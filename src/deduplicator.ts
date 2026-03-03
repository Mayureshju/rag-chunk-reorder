import { Chunk, ValidationMode } from './types';
import { ValidationError } from './errors';
import { prepareChunks } from './validator';

/** Options for chunk deduplication. */
export interface DeduplicateOptions {
  /** Similarity threshold (0–1). Chunks with text similarity above this are considered duplicates. Default: 1.0 (exact match only). */
  threshold?: number;
  /** Strategy for picking the survivor when duplicates are found. Default: 'highestScore'. */
  keep?: 'highestScore' | 'first' | 'last';
  /** Validation behavior when used as a direct API. Default: 'strict'. */
  validationMode?: ValidationMode;
  /** Optional length bucket size (chars) to prefilter fuzzy comparisons. */
  lengthBucketSize?: number;
  /** Optional cap on comparisons per chunk in fuzzy mode. */
  maxCandidates?: number;
}

/**
 * Compute Jaccard similarity between two strings based on character trigrams.
 * Returns a value in [0, 1] where 1 means identical trigram sets.
 *
 * **Note:** Strings shorter than 3 characters produce no trigrams. When comparing
 * a short string (< 3 chars) against a longer one, the result is always 0 — even
 * if the short string is a substring of the longer one. For short-text similarity,
 * consider exact or substring matching instead.
 */
export function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 3 && b.length < 3) return a === b ? 1 : 0;

  const trigramsA = buildTrigrams(a);
  const trigramsB = buildTrigrams(b);

  if (trigramsA.size === 0 && trigramsB.size === 0) return a === b ? 1 : 0;
  if (trigramsA.size === 0 || trigramsB.size === 0) return 0;

  let intersection = 0;
  for (const tri of trigramsA) {
    if (trigramsB.has(tri)) intersection++;
  }

  const union = trigramsA.size + trigramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function buildTrigrams(text: string): Set<string> {
  const trigrams = new Set<string>();
  for (let i = 0; i <= text.length - 3; i++) {
    trigrams.add(text.substring(i, i + 3));
  }
  return trigrams;
}

/**
 * Remove duplicate or near-duplicate chunks from an array.
 *
 * At threshold 1.0 (default), only exact text matches are removed (O(n) via Map).
 * At lower thresholds, fuzzy matching via trigram Jaccard similarity is used.
 * **Note:** Fuzzy deduplication is O(n²) — for large chunk arrays (>500), consider
 * pre-filtering or using exact dedup only.
 *
 * **Clustering behavior:** Fuzzy dedup uses single-pass greedy clustering. Each chunk
 * is compared against earlier surviving clusters in order. A chunk is merged into the
 * first cluster it matches (similarity ≥ threshold). This means transitive duplicates
 * may not be fully collapsed — if A≈B and B≈C but A≉C, B merges into A's cluster
 * while C remains separate.
 *
 * When duplicates are found, the survivor is chosen based on the `keep` option:
 * - 'highestScore' (default): keep the chunk with the highest relevance score
 * - 'first': keep the first occurrence in the input array
 * - 'last': keep the last occurrence in the input array
 */
export function deduplicateChunks(chunks: Chunk[], options?: DeduplicateOptions): Chunk[] {
  const threshold = options?.threshold ?? 1.0;
  const keep = options?.keep ?? 'highestScore';
  const lengthBucketSize = options?.lengthBucketSize;
  const maxCandidates = options?.maxCandidates;

  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new ValidationError('deduplicateThreshold must be a number between 0 and 1');
  }
  if (keep !== 'highestScore' && keep !== 'first' && keep !== 'last') {
    throw new ValidationError(
      `Invalid deduplicateKeep '${keep}'. Valid values: highestScore, first, last`,
    );
  }
  if (lengthBucketSize !== undefined) {
    if (
      typeof lengthBucketSize !== 'number' ||
      !Number.isFinite(lengthBucketSize) ||
      !Number.isInteger(lengthBucketSize) ||
      lengthBucketSize < 1
    ) {
      throw new ValidationError('lengthBucketSize must be a positive integer');
    }
  }
  if (maxCandidates !== undefined) {
    if (
      typeof maxCandidates !== 'number' ||
      !Number.isFinite(maxCandidates) ||
      !Number.isInteger(maxCandidates) ||
      maxCandidates < 1
    ) {
      throw new ValidationError('maxCandidates must be a positive integer');
    }
  }

  let working: Chunk[];
  try {
    working = prepareChunks(chunks, options?.validationMode ?? 'strict');
  } catch (error) {
    throw new ValidationError(
      `Invalid chunks supplied to deduplicateChunks: ${(error as Error).message}`,
    );
  }

  if (working.length <= 1) return [...working];

  // Fast path: exact dedup only
  if (threshold >= 1.0) {
    return deduplicateExact(working, keep);
  }

  return deduplicateFuzzy(working, threshold, keep, lengthBucketSize, maxCandidates);
}

/**
 * Legacy permissive deduplication (coerce mode).
 * Keeps backward-compatible behavior for callers that relied on non-strict inputs.
 */
export function deduplicateChunksUnsafe(chunks: Chunk[], options?: DeduplicateOptions): Chunk[] {
  const validationMode = options?.validationMode ?? 'coerce';
  return deduplicateChunks(chunks, { ...options, validationMode });
}

function deduplicateExact(chunks: Chunk[], keep: 'highestScore' | 'first' | 'last'): Chunk[] {
  const seen = new Map<string, { chunk: Chunk; index: number }>();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const existing = seen.get(chunk.text);

    if (!existing) {
      seen.set(chunk.text, { chunk, index: i });
      continue;
    }

    // Decide which to keep
    if (shouldReplace(existing.chunk, existing.index, chunk, i, keep)) {
      seen.set(chunk.text, { chunk, index: i });
    }
  }

  // Preserve relative order of survivors
  return Array.from(seen.values())
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.chunk);
}

function deduplicateFuzzy(
  chunks: Chunk[],
  threshold: number,
  keep: 'highestScore' | 'first' | 'last',
  lengthBucketSize?: number,
  maxCandidates?: number,
): Chunk[] {
  // Track which indices have been merged into another
  const removed = new Set<number>();
  // Map from survivor anchor index to selected survivor payload.
  // orderIndex tracks the true index of the currently selected survivor.
  const survivors = new Map<number, { chunk: Chunk; orderIndex: number }>();

  for (let i = 0; i < chunks.length; i++) {
    survivors.set(i, { chunk: chunks[i], orderIndex: i });
  }

  const buckets =
    lengthBucketSize && lengthBucketSize > 0
      ? chunks.map((c) => Math.floor(c.text.length / lengthBucketSize))
      : [];

  for (let i = 0; i < chunks.length; i++) {
    if (removed.has(i)) continue;
    let comparisons = 0;

    for (let j = i + 1; j < chunks.length; j++) {
      if (removed.has(j)) continue;
      if (lengthBucketSize && lengthBucketSize > 0) {
        const bi = buckets[i];
        const bj = buckets[j];
        if (Math.abs(bi - bj) > 1) continue;
      }
      if (maxCandidates !== undefined) {
        if (comparisons >= maxCandidates) break;
      }

      const sim = trigramSimilarity(chunks[i].text, chunks[j].text);
      comparisons++;
      if (sim >= threshold) {
        const survivor = survivors.get(i)!;
        const candidate = survivors.get(j)!;

        if (
          shouldReplace(
            survivor.chunk,
            survivor.orderIndex,
            candidate.chunk,
            candidate.orderIndex,
            keep,
          )
        ) {
          // j wins: replace i's survivor with j's chunk, remove j
          survivors.set(i, candidate);
        }
        // Either way, j is merged into i's cluster
        removed.add(j);
        survivors.delete(j);
      }
    }
  }

  // Return survivors in original order
  return Array.from(survivors.values())
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((entry) => entry.chunk);
}

function shouldReplace(
  existing: Chunk,
  existingIndex: number,
  candidate: Chunk,
  candidateIndex: number,
  keep: 'highestScore' | 'first' | 'last',
): boolean {
  switch (keep) {
    case 'highestScore':
      return candidate.score > existing.score;
    case 'first':
      return candidateIndex < existingIndex;
    case 'last':
      return candidateIndex > existingIndex;
  }
}
