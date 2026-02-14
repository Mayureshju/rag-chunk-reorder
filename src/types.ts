/** Extensible metadata attached to a chunk. Known fields are used by built-in strategies. */
export interface ChunkMetadata {
  /** Unix timestamp or epoch ms for temporal ordering */
  timestamp?: number;
  /** Page number in source document */
  page?: number;
  /** Position/index within the source document */
  sectionIndex?: number;
  /** Identifier of the source document */
  sourceId?: string;
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
export type Strategy = 'scoreSpread' | 'preserveOrder' | 'chronological' | 'custom';

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
}

/** Configuration for the Reorderer. All fields are optional with sensible defaults. */
export interface ReorderConfig {
  /** Reordering algorithm. Default: 'scoreSpread' */
  strategy?: Strategy;
  /** Weights for priority score computation. Default: { similarity: 1, time: 0, section: 0 } */
  weights?: Partial<ScoringWeights>;
  /** Number of top chunks to place at the start (scoreSpread only) */
  startCount?: number;
  /** Number of top chunks to place at the end (scoreSpread only) */
  endCount?: number;
  /** Metadata field to group chunks by before reordering */
  groupBy?: string;
  /** External reranker to refine scores before reordering */
  reranker?: Reranker;
  /** Comparison function for the 'custom' strategy */
  customComparator?: CustomComparator;
  /** Minimum score threshold — chunks below this are dropped before reordering */
  minScore?: number;
  /** Maximum number of tokens in the output context window */
  maxTokens?: number;
  /** Function to count tokens in a chunk's text. Required when maxTokens is set. */
  tokenCounter?: (text: string) => number;
  /** Called when the reranker fails. Defaults to no-op. */
  onRerankerError?: (error: unknown) => void;
  /** If true, include priorityScore in output chunk metadata */
  includePriorityScore?: boolean;
  /** Enable deduplication before reordering. When true, exact duplicates are removed. */
  deduplicate?: boolean;
  /** Similarity threshold for fuzzy deduplication (0–1). Default: 1.0 (exact match). Requires deduplicate: true. */
  deduplicateThreshold?: number;
  /** Strategy for picking the survivor when duplicates are found. Default: 'highestScore'. */
  deduplicateKeep?: 'highestScore' | 'first' | 'last';
  /** Maximum number of chunks to return after reordering. Applied after token budget. */
  topK?: number;
}

/** Interface for external rerankers (e.g., cross-encoder models). */
export interface Reranker {
  /** Refine chunk scores given a query. Returns chunks with updated scores. */
  rerank(chunks: Chunk[], query: string): Promise<Chunk[]>;
}
