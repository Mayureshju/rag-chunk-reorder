# 60-Second Demo Script

**Goal:** Show answer quality improving without changing retriever or LLM.

1. Show retrieval output list (top 6).
2. Ask: "What is the capital of France?"
3. Baseline answer (wrong or uncertain).
4. Apply `scoreSpread` reorder with `topK=4`.
5. Show reordered context edges.
6. Ask same question again.
7. Answer now correct and grounded.

**Suggested commands**

```bash
npm run bench
```

Use the dataset in `bench/data/sample.jsonl` to replay the example in a repeatable way.
