/** Extensible metadata attached to a chunk. Known fields are used by built-in strategies. */
export interface ChunkMetadata {
  /** Unix timestamp or epoch ms for temporal ordering */
  timestamp?: number;
  /** Page number in source document */
  page?: number;
  /** Position/index within the source document */
  sectionIndex?: number;
  /** Optional stable identifier for strict reranker order checks */
  chunkId?: string;
  /** Identifier of the source document */
  sourceId?: string | number | boolean;
  /** Optional source reliability score (0–1 recommended) */
  sourceReliability?: number;
  /** Optional precomputed token count for faster budgeting */
  tokenCount?: number;
  /** Optional reorder explanation when includeExplain is enabled */
  reorderExplain?: ReorderExplain;
  [key: string]: unknown;
}

/** A retrieved passage with text, relevance score, and optional metadata. */
export interface Chunk {
  /** Unique identifier for the chunk */
  id: string;
  /** The passage text content */
  text: string;
  /** Relevance score from retrieval (typically 0–1) */
  score: number;
  /** Optional precomputed token count for budgeting */
  tokenCount?: number;
  /** Optional metadata for scoring and strategy selection */
  metadata?: ChunkMetadata;
}

/** Internal representation with computed priority score and original position. */
export interface ScoredChunk extends Chunk {
  /** Composite score computed from relevance and weighted metadata */
  priorityScore: number;
  /** Position in the original input array, used for stable sorting */
  originalIndex: number;
}

/** Available reordering strategies. */
export type Strategy = 'scoreSpread' | 'preserveOrder' | 'chronological' | 'custom' | 'auto';

/** Validation behavior for inputs. */
export type ValidationMode = 'strict' | 'coerce';

/** Score normalization applied to similarity scores before weighting. */
export type ScoreNormalization = 'none' | 'minMax' | 'zScore' | 'softmax';

/** Query intent used by auto strategy selection. */
export type QueryIntent = 'factoid' | 'narrative' | 'temporal';

/** User-supplied comparison function for the 'custom' strategy. */
export type CustomComparator = (a: Chunk, b: Chunk) => number;

/** Weights for computing the composite priority score. */
export interface ScoringWeights {
  /** Weight for the base relevance score */
  similarity: number;
  /** Weight for the normalized timestamp */
  time: number;
  /** Weight for the normalized section index */
  section: number;
  /** Weight for the normalized source reliability */
  sourceReliability: number;
}

/** Controls automatic strategy selection based on query intent and metadata coverage. */
export interface AutoStrategyConfig {
  /** Minimum timestamp coverage required to use chronological for temporal queries. Default: 0.4 */
  temporalTimestampCoverageThreshold?: number;
  /** Minimum sourceId coverage required to use preserveOrder for narrative queries. Default: 0.4 */
  narrativeSourceCoverageThreshold?: number;
  /** Minimum sectionIndex coverage required to use preserveOrder for narrative queries. Default: 0.3 */
  narrativeSectionCoverageThreshold?: number;
  /** Case-insensitive terms used to detect temporal intent. */
  temporalQueryTerms?: string[];
  /** Case-insensitive terms used to detect narrative intent. */
  narrativeQueryTerms?: string[];
  /** Optional override intent detector. Return undefined to fall back to term matching. */
  intentDetector?: (query: string | undefined) => QueryIntent | undefined;
}

/** Controls diversity-aware reranking before strategy application. */
export interface DiversityConfig {
  /** Enable Maximal Marginal Relevance (MMR)-style diversification. Default: false */
  enabled?: boolean;
  /** Relevance-vs-diversity tradeoff (0–1). Higher keeps more relevance. Default: 0.7 */
  lambda?: number;
  /** Penalize repeatedly selecting same source. Default: 0.15 */
  sourceDiversityWeight?: number;
  /** Metadata field used for source diversity. Default: 'sourceId' */
  sourceField?: string;
  /** Optional cap on candidates to keep diversity reranking bounded. */
  maxCandidates?: number;
}

/** Controls how topK/maxTokens budget constraints are applied after reordering. */
export type PackingStrategy = 'auto' | 'prefix' | 'edgeAware';

/** Configuration for the Reorderer. All fields are optional with sensible defaults. */
export interface AbortSignalLike {
  readonly aborted: boolean;
  readonly reason?: unknown;
  addEventListener(type: 'abort', listener: () => void): void;
  removeEventListener(type: 'abort', listener: () => void): void;
}

export interface ReorderConfig {
  /** Reordering algorithm. Default: 'scoreSpread' */
  strategy?: Strategy;
  /** Chronological order direction when strategy = 'chronological'. Default: 'asc' */
  chronologicalOrder?: 'asc' | 'desc';
  /** Metadata field used by preserveOrder to group chunks. Default: 'sourceId' */
  preserveOrderSourceField?: string;
  /** Weights for priority score computation. Default: { similarity: 1, time: 0, section: 0 } */
  weights?: Partial<ScoringWeights>;
  /** Normalize similarity scores before weighting. Default: 'none' */
  scoreNormalization?: ScoreNormalization;
  /** Temperature for softmax score normalization. Default: 1.0 */
  scoreNormalizationTemperature?: number;
  /** Number of top chunks to place at the start (scoreSpread only) */
  startCount?: number;
  /** Number of top chunks to place at the end (scoreSpread only) */
  endCount?: number;
  /** Metadata field to group chunks by before reordering */
  groupBy?: string;
  /** External reranker to refine scores before reordering */
  reranker?: Reranker;
  /** Max number of concurrent reranker calls (batching). */
  rerankerConcurrency?: number;
  /** Batch size for reranker calls (batching). */
  rerankerBatchSize?: number;
  /** Abort signal for reranker (optional). */
  rerankerAbortSignal?: AbortSignalLike;
  /** Timeout for reranker in milliseconds (optional). */
  rerankerTimeoutMs?: number;
  /** Comparison function for the 'custom' strategy */
  customComparator?: CustomComparator;
  /** Minimum score threshold — chunks below this are dropped before reordering */
  minScore?: number;
  /** Maximum number of tokens in the output context window */
  maxTokens?: number;
  /** Maximum number of characters in the output context window */
  maxChars?: number;
  /** Optional character counter for maxChars budgeting (defaults to text.length) */
  charCounter?: (text: string) => number;
  /** Function to count tokens in a chunk's text. Required when maxTokens is set. */
  tokenCounter?: (text: string) => number;
  /** Optional clamp for chunk scores: [min, max] */
  scoreClamp?: [number, number];
  /** Minimum number of chunks to return even if budgets are tight. */
  minTopK?: number;
  /** Called when the reranker fails. Defaults to no-op. */
  onRerankerError?: (error: unknown) => void;
  /** Validate reranker output length matches input (default: true). */
  validateRerankerOutputLength?: boolean;
  /** Validate reranker output preserves input order when ids are unique (default: true). */
  validateRerankerOutputOrder?: boolean;
  /** Strict index-based reranker order validation using id+text (default: false). */
  validateRerankerOutputOrderByIndex?: boolean;
  /** If true, include priorityScore in output chunk metadata */
  includePriorityScore?: boolean;
  /** Enable deduplication before reordering. When true, exact duplicates are removed. */
  deduplicate?: boolean;
  /** Similarity threshold for fuzzy deduplication (0–1). Default: 1.0 (exact match). Requires deduplicate: true. */
  deduplicateThreshold?: number;
  /** Strategy for picking the survivor when duplicates are found. Default: 'highestScore'. */
  deduplicateKeep?: 'highestScore' | 'first' | 'last';
  /** Bucket size for length-based prefiltering in fuzzy dedup (chars). Optional. */
  deduplicateLengthBucketSize?: number;
  /** Cap comparisons per chunk in fuzzy dedup. Optional. */
  deduplicateMaxCandidates?: number;
  /** Maximum number of chunks to return after reordering. Applied after token budget. */
  topK?: number;
  /** Auto strategy controls. Used when strategy is 'auto'. */
  autoStrategy?: AutoStrategyConfig;
  /** Diversity-aware reranking controls applied before final strategy. */
  diversity?: DiversityConfig;
  /** Budget packing policy used for maxTokens/topK. Default: 'auto'. */
  packing?: PackingStrategy;
  /** Validation mode for inputs. Default: 'strict'. */
  validationMode?: ValidationMode;
  /** Include a per-chunk explanation payload in output metadata. Default: false. */
  includeExplain?: boolean;
  /** Streaming window size for reorderStream when given an iterable. Default: 128. */
  streamingWindowSize?: number;
  /** Structured diagnostics emitted per reorder call. */
  onDiagnostics?: (stats: ReorderDiagnostics) => void;
  /** Optional per-step timing hook (ms). */
  onTraceStep?: (step: TraceStep, ms: number, details?: Record<string, unknown>) => void;
}

/** Diagnostics emitted per reorder call. */
export interface ReorderDiagnostics {
  inputCount: number;
  validatedCount: number;
  coercedScores: number;
  droppedMetadataFields: number;
  droppedMetadataTimestamp: number;
  droppedMetadataSectionIndex: number;
  droppedMetadataSourceId: number;
  droppedMetadataSourceReliability: number;
  dedupStrategyUsed: 'none' | 'exact' | 'fuzzy';
  packingStrategyUsed: 'prefix' | 'edgeAware';
  tokenCountUsed: number;
  cachedTokenCountUsed: number;
  charCountUsed: number;
  budgetUnit: 'none' | 'tokens' | 'chars';
  filteredByMinScore: number;
  dedupRemoved: number;
  rerankerApplied: boolean;
  strategyChosen: Exclude<Strategy, 'auto'>;
  budgetPruned: number;
  outputCount: number;
}

/** Per-chunk explanation payload when includeExplain is enabled. */
export interface ReorderExplain {
  strategy: Exclude<Strategy, 'auto'>;
  placement: string;
  position: number;
  priorityRank?: number;
  priorityScore?: number;
  groupKey?: string;
  groupBy?: string;
  preserveOrderSourceField?: string;
  chronologicalOrder?: 'asc' | 'desc';
  timestamp?: number;
  scoreNormalization?: ScoreNormalization;
  diversityApplied?: boolean;
}

/** Reorder result with diagnostics payload. */
export interface ReorderResult {
  chunks: Chunk[];
  diagnostics: ReorderDiagnostics;
}

/** Interface for external rerankers (e.g., cross-encoder models). */
export interface Reranker {
  /** Refine chunk scores given a query. Returns chunks with updated scores. */
  rerank(
    chunks: Chunk[],
    query: string,
    options?: { signal?: AbortSignalLike },
  ): Promise<RerankerResult>;
}

/** Coercion counters used in diagnostics. */
export interface CoercionStats {
  coercedScores: number;
  droppedMetadataFields: number;
  droppedMetadataTimestamp: number;
  droppedMetadataSectionIndex: number;
  droppedMetadataSourceId: number;
  droppedMetadataSourceReliability: number;
}

export type TraceStep =
  | 'minScore'
  | 'dedup'
  | 'score'
  | 'strategy'
  | 'budget'
  | 'reranker';

export type RerankerResult =
  | Chunk[]
  | { chunks: Chunk[]; scores: number[] };
