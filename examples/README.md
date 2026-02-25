# Examples

Drop-in recipes for common stacks:

- `examples/langchain.ts` — LangChain Document[] and scored pairs
- `examples/haystack.ts` — Haystack-like document payloads
- `examples/llamaindex.ts` — LlamaIndex node reorder
- `examples/langchain-pinecone.ts` — LangChain + Pinecone
- `examples/llamaindex-qdrant.ts` — LlamaIndex + Qdrant
- `examples/openai-responses.ts` — OpenAI Responses API
- `examples/eval-cli.js` — JSONL eval harness (before vs after reorder)

Most examples use environment variables for credentials:

```bash
export PINECONE_API_KEY=...
export QDRANT_URL=...
export OPENAI_API_KEY=...
```

### Eval CLI

Run a lightweight before/after evaluation on a JSONL dataset:

```bash
npm run build
node examples/eval-cli.js --input examples/data/sample-eval.jsonl --strategy scoreSpread --topK 4 --ciSamples 500
```

JSONL schema (one object per line):

```json
{
  "query": "string (optional)",
  "prediction": "baseline answer (optional)",
  "predictionReordered": "answer after reorder (optional)",
  "references": ["gold answer", "..."] | "gold answer",
  "relevantIds": ["doc-1", "doc-2"],
  "relevantSpans": ["span-1", "span-2"],
  "chunks": [{ "id": "...", "text": "...", "score": 0.9, "metadata": { ... } }]
}
```
