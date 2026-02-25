"use client";

const recipes = [
  {
    title: 'LangChain + Pinecone',
    icon: '🔗',
    badge: 'Popular',
    badgeColor: 'green',
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
    icon: '🦙',
    badge: 'Fast',
    badgeColor: 'blue',
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
    icon: '🤖',
    badge: 'New',
    badgeColor: 'purple',
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
    <section id="recipes" className="recipes-section">
      <div className="section-label">Recipes</div>
      <h2>Drop-In Integrations</h2>
      <p style={{ marginBottom: 16 }}>
        Copy-paste ready recipes for popular stacks. Each example keeps your
        existing retriever and only changes ordering.
      </p>
      <div className="recipes-features">
        <span className="recipe-feature">✓ Zero config</span>
        <span className="recipe-feature">✓ Type-safe</span>
        <span className="recipe-feature">✓ Framework agnostic</span>
      </div>
      <div className="recipes-grid">
        {recipes.map((recipe) => (
          <div key={recipe.title} className="recipe-card">
            <div className="recipe-header">
              <span className="recipe-icon">{recipe.icon}</span>
              <div className="recipe-title-row">
                <h3>{recipe.title}</h3>
                <span className={`badge badge-${recipe.badgeColor}`}>{recipe.badge}</span>
              </div>
            </div>
            <p className="recipe-desc">{recipe.desc}</p>
            <div className="recipe-code-wrapper">
              <pre className="recipe-code">{recipe.code}</pre>
            </div>
            <div className="recipe-footer">
              <span className="recipe-lines">{recipe.code.split('\n').length} lines</span>
              <button 
                className="recipe-copy-btn"
                onClick={() => navigator.clipboard.writeText(recipe.code)}
              >
                Copy code
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
