# rag-chunk-reorder

Context-aware chunk reordering for RAG pipelines. Mitigates the **lost-in-the-middle** phenomenon by strategically placing high-relevance passages at the beginning and end of LLM context windows.

## Why?

LLMs pay more attention to the start and end of their context window. When retrieved passages are ordered by relevance score alone, the most important information can end up buried in the middle where it's least likely to influence generation. This library fixes that.

## Install

```bash
npm install rag-chunk-reorder
```

## Quick Start

```typescript
import { Reorderer } from 'rag-chunk-reorder';

const chunks = [
  { id: '1', text: 'Most relevant passage', score: 0.95 },
  { id: '2', text: 'Somewhat relevant', score: 0.72 },
  { id: '3', text: 'Also relevant', score: 0.85 },
  { id: '4', text: 'Less relevant', score: 0.60 },
  { id: '5', text: 'Moderately relevant', score: 0.78 },
];

const reorderer = new Reorderer();
const reordered = reorderer.reorderSync(chunks);
// Result: highest-scoring chunks at positions 0 and N-1 (primacy/recency bias)
```

## Strategies

### ScoreSpread (default)

Interleaves chunks by priority score — highest at the start and end, lowest in the middle. Exploits the U-shaped attention curve of LLMs.

```typescript
const reorderer = new Reorderer({ strategy: 'scoreSpread' });
```

With explicit start/end counts:

```typescript
const reorderer = new Reorderer({
  strategy: 'scoreSpread',
  startCount: 3,  // top 3 chunks at the beginning
  endCount: 2,    // next 2 chunks at the end
});
```

### PreserveOrder (OP-RAG)

Maintains original document order within each source. Groups chunks by `sourceId`, sorts by `sectionIndex` within each group, and orders groups by their highest relevance score.

```typescript
const reorderer = new Reorderer({ strategy: 'preserveOrder' });

const chunks = [
  { id: '1', text: 'Intro', score: 0.9, metadata: { sourceId: 'doc-a', sectionIndex: 0 } },
  { id: '2', text: 'Details', score: 0.7, metadata: { sourceId: 'doc-a', sectionIndex: 2 } },
  { id: '3', text: 'Summary', score: 0.8, metadata: { sourceId: 'doc-b', sectionIndex: 0 } },
];
```

### Chronological

Sorts by timestamp ascending. Ideal for event logs, chat transcripts, and time-series data.

```typescript
const reorderer = new Reorderer({ strategy: 'chronological' });

const chunks = [
  { id: '1', text: 'Event A', score: 0.8, metadata: { timestamp: 1700000000 } },
  { id: '2', text: 'Event B', score: 0.9, metadata: { timestamp: 1700000100 } },
];
```

### Custom

Supply your own comparator for domain-specific ordering.

```typescript
const reorderer = new Reorderer({
  strategy: 'custom',
  customComparator: (a, b) => (b.metadata?.priority as number) - (a.metadata?.priority as number),
});
```

## Configuration

```typescript
const reorderer = new Reorderer({
  // Strategy selection
  strategy: 'scoreSpread',        // 'scoreSpread' | 'preserveOrder' | 'chronological' | 'custom'

  // Scoring weights for priority computation
  weights: {
    similarity: 1.0,              // weight for base relevance score
    time: 0.0,                    // weight for normalized timestamp
    section: 0.0,                 // weight for normalized sectionIndex
  },

  // ScoreSpread options
  startCount: 3,                  // chunks to place at start
  endCount: 2,                    // chunks to place at end

  // Filtering
  minScore: 0.5,                  // drop chunks below this score
  topK: 10,                       // max chunks to return

  // Token budget
  maxTokens: 4096,                // max total tokens in output
  tokenCounter: (text) => text.split(/\s+/).length,  // required when maxTokens is set

  // Deduplication
  deduplicate: true,              // remove duplicate chunks
  deduplicateThreshold: 0.85,     // fuzzy similarity threshold (0-1, default: 1.0 = exact)
  deduplicateKeep: 'highestScore', // 'highestScore' | 'first' | 'last'

  // Grouping
  groupBy: 'sourceId',            // group chunks by this metadata field

  // Reranker (async only)
  reranker: myReranker,           // external cross-encoder reranker
  onRerankerError: (err) => console.warn('Reranker failed:', err),

  // Debug
  includePriorityScore: true,     // include computed priorityScore in output metadata
});
```

## Per-Call Overrides

Override config on individual calls without mutating the instance:

```typescript
const reorderer = new Reorderer({ strategy: 'scoreSpread' });

// Use chronological for this one call
const result = reorderer.reorderSync(chunks, { strategy: 'chronological' });

// Instance config is unchanged
reorderer.getConfig().strategy; // 'scoreSpread'
```

## Async Reorder with Reranker

```typescript
import { Reorderer, Reranker } from 'rag-chunk-reorder';

const reranker: Reranker = {
  async rerank(chunks, query) {
    // Call your cross-encoder model here
    const reranked = await myCrossEncoder.rerank(chunks, query);
    return reranked.map((c, i) => ({ ...c, score: reranked[i].score }));
  },
};

const reorderer = new Reorderer({
  reranker,
  onRerankerError: (err) => console.warn('Reranker failed, using original scores:', err),
});

const result = await reorderer.reorder(chunks, 'What is the capital of France?');
```

If the reranker throws, the library falls back to original scores and calls `onRerankerError`.

## Streaming

```typescript
for await (const chunk of reorderer.reorderStream(chunks, 'my query')) {
  process.stdout.write(chunk.text);
}
```

> **Note:** The current streaming implementation materializes the full result before yielding. True incremental streaming is planned for a future release.

## Deduplication

Remove exact or near-duplicate chunks before reordering:

```typescript
import { deduplicateChunks, trigramSimilarity } from 'rag-chunk-reorder';

// Exact dedup
const unique = deduplicateChunks(chunks);

// Fuzzy dedup (trigram Jaccard similarity)
const fuzzyUnique = deduplicateChunks(chunks, {
  threshold: 0.85,
  keep: 'highestScore',
});

// Check similarity between two texts
const sim = trigramSimilarity('hello world foo', 'hello world bar'); // ~0.6
```

Fuzzy dedup uses O(n²) pairwise comparison. For arrays > 500 chunks, consider exact dedup or pre-filtering.

## Serialization

```typescript
import { serializeChunks, deserializeChunks } from 'rag-chunk-reorder';

const json = serializeChunks(chunks);
const restored = deserializeChunks(json);
// Round-trip: deserialize(serialize(chunks)) ≡ chunks
```

## Evaluation Metrics

```typescript
import {
  keyPointRecall,
  keyPointPrecision,
  positionEffectiveness,
  ndcg,
} from 'rag-chunk-reorder';

const keyPoints = ['capital of France', 'Paris', 'Eiffel Tower'];
const texts = reordered.map((c) => c.text);

// What fraction of key points appear in the chunks?
const recall = keyPointRecall(keyPoints, texts);

// What fraction of chunks contain at least one key point?
const precision = keyPointPrecision(keyPoints, texts);

// Case-insensitive matching
const ciRecall = keyPointRecall(keyPoints, texts, { caseInsensitive: true });

// Are high-scoring chunks at the start and end? (U-shaped weighting)
const posEff = positionEffectiveness(scoredChunks);

// Ranking quality (nDCG) — scores must be non-negative
const rankQuality = ndcg(reordered.map((c) => c.score));
```

## Pipeline Order

The reordering pipeline processes chunks in this order:

1. **minScore filter** — drop chunks below threshold
2. **Deduplicate** — remove exact/fuzzy duplicates
3. **Validate** — check required fields (id, text, score)
4. **Score** — compute priorityScore from weights + metadata
5. **Group** (optional) — partition by metadata field
6. **Strategy** — apply reordering algorithm
7. **Strip internals** — remove priorityScore/originalIndex
8. **Token budget** — trim to fit context window
9. **topK** — limit output count

## API Reference

### `Reorderer`

```typescript
class Reorderer {
  constructor(config?: ReorderConfig);
  reorderSync(chunks: Chunk[], overrides?: Partial<ReorderConfig>): Chunk[];
  reorder(chunks: Chunk[], query?: string, overrides?: Partial<ReorderConfig>): Promise<Chunk[]>;
  reorderStream(chunks: Chunk[], query?: string, overrides?: Partial<ReorderConfig>): AsyncIterable<Chunk>;
  getConfig(): ReorderConfig;
}
```

### Standalone Functions

| Function | Description |
|----------|-------------|
| `scoreChunks(chunks, weights)` | Compute priority scores |
| `validateChunks(chunks)` | Validate chunk array |
| `validateConfig(config)` | Validate configuration |
| `mergeConfig(config)` | Merge with defaults |
| `deduplicateChunks(chunks, options?)` | Remove duplicates |
| `trigramSimilarity(a, b)` | Trigram Jaccard similarity |
| `serializeChunks(chunks)` | Serialize to JSON |
| `deserializeChunks(json)` | Deserialize from JSON |
| `keyPointRecall(keyPoints, texts, options?)` | Key-point recall metric |
| `keyPointPrecision(keyPoints, texts, options?)` | Key-point precision metric |
| `positionEffectiveness(chunks)` | Position effectiveness score |
| `ndcg(scores)` | Normalized DCG |

### Types

```typescript
interface Chunk {
  id: string;
  text: string;
  score: number;
  metadata?: ChunkMetadata;
}

interface ChunkMetadata {
  timestamp?: number;
  page?: number;
  sectionIndex?: number;
  sourceId?: string;
  [key: string]: unknown;
}

interface Reranker {
  rerank(chunks: Chunk[], query: string): Promise<Chunk[]>;
}
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0 (for type definitions)

## License

MIT
