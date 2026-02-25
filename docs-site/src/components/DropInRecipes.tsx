export function DropInRecipes() {
  return (
    <section id="drop-in-recipes">
      <div className="section-label">Drop-In</div>
      <h2>Drop-In Recipes</h2>
      <p style={{ marginBottom: 20 }}>
        Add reorder in minutes. Copy a recipe, paste, and ship.
      </p>

      <div className="grid-2">
        <div className="card">
          <h3>LangChain + Pinecone (15 lines)</h3>
          <pre style={{ fontSize: '0.8rem' }}>{`import { Pinecone } from '@pinecone-database/pinecone';
import { reorderLangChainDocuments } from 'rag-chunk-reorder';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pc.index('docs');

const results = await index.query({ vector, topK: 20, includeMetadata: true });
const documents = results.matches.map((m) => ({
  id: m.id,
  pageContent: m.metadata?.text ?? '',
  metadata: { score: m.score, sourceId: m.metadata?.docId },
}));

const reordered = await reorderLangChainDocuments(documents, {
  query,
  config: { strategy: 'scoreSpread', topK: 8, startCount: 2, endCount: 2 },
});`}</pre>
          <a href="#recipes" style={{ fontSize: '0.85rem' }}>See full recipe →</a>
        </div>
        <div className="card">
          <h3>LlamaIndex + Qdrant (10 lines)</h3>
          <pre style={{ fontSize: '0.8rem' }}>{`import { QdrantClient } from '@qdrant/js-client-rest';
import { reorderLlamaIndexNodes } from 'rag-chunk-reorder';

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL! });
const hits = await qdrant.search('docs', { vector, limit: 20 });

const nodes = hits.map((hit) => ({
  id_: hit.id?.toString(),
  text: (hit.payload?.text as string) ?? '',
  score: hit.score,
  metadata: { timestamp: hit.payload?.timestamp, sourceId: hit.payload?.docId },
}));

const reordered = await reorderLlamaIndexNodes(nodes, {
  query,
  config: { strategy: 'auto', topK: 8 },
});`}</pre>
          <a href="#recipes" style={{ fontSize: '0.85rem' }}>See full recipe →</a>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ marginBottom: 8 }}>OpenAI Responses API</h3>
          <p style={{ fontSize: '0.9rem', marginBottom: 0 }}>
            Combine responses + reorder to keep the best evidence near the start and end.
          </p>
        </div>
        <a
          href="#recipes"
          style={{
            background: 'var(--accent)',
            color: 'white',
            padding: '8px 14px',
            borderRadius: 999,
            fontWeight: 700,
            fontSize: '0.85rem',
            textDecoration: 'none',
          }}
        >
          View recipes
        </a>
      </div>
    </section>
  );
}
