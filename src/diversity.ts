import { trigramSimilarity } from './deduplicator';
import { DiversityConfig, ScoredChunk } from './types';

function normalize01(values: number[]): number[] {
  if (values.length === 0) return [];
  let min = values[0];
  let max = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] < min) min = values[i];
    if (values[i] > max) max = values[i];
  }
  if (max === min) return values.map(() => 1);
  return values.map((v) => (v - min) / (max - min));
}

function sourceKey(chunk: ScoredChunk, sourceField: string): string {
  const value = chunk.metadata?.[sourceField];
  if (value === undefined || value === null) return '__unknown__';
  return String(value);
}

/**
 * Apply MMR-style diversification and return chunks ordered by diversity-aware priority.
 * All chunks are retained; only ranking is changed.
 */
export function rerankWithDiversity(chunks: ScoredChunk[], config: DiversityConfig): ScoredChunk[] {
  if (!config.enabled || chunks.length <= 1) return chunks;

  const lambda = config.lambda ?? 0.7;
  const sourceWeight = config.sourceDiversityWeight ?? 0.15;
  const sourceField = config.sourceField ?? 'sourceId';
  const maxCandidates = config.maxCandidates ?? chunks.length;

  const indexed = chunks.map((chunk, index) => ({ chunk, index }));
  indexed.sort((a, b) => {
    if (b.chunk.priorityScore !== a.chunk.priorityScore) {
      return b.chunk.priorityScore - a.chunk.priorityScore;
    }
    return a.chunk.originalIndex - b.chunk.originalIndex;
  });
  const top = maxCandidates < indexed.length ? indexed.slice(0, maxCandidates) : indexed;
  const topSet = new Set(top.map((item) => item.index));
  const tail = maxCandidates < indexed.length
    ? chunks.filter((_, idx) => !topSet.has(idx))
    : [];
  const working = top.map((item) => item.chunk);

  const normalizedRelevance = normalize01(working.map((c) => c.priorityScore));

  const remaining = new Set<number>();
  for (let i = 0; i < working.length; i++) remaining.add(i);

  const selected: number[] = [];
  const selectedSourceCounts = new Map<string, number>();
  const similarityCache = new Map<string, number>();

  const getSimilarity = (a: number, b: number): number => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    const cached = similarityCache.get(key);
    if (cached !== undefined) return cached;
    const sim = trigramSimilarity(working[a].text, working[b].text);
    similarityCache.set(key, sim);
    return sim;
  };

  while (remaining.size > 0) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (const idx of remaining) {
      const candidate = working[idx];
      const relevance = normalizedRelevance[idx];

      let maxSimilarity = 0;
      for (const selectedIdx of selected) {
        const sim = getSimilarity(idx, selectedIdx);
        if (sim > maxSimilarity) maxSimilarity = sim;
      }

      const sKey = sourceKey(candidate, sourceField);
      const selectedFromSource = selectedSourceCounts.get(sKey) ?? 0;
      const score =
        lambda * relevance -
        (1 - lambda) * maxSimilarity -
        sourceWeight * selectedFromSource;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      } else if (score === bestScore && bestIdx !== -1) {
        if (candidate.originalIndex < working[bestIdx].originalIndex) {
          bestIdx = idx;
        }
      }
    }

    if (bestIdx === -1) break;

    remaining.delete(bestIdx);
    selected.push(bestIdx);

    const chosen = working[bestIdx];
    const sKey = sourceKey(chosen, sourceField);
    selectedSourceCounts.set(sKey, (selectedSourceCounts.get(sKey) ?? 0) + 1);
  }

  // Re-encode the diversity order into priorityScore so downstream strategies
  // can use the improved ranking without API changes.
  const n = selected.length;
  const reranked = selected.map((idx, rank) => ({
    ...working[idx],
    priorityScore: n - rank + working[idx].priorityScore * 1e-6,
  }));

  return tail.length > 0 ? [...reranked, ...tail] : reranked;
}
