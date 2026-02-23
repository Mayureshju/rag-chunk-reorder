import { ScoredChunk } from './types';

const DEFAULT_GROUP = '__default__';

function resolveDefaultGroupKey(chunks: ScoredChunk[], groupByField: string): string {
  const presentKeys = new Set<string>();

  for (const chunk of chunks) {
    const value = chunk.metadata?.[groupByField];
    if (value !== undefined && value !== null) {
      presentKeys.add(String(value));
    }
  }

  if (!presentKeys.has(DEFAULT_GROUP)) return DEFAULT_GROUP;

  let suffix = 1;
  let candidate = `${DEFAULT_GROUP}#${suffix}`;
  while (presentKeys.has(candidate)) {
    suffix++;
    candidate = `${DEFAULT_GROUP}#${suffix}`;
  }
  return candidate;
}

/**
 * Partition chunks into groups by a metadata field value.
 * Chunks missing the field are placed into a default group key.
 * If '__default__' already exists as a real metadata value, a suffixed key
 * such as '__default__#1' is used to avoid collisions.
 */
export function groupChunks(
  chunks: ScoredChunk[],
  groupByField: string,
): Map<string, ScoredChunk[]> {
  const groups = new Map<string, ScoredChunk[]>();
  const defaultGroupKey = resolveDefaultGroupKey(chunks, groupByField);

  for (const chunk of chunks) {
    const value = chunk.metadata?.[groupByField];
    const key = value !== undefined && value !== null ? String(value) : defaultGroupKey;

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
