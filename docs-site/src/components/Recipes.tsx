"use client";

const recipes = [
  {
    title: 'LangChain + Pinecone',
    desc: 'Reorder Pinecone results before they hit the LLM. Works with Document[] or [Document, score][].',
    code: `import { Pinecone } from '@pinecone-database/pinecone';
import { reorderLangChainDocuments } from 'rag-chunk-reorder';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pc.index('docs');

const results = await index.query({
  vector: embedding,
  topK: 20,
  includeMetadata: true,
});

const documents = results.matches.map((m) => ({
  id: m.id,
  pageContent: m.metadata?.text ?? '',
  metadata: { score: m.score, sourceId: m.metadata?.docId },
}));

const reordered = await reorderLangChainDocuments(documents, {
  query,
  config: { strategy: 'scoreSpread', topK: 8 },
});`,
  },
  {
    title: 'LlamaIndex + Qdrant',
    desc: 'Use Qdrant for retrieval, then apply chronological or preserveOrder based on query intent.',
    code: `import { QdrantClient } from '@qdrant/js-client-rest';
import { reorderLlamaIndexNodes } from 'rag-chunk-reorder';

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL! });
const hits = await qdrant.search('docs', { vector: embedding, limit: 20 });

const nodes = hits.map((hit) => ({
  id_: hit.id?.toString(),
  text: hit.payload?.text ?? '',
  score: hit.score,
  metadata: { timestamp: hit.payload?.timestamp, sourceId: hit.payload?.docId },
}));

const reordered = await reorderLlamaIndexNodes(nodes, {
  query,
  config: { strategy: 'auto', topK: 8 },
});`,
  },
  {
    title: 'OpenAI Responses API',
    desc: 'Drop reordered context directly into the Responses API for tighter, more grounded answers.',
    code: `import OpenAI from 'openai';
import { Reorderer } from 'rag-chunk-reorder';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const reorderer = new Reorderer({ strategy: 'scoreSpread', topK: 8 });

const reordered = reorderer.reorderSync(chunks);
const context = reordered.map((c) => c.text).join('\\n\\n');

const response = await client.responses.create({
  model: 'gpt-4.1-mini',
  input: \`Answer using the context:\\n\\n\${context}\\n\\nQ: \${query}\`,
});`,
  },
];

export function Recipes() {
  return (
    <section id="recipes">
      <div className="section-label">Recipes</div>
      <h2>Drop-In Integrations</h2>
      <p style={{ marginBottom: 32 }}>
        Copy-paste ready recipes for popular stacks. Each example keeps your
        existing retriever and only changes ordering.
      </p>
      <div className="grid-3">
        {recipes.map((recipe) => (
          <div key={recipe.title} className="card">
            <h3>{recipe.title}</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>{recipe.desc}</p>
            <pre style={{ fontSize: '0.75rem' }}>{recipe.code}</pre>
          </div>
        ))}
      </div>
    </section>
  );
}
