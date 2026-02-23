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

  const normalizedRelevance = normalize01(chunks.map((c) => c.priorityScore));

  const remaining = new Set<number>();
  for (let i = 0; i < chunks.length; i++) remaining.add(i);

  const selected: number[] = [];
  const selectedSourceCounts = new Map<string, number>();

  while (remaining.size > 0) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (const idx of remaining) {
      const candidate = chunks[idx];
      const relevance = normalizedRelevance[idx];

      let maxSimilarity = 0;
      for (const selectedIdx of selected) {
        const sim = trigramSimilarity(candidate.text, chunks[selectedIdx].text);
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
        if (candidate.originalIndex < chunks[bestIdx].originalIndex) {
          bestIdx = idx;
        }
      }
    }

    if (bestIdx === -1) break;

    remaining.delete(bestIdx);
    selected.push(bestIdx);

    const chosen = chunks[bestIdx];
    const sKey = sourceKey(chosen, sourceField);
    selectedSourceCounts.set(sKey, (selectedSourceCounts.get(sKey) ?? 0) + 1);
  }

  // Re-encode the diversity order into priorityScore so downstream strategies
  // can use the improved ranking without API changes.
  const n = selected.length;
  return selected.map((idx, rank) => ({
    ...chunks[idx],
    priorityScore: n - rank + chunks[idx].priorityScore * 1e-6,
  }));
}
