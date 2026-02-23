# Benchmarks

This folder contains reproducible “before vs after reorder” benchmarks.

## Run

```bash
npm run bench
```

The script builds the library and evaluates:

- Baseline: topK prefix of retrieval order
- Reordered: scoreSpread with edge-aware topK

## Dataset format

`bench/data/*.jsonl` lines:

```json
{
  "id": "case-1",
  "query": "What is the capital of France?",
  "keyPoints": ["Paris", "capital of France"],
  "chunks": [
    { "id": "c1", "text": "...", "score": 0.95, "metadata": { "sourceId": "wiki" } }
  ]
}
```

## Metrics

- `keyPointRecall`: fraction of key points appearing in selected context
- `positionEffectiveness`: U-shaped attention weighting
- `nDCG`: ranking quality based on scores
