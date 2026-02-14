import { ScoredChunk } from '../types';

/**
 * Chronological reordering strategy.
 * Sorts chunks by timestamp ascending. Breaks ties by score descending.
 * Chunks missing timestamp are placed at the end.
 *
 * Tie-breaking intentionally uses the raw retrieval `score` rather than the
 * weighted `priorityScore`, since `priorityScore` already incorporates time
 * weighting which is the primary sort key here.
 */
export function chronological(chunks: ScoredChunk[]): ScoredChunk[] {
  if (chunks.length === 0) return [];

  return [...chunks].sort((a, b) => {
    const tsA = a.metadata?.timestamp;
    const tsB = b.metadata?.timestamp;

    // Chunks missing timestamp go to the end
    if (tsA === undefined && tsB === undefined) return a.originalIndex - b.originalIndex;
    if (tsA === undefined) return 1;
    if (tsB === undefined) return -1;

    // Sort by timestamp ascending
    if (tsA !== tsB) return tsA - tsB;

    // Break ties by score descending
    if (b.score !== a.score) return b.score - a.score;

    return a.originalIndex - b.originalIndex;
  });
}
