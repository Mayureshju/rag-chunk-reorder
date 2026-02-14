import { ScoredChunk } from '../types';

/**
 * PreserveOrder reordering strategy (OP-RAG).
 * Groups chunks by sourceId and sorts within each group by sectionIndex ascending.
 * Groups are ordered by their highest priorityScore (most relevant document first).
 * Falls back to originalIndex when sectionIndex is missing.
 */
export function preserveOrder(chunks: ScoredChunk[]): ScoredChunk[] {
  if (chunks.length === 0) return [];

  // Group by sourceId
  const groups = new Map<string, ScoredChunk[]>();
  for (const chunk of chunks) {
    const sourceId = chunk.metadata?.sourceId ?? '';
    if (!groups.has(sourceId)) groups.set(sourceId, []);
    groups.get(sourceId)!.push(chunk);
  }

  // Sort within each group by sectionIndex (fallback to originalIndex)
  for (const [, group] of groups) {
    group.sort((a, b) => {
      const secA = a.metadata?.sectionIndex ?? a.originalIndex;
      const secB = b.metadata?.sectionIndex ?? b.originalIndex;
      if (secA !== secB) return secA - secB;
      return a.originalIndex - b.originalIndex;
    });
  }

  // Order groups by highest score in each group (most relevant document first)
  const orderedGroups = Array.from(groups.entries());
  const groupMaxScores = new Map<string, number>();
  for (const [key, group] of orderedGroups) {
    let max = -Infinity;
    for (const c of group) {
      if (c.priorityScore > max) max = c.priorityScore;
    }
    groupMaxScores.set(key, max);
  }
  orderedGroups.sort((a, b) => groupMaxScores.get(b[0])! - groupMaxScores.get(a[0])!);

  return orderedGroups.flatMap(([, group]) => group);
}
