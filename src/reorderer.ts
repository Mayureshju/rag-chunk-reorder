import {
  AbortSignalLike,
  Chunk,
  CoercionStats,
  ReorderConfig,
  ReorderDiagnostics,
  ReorderExplain,
  ReorderResult,
  RerankerResult,
  ScoredChunk,
} from './types';
import { validateConfig, mergeConfig, MergedReorderConfig } from './config';
import { prepareChunks } from './validator';
import { ValidationError } from './errors';
import { scoreChunksWithOptions } from './scorer';
import { scoreSpread } from './strategies/score-spread';
import { preserveOrder } from './strategies/preserve-order';
import { chronological } from './strategies/chronological';
import { customSort } from './strategies/custom';
import { groupChunks, orderGroups } from './grouper';
import { deduplicateChunks } from './deduplicator';
import { resolveAutoStrategy } from './selector';
import { rerankWithDiversity } from './diversity';

function stripInternalFields(
  chunk: ScoredChunk,
  includePriorityScore?: boolean,
  explain?: ReorderExplain,
): Chunk {
  const { priorityScore, originalIndex: _, ...rest } = chunk;
  if (includePriorityScore || explain) {
    const metadata = { ...(rest.metadata ?? {}) } as Record<string, unknown>;
    if (includePriorityScore) metadata.priorityScore = priorityScore;
    if (explain) metadata.reorderExplain = explain;
    return { ...rest, metadata };
  }
  return rest;
}

function applyStrategy(
  chunks: ScoredChunk[],
  strategy: Exclude<ReorderConfig['strategy'], 'auto' | undefined>,
  config: ReorderConfig,
): ScoredChunk[] {
  switch (strategy) {
    case 'scoreSpread':
      return scoreSpread(chunks, config.startCount, config.endCount);
    case 'preserveOrder':
      return preserveOrder(chunks, config.preserveOrderSourceField);
    case 'chronological':
      return chronological(chunks, config.chronologicalOrder);
    case 'custom':
      return customSort(chunks, config.customComparator!);
    default:
      return scoreSpread(chunks, config.startCount, config.endCount);
  }
}

function filterByMinScore(chunks: Chunk[], minScore: number): Chunk[] {
  return chunks.filter((c) => c.score >= minScore);
}

function buildEdgePriorityOrder(length: number): number[] {
  const order: number[] = [];
  let front = 0;
  let back = length - 1;

  while (front <= back) {
    order.push(front);
    if (front !== back) {
      order.push(back);
    }
    front++;
    back--;
  }

  return order;
}

function takeFromEdges<T>(items: T[], count: number): T[] {
  if (count >= items.length) return [...items];
  if (count <= 0) return [];

  const frontCount = Math.ceil(count / 2);
  const backCount = Math.floor(count / 2);

  return [...items.slice(0, frontCount), ...items.slice(items.length - backCount)];
}

type TokenUsage = { total: number; cached: number };

function normalizeGroupKey(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'object' || typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }
  const key = String(value);
  return key.length > 0 ? key : undefined;
}

function buildExplainPayload(
  ordered: ScoredChunk[],
  strategy: Exclude<ReorderConfig['strategy'], 'auto' | undefined>,
  config: MergedReorderConfig,
  groupField?: string,
  groupKeyByChunk?: Map<ScoredChunk, string>,
): ReorderExplain[] {
  if (ordered.length === 0) return [];

  const prioritySorted = [...ordered].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return a.originalIndex - b.originalIndex;
  });
  const priorityRank = new Map<ScoredChunk, number>();
  for (let i = 0; i < prioritySorted.length; i++) {
    priorityRank.set(prioritySorted[i], i);
  }

  const hasCounts =
    config.startCount !== undefined &&
    config.endCount !== undefined &&
    config.startCount + config.endCount < ordered.length;

  return ordered.map((chunk, position) => {
    let placement: string = strategy;
    if (strategy === 'scoreSpread') {
      if (hasCounts) {
        if (position < config.startCount!) placement = 'scoreSpread:start';
        else if (position >= ordered.length - config.endCount!) placement = 'scoreSpread:end';
        else placement = 'scoreSpread:middle';
      } else {
        placement = position <= (ordered.length - 1) / 2 ? 'scoreSpread:front' : 'scoreSpread:back';
      }
    } else if (strategy === 'preserveOrder') {
      placement = 'preserveOrder';
    } else if (strategy === 'chronological') {
      placement = 'chronological';
    } else if (strategy === 'custom') {
      placement = 'custom';
    }

    const explain: ReorderExplain = {
      strategy,
      placement,
      position,
      priorityRank: priorityRank.get(chunk),
      priorityScore: chunk.priorityScore,
      scoreNormalization: config.scoreNormalization,
      diversityApplied: !!config.diversity?.enabled,
    };

    if (groupField) {
      explain.groupBy = groupField;
      if (groupKeyByChunk) {
        explain.groupKey = groupKeyByChunk.get(chunk);
      } else {
        explain.groupKey = normalizeGroupKey(chunk.metadata?.[groupField]) ?? '__default__';
      }
    }

    if (strategy === 'preserveOrder') {
      explain.preserveOrderSourceField = config.preserveOrderSourceField ?? 'sourceId';
      const field = explain.preserveOrderSourceField;
      explain.groupKey = normalizeGroupKey(chunk.metadata?.[field]) ?? '__default__';
    }

    if (strategy === 'chronological') {
      explain.chronologicalOrder = config.chronologicalOrder ?? 'asc';
      const ts = chunk.metadata?.timestamp;
      if (typeof ts === 'number' && Number.isFinite(ts)) explain.timestamp = ts;
    }

    return explain;
  });
}

function resolveTokenCount(
  chunk: Chunk,
  tokenCounter: (text: string) => number,
): { tokens: number; cached: boolean } {
  const cached = chunk.tokenCount ?? (chunk.metadata as Record<string, unknown>)?.tokenCount;
  if (cached !== undefined) {
    if (typeof cached !== 'number' || !Number.isFinite(cached) || cached < 0) {
      throw new ValidationError('tokenCount must be a non-negative finite number');
    }
    return { tokens: cached, cached: true };
  }

  const tokens = tokenCounter(chunk.text);
  if (typeof tokens !== 'number' || !Number.isFinite(tokens) || tokens < 0) {
    throw new ValidationError('tokenCounter must return a non-negative finite number');
  }
  return { tokens, cached: false };
}

function applyTokenBudgetPrefix(
  chunks: Chunk[],
  maxTokens: number,
  tokenCounter: (text: string) => number,
  usage?: TokenUsage,
): Chunk[] {
  const result: Chunk[] = [];
  let totalTokens = 0;
  for (const chunk of chunks) {
    const { tokens, cached } = resolveTokenCount(chunk, tokenCounter);
    if (totalTokens + tokens > maxTokens) break;
    totalTokens += tokens;
    if (usage) {
      usage.total += tokens;
      if (cached) usage.cached += tokens;
    }
    result.push(chunk);
  }
  return result;
}

/**
 * Token-budget trimming for scoreSpread output.
 * Prefers chunks near both edges (high-attention zones) instead of prefix-only truncation.
 */
function applyTokenBudgetEdgeAware(
  chunks: Chunk[],
  maxTokens: number,
  tokenCounter: (text: string) => number,
  usage?: TokenUsage,
): Chunk[] {
  const selectedIndices = new Set<number>();
  let totalTokens = 0;

  for (const idx of buildEdgePriorityOrder(chunks.length)) {
    const { tokens, cached } = resolveTokenCount(chunks[idx], tokenCounter);
    if (tokens > maxTokens) continue;
    if (totalTokens + tokens > maxTokens) continue;

    totalTokens += tokens;
    if (usage) {
      usage.total += tokens;
      if (cached) usage.cached += tokens;
    }
    selectedIndices.add(idx);
  }

  return chunks.filter((_, idx) => selectedIndices.has(idx));
}

function resolveCharCount(text: string, charCounter?: (text: string) => number): number {
  if (!charCounter) return text.length;
  const count = charCounter(text);
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) {
    throw new ValidationError('charCounter must return a non-negative finite number');
  }
  return count;
}

function applyCharBudgetPrefix(
  chunks: Chunk[],
  maxChars: number,
  charCounter?: (text: string) => number,
  usage?: { total: number },
): Chunk[] {
  const result: Chunk[] = [];
  let totalChars = 0;
  for (const chunk of chunks) {
    const chars = resolveCharCount(chunk.text, charCounter);
    if (totalChars + chars > maxChars) break;
    totalChars += chars;
    if (usage) usage.total += chars;
    result.push(chunk);
  }
  return result;
}

function applyCharBudgetEdgeAware(
  chunks: Chunk[],
  maxChars: number,
  charCounter?: (text: string) => number,
  usage?: { total: number },
): Chunk[] {
  const selectedIndices = new Set<number>();
  let totalChars = 0;

  for (const idx of buildEdgePriorityOrder(chunks.length)) {
    const chars = resolveCharCount(chunks[idx].text, charCounter);
    if (chars > maxChars) continue;
    if (totalChars + chars > maxChars) continue;

    totalChars += chars;
    if (usage) usage.total += chars;
    selectedIndices.add(idx);
  }

  return chunks.filter((_, idx) => selectedIndices.has(idx));
}

function createCoercionStats(): CoercionStats {
  return {
    coercedScores: 0,
    droppedMetadataFields: 0,
    droppedMetadataTimestamp: 0,
    droppedMetadataSectionIndex: 0,
    droppedMetadataSourceId: 0,
    droppedMetadataSourceReliability: 0,
  };
}

function computeTokenUsage(
  chunks: Chunk[],
  tokenCounter: (text: string) => number,
): TokenUsage {
  const usage: TokenUsage = { total: 0, cached: 0 };
  for (const chunk of chunks) {
    const { tokens, cached } = resolveTokenCount(chunk, tokenCounter);
    usage.total += tokens;
    if (cached) usage.cached += tokens;
  }
  return usage;
}

function computeCharUsage(chunks: Chunk[], charCounter?: (text: string) => number): number {
  let total = 0;
  for (const chunk of chunks) {
    total += resolveCharCount(chunk.text, charCounter);
  }
  return total;
}

function applyScoreClamp(chunks: Chunk[], clamp?: [number, number]): Chunk[] {
  if (!clamp) return chunks;
  const [min, max] = clamp;
  let changed = false;
  const clamped = chunks.map((chunk) => {
    const next = Math.min(max, Math.max(min, chunk.score));
    if (next !== chunk.score) {
      changed = true;
      return { ...chunk, score: next };
    }
    return chunk;
  });
  return changed ? clamped : chunks;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void,
  onLateError?: (error: unknown) => void,
): Promise<T> {
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      onTimeout();
      reject(new ValidationError(`reranker timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([
    promise
      .catch((error) => {
        if (timedOut) {
          // Swallow late rejections after timeout to avoid unhandled promise rejections.
          if (onLateError) {
            try {
              onLateError(error);
            } catch {
              // ignore late error handler failures
            }
          }
          return new Promise<T>(() => {});
        }
        throw error;
      })
      .finally(() => {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
      }),
    timeoutPromise,
  ]);
}

function getTime(): number {
  const perf = (globalThis as { performance?: { now: () => number } }).performance;
  if (perf && typeof perf.now === 'function') return perf.now();
  return Date.now();
}

function createRerankerSignal(
  externalSignal: AbortSignalLike | undefined,
  forceController: boolean,
): { signal?: AbortSignalLike; cleanup: () => void; abort: (reason?: Error) => void } {
  if (!externalSignal && !forceController) {
    return { signal: undefined, cleanup: () => {}, abort: () => {} };
  }

  const Controller = (globalThis as { AbortController?: { new (): { signal: AbortSignalLike; abort: (reason?: unknown) => void } } }).AbortController;
  if (!Controller) {
    return { signal: externalSignal, cleanup: () => {}, abort: () => {} };
  }
  const controller = new Controller();
  const onAbort = () => {
    controller.abort(externalSignal?.reason ?? new ValidationError('reranker aborted'));
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      onAbort();
    } else {
      externalSignal.addEventListener('abort', onAbort);
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onAbort);
      }
    },
    abort: (reason?: Error) => {
      controller.abort(reason ?? new ValidationError('reranker aborted'));
    },
  };
}

function resolvePacking(
  packing: ReorderConfig['packing'],
  strategy: Exclude<ReorderConfig['strategy'], 'auto' | undefined>,
): 'prefix' | 'edgeAware' {
  if (packing === 'prefix' || packing === 'edgeAware') return packing;
  return strategy === 'scoreSpread' ? 'edgeAware' : 'prefix';
}

function normalizeRerankerResult(result: RerankerResult): Chunk[] {
  if (Array.isArray(result)) {
    return result;
  }
  if (!result || typeof result !== 'object') {
    throw new ValidationError('reranker returned invalid result');
  }
  const payload = result as { chunks: Chunk[]; scores: number[] };
  if (!Array.isArray(payload.chunks) || !Array.isArray(payload.scores)) {
    throw new ValidationError('reranker returned invalid result');
  }
  if (payload.chunks.length !== payload.scores.length) {
    throw new ValidationError('reranker returned chunks/scores length mismatch');
  }
  for (let i = 0; i < payload.scores.length; i++) {
    const score = payload.scores[i];
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throw new ValidationError(`reranker returned invalid score at index ${i}`);
    }
  }
  return payload.chunks.map((chunk, idx) => ({ ...chunk, score: payload.scores[idx] }));
}

function chunkIntoBatches<T>(items: T[], batchSize: number): T[][] {
  if (batchSize <= 0 || batchSize >= items.length) return [items];
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Main orchestrator for chunk reordering in RAG pipelines.
 * Supports sync, async (with reranker), and streaming modes.
 */
export class Reorderer {
  private readonly config: Readonly<MergedReorderConfig>;

  constructor(config?: ReorderConfig) {
    const merged = mergeConfig(config);
    validateConfig(merged);
    if (merged.weights) Object.freeze(merged.weights);
    if (merged.autoStrategy?.temporalQueryTerms) {
      Object.freeze(merged.autoStrategy.temporalQueryTerms);
    }
    if (merged.autoStrategy?.narrativeQueryTerms) {
      Object.freeze(merged.autoStrategy.narrativeQueryTerms);
    }
    if (merged.autoStrategy) Object.freeze(merged.autoStrategy);
    if (merged.diversity) Object.freeze(merged.diversity);
    this.config = Object.freeze(merged);
  }

  /** Returns a deep copy of the current configuration. */
  getConfig(): ReorderConfig {
    return {
      ...this.config,
      weights: { ...this.config.weights },
      autoStrategy: {
        ...this.config.autoStrategy,
        temporalQueryTerms: [...(this.config.autoStrategy.temporalQueryTerms ?? [])],
        narrativeQueryTerms: [...(this.config.autoStrategy.narrativeQueryTerms ?? [])],
      },
      diversity: { ...this.config.diversity },
    };
  }

  private mergeOverrides(overrides?: Partial<ReorderConfig>): MergedReorderConfig {
    if (!overrides) return this.config as MergedReorderConfig;
    const merged: MergedReorderConfig = {
      ...this.config,
      ...overrides,
      weights: { ...this.config.weights, ...overrides.weights },
      autoStrategy: { ...this.config.autoStrategy, ...overrides.autoStrategy },
      diversity: { ...this.config.diversity, ...overrides.diversity },
    };
    merged.autoStrategy.temporalQueryTerms = [
      ...(overrides?.autoStrategy?.temporalQueryTerms ??
        this.config.autoStrategy.temporalQueryTerms ??
        []),
    ];
    merged.autoStrategy.narrativeQueryTerms = [
      ...(overrides?.autoStrategy?.narrativeQueryTerms ??
        this.config.autoStrategy.narrativeQueryTerms ??
        []),
    ];

    // Prevent stale comparators from previous custom configs from leaking into
    // non-custom override calls (for example custom -> auto).
    if (merged.strategy !== 'custom') {
      merged.customComparator = undefined;
    }

    validateConfig(merged);
    return merged;
  }

  private executePipelineWithConfig(
    chunks: Chunk[],
    config: MergedReorderConfig,
    query?: string,
    diagnostics?: { rerankerApplied?: boolean; prepared?: boolean; coercionStats?: CoercionStats },
  ): Chunk[] {
    const fallbackStrategy: Exclude<ReorderConfig['strategy'], 'auto' | undefined> =
      config.strategy === 'auto' ? 'scoreSpread' : config.strategy;
    const coercionStats = diagnostics?.coercionStats ?? createCoercionStats();
    const trace = config.onTraceStep;
    const validateRerankerOutputLength = config.validateRerankerOutputLength !== false;
    const validateRerankerOutputOrder = config.validateRerankerOutputOrder !== false;
    const validateRerankerOutputOrderByIndex = config.validateRerankerOutputOrderByIndex === true;
    const dedupStrategyUsed: 'none' | 'exact' | 'fuzzy' = config.deduplicate
      ? config.deduplicateThreshold !== undefined && config.deduplicateThreshold < 1
        ? 'fuzzy'
        : 'exact'
      : 'none';
    const fallbackPacking: 'prefix' | 'edgeAware' = resolvePacking(
      config.packing,
      fallbackStrategy,
    );

    if (chunks.length === 0) {
      if (config.onDiagnostics) {
        try {
          const emptyStats: ReorderDiagnostics = {
            inputCount: 0,
            validatedCount: 0,
            coercedScores: coercionStats.coercedScores,
            droppedMetadataFields: coercionStats.droppedMetadataFields,
            droppedMetadataTimestamp: coercionStats.droppedMetadataTimestamp,
            droppedMetadataSectionIndex: coercionStats.droppedMetadataSectionIndex,
            droppedMetadataSourceId: coercionStats.droppedMetadataSourceId,
            droppedMetadataSourceReliability: coercionStats.droppedMetadataSourceReliability,
            dedupStrategyUsed,
            packingStrategyUsed: fallbackPacking,
            tokenCountUsed: 0,
            cachedTokenCountUsed: 0,
            charCountUsed: 0,
            budgetUnit: 'none',
            filteredByMinScore: 0,
            dedupRemoved: 0,
            rerankerApplied: diagnostics?.rerankerApplied ?? false,
            strategyChosen: fallbackStrategy,
            budgetPruned: 0,
            outputCount: 0,
          };
          config.onDiagnostics(emptyStats);
        } catch {
          // ignore diagnostics errors
        }
      }
      return [];
    }

    // Validate/coerce input before any filtering/transforms so malformed chunks never
    // bypass validation (for example via minScore) or trigger raw runtime errors.
    let working = diagnostics?.prepared
      ? chunks
      : prepareChunks(chunks, config.validationMode, coercionStats);
    const diagnosticsStats: ReorderDiagnostics = {
      inputCount: chunks.length,
      validatedCount: working.length,
      coercedScores: coercionStats.coercedScores,
      droppedMetadataFields: coercionStats.droppedMetadataFields,
      droppedMetadataTimestamp: coercionStats.droppedMetadataTimestamp,
      droppedMetadataSectionIndex: coercionStats.droppedMetadataSectionIndex,
      droppedMetadataSourceId: coercionStats.droppedMetadataSourceId,
      droppedMetadataSourceReliability: coercionStats.droppedMetadataSourceReliability,
      dedupStrategyUsed,
      packingStrategyUsed: fallbackPacking,
      tokenCountUsed: 0,
      cachedTokenCountUsed: 0,
      charCountUsed: 0,
      budgetUnit: 'none',
      filteredByMinScore: 0,
      dedupRemoved: 0,
      rerankerApplied: diagnostics?.rerankerApplied ?? false,
      strategyChosen: fallbackStrategy,
      budgetPruned: 0,
      outputCount: 0,
    };

    // Optional score clamping before filtering/ranking.
    working = applyScoreClamp(working, config.scoreClamp);

    // Filter by minimum score
    if (config.minScore !== undefined) {
      const start = trace ? getTime() : 0;
      const before = working.length;
      working = filterByMinScore(working, config.minScore);
      diagnosticsStats.filteredByMinScore = before - working.length;
      if (trace) {
        try {
          trace('minScore', getTime() - start, { before, after: working.length });
        } catch {
          // ignore trace errors
        }
      }
    }

    // Deduplicate
    if (config.deduplicate) {
      const start = trace ? getTime() : 0;
      const before = working.length;
      working = deduplicateChunks(working, {
        threshold: config.deduplicateThreshold,
        keep: config.deduplicateKeep,
        lengthBucketSize: config.deduplicateLengthBucketSize,
        maxCandidates: config.deduplicateMaxCandidates,
      });
      diagnosticsStats.dedupRemoved = before - working.length;
      if (trace) {
        try {
          trace('dedup', getTime() - start, { before, after: working.length });
        } catch {
          // ignore trace errors
        }
      }
    }

    if (working.length === 0) {
      diagnosticsStats.outputCount = 0;
      if (config.onDiagnostics) {
        try {
          config.onDiagnostics(diagnosticsStats);
        } catch {
          // ignore diagnostics errors
        }
      }
      return [];
    }

    const resolvedStrategy: Exclude<ReorderConfig['strategy'], 'auto' | undefined> =
      config.strategy === 'auto'
        ? resolveAutoStrategy(working, query, config.autoStrategy, config.preserveOrderSourceField)
        : config.strategy;
    diagnosticsStats.strategyChosen = resolvedStrategy;
    diagnosticsStats.packingStrategyUsed = resolvePacking(config.packing, resolvedStrategy);

    const scoreStart = trace ? getTime() : 0;
    let scored = scoreChunksWithOptions(working, config.weights, {
      scoreNormalization: config.scoreNormalization,
      scoreNormalizationTemperature: config.scoreNormalizationTemperature,
    });

    if (config.diversity.enabled) {
      scored = rerankWithDiversity(scored, config.diversity);
    }
    if (trace) {
      try {
        trace('score', getTime() - scoreStart, { count: scored.length });
      } catch {
        // ignore trace errors
      }
    }

    let result: ScoredChunk[];

    const groupField = config.groupBy;
    const preserveField = config.preserveOrderSourceField ?? 'sourceId';
    const shouldGroup =
      groupField !== undefined &&
      !(resolvedStrategy === 'preserveOrder' && groupField === preserveField);

    const strategyStart = trace ? getTime() : 0;
    let groupKeyByChunk: Map<ScoredChunk, string> | undefined;
    if (shouldGroup && groupField !== undefined) {
      const groups = groupChunks(scored, groupField);
      groupKeyByChunk = new Map<ScoredChunk, string>();
      for (const [key, group] of groups) {
        for (const chunk of group) {
          groupKeyByChunk.set(chunk, key);
        }
      }
      const ordered = orderGroups(groups);
      const reorderedGroups = ordered.map(
        ([key, group]) =>
          [key, applyStrategy(group, resolvedStrategy, config)] as [string, ScoredChunk[]],
      );
      result = reorderedGroups.flatMap(([, group]) => group);
    } else {
      result = applyStrategy(scored, resolvedStrategy, config);
    }
    if (trace) {
      try {
        trace('strategy', getTime() - strategyStart, { count: result.length });
      } catch {
        // ignore trace errors
      }
    }

    const explainPayload = config.includeExplain
      ? buildExplainPayload(
          result,
          resolvedStrategy,
          config,
          shouldGroup ? groupField : undefined,
          groupKeyByChunk,
        )
      : undefined;
    let output = result.map((c, idx) =>
      stripInternalFields(c, config.includePriorityScore, explainPayload?.[idx]),
    );
    const packing = resolvePacking(config.packing, resolvedStrategy);
    const preBudget = output;
    const preBudgetCount = output.length;
    const tokenUsage: TokenUsage = { total: 0, cached: 0 };
    const charUsage = { total: 0 };
    let usedTokenBudget = false;
    let usedCharBudget = false;
    let outputAdjustedAfterBudget = false;
    const budgetStart = trace ? getTime() : 0;

    // Apply token budget after reordering.
    // scoreSpread keeps chunks from both edges to preserve primacy/recency placements.
    if (config.maxTokens !== undefined && config.tokenCounter) {
      usedTokenBudget = true;
      output =
        packing === 'edgeAware'
          ? applyTokenBudgetEdgeAware(output, config.maxTokens, config.tokenCounter, tokenUsage)
          : applyTokenBudgetPrefix(output, config.maxTokens, config.tokenCounter, tokenUsage);
    } else if (config.maxChars !== undefined) {
      usedCharBudget = true;
      output =
        packing === 'edgeAware'
          ? applyCharBudgetEdgeAware(output, config.maxChars, config.charCounter, charUsage)
          : applyCharBudgetPrefix(output, config.maxChars, config.charCounter, charUsage);
    }

    if (config.minTopK !== undefined && output.length < config.minTopK) {
      const minimum =
        packing === 'edgeAware'
          ? takeFromEdges(preBudget, config.minTopK)
          : preBudget.slice(0, config.minTopK);
      if (minimum.length !== output.length) {
        output = minimum;
        outputAdjustedAfterBudget = true;
      }
    }

    // Apply topK limit.
    // scoreSpread keeps chunks from both edges to preserve primacy/recency placements.
    if (config.topK !== undefined && output.length > config.topK) {
      outputAdjustedAfterBudget = true;
      output =
        packing === 'edgeAware'
          ? takeFromEdges(output, config.topK)
          : output.slice(0, config.topK);
    }

    if (config.includeExplain) {
      output = output.map((chunk, idx) => {
        const metadata = chunk.metadata as Record<string, unknown> | undefined;
        const explain = metadata?.reorderExplain as ReorderExplain | undefined;
        if (!explain) return chunk;
        return {
          ...chunk,
          metadata: {
            ...(metadata ?? {}),
            reorderExplain: { ...explain, position: idx },
          },
        };
      });
    }

    if (usedTokenBudget) {
      const usage = outputAdjustedAfterBudget
        ? computeTokenUsage(output, config.tokenCounter!)
        : tokenUsage;
      diagnosticsStats.tokenCountUsed = usage.total;
      diagnosticsStats.cachedTokenCountUsed = usage.cached;
      diagnosticsStats.charCountUsed = 0;
      diagnosticsStats.budgetUnit = 'tokens';
    } else if (usedCharBudget) {
      diagnosticsStats.tokenCountUsed = outputAdjustedAfterBudget
        ? computeCharUsage(output, config.charCounter)
        : charUsage.total;
      diagnosticsStats.cachedTokenCountUsed = 0;
      diagnosticsStats.charCountUsed = diagnosticsStats.tokenCountUsed;
      diagnosticsStats.tokenCountUsed = 0;
      diagnosticsStats.budgetUnit = 'chars';
    } else {
      diagnosticsStats.budgetUnit = 'none';
    }

    if (trace) {
      try {
        trace('budget', getTime() - budgetStart, {
          before: preBudgetCount,
          after: output.length,
          packing,
          maxTokens: config.maxTokens,
          maxChars: config.maxChars,
          topK: config.topK,
          minTopK: config.minTopK,
        });
      } catch {
        // ignore trace errors
      }
    }

    diagnosticsStats.budgetPruned = preBudgetCount - output.length;
    diagnosticsStats.outputCount = output.length;
    if (config.onDiagnostics) {
      try {
        config.onDiagnostics(diagnosticsStats);
      } catch {
        // ignore diagnostics errors
      }
    }

    return output;
  }

  /** Synchronous reorder. Does not support reranker (use `reorder` for that). Throws if reranker is passed via overrides. */
  reorderSync(chunks: Chunk[], overrides?: Partial<ReorderConfig>): Chunk[];
  reorderSync(chunks: Chunk[], query: string, overrides?: Partial<ReorderConfig>): Chunk[];
  reorderSync(
    chunks: Chunk[],
    queryOrOverrides?: string | Partial<ReorderConfig>,
    maybeOverrides?: Partial<ReorderConfig>,
  ): Chunk[] {
    const query = typeof queryOrOverrides === 'string' ? queryOrOverrides : undefined;
    const overrides = typeof queryOrOverrides === 'string' ? maybeOverrides : queryOrOverrides;

    if (overrides?.reranker) {
      throw new ValidationError(
        'reranker cannot be used with reorderSync(). Use the async reorder() method instead.',
      );
    }
    return this.executePipelineWithConfig(chunks, this.mergeOverrides(overrides), query);
  }

  /** Synchronous reorder with diagnostics payload. */
  reorderSyncWithDiagnostics(
    chunks: Chunk[],
    overrides?: Partial<ReorderConfig>,
  ): ReorderResult;
  reorderSyncWithDiagnostics(
    chunks: Chunk[],
    query: string,
    overrides?: Partial<ReorderConfig>,
  ): ReorderResult;
  reorderSyncWithDiagnostics(
    chunks: Chunk[],
    queryOrOverrides?: string | Partial<ReorderConfig>,
    maybeOverrides?: Partial<ReorderConfig>,
  ): ReorderResult {
    const query = typeof queryOrOverrides === 'string' ? queryOrOverrides : undefined;
    const overrides = typeof queryOrOverrides === 'string' ? maybeOverrides : queryOrOverrides;

    let captured: ReorderDiagnostics | undefined;
    const mergedOverrides: Partial<ReorderConfig> = {
      ...overrides,
      onDiagnostics: (stats) => {
        captured = stats;
        overrides?.onDiagnostics?.(stats);
      },
    };

    const chunksOut =
      query !== undefined
        ? this.reorderSync(chunks, query, mergedOverrides)
        : this.reorderSync(chunks, mergedOverrides);
    if (!captured) {
      throw new ValidationError('Diagnostics were not captured');
    }
    return { chunks: chunksOut, diagnostics: captured };
  }

  /** Async reorder with optional reranker integration. */
  async reorder(
    chunks: Chunk[],
    query?: string,
    overrides?: Partial<ReorderConfig>,
  ): Promise<Chunk[]> {
    const config = this.mergeOverrides(overrides);

    if (chunks.length === 0) {
      return this.executePipelineWithConfig(chunks, config, query, { rerankerApplied: false });
    }

    const inputCoercion = createCoercionStats();
    let workingChunks = prepareChunks(chunks, config.validationMode, inputCoercion);
    let rerankerApplied = false;
    let coercionStats = inputCoercion;
    const trace = config.onTraceStep;
    const validateRerankerOutputLength = config.validateRerankerOutputLength !== false;
    const validateRerankerOutputOrder = config.validateRerankerOutputOrder !== false;
    const validateRerankerOutputOrderByIndex = config.validateRerankerOutputOrderByIndex === true;

    if (config.reranker && query) {
      try {
        const { signal, cleanup, abort } = createRerankerSignal(
          config.rerankerAbortSignal,
          config.rerankerTimeoutMs !== undefined,
        );
        const batchSize = config.rerankerBatchSize ?? workingChunks.length;
        const concurrency = Math.min(
          config.rerankerConcurrency ?? 1,
          Math.max(1, Math.ceil(workingChunks.length / batchSize)),
        );
        const batches = chunkIntoBatches(workingChunks, batchSize);
        const rerankerStart = trace ? getTime() : 0;
        let lateErrorReported = false;

        const reportLateError = (error: unknown) => {
          if (!config.onRerankerError || lateErrorReported) return;
          lateErrorReported = true;
          const message =
            error instanceof Error ? error.message : `Unknown reranker error: ${String(error)}`;
          config.onRerankerError(new ValidationError(`reranker rejected after timeout: ${message}`));
        };

        try {
          if (signal?.aborted) {
            throw signal.reason ?? new ValidationError('reranker aborted');
          }
          const results: Chunk[][] = new Array(batches.length);
          let cursor = 0;
          const runBatch = async () => {
            while (cursor < batches.length) {
              const idx = cursor++;
              const batch = batches[idx];
              const rerankPromise = config.reranker!.rerank(
                batch,
                query,
                signal ? { signal } : undefined,
              );
              const rerankResult = config.rerankerTimeoutMs !== undefined
                ? await withTimeout(
                    rerankPromise,
                    config.rerankerTimeoutMs,
                    () =>
                      abort(
                        new ValidationError(
                          `reranker timed out after ${config.rerankerTimeoutMs}ms`,
                        ),
                      ),
                    reportLateError,
                  )
                : await rerankPromise;
              results[idx] = normalizeRerankerResult(rerankResult);
            }
          };

          const workers = Array.from({ length: concurrency }, () => runBatch());
          await Promise.all(workers);

          const reranked = results.flat();
          if (validateRerankerOutputLength && reranked.length !== workingChunks.length) {
            throw new ValidationError(
              `reranker returned ${reranked.length} chunks, expected ${workingChunks.length}`,
            );
          }
          if (validateRerankerOutputOrderByIndex) {
            const orderKeys = new Set<string>();
            const resolveKey = (chunk: Chunk): string => {
              const chunkId = chunk.metadata?.chunkId;
              if (typeof chunkId === 'string' && chunkId.length > 0) {
                return `chunkId:${chunkId}`;
              }
              return `id:${chunk.id}\u0000text:${chunk.text}`;
            };
            for (const chunk of workingChunks) {
              const key = resolveKey(chunk);
              if (orderKeys.has(key)) {
                throw new ValidationError(
                  'reranker order validation requires unique metadata.chunkId for duplicate chunks',
                );
              }
              orderKeys.add(key);
            }
            for (let i = 0; i < workingChunks.length; i++) {
              if (resolveKey(reranked[i] as Chunk) !== resolveKey(workingChunks[i])) {
                throw new ValidationError(
                  'reranker output order does not match input order',
                );
              }
            }
          } else if (validateRerankerOutputOrder) {
            const seen = new Set<string>();
            let hasDuplicate = false;
            for (const chunk of workingChunks) {
              if (seen.has(chunk.id)) {
                hasDuplicate = true;
                break;
              }
              seen.add(chunk.id);
            }
            if (!hasDuplicate) {
              for (let i = 0; i < workingChunks.length; i++) {
                if (reranked[i]?.id !== workingChunks[i].id) {
                  throw new ValidationError(
                    'reranker output order does not match input order',
                  );
                }
              }
            }
          }
          const rerankCoercion = createCoercionStats();
          // Validate/coerce reranker output early so we can fall back gracefully.
          workingChunks = prepareChunks(reranked, config.validationMode, rerankCoercion);
          coercionStats = rerankCoercion;
          rerankerApplied = true;
          if (trace) {
            try {
              trace('reranker', getTime() - rerankerStart, {
                batches: batches.length,
                batchSize,
                concurrency,
              });
            } catch {
              // ignore trace errors
            }
          }
        } finally {
          cleanup();
        }
      } catch (error) {
        if (config.onRerankerError) {
          config.onRerankerError(error);
        }
        // Fall back to original scores
      }
    }

    return this.executePipelineWithConfig(workingChunks, config, query, {
      rerankerApplied,
      prepared: true,
      coercionStats,
    });
  }

  /** Async reorder with diagnostics payload. */
  async reorderWithDiagnostics(
    chunks: Chunk[],
    query?: string,
    overrides?: Partial<ReorderConfig>,
  ): Promise<ReorderResult> {
    let captured: ReorderDiagnostics | undefined;
    const mergedOverrides: Partial<ReorderConfig> = {
      ...overrides,
      onDiagnostics: (stats) => {
        captured = stats;
        overrides?.onDiagnostics?.(stats);
      },
    };

    const output = await this.reorder(chunks, query, mergedOverrides);
    if (!captured) {
      throw new ValidationError('Diagnostics were not captured');
    }
    return { chunks: output, diagnostics: captured };
  }

  /**
   * Streaming reorder. Yields chunks one at a time.
   *
   * When provided a Chunk[] array, this materializes the full result before yielding.
   * When provided an Iterable/AsyncIterable, the input is processed in windows to
   * bound memory. Windowed streaming is approximate and may differ from a global
   * reorder on the full set.
   */
  async *reorderStream(
    chunks: Chunk[] | Iterable<Chunk> | AsyncIterable<Chunk>,
    query?: string,
    overrides?: Partial<ReorderConfig>,
  ): AsyncIterable<Chunk> {
    // Arrays use the existing materialized pipeline.
    if (Array.isArray(chunks)) {
      const result = await this.reorder(chunks, query, overrides);
      for (const chunk of result) {
        yield chunk;
      }
      return;
    }

    // Iterable/AsyncIterable mode: process in windows to bound memory.
    const windowSize =
      overrides?.streamingWindowSize ??
      this.config.streamingWindowSize ??
      128;
    if (!Number.isFinite(windowSize) || windowSize <= 0 || !Number.isInteger(windowSize)) {
      throw new ValidationError('streamingWindowSize must be a positive integer');
    }

    const buffer: Chunk[] = [];

    const asyncIterable = chunks as AsyncIterable<Chunk>;
    if (asyncIterable && typeof asyncIterable[Symbol.asyncIterator] === 'function') {
      for await (const chunk of asyncIterable) {
        buffer.push(chunk);
        if (buffer.length >= windowSize) {
          const result = await this.reorder(buffer, query, overrides);
          buffer.length = 0;
          for (const outChunk of result) {
            yield outChunk;
          }
        }
      }
      if (buffer.length > 0) {
        const result = await this.reorder(buffer, query, overrides);
        buffer.length = 0;
        for (const outChunk of result) {
          yield outChunk;
        }
      }
      return;
    }

    const iterable = chunks as Iterable<Chunk>;
    if (iterable && typeof iterable[Symbol.iterator] === 'function') {
      for (const chunk of iterable) {
        buffer.push(chunk);
        if (buffer.length >= windowSize) {
          const result = await this.reorder(buffer, query, overrides);
          buffer.length = 0;
          for (const outChunk of result) {
            yield outChunk;
          }
        }
      }
      if (buffer.length > 0) {
        const result = await this.reorder(buffer, query, overrides);
        buffer.length = 0;
        for (const outChunk of result) {
          yield outChunk;
        }
      }
    }
  }
}
