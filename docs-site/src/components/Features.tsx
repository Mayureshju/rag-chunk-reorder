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
      icon: '🎯', title: 'Min Score Filter',
      desc: 'Drop low-relevance chunks before reordering. Prevents noise from diluting your context window.',
      code: `minScore: 0.5`,
    },
    {
      icon: '📏', title: 'Token Budget',
      desc: 'Trim output to fit your LLM context window. Requires a token counter function.',
      code: `maxTokens: 4096,
tokenCounter: (text) =>
  text.split(/\\s+/).length`,
    },
    {
      icon: '🔝', title: 'Top-K Limit',
      desc: 'Cap the number of output chunks after reordering and token budget are applied.',
      code: `topK: 10`,
    },
    {
      icon: '📦', title: 'Grouping',
      desc: 'Partition chunks by any metadata field before applying the strategy to each group independently.',
      code: `groupBy: 'sourceId'`,
    },
    {
      icon: '🤖', title: 'Reranker Integration',
      desc: 'Plug in a cross-encoder reranker to refine scores before reordering. Async only, with graceful fallback.',
      code: `reranker: myCrossEncoder,
onRerankerError: (e) =>
  console.warn(e)`,
    },
    {
      icon: '🌊', title: 'Streaming',
      desc: 'Yield chunks one at a time via async iterator. Compatible with streaming LLM pipelines.',
      code: `for await (const chunk of
  reorderer.reorderStream(chunks, q)) {
  process.stdout.write(chunk.text);
}`,
    },
    {
      icon: '💾', title: 'Serialization',
      desc: 'Round-trip serialize/deserialize chunks to JSON. Perfect for caching and persistence.',
      code: `const json = serializeChunks(chunks);
const restored = deserializeChunks(json);`,
    },
    {
      icon: '📊', title: 'Evaluation Metrics',
      desc: 'Built-in keyPointRecall, keyPointPrecision, positionEffectiveness, and nDCG for measuring quality.',
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
