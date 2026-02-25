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
      icon: '📈', title: 'Diagnostics + Trace',
      desc: 'Structured per-call stats and step timings for production tuning.',
      code: `onDiagnostics: (stats) => console.log(stats),
onTraceStep: (step, ms) =>
  console.log(step, ms)`,
    },
    {
      icon: '🎚️', title: 'Score Clamp',
      desc: 'Clamp scores to a safe range to prevent outliers from dominating.',
      code: `scoreClamp: [0, 1]`,
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
