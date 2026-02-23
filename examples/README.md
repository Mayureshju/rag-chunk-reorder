# Examples

Drop-in recipes for common stacks:

- `examples/langchain.ts` — LangChain Document[] and scored pairs
- `examples/haystack.ts` — Haystack-like document payloads
- `examples/llamaindex.ts` — LlamaIndex node reorder
- `examples/langchain-pinecone.ts` — LangChain + Pinecone
- `examples/llamaindex-qdrant.ts` — LlamaIndex + Qdrant
- `examples/openai-responses.ts` — OpenAI Responses API

Most examples use environment variables for credentials:

```bash
export PINECONE_API_KEY=...
export QDRANT_URL=...
export OPENAI_API_KEY=...
```
