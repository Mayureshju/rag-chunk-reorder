export function DropInRecipes() {
  return (
    <section id="drop-in-recipes" className="drop-in-section">
      <div className="section-label">Drop-In</div>
      <h2>Quick Start Recipes</h2>
      <p style={{ marginBottom: 24 }}>
        Add reorder in minutes. Copy a recipe, paste, and ship.
      </p>

      <div className="drop-in-grid">
        <div className="drop-in-card">
          <div className="drop-in-header">
            <span className="drop-in-icon">🔗</span>
            <div>
              <h3>LangChain + Pinecone</h3>
              <span className="drop-in-lines">15 lines</span>
            </div>
          </div>
          <pre className="drop-in-code">{`import { Pinecone } from '@pinecone-database/pinecone';
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
          <a href="#recipes" className="drop-in-link">See full recipe →</a>
        </div>

        <div className="drop-in-card">
          <div className="drop-in-header">
            <span className="drop-in-icon">⚡</span>
            <div>
              <h3>Vercel AI + Vector DB</h3>
              <span className="drop-in-lines">12 lines</span>
            </div>
          </div>
          <pre className="drop-in-code">{`import { reorderVercelAIResults } from 'rag-chunk-reorder';

const reordered = await reorderVercelAIResults(results, {
  query,
  config: { strategy: 'auto', topK: 8 },
});

const context = reordered.map(r => r.content).join('\\n\\n');`}</pre>
          <a href="#recipes" className="drop-in-link">See full recipe →</a>
        </div>
        
        <div className="drop-in-card">
          <div className="drop-in-header">
            <span className="drop-in-icon">🦙</span>
            <div>
              <h3>LlamaIndex + Qdrant</h3>
              <span className="drop-in-lines">10 lines</span>
            </div>
          </div>
          <pre className="drop-in-code">{`import { QdrantClient } from '@qdrant/js-client-rest';
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
          <a href="#recipes" className="drop-in-link">See full recipe →</a>
        </div>
      </div>

      <div className="drop-in-cta">
        <div className="drop-in-cta-content">
          <span className="drop-in-cta-icon">🤖</span>
          <div className="drop-in-cta-text">
            <h3>OpenAI Responses API</h3>
            <p>
              Combine responses + reorder to keep the best evidence near the start and end.
            </p>
          </div>
        </div>
        <a href="#recipes" className="drop-in-cta-btn">
          View all recipes
        </a>
      </div>
    </section>
  );
}
