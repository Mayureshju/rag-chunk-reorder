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
  ReorderExplain,
  ReorderResult,
  CoercionStats,
  AbortSignalLike,
  Reranker,
  RerankerResult,
  ScoreNormalization,
} from './types';
export { isReorderDiagnostics } from './types';

// Core
export { Reorderer } from './reorderer';
export { scoreChunks, scoreChunksWithOptions } from './scorer';
export { validateConfig, mergeConfig } from './config';
export type { MergedReorderConfig } from './config';
export { validateChunks, prepareChunks } from './validator';

// Deduplication
export { deduplicateChunks, deduplicateChunksUnsafe, trigramSimilarity } from './deduplicator';
export type { DeduplicateOptions } from './deduplicator';

// Serialization
export { serializeChunks, serializeChunksSafe, deserializeChunks } from './serializer';
export type { DeserializeChunksOptions } from './serializer';

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
  reorderVercelAIResults,
  reorderLangGraphState,
  reorderVectorStoreResults,
} from './adapters';
export type {
  LangChainDocumentLike,
  LlamaIndexNodeLike,
  HaystackDocumentLike,
  VercelAIResultLike,
  LangGraphStateLike,
  VectorStoreResultLike,
} from './adapters';

// Presets
export { reordererPresets, getPreset } from './presets';
export type { ReordererPresetName } from './presets';

// Token counters
export { tokenCounterFactory, createTiktokenCounter } from './token-counters';
export type { TokenCounter, TokenCounterWithDispose } from './token-counters';

// Observability
export {
  createOtelHooks,
  createMetricsHooks,
} from './observability';

// Pipeline helpers
export {
  reorderForChatHistory,
  reorderForDocsQA,
  reorderForLogs,
} from './pipelines';
export type { DocsQAOverrides, ChatHistoryOverrides, LogsOverrides } from './pipelines';

// External rerankers
export {
  createCohereReranker,
  createVoyageReranker,
  createJinaReranker,
} from './rerankers';
export type {
  CohereRerankerOptions,
  VoyageRerankerOptions,
  JinaRerankerOptions,
} from './rerankers';

// Errors
export { ValidationError, RerankerError } from './errors';
