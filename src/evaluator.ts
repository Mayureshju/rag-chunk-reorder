import { Chunk, ScoredChunk } from './types';

export interface EvalOptions {
  /** Use case-insensitive substring matching. Defaults to false. */
  caseInsensitive?: boolean;
}

export interface FaithfulnessOptions {
  /** Use case-insensitive matching for token support checks. Defaults to true. */
  caseInsensitive?: boolean;
  /** Filter common stop words from answer tokens. Defaults to true. */
  ignoreStopWords?: boolean;
  /** Minimum token length to include in faithfulness scoring. Defaults to 2. */
  minTokenLength?: number;
}

export interface AnswerEvalCase {
  prediction: string;
  references: string[] | string;
  contexts?: string[];
}

export interface AnswerEvalSummary {
  count: number;
  exactMatch: number;
  f1: number;
  faithfulness?: number;
  perExample: Array<{ exactMatch: number; f1: number; faithfulness?: number }>;
}

const DEFAULT_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'were',
  'will',
  'with',
]);

function normalizeAnswer(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\b(a|an|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeForF1(text: string): string[] {
  const normalized = normalizeAnswer(text);
  return normalized.length === 0 ? [] : normalized.split(' ');
}

function toReferences(references: string[] | string): string[] {
  return Array.isArray(references) ? references : [references];
}

function f1AgainstReference(prediction: string, reference: string): number {
  const predTokens = tokenizeForF1(prediction);
  const refTokens = tokenizeForF1(reference);

  // SQuAD-style no-answer handling: both empty => perfect match.
  if (predTokens.length === 0 && refTokens.length === 0) return 1;
  if (predTokens.length === 0 || refTokens.length === 0) return 0;

  const predCounts = new Map<string, number>();
  const refCounts = new Map<string, number>();

  for (const t of predTokens) predCounts.set(t, (predCounts.get(t) ?? 0) + 1);
  for (const t of refTokens) refCounts.set(t, (refCounts.get(t) ?? 0) + 1);

  let overlap = 0;
  for (const [token, predCount] of predCounts) {
    const refCount = refCounts.get(token) ?? 0;
    overlap += Math.min(predCount, refCount);
  }

  if (overlap === 0) return 0;

  const precision = overlap / predTokens.length;
  const recall = overlap / refTokens.length;
  return (2 * precision * recall) / (precision + recall);
}

function tokenizeForFaithfulness(text: string, options?: FaithfulnessOptions): string[] {
  const caseInsensitive = options?.caseInsensitive ?? true;
  const ignoreStopWords = options?.ignoreStopWords ?? true;
  const minTokenLength = options?.minTokenLength ?? 2;

  const normalized = caseInsensitive ? text.toLowerCase() : text;
  const tokens = normalized.normalize('NFKC').match(/[\p{L}\p{N}]+/gu) ?? [];
  return tokens.filter((t) => {
    if (t.length < minTokenLength) return false;
    if (ignoreStopWords && DEFAULT_STOP_WORDS.has(t.toLowerCase())) return false;
    return true;
  });
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

/**
 * Exact Match (EM) using normalized answer text.
 * Returns 1 for exact match and 0 otherwise. Supports multiple references (best-of).
 */
export function exactMatch(prediction: string, references: string[] | string): number {
  const normalizedPrediction = normalizeAnswer(prediction);
  const refs = toReferences(references);

  for (const reference of refs) {
    if (normalizedPrediction === normalizeAnswer(reference)) return 1;
  }
  return 0;
}

/**
 * Token-level F1 between prediction and references (best-of over references).
 */
export function tokenF1(prediction: string, references: string[] | string): number {
  const refs = toReferences(references);
  let best = 0;
  for (const reference of refs) {
    const f1 = f1AgainstReference(prediction, reference);
    if (f1 > best) best = f1;
  }
  return best;
}

/**
 * Heuristic faithfulness score: fraction of informative answer tokens supported
 * by the provided context texts. Returns value in [0, 1].
 */
export function faithfulness(
  prediction: string,
  contexts: string[],
  options?: FaithfulnessOptions,
): number {
  if (contexts.length === 0) return 0;

  const answerTokens = new Set(tokenizeForFaithfulness(prediction, options));
  if (answerTokens.size === 0) return 0;

  const contextTokens = new Set(tokenizeForFaithfulness(contexts.join(' '), options));
  if (contextTokens.size === 0) return 0;

  let supported = 0;
  for (const token of answerTokens) {
    if (contextTokens.has(token)) supported++;
  }

  return supported / answerTokens.size;
}

/**
 * Evaluate a set of QA outputs with answer-level metrics.
 */
export function evaluateAnswerSet(
  cases: AnswerEvalCase[],
  options?: { faithfulness?: FaithfulnessOptions },
): AnswerEvalSummary {
  if (cases.length === 0) {
    return { count: 0, exactMatch: 0, f1: 0, faithfulness: undefined, perExample: [] };
  }

  const perExample: Array<{ exactMatch: number; f1: number; faithfulness?: number }> = [];
  let emSum = 0;
  let f1Sum = 0;
  let faithfulnessSum = 0;
  let faithfulnessCount = 0;

  for (const item of cases) {
    const em = exactMatch(item.prediction, item.references);
    const f1 = tokenF1(item.prediction, item.references);
    const caseEval: { exactMatch: number; f1: number; faithfulness?: number } = {
      exactMatch: em,
      f1,
    };

    if (item.contexts && item.contexts.length > 0) {
      caseEval.faithfulness = faithfulness(
        item.prediction,
        item.contexts,
        options?.faithfulness,
      );
      faithfulnessSum += caseEval.faithfulness;
      faithfulnessCount++;
    }

    emSum += em;
    f1Sum += f1;
    perExample.push(caseEval);
  }

  return {
    count: cases.length,
    exactMatch: emSum / cases.length,
    f1: f1Sum / cases.length,
    faithfulness: faithfulnessCount > 0 ? faithfulnessSum / faithfulnessCount : undefined,
    perExample,
  };
}
