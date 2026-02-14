export function ApiReference() {
  const methods = [
    {
      name: 'reorderSync(chunks, overrides?)',
      ret: 'Chunk[]',
      desc: 'Synchronous reorder. Cannot use reranker.',
    },
    {
      name: 'reorder(chunks, query?, overrides?)',
      ret: 'Promise<Chunk[]>',
      desc: 'Async reorder with optional reranker integration.',
    },
    {
      name: 'reorderStream(chunks, query?, overrides?)',
      ret: 'AsyncIterable<Chunk>',
      desc: 'Streaming reorder. Yields chunks one at a time.',
    },
    {
      name: 'getConfig()',
      ret: 'ReorderConfig',
      desc: 'Returns a deep copy of the current configuration.',
    },
  ];

  const standalone = [
    { name: 'scoreChunks(chunks, weights)', desc: 'Compute priority scores from weights + metadata' },
    { name: 'validateChunks(chunks)', desc: 'Validate chunk array (id, text, score)' },
    { name: 'validateConfig(config)', desc: 'Validate configuration object' },
    { name: 'mergeConfig(config)', desc: 'Merge partial config with defaults' },
    { name: 'deduplicateChunks(chunks, opts?)', desc: 'Remove exact or fuzzy duplicates' },
    { name: 'trigramSimilarity(a, b)', desc: 'Trigram Jaccard similarity between two strings' },
    { name: 'serializeChunks(chunks)', desc: 'Serialize chunks to JSON string' },
    { name: 'deserializeChunks(json)', desc: 'Deserialize chunks from JSON string' },
    { name: 'keyPointRecall(kp, texts, opts?)', desc: 'Fraction of key points found in texts' },
    { name: 'keyPointPrecision(kp, texts, opts?)', desc: 'Fraction of texts containing a key point' },
    { name: 'positionEffectiveness(chunks)', desc: 'U-shaped position weighting score' },
    { name: 'ndcg(scores)', desc: 'Normalized Discounted Cumulative Gain' },
  ];

  return (
    <section id="api">
      <div className="section-label">Reference</div>
      <h2>API Reference</h2>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Reorderer Class</h3>
        <pre style={{ margin: '0 0 16px' }}>{`import { Reorderer } from 'rag-chunk-reorder';
const r = new Reorderer(config?: ReorderConfig);`}</pre>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {methods.map(m => (
            <div key={m.name} style={{
              display: 'flex', alignItems: 'baseline', gap: 12, padding: '8px 12px',
              background: 'var(--bg)', borderRadius: 8,
            }}>
              <code style={{ fontSize: '0.82rem', color: 'var(--accent-light)', border: 'none', background: 'none', whiteSpace: 'nowrap' }}>
                {m.name}
              </code>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                → {m.ret}
              </span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.82rem', marginTop: 12 }}>{methods[0].desc}</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Standalone Functions</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {standalone.map(s => (
            <div key={s.name} style={{
              display: 'flex', alignItems: 'baseline', gap: 12, padding: '6px 12px',
              background: 'var(--bg)', borderRadius: 8, flexWrap: 'wrap',
            }}>
              <code style={{ fontSize: '0.8rem', color: 'var(--green)', border: 'none', background: 'none' }}>
                {s.name}
              </code>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Core Types</h3>
        <pre style={{ margin: 0, fontSize: '0.8rem' }}>{`interface Chunk {
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

type Strategy = 'scoreSpread' | 'preserveOrder'
  | 'chronological' | 'custom';`}</pre>
      </div>
    </section>
  );
}
