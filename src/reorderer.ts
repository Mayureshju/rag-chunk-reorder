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

function stripInternalFields(chunk: ScoredChunk, includePriorityScore?: boolean): Chunk {
  const { priorityScore, originalIndex: _, ...rest } = chunk;
  if (includePriorityScore) {
    return { ...rest, metadata: { ...rest.metadata, priorityScore } };
  }
  return rest;
}

function applyStrategy(chunks: ScoredChunk[], config: ReorderConfig): ScoredChunk[] {
  switch (config.strategy) {
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

function applyTokenBudget(
  chunks: Chunk[],
  maxTokens: number,
  tokenCounter: (text: string) => number,
): Chunk[] {
  const result: Chunk[] = [];
  let totalTokens = 0;
  for (const chunk of chunks) {
    const tokens = tokenCounter(chunk.text);
    if (totalTokens + tokens > maxTokens) break;
    totalTokens += tokens;
    result.push(chunk);
  }
  return result;
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
    this.config = Object.freeze(merged);
  }

  /** Returns a deep copy of the current configuration. */
  getConfig(): ReorderConfig {
    return { ...this.config, weights: { ...this.config.weights } };
  }

  private mergeOverrides(overrides?: Partial<ReorderConfig>): MergedReorderConfig {
    if (!overrides) return this.config as MergedReorderConfig;
    const merged: MergedReorderConfig = {
      ...this.config,
      ...overrides,
      weights: { ...this.config.weights, ...overrides.weights },
    };
    validateConfig(merged);
    return merged;
  }

  private executePipelineWithConfig(chunks: Chunk[], config: MergedReorderConfig): Chunk[] {

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

    validateChunks(working);

    const scored = scoreChunks(working, config.weights);

    let result: ScoredChunk[];

    if (config.groupBy) {
      const groups = groupChunks(scored, config.groupBy);
      const ordered = orderGroups(groups);
      const reorderedGroups = ordered.map(
        ([key, group]) => [key, applyStrategy(group, config)] as [string, ScoredChunk[]],
      );
      result = reorderedGroups.flatMap(([, group]) => group);
    } else {
      result = applyStrategy(scored, config);
    }

    let output = result.map((c) => stripInternalFields(c, config.includePriorityScore));

    // Apply token budget after reordering (drop lowest-priority tail chunks)
    if (config.maxTokens !== undefined && config.tokenCounter) {
      output = applyTokenBudget(output, config.maxTokens, config.tokenCounter);
    }

    // Apply topK limit
    if (config.topK !== undefined && output.length > config.topK) {
      output = output.slice(0, config.topK);
    }

    return output;
  }

  /** Synchronous reorder. Does not support reranker (use `reorder` for that). Throws if reranker is passed via overrides. */
  reorderSync(chunks: Chunk[], overrides?: Partial<ReorderConfig>): Chunk[] {
    if (overrides?.reranker) {
      throw new ValidationError(
        'reranker cannot be used with reorderSync(). Use the async reorder() method instead.',
      );
    }
    return this.executePipelineWithConfig(chunks, this.mergeOverrides(overrides));
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
        workingChunks = await config.reranker.rerank(chunks, query);
      } catch (error) {
        if (config.onRerankerError) {
          config.onRerankerError(error);
        }
        // Fall back to original scores
      }
    }

    return this.executePipelineWithConfig(workingChunks, config);
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
