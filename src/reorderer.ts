import { Chunk, ReorderConfig, ScoredChunk } from './types';
import { validateConfig, mergeConfig, MergedReorderConfig } from './config';
import { validateChunks } from './validator';
import { ValidationError } from './errors';
import { scoreChunks } from './scorer';
import { scoreSpread } from './strategies/score-spread';
import { preserveOrder } from './strategies/preserve-order';
import { chronological } from './strategies/chronological';
import { customSort } from './strategies/custom';
import { groupChunks, orderGroups } from './grouper';
import { deduplicateChunks } from './deduplicator';
import { resolveAutoStrategy } from './selector';
import { rerankWithDiversity } from './diversity';

function stripInternalFields(chunk: ScoredChunk, includePriorityScore?: boolean): Chunk {
  const { priorityScore, originalIndex: _, ...rest } = chunk;
  if (includePriorityScore) {
    return { ...rest, metadata: { ...rest.metadata, priorityScore } };
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
      return preserveOrder(chunks);
    case 'chronological':
      return chronological(chunks);
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

function applyTokenBudgetPrefix(
  chunks: Chunk[],
  maxTokens: number,
  tokenCounter: (text: string) => number,
): Chunk[] {
  const result: Chunk[] = [];
  let totalTokens = 0;
  for (const chunk of chunks) {
    const tokens = getTokenCount(chunk.text, tokenCounter);
    if (totalTokens + tokens > maxTokens) break;
    totalTokens += tokens;
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
): Chunk[] {
  const selectedIndices = new Set<number>();
  let totalTokens = 0;

  for (const idx of buildEdgePriorityOrder(chunks.length)) {
    const tokens = getTokenCount(chunks[idx].text, tokenCounter);
    if (tokens > maxTokens) continue;
    if (totalTokens + tokens > maxTokens) continue;

    totalTokens += tokens;
    selectedIndices.add(idx);
  }

  return chunks.filter((_, idx) => selectedIndices.has(idx));
}

function getTokenCount(text: string, tokenCounter: (text: string) => number): number {
  const tokens = tokenCounter(text);
  if (typeof tokens !== 'number' || !Number.isFinite(tokens) || tokens < 0) {
    throw new ValidationError('tokenCounter must return a non-negative finite number');
  }
  return tokens;
}

function resolvePacking(
  packing: ReorderConfig['packing'],
  strategy: Exclude<ReorderConfig['strategy'], 'auto' | undefined>,
): 'prefix' | 'edgeAware' {
  if (packing === 'prefix' || packing === 'edgeAware') return packing;
  return strategy === 'scoreSpread' ? 'edgeAware' : 'prefix';
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
  ): Chunk[] {
    if (chunks.length === 0) return [];
    // Validate input before any filtering/transforms so malformed chunks never
    // bypass validation (for example via minScore) or trigger raw runtime errors.
    validateChunks(chunks);

    let working = chunks;

    // Filter by minimum score
    if (config.minScore !== undefined) {
      working = filterByMinScore(working, config.minScore);
    }

    // Deduplicate
    if (config.deduplicate) {
      working = deduplicateChunks(working, {
        threshold: config.deduplicateThreshold,
        keep: config.deduplicateKeep,
      });
    }

    if (working.length === 0) return [];

    const resolvedStrategy: Exclude<ReorderConfig['strategy'], 'auto' | undefined> =
      config.strategy === 'auto'
        ? resolveAutoStrategy(working, query, config.autoStrategy)
        : config.strategy;

    let scored = scoreChunks(working, config.weights);

    if (config.diversity.enabled) {
      scored = rerankWithDiversity(scored, config.diversity);
    }

    let result: ScoredChunk[];

    const groupField = config.groupBy;
    const shouldGroup =
      groupField !== undefined &&
      !(resolvedStrategy === 'preserveOrder' && groupField === 'sourceId');

    if (shouldGroup && groupField !== undefined) {
      const groups = groupChunks(scored, groupField);
      const ordered = orderGroups(groups);
      const reorderedGroups = ordered.map(
        ([key, group]) =>
          [key, applyStrategy(group, resolvedStrategy, config)] as [string, ScoredChunk[]],
      );
      result = reorderedGroups.flatMap(([, group]) => group);
    } else {
      result = applyStrategy(scored, resolvedStrategy, config);
    }

    let output = result.map((c) => stripInternalFields(c, config.includePriorityScore));
    const packing = resolvePacking(config.packing, resolvedStrategy);

    // Apply token budget after reordering.
    // scoreSpread keeps chunks from both edges to preserve primacy/recency placements.
    if (config.maxTokens !== undefined && config.tokenCounter) {
      output =
        packing === 'edgeAware'
          ? applyTokenBudgetEdgeAware(output, config.maxTokens, config.tokenCounter)
          : applyTokenBudgetPrefix(output, config.maxTokens, config.tokenCounter);
    }

    // Apply topK limit.
    // scoreSpread keeps chunks from both edges to preserve primacy/recency placements.
    if (config.topK !== undefined && output.length > config.topK) {
      output =
        packing === 'edgeAware'
          ? takeFromEdges(output, config.topK)
          : output.slice(0, config.topK);
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

  /** Async reorder with optional reranker integration. */
  async reorder(
    chunks: Chunk[],
    query?: string,
    overrides?: Partial<ReorderConfig>,
  ): Promise<Chunk[]> {
    const config = this.mergeOverrides(overrides);

    if (chunks.length === 0) return [];

    let workingChunks = chunks;

    if (config.reranker && query) {
      try {
        const reranked = await config.reranker.rerank(chunks, query);
        // Validate reranker output early so we can fall back gracefully.
        validateChunks(reranked);
        workingChunks = reranked;
      } catch (error) {
        if (config.onRerankerError) {
          config.onRerankerError(error);
        }
        // Fall back to original scores
      }
    }

    return this.executePipelineWithConfig(workingChunks, config, query);
  }

  /**
   * Streaming reorder. Yields chunks one at a time.
   *
   * **Note:** This method materializes the full result internally before yielding.
   * It does not reduce memory usage or time-to-first-chunk compared to `reorder()`.
   * True incremental streaming is a planned future enhancement for strategies
   * that support it (e.g., `preserveOrder`, `chronological`).
   */
  async *reorderStream(
    chunks: Chunk[],
    query?: string,
    overrides?: Partial<ReorderConfig>,
  ): AsyncIterable<Chunk> {
    // Note: This materializes the full result first, then yields incrementally.
    // True streaming is only possible for strategies that support incremental output.
    const result = await this.reorder(chunks, query, overrides);
    for (const chunk of result) {
      yield chunk;
    }
  }
}
