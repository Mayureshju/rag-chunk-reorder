import { Chunk } from './types';

/** Options for chunk deduplication. */
export interface DeduplicateOptions {
  /** Similarity threshold (0–1). Chunks with text similarity above this are considered duplicates. Default: 1.0 (exact match only). */
  threshold?: number;
  /** Strategy for picking the survivor when duplicates are found. Default: 'highestScore'. */
  keep?: 'highestScore' | 'first' | 'last';
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

  if (chunks.length <= 1) return [...chunks];

  // Fast path: exact dedup only
  if (threshold >= 1.0) {
    return deduplicateExact(chunks, keep);
  }

  return deduplicateFuzzy(chunks, threshold, keep);
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
): Chunk[] {
  // Track which indices have been merged into another
  const removed = new Set<number>();
  // Map from survivor index to the survivor chunk (may have been replaced)
  const survivors = new Map<number, Chunk>();

  for (let i = 0; i < chunks.length; i++) {
    survivors.set(i, chunks[i]);
  }

  for (let i = 0; i < chunks.length; i++) {
    if (removed.has(i)) continue;

    for (let j = i + 1; j < chunks.length; j++) {
      if (removed.has(j)) continue;

      const sim = trigramSimilarity(chunks[i].text, chunks[j].text);
      if (sim >= threshold) {
        const survivorChunk = survivors.get(i)!;
        const candidateChunk = survivors.get(j)!;

        if (shouldReplace(survivorChunk, i, candidateChunk, j, keep)) {
          // j wins: replace i's survivor with j's chunk, remove j
          survivors.set(i, candidateChunk);
        }
        // Either way, j is merged into i's cluster
        removed.add(j);
        survivors.delete(j);
      }
    }
  }

  // Return survivors in original order
  return Array.from(survivors.entries())
    .sort(([a], [b]) => a - b)
    .map(([, chunk]) => chunk);
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
