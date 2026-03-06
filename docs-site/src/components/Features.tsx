export function Features() {
  const features = [
    {
      icon: '🧹', title: 'Deduplication',
      desc: 'Remove exact or fuzzy duplicates using trigram Jaccard similarity. Configurable threshold and survivor strategy.',
      code: `deduplicate: true,
deduplicateThreshold: 0.85,
deduplicateKeep: 'highestScore'`,
    },
    {
      icon: '📏', title: 'Budgeting + Fallbacks',
      desc: 'Trim output to fit your context window with token counting or maxChars fallback.',
      code: `maxTokens: 4096,
tokenCounter: (text) => text.split(/\\s+/).length,
maxChars: 20000,
minTopK: 4`,
    },
    {
      icon: '🤖', title: 'Reranker Batching',
      desc: 'Plug in a cross-encoder and control batch size, concurrency, and timeouts.',
      code: `reranker: myCrossEncoder,
rerankerBatchSize: 16,
rerankerConcurrency: 4,
rerankerTimeoutMs: 2000`,
    },
    {
      icon: '🧭', title: 'Auto Strategy',
      desc: 'Route to the right strategy based on query intent and metadata coverage.',
      code: `strategy: 'auto',
autoStrategy: {
  temporalTimestampCoverageThreshold: 0.4,
}`,
    },
    {
      icon: '🧰', title: 'Presets + Token Counters',
      desc: 'Start fast with presets and built-in token counter helpers.',
      code: `const preset = reordererPresets.standard;
const counter = tokenCounterFactory('char4');`,
    },
    {
      icon: '🧾', title: 'Explain Mode',
      desc: 'Attach per-chunk placement reasons for debugging and audits.',
      code: `includeExplain: true`,
    },
    {
      icon: '🧩', title: 'Diversity Rerank',
      desc: 'MMR + source diversity with an optional cap for large retrieval sets.',
      code: `diversity: {
  enabled: true,
  maxCandidates: 200,
}`,
    },
    {
      icon: '🎚️', title: 'Score Clamp',
      desc: 'Clamp scores to a safe range to prevent outliers from dominating.',
      code: `scoreClamp: [0, 1]`,
    },
    {
      icon: '📈', title: 'Diagnostics + Trace',
      desc: 'Structured per-call stats and step timings for production tuning.',
      code: `onDiagnostics: (stats) => console.log(stats),
onTraceStep: (step, ms) =>
  console.log(step, ms)`,
    },
    {
      icon: '🔀', title: 'Grouping + Top-K',
      desc: 'Partition by metadata fields and cap output after reordering.',
      code: `groupBy: 'sourceId',
topK: 10`,
    },
    {
      icon: '📊', title: 'Evaluation Metrics',
      desc: 'Built-in answer-level and ranking metrics for offline evaluations.',
      code: `keyPointRecall(keyPoints, texts)
positionEffectiveness(scored)
ndcg(scores)`,
    },
    {
      icon: '🧪', title: 'CLI Runner',
      desc: 'Batch reorder JSON/JSONL with a single command. Use --dry-run to validate and print diagnostics without writing output.',
      code: `rag-chunk-reorder --jsonl --input data.jsonl --topK 8
rag-chunk-reorder --dry-run --input chunks.json`,
    },
    {
      icon: '⚠️', title: 'RerankerError',
      desc: 'Built-in rerankers throw RerankerError with statusCode, retryable (4xx = false), and bodySnippet. No retry on 4xx when rerankerRetries is set.',
      code: `import { RerankerError } from 'rag-chunk-reorder';
onRerankerError: (err) => {
  if (err instanceof RerankerError && !err.retryable) { ... }
}`,
    },
    {
      icon: '📊', title: 'Reranker Diagnostics',
      desc: 'Diagnostics include rerankerLatencyMs, rerankerBatches, rerankerFailed, and queryLength for SLOs and dashboards.',
      code: `onDiagnostics: (stats) => {
  console.log(stats.rerankerLatencyMs, stats.rerankerFailed);
}`,
    },
    {
      icon: '✂️', title: 'Input Truncate',
      desc: 'Cap input size and optionally truncate instead of throwing: maxInputChunks + maxInputChunksBehavior: "truncate".',
      code: `maxInputChunks: 500,
maxInputChunksBehavior: 'truncate',
// diagnostics.inputTruncated === true when truncated`,
    },
    {
      icon: '📦', title: 'Deserialize + Normalize',
      desc: 'Deserialize chunks and normalize optional metadata for untrusted payloads.',
      code: `deserializeChunks(json, { normalizeMetadata: true })`,
    },
    {
      icon: '📐', title: 'Typed Pipeline Overrides',
      desc: 'DocsQAOverrides, ChatHistoryOverrides, LogsOverrides for better IDE hints on pipeline helpers.',
      code: `import { reorderForDocsQA, type DocsQAOverrides } from 'rag-chunk-reorder';
const overrides: DocsQAOverrides = { topK: 8, maxTokens: 4096 };`,
    },
  ];

  return (
    <section id="features">
      <div className="section-label">Capabilities</div>
      <h2>Production-Ready Features</h2>
      <p style={{ marginBottom: 32 }}>
        Everything you need for enterprise RAG pipelines, built in.
      </p>
      <div className="grid-3">
        {features.map(f => (
          <div key={f.title} className="card">
            <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 12 }}>{f.desc}</p>
            <pre style={{ margin: 0, fontSize: '0.76rem' }}>{f.code}</pre>
          </div>
        ))}
      </div>
    </section>
  );
}
