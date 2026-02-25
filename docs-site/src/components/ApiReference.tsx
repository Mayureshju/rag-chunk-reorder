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
    { name: 'prepareChunks(chunks, mode?)', desc: 'Validate or coerce chunks' },
    { name: 'validateConfig(config)', desc: 'Validate configuration object' },
    { name: 'mergeConfig(config)', desc: 'Merge partial config with defaults' },
    { name: 'deduplicateChunks(chunks, opts?)', desc: 'Remove exact or fuzzy duplicates' },
    { name: 'deduplicateChunksUnsafe(chunks, opts?)', desc: 'Permissive dedup (coerce)' },
    { name: 'trigramSimilarity(a, b)', desc: 'Trigram Jaccard similarity between two strings' },
    { name: 'serializeChunks(chunks)', desc: 'Serialize chunks to JSON string' },
    { name: 'deserializeChunks(json)', desc: 'Deserialize chunks from JSON string' },
    { name: 'detectQueryIntent(query, autoConfig)', desc: 'Infer factoid/narrative/temporal intent' },
    { name: 'metadataCoverage(chunks)', desc: 'Measure timestamp/source/section coverage' },
    { name: 'resolveAutoStrategy(chunks, query, autoConfig)', desc: 'Pick strategy based on intent + metadata' },
    { name: 'rerankWithDiversity(chunks, config)', desc: 'MMR-style diversity rerank' },
    { name: 'keyPointRecall(kp, texts, opts?)', desc: 'Fraction of key points found in texts' },
    { name: 'keyPointPrecision(kp, texts, opts?)', desc: 'Fraction of texts containing a key point' },
    { name: 'spanRecall(spans, texts, opts?)', desc: 'Relevant span recall metric' },
    { name: 'positionEffectiveness(chunks)', desc: 'U-shaped position weighting score' },
    { name: 'ndcg(scores)', desc: 'Normalized Discounted Cumulative Gain' },
    { name: 'exactMatch(prediction, refs)', desc: 'Answer exact-match score' },
    { name: 'isAnswerable(text)', desc: 'Answerable/unanswerable classifier' },
    { name: 'answerabilityMatch(prediction, refs)', desc: 'Answerability agreement score' },
    { name: 'tokenF1(prediction, refs)', desc: 'Answer token-level F1' },
    { name: 'citationCoverage(prediction, contexts, opts?)', desc: 'Answer token coverage in contexts' },
    { name: 'faithfulness(prediction, contexts, opts?)', desc: 'Answer faithfulness to contexts' },
    { name: 'retrievalRecallAtK(retrieved, relevantIds, k?)', desc: 'Retrieval recall@k' },
    { name: 'evaluateAnswerSet(cases)', desc: 'Aggregate answer evaluation' },
  ];

  return (
    <section id="api">
      <div className="section-label">Reference</div>
      <h2>API Reference</h2>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Config Highlights</h3>
        <pre style={{ margin: 0, fontSize: '0.8rem' }}>{`// Budget + diagnostics clarity
const reorderer = new Reorderer({
  maxChars: 4000,
  charCounter: (text) => Array.from(text).length,
  scoreClamp: [0, 1],
  validateRerankerOutputOrderByIndex: true,
});`}</pre>
      </div>

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
  tokenCount?: number;
  metadata?: ChunkMetadata;
}

interface ChunkMetadata {
  timestamp?: number;
  page?: number;
  sectionIndex?: number;
  chunkId?: string;
  sourceId?: string | number | boolean;
  sourceReliability?: number;
  tokenCount?: number;
  [key: string]: unknown;
}

interface Reranker {
  rerank(chunks: Chunk[], query: string, options?: { signal?: AbortSignal }): Promise<RerankerResult>;
}

type RerankerResult = Chunk[] | { chunks: Chunk[]; scores: number[] };

interface ReorderConfigExtras {
  maxChars?: number;
  charCounter?: (text: string) => number;
  minTopK?: number;
  validateRerankerOutputLength?: boolean;
  validateRerankerOutputOrder?: boolean;
  validateRerankerOutputOrderByIndex?: boolean;
  scoreClamp?: [number, number];
}

type Strategy = 'scoreSpread' | 'preserveOrder'
  | 'chronological' | 'custom' | 'auto';

type ValidationMode = 'strict' | 'coerce';`}</pre>
      </div>
    </section>
  );
}
