// Types
export type {
  Chunk,
  ChunkMetadata,
  ScoredChunk,
  Strategy,
  CustomComparator,
  ScoringWeights,
  ReorderConfig,
  Reranker,
} from './types';

// Core
export { Reorderer } from './reorderer';
export { scoreChunks } from './scorer';
export { validateConfig, mergeConfig } from './config';
export type { MergedReorderConfig } from './config';
export { validateChunks } from './validator';

// Deduplication
export { deduplicateChunks, trigramSimilarity } from './deduplicator';
export type { DeduplicateOptions } from './deduplicator';

// Serialization
export { serializeChunks, deserializeChunks } from './serializer';

// Evaluation
export {
  keyPointRecall,
  keyPointPrecision,
  positionEffectiveness,
  ndcg,
} from './evaluator';
export type { EvalOptions } from './evaluator';

// Errors
export { ValidationError } from './errors';
