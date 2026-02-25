// Types
export type {
  Chunk,
  ChunkMetadata,
  ScoredChunk,
  Strategy,
  QueryIntent,
  CustomComparator,
  ScoringWeights,
  AutoStrategyConfig,
  DiversityConfig,
  PackingStrategy,
  ValidationMode,
  ReorderConfig,
  ReorderDiagnostics,
  CoercionStats,
  AbortSignalLike,
  Reranker,
} from './types';

// Core
export { Reorderer } from './reorderer';
export { scoreChunks } from './scorer';
export { validateConfig, mergeConfig } from './config';
export type { MergedReorderConfig } from './config';
export { validateChunks, prepareChunks } from './validator';

// Deduplication
export { deduplicateChunks, trigramSimilarity } from './deduplicator';
export type { DeduplicateOptions } from './deduplicator';

// Serialization
export { serializeChunks, deserializeChunks } from './serializer';

// Evaluation
export {
  keyPointRecall,
  keyPointPrecision,
  spanRecall,
  positionEffectiveness,
  ndcg,
  exactMatch,
  isAnswerable,
  answerabilityMatch,
  tokenF1,
  citationCoverage,
  faithfulness,
  retrievalRecallAtK,
  evaluateAnswerSet,
} from './evaluator';
export type {
  EvalOptions,
  AnswerEvalCase,
  AnswerEvalSummary,
  FaithfulnessOptions,
  CitationCoverageOptions,
} from './evaluator';

// Auto strategy
export { detectQueryIntent, metadataCoverage, resolveAutoStrategy } from './selector';
export type { MetadataCoverage } from './selector';

// Diversity reranking
export { rerankWithDiversity } from './diversity';

// Adapters
export {
  reorderLangChainDocuments,
  reorderLangChainPairs,
  reorderLlamaIndexNodes,
  reorderHaystackDocuments,
} from './adapters';
export type {
  LangChainDocumentLike,
  LlamaIndexNodeLike,
  HaystackDocumentLike,
} from './adapters';

// Errors
export { ValidationError } from './errors';
