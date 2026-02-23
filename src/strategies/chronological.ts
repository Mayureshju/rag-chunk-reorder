import { ScoredChunk } from '../types';

function finiteTimestamp(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return value;
}

/**
 * Chronological reordering strategy.
 * Sorts chunks by timestamp ascending. Breaks ties by priorityScore descending.
 * Chunks missing timestamp are placed at the end.
 *
 * Tie-breaking uses `priorityScore` so optional diversity reranking can influence
 * ordering when timestamps are equal.
 */
export function chronological(chunks: ScoredChunk[]): ScoredChunk[] {
  if (chunks.length === 0) return [];

  return [...chunks].sort((a, b) => {
    const tsA = finiteTimestamp(a.metadata?.timestamp);
    const tsB = finiteTimestamp(b.metadata?.timestamp);

    // Chunks missing timestamp go to the end
    if (tsA === undefined && tsB === undefined) return a.originalIndex - b.originalIndex;
    if (tsA === undefined) return 1;
    if (tsB === undefined) return -1;

    // Sort by timestamp ascending
    if (tsA !== tsB) return tsA - tsB;

    // Break ties by priorityScore descending
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;

    // Stable fallback to retrieval score
    if (b.score !== a.score) return b.score - a.score;

    return a.originalIndex - b.originalIndex;
  });
}
