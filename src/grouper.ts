import { ScoredChunk } from './types';

const DEFAULT_GROUP = '__default__';

/**
 * Partition chunks into groups by a metadata field value.
 * Chunks missing the field are placed into a '__default__' group.
 */
export function groupChunks(
  chunks: ScoredChunk[],
  groupByField: string,
): Map<string, ScoredChunk[]> {
  const groups = new Map<string, ScoredChunk[]>();

  for (const chunk of chunks) {
    const value = chunk.metadata?.[groupByField];
    const key = value !== undefined && value !== null ? String(value) : DEFAULT_GROUP;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(chunk);
  }

  return groups;
}

/**
 * Order groups by the highest priorityScore in each group (descending).
 * Returns an ordered array of [groupKey, chunks] tuples.
 */
export function orderGroups(
  groups: Map<string, ScoredChunk[]>,
): [string, ScoredChunk[]][] {
  const entries = Array.from(groups.entries());

  const maxScores = new Map<string, number>();
  for (const [key, chunks] of entries) {
    let max = -Infinity;
    for (const c of chunks) {
      if (c.priorityScore > max) max = c.priorityScore;
    }
    maxScores.set(key, max);
  }

  return entries.sort((a, b) => maxScores.get(b[0])! - maxScores.get(a[0])!);
}
