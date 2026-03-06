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
      desc: 'Streaming reorder. Windowed mode for iterables, full materialization for arrays.',
    },
    {
      name: 'reorderSyncWithDiagnostics(chunks, overrides?)',
      ret: '{ chunks, diagnostics }',
      desc: 'Synchronous reorder with diagnostics payload.',
    },
    {
      name: 'reorderWithDiagnostics(chunks, query?, overrides?)',
      ret: 'Promise<{ chunks, diagnostics }>',
      desc: 'Async reorder with diagnostics payload.',
    },
    {
      name: 'getConfig()',
      ret: 'ReorderConfig',
      desc: 'Returns a deep copy of the current configuration.',
    },
  ];

  const standalone = [
    { name: 'scoreChunks(chunks, weights)', desc: 'Compute priority scores from weights + metadata' },
    { name: 'scoreChunksWithOptions(chunks, weights, opts?)', desc: 'Score chunks with normalization options' },
    { name: 'validateChunks(chunks)', desc: 'Validate chunk array (id, text, score)' },
    { name: 'prepareChunks(chunks, mode?)', desc: 'Validate or coerce chunks' },
    { name: 'validateConfig(config)', desc: 'Validate configuration object' },
    { name: 'mergeConfig(config)', desc: 'Merge partial config with defaults' },
    { name: 'reordererPresets', desc: 'Opinionated config presets' },
    { name: 'getPreset(name)', desc: 'Retrieve a preset config copy' },
    { name: 'reorderForChatHistory(chunks, query?, overrides?)', desc: 'Pipeline helper for chat-style histories' },
    { name: 'reorderForDocsQA(chunks, query?, overrides?)', desc: 'Pipeline helper for docs / KB QA' },
    { name: 'reorderForLogs(chunks, query?, overrides?)', desc: 'Pipeline helper for logs / event streams' },
    { name: 'tokenCounterFactory(name)', desc: 'Built-in token counters (whitespace/char4/openai-approx/gemini-approx)' },
    { name: 'createTiktokenCounter(opts?)', desc: 'Optional tiktoken-based counter' },
    { name: 'deduplicateChunks(chunks, opts?)', desc: 'Remove exact or fuzzy duplicates' },
    { name: 'deduplicateChunksUnsafe(chunks, opts?)', desc: 'Permissive dedup (coerce)' },
    { name: 'trigramSimilarity(a, b)', desc: 'Trigram Jaccard similarity between two strings' },
    { name: 'serializeChunks(chunks)', desc: 'Serialize chunks to JSON string' },
    { name: 'deserializeChunks(json, options?)', desc: 'Deserialize from JSON. options.normalizeMetadata runs prepareChunks(..., "coerce") for untrusted payloads' },
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
    { name: 'reorderLangChainDocuments(docs, opts?)', desc: 'LangChain adapter for Document[]' },
    { name: 'reorderLangChainPairs(pairs, opts?)', desc: 'LangChain adapter for [Document, score][]' },
    { name: 'reorderLlamaIndexNodes(nodes, opts?)', desc: 'LlamaIndex node adapter' },
    { name: 'reorderHaystackDocuments(docs, opts?)', desc: 'Haystack-style document adapter' },
    { name: 'reorderVercelAIResults(results, opts?)', desc: 'Vercel AI SDK-style result adapter' },
    { name: 'reorderLangGraphState(stateChunks, opts?)', desc: 'LangGraph state chunk adapter' },
    { name: 'reorderVectorStoreResults(rows, opts?)', desc: 'Generic vector DB row adapter' },
  ];

  const errorsAndTypes = [
    { name: 'ValidationError', desc: 'Thrown on invalid config or chunks. Has message and optional context.' },
    { name: 'RerankerError', desc: 'Thrown by built-in rerankers. statusCode, retryable (4xx=false), bodySnippet.' },
    { name: 'DocsQAOverrides', desc: 'Typed overrides for reorderForDocsQA (topK, maxTokens, strategy, etc.)' },
    { name: 'ChatHistoryOverrides', desc: 'Typed overrides for reorderForChatHistory' },
    { name: 'LogsOverrides', desc: 'Typed overrides for reorderForLogs' },
    { name: 'DeserializeChunksOptions', desc: 'normalizeMetadata?: boolean for deserializeChunks' },
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
  diversity: { enabled: true, maxCandidates: 200 },
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
  reorderExplain?: ReorderExplain;
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
  diversity?: { enabled?: boolean; maxCandidates?: number };
  chronologicalOrder?: 'asc' | 'desc';
  preserveOrderSourceField?: string;
  scoreNormalization?: 'none' | 'minMax' | 'zScore' | 'softmax';
  scoreNormalizationTemperature?: number;
  includeExplain?: boolean;
  streamingWindowSize?: number;
  deduplicateLengthBucketSize?: number;
  deduplicateMaxCandidates?: number;
}

type Strategy = 'scoreSpread' | 'preserveOrder'
  | 'chronological' | 'custom' | 'auto';

type ValidationMode = 'strict' | 'coerce';

// New: diagnostics include reranker health
interface ReorderDiagnostics {
  rerankerLatencyMs?: number;
  rerankerBatches?: number;
  rerankerFailed?: boolean;
  queryLength?: number;
  inputTruncated?: boolean;
  // ... plus existing fields
}

// New: truncate instead of throw when over maxInputChunks
maxInputChunksBehavior?: 'throw' | 'truncate';`}</pre>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Errors &amp; Types</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {errorsAndTypes.map((s) => (
            <div
              key={s.name}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
                padding: '6px 12px',
                background: 'var(--bg)',
                borderRadius: 8,
                flexWrap: 'wrap',
              }}
            >
              <code style={{ fontSize: '0.8rem', color: 'var(--orange)', border: 'none', background: 'none' }}>
                {s.name}
              </code>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
