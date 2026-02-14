import { ScoredChunk } from '../types';

function stableSort(chunks: ScoredChunk[]): ScoredChunk[] {
  return [...chunks].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    return a.originalIndex - b.originalIndex;
  });
}

/**
 * ScoreSpread reordering strategy.
 * Interleaves chunks by priority score, placing highest-scoring chunks at the
 * beginning and end of the output to exploit LLM primacy/recency bias.
 *
 * With startCount/endCount: places top N at start, next M at end, rest in middle.
 * If startCount + endCount >= chunk count, falls back to full interleave mode.
 * Without: full alternating interleave (rank 0→pos 0, rank 1→pos N-1, rank 2→pos 1, ...).
 */
export function scoreSpread(
  chunks: ScoredChunk[],
  startCount?: number,
  endCount?: number,
): ScoredChunk[] {
  if (chunks.length === 0) return [];

  const sorted = stableSort(chunks);

  if (startCount !== undefined && endCount !== undefined) {
    return scoreSpreadWithCounts(sorted, startCount, endCount);
  }

  return scoreSpreadInterleave(sorted);
}

function scoreSpreadInterleave(sorted: ScoredChunk[]): ScoredChunk[] {
  const result: ScoredChunk[] = new Array(sorted.length);
  let front = 0;
  let back = sorted.length - 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i % 2 === 0) {
      result[front++] = sorted[i];
    } else {
      result[back--] = sorted[i];
    }
  }

  return result;
}

function scoreSpreadWithCounts(
  sorted: ScoredChunk[],
  startCount: number,
  endCount: number,
): ScoredChunk[] {
  const n = sorted.length;

  if (startCount + endCount >= n) {
    return scoreSpreadInterleave(sorted);
  }

  const startChunks = sorted.slice(0, startCount);
  const endChunks = sorted.slice(startCount, startCount + endCount);
  const middleChunks = sorted.slice(startCount + endCount);

  return [...startChunks, ...middleChunks, ...endChunks];
}
