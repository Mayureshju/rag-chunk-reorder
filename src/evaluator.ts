import { Chunk, ScoredChunk } from './types';

export interface EvalOptions {
  /** Use case-insensitive substring matching. Defaults to false. */
  caseInsensitive?: boolean;
}

function containsKeyPoint(text: string, keyPoint: string, caseInsensitive: boolean): boolean {
  if (caseInsensitive) {
    return text.toLowerCase().includes(keyPoint.toLowerCase());
  }
  return text.includes(keyPoint);
}

/**
 * Key-point recall: fraction of key points found as substrings in any chunk text.
 */
export function keyPointRecall(
  keyPoints: string[],
  chunkTexts: string[],
  options?: EvalOptions,
): number {
  if (keyPoints.length === 0) return 0;
  const ci = options?.caseInsensitive ?? false;

  const found = keyPoints.filter((kp) =>
    chunkTexts.some((text) => containsKeyPoint(text, kp, ci)),
  );
  return found.length / keyPoints.length;
}

/**
 * Key-point precision: fraction of chunks whose text contains at least one key point.
 */
export function keyPointPrecision(
  keyPoints: string[],
  chunkTexts: string[],
  options?: EvalOptions,
): number {
  if (chunkTexts.length === 0) return 0;
  const ci = options?.caseInsensitive ?? false;

  const matching = chunkTexts.filter((text) =>
    keyPoints.some((kp) => containsKeyPoint(text, kp, ci)),
  );
  return matching.length / chunkTexts.length;
}

/**
 * Position effectiveness: weighted average of priority scores where weights
 * follow a U-shaped curve (higher at first and last positions).
 *
 * Accepts `ScoredChunk[]` directly, or `Chunk[]` from pipeline output when
 * `includePriorityScore` was enabled (reads `metadata.priorityScore`).
 */
export function positionEffectiveness(chunks: ScoredChunk[] | Chunk[]): number {
  const n = chunks.length;
  if (n <= 1) {
    if (n === 0) return 0;
    const c = chunks[0];
    const ps = 'priorityScore' in c
      ? (c as ScoredChunk).priorityScore
      : (c.metadata as Record<string, unknown>)?.priorityScore;
    return typeof ps === 'number' ? ps : 0;
  }

  const mid = (n - 1) / 2;

  let weightedSum = 0;
  let weightSum = 0;

  for (let i = 0; i < n; i++) {
    const c = chunks[i];
    const ps = 'priorityScore' in c && typeof (c as ScoredChunk).priorityScore === 'number'
      ? (c as ScoredChunk).priorityScore
      : typeof (c.metadata as Record<string, unknown>)?.priorityScore === 'number'
        ? (c.metadata as Record<string, unknown>).priorityScore as number
        : 0;
    const weight = ((i - mid) * (i - mid)) / (mid * mid);
    weightedSum += ps * weight;
    weightSum += weight;
  }

  return weightedSum / weightSum;
}

/**
 * Normalized Discounted Cumulative Gain (nDCG).
 * Measures ranking quality by comparing actual ordering against ideal ordering.
 * Scores are used as relevance labels.
 *
 * **Important:** This function assumes non-negative scores (standard in IR).
 * Negative scores can produce nDCG values outside the expected [0, 1] range.
 * Returns 0 when all scores are zero (iDCG = 0).
 */
export function ndcg(scores: number[]): number {
  if (scores.length === 0) return 0;

  const dcg = scores.reduce(
    (sum, score, i) => sum + score / Math.log2(i + 2),
    0,
  );

  const idealScores = [...scores].sort((a, b) => b - a);
  const idcg = idealScores.reduce(
    (sum, score, i) => sum + score / Math.log2(i + 2),
    0,
  );

  if (idcg === 0) return 0;
  return dcg / idcg;
}
