import { Reorderer } from './reorderer';
import { Chunk, ReorderConfig } from './types';

type PartialConfig = Partial<ReorderConfig>;

function mergeConfigs(base: PartialConfig, overrides?: PartialConfig): ReorderConfig {
  return {
    ...base,
    ...(overrides ?? {}),
    weights: { ...(base.weights ?? {}), ...(overrides?.weights ?? {}) },
    autoStrategy: { ...(base.autoStrategy ?? {}), ...(overrides?.autoStrategy ?? {}) },
    diversity: { ...(base.diversity ?? {}), ...(overrides?.diversity ?? {}) },
  };
}

/**
 * Opinionated helper for chat-style history reordering.
 * Defaults:
 * - scoreSpread with edge-aware packing
 * - coerce validation (tolerant to bad inputs)
 * - small minTopK to avoid empty contexts under tight budgets
 */
export async function reorderForChatHistory(
  chunks: Chunk[],
  query?: string,
  overrides?: PartialConfig,
): Promise<Chunk[]> {
  const base: PartialConfig = {
    strategy: 'scoreSpread',
    packing: 'edgeAware',
    validationMode: 'coerce',
    minTopK: 4,
  };
  const reorderer = new Reorderer(mergeConfigs(base, overrides));
  return reorderer.reorder(chunks, query);
}

/**
 * Opinionated helper for docs QA / knowledge-base style queries.
 * Defaults:
 * - auto strategy (factoid vs narrative vs temporal)
 * - fuzzy dedup to reduce near-duplicates
 * - edge-aware packing to keep strong hits at both edges
 */
export async function reorderForDocsQA(
  chunks: Chunk[],
  query?: string,
  overrides?: PartialConfig,
): Promise<Chunk[]> {
  const base: PartialConfig = {
    strategy: 'auto',
    deduplicate: true,
    deduplicateThreshold: 0.95,
    deduplicateKeep: 'highestScore',
    packing: 'edgeAware',
    validationMode: 'coerce',
    minTopK: 4,
  };
  const reorderer = new Reorderer(mergeConfigs(base, overrides));
  return reorderer.reorder(chunks, query);
}

/**
 * Opinionated helper for logs / time-series / event streams.
 * Defaults:
 * - chronological desc (latest first)
 * - tolerant validation
 */
export async function reorderForLogs(
  chunks: Chunk[],
  query?: string,
  overrides?: PartialConfig,
): Promise<Chunk[]> {
  const base: PartialConfig = {
    strategy: 'chronological',
    chronologicalOrder: 'desc',
    validationMode: 'coerce',
  };
  const reorderer = new Reorderer(mergeConfigs(base, overrides));
  return reorderer.reorder(chunks, query);
}

