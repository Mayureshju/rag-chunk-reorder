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
          <pre style={{ fontSize: '0.8rem' }}>{`import { reorderLangChainDocuments } from 'rag-chunk-reorder';

const docs = await retriever.getRelevantDocuments(query);
const reordered = await reorderLangChainDocuments(docs);

const answer = await llm.call(reordered.map(d => d.pageContent).join('\\n'));`}</pre>
          <a href="#recipes" style={{ fontSize: '0.85rem' }}>See full recipe →</a>
        </div>
        <div className="card">
          <h3>LlamaIndex + Qdrant (10 lines)</h3>
          <pre style={{ fontSize: '0.8rem' }}>{`import { reorderLlamaIndexNodes } from 'rag-chunk-reorder';

const nodes = await retriever.retrieve({ query });
const reordered = await reorderLlamaIndexNodes(nodes);

const answer = await llm.synthesize(reordered);`}</pre>
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
