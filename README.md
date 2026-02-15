# rag-chunk-reorder

<p align="center">
  <a href="https://www.npmjs.com/package/rag-chunk-reorder">
    <img src="https://img.shields.io/npm/v/rag-chunk-reorder.svg" alt="npm version">
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
  </a>
  <a href="https://github.com/Mayureshju/rag-chunk-reorder/actions">
    <img src="https://github.com/Mayureshju/rag-chunk-reorder/workflows/Test/badge.svg" alt="Tests">
  </a>
</p>

Context-aware chunk reordering for RAG pipelines. Mitigates the **lost-in-the-middle** phenomenon by strategically placing high-relevance passages at the beginning and end of LLM context windows.

📖 **[Interactive Documentation & Live Demo](https://resonant-parfait-d49e6a.netlify.app)** — visual explanations, strategy comparisons, and a live reordering playground.

---

## Table of Contents

- [Why?](#why)
- [The Lost-in-the-Middle Problem](#the-lost-in-the-middle-problem)
- [How It Works](#how-it-works)
- [Install](#install)
- [Quick Start](#quick-start)
- [Strategies](#strategies)
- [Configuration](#configuration)
- [Advanced Usage](#advanced-usage)
- [API Reference](#api-reference)
- [Evaluation Metrics](#evaluation-metrics)
- [Performance Considerations](#performance-considerations)
- [Best Practices](#best-practices)
- [Requirements](#requirements)
- [License](#license)

---

## Why?

Large Language Models (LLMs) don't process all information equally. Research shows that:

- **Position Bias**: Models tend to prioritize information at the beginning (primacy) and end (recency) of their context
- **U-Shaped Attention**: Attention scores follow a U-curve — highest at extremes, lowest in the middle
- **Lost-in-the-Middle**: When chunks are ordered by relevance score alone, critical information can get buried in positions 3-8 where it's least likely to influence generation

This library solves this by reordering retrieved chunks to maximize the visibility of high-relevance content.

---

## The Lost-in-the-Middle Problem

When using retrieval-augmented generation (RAG), you typically:

1. **Retrieve** chunks from a vector database using semantic similarity
2. **Rank** them by relevance score
3. **Concatenate** the top-K chunks into the LLM context

The problem: vector databases return results sorted by similarity score, but this ordering doesn't account for how LLMs process context.

### Example

```
Retrieved (by similarity score):
┌─────────────────────────────────────────────────────────────┐
│ Position 0  │ "Introduction to Python"        (score: 0.95)│
│ Position 1  │ "Variables and Data Types"       (score: 0.92)│
│ Position 2  │ "Control Flow: If/Else"          (score: 0.89)│
│ Position 3  │ "Functions and Parameters"        (score: 0.87)│ ← BURIED!
│ Position 4  │ "Error Handling"                  (score: 0.85)│ ← BURIED!
│ Position 5  │ "Classes and Objects"             (score: 0.83)│ ← BURIED!
│ Position 6  │ "File I/O Operations"             (score: 0.80)│
│ Position 7  │ "Working with Modules"            (score: 0.78)│
└─────────────────────────────────────────────────────────────┘

After Reordering (scoreSpread strategy):
┌─────────────────────────────────────────────────────────────┐
│ Position 0  │ "Introduction to Python"        (score: 0.95)│ ← HIGH VISIBILITY
│ Position 1  │ "Variables and Data Types"       (score: 0.92)│ ← HIGH VISIBILITY
│ Position 2  │ "File I/O Operations"            (score: 0.80)│
│ Position 3  │ "Working with Modules"           (score: 0.78)│
│ Position 4  │ "Control Flow: If/Else"          (score: 0.89)│
│ Position 5  │ "Functions and Parameters"       (score: 0.87)│
│ Position 6  │ "Error Handling"                 (score: 0.85)│
│ Position 7  │ "Classes and Objects"            (score: 0.83)│ ← HIGH VISIBILITY
└─────────────────────────────────────────────────────────────┘
```

---

## How It Works

The library provides multiple reordering strategies:

### 1. ScoreSpread (Default)

Places the highest-scoring chunks at the beginning and end, with lower-scoring chunks in the middle. This exploits the U-shaped attention curve.

```
Input chunks sorted by score: [A, B, C, D, E] (A = highest)
Output: [A, B, E, D, C]
         ↑↑       ↑↑
       start    end
```

### 2. PreserveOrder (OP-RAG)

Maintains document structure by:

- Grouping chunks by source document
- Sorting within groups by section index
- Ordering groups by highest relevance score

Ideal for maintaining narrative flow and context.

### 3. Chronological

Sorts by timestamp for temporal data like:

- Event logs
- Chat transcripts
- Time-series records

### 4. Custom

Supply your own comparator function for domain-specific ordering.

---

## Install

```bash
npm install rag-chunk-reorder
```

Or using yarn:

```bash
yarn add rag-chunk-reorder
```

Or using pnpm:

```bash
pnpm add rag-chunk-reorder
```

---

## Quick Start

```typescript
import { Reorderer } from 'rag-chunk-reorder';

const chunks = [
  { id: '1', text: 'Most relevant passage', score: 0.95 },
  { id: '2', text: 'Somewhat relevant', score: 0.72 },
  { id: '3', text: 'Also relevant', score: 0.85 },
  { id: '4', text: 'Less relevant', score: 0.6 },
  { id: '5', text: 'Moderately relevant', score: 0.78 },
];

const reorderer = new Reorderer();
const reordered = reorderer.reorderSync(chunks);
// Result: highest-scoring chunks at positions 0 and N-1 (primacy/recency bias)
```

---

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
  startCount: 3, // top 3 chunks at the beginning
  endCount: 2, // next 2 chunks at the end
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

---

## Configuration

```typescript
const reorderer = new Reorderer({
  // Strategy selection
  strategy: 'scoreSpread', // 'scoreSpread' | 'preserveOrder' | 'chronological' | 'custom'

  // Scoring weights for priority computation
  weights: {
    similarity: 1.0, // weight for base relevance score
    time: 0.0, // weight for normalized timestamp
    section: 0.0, // weight for normalized sectionIndex
  },

  // ScoreSpread options
  startCount: 3, // chunks to place at start
  endCount: 2, // chunks to place at end

  // Filtering
  minScore: 0.5, // drop chunks below this score
  topK: 10, // max chunks to return

  // Token budget
  maxTokens: 4096, // max total tokens in output
  tokenCounter: (text) => text.split(/\s+/).length, // required when maxTokens is set

  // Deduplication
  deduplicate: true, // remove duplicate chunks
  deduplicateThreshold: 0.85, // fuzzy similarity threshold (0-1, default: 1.0 = exact)
  deduplicateKeep: 'highestScore', // 'highestScore' | 'first' | 'last'

  // Grouping
  groupBy: 'sourceId', // group chunks by this metadata field

  // Reranker (async only)
  reranker: myReranker, // external cross-encoder reranker
  onRerankerError: (err) => console.warn('Reranker failed:', err),

  // Debug
  includePriorityScore: true, // include computed priorityScore in output metadata
});
```

### Configuration Options Reference

| Option                 | Type                                                                    | Default         | Description                                                  |
| ---------------------- | ----------------------------------------------------------------------- | --------------- | ------------------------------------------------------------ |
| `strategy`             | `'scoreSpread'` \| `'preserveOrder'` \| `'chronological'` \| `'custom'` | `'scoreSpread'` | Reordering algorithm to use                                  |
| `startCount`           | `number`                                                                | `3`             | Number of top chunks to place at the beginning (scoreSpread) |
| `endCount`             | `number`                                                                | `2`             | Number of top chunks to place at the end (scoreSpread)       |
| `minScore`             | `number`                                                                | `0`             | Minimum relevance score threshold                            |
| `topK`                 | `number`                                                                | `Infinity`      | Maximum number of chunks to return                           |
| `maxTokens`            | `number`                                                                | `undefined`     | Maximum token budget for output                              |
| `deduplicate`          | `boolean`                                                               | `false`         | Whether to remove duplicates                                 |
| `deduplicateThreshold` | `number`                                                                | `1.0`           | Similarity threshold for fuzzy dedup (0-1)                   |
| `groupBy`              | `string`                                                                | `undefined`     | Metadata field to group chunks by                            |
| `weights.similarity`   | `number`                                                                | `1.0`           | Weight for base relevance score                              |
| `weights.time`         | `number`                                                                | `0.0`           | Weight for timestamp in priority calculation                 |
| `weights.section`      | `number`                                                                | `0.0`           | Weight for sectionIndex in priority calculation              |
| `includePriorityScore` | `boolean`                                                               | `false`         | Include computed priority in output metadata                 |

---

## Advanced Usage

### Per-Call Overrides

Override config on individual calls without mutating the instance:

```typescript
const reorderer = new Reorderer({ strategy: 'scoreSpread' });

// Use chronological for this one call
const result = reorderer.reorderSync(chunks, { strategy: 'chronological' });

// Instance config is unchanged
reorderer.getConfig().strategy; // 'scoreSpread'
```

### Async Reorder with Reranker

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

### Streaming

```typescript
for await (const chunk of reorderer.reorderStream(chunks, 'my query')) {
  process.stdout.write(chunk.text);
}
```

> **Note:** The current streaming implementation materializes the full result before yielding. True incremental streaming is planned for a future release.

### Deduplication

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

### Serialization

```typescript
import { serializeChunks, deserializeChunks } from 'rag-chunk-reorder';

const json = serializeChunks(chunks);
const restored = deserializeChunks(json);
// Round-trip: deserialize(serialize(chunks)) ≡ chunks
```

---

## API Reference

### `Reorderer`

```typescript
class Reorderer {
  constructor(config?: ReorderConfig);
  reorderSync(chunks: Chunk[], overrides?: Partial<ReorderConfig>): Chunk[];
  reorder(chunks: Chunk[], query?: string, overrides?: Partial<ReorderConfig>): Promise<Chunk[]>;
  reorderStream(
    chunks: Chunk[],
    query?: string,
    overrides?: Partial<ReorderConfig>,
  ): AsyncIterable<Chunk>;
  getConfig(): ReorderConfig;
}
```

### Standalone Functions

| Function                                        | Description                  |
| ----------------------------------------------- | ---------------------------- |
| `scoreChunks(chunks, weights)`                  | Compute priority scores      |
| `validateChunks(chunks)`                        | Validate chunk array         |
| `validateConfig(config)`                        | Validate configuration       |
| `mergeConfig(config)`                           | Merge with defaults          |
| `deduplicateChunks(chunks, options?)`           | Remove duplicates            |
| `trigramSimilarity(a, b)`                       | Trigram Jaccard similarity   |
| `serializeChunks(chunks)`                       | Serialize to JSON            |
| `deserializeChunks(json)`                       | Deserialize from JSON        |
| `keyPointRecall(keyPoints, texts, options?)`    | Key-point recall metric      |
| `keyPointPrecision(keyPoints, texts, options?)` | Key-point precision metric   |
| `positionEffectiveness(chunks)`                 | Position effectiveness score |
| `ndcg(scores)`                                  | Normalized DCG               |

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

---

## Evaluation Metrics

```typescript
import { keyPointRecall, keyPointPrecision, positionEffectiveness, ndcg } from 'rag-chunk-reorder';

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

---

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

---

## Performance Considerations

| Operation     | Time Complexity | Notes                 |
| ------------- | --------------- | --------------------- |
| ScoreSpread   | O(n log n)      | Sorting dominates     |
| PreserveOrder | O(n log n)      | Group + sort          |
| Chronological | O(n log n)      | Sort by timestamp     |
| Custom        | O(n log n)      | Depends on comparator |
| Fuzzy Dedup   | O(n²)           | Pairwise comparison   |
| Exact Dedup   | O(n)            | Hash-based            |

### Recommendations

- **For large datasets (>500 chunks)**: Use exact dedup or pre-filter
- **Token budget**: Set `maxTokens` to avoid context overflow
- **Streaming**: Use `reorderStream()` for memory-efficient processing of large result sets

---

## Best Practices

1. **Choose the right strategy**:
   - `scoreSpread`: General-purpose, works well with most RAG pipelines
   - `preserveOrder`: When document structure matters (technical docs, articles)
   - `chronological`: For temporal data (logs, chat, events)

2. **Tune startCount/endCount**: Start with defaults (3/2), adjust based on your topK

3. **Use rerankers**: For critical applications, add a cross-encoder reranker to improve relevance scores

4. **Monitor metrics**: Use `positionEffectiveness` and `ndcg` to evaluate reordering quality

5. **Set minScore**: Filter low-quality chunks early to reduce processing overhead

6. **Token budget**: Always set `maxTokens` to prevent context overflow

---

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0 (for type definitions)

---

## Documentation

For interactive examples, visual explanations of the lost-in-the-middle problem, and a live reordering demo, visit the **[documentation site](https://resonant-parfait-d49e6a.netlify.app)**.

---

## License

MIT
