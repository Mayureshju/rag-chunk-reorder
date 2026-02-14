import { CustomComparator, ScoredChunk } from '../types';

/**
 * Custom comparator reordering strategy.
 * Sorts chunks using a user-provided comparison function.
 */
export function customSort(chunks: ScoredChunk[], comparator: CustomComparator): ScoredChunk[] {
  if (chunks.length === 0) return [];
  return [...chunks].sort(comparator);
}
