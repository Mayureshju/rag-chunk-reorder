export function Solution() {
  const before = [
    { score: 0.95, pos: 1, attn: 'high', icon: '✅' },
    { score: 0.85, pos: 2, attn: 'med', icon: '⚠️' },
    { score: 0.78, pos: 3, attn: 'low', icon: '❌' },
    { score: 0.72, pos: 4, attn: 'low', icon: '❌' },
    { score: 0.60, pos: 5, attn: 'med', icon: '⚠️' },
  ];

  const after = [
    { score: 0.95, pos: 1, attn: 'high', icon: '✅' },
    { score: 0.78, pos: 2, attn: 'med', icon: '⚠️' },
    { score: 0.60, pos: 3, attn: 'low', icon: '💤' },
    { score: 0.72, pos: 4, attn: 'med', icon: '⚠️' },
    { score: 0.85, pos: 5, attn: 'high', icon: '✅' },
  ];

  const ChunkRow = ({ items, label }: { items: typeof before; label: string }) => (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>{label}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((c, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            borderRadius: 8, background: 'var(--bg)',
            borderLeft: `3px solid ${c.attn === 'high' ? 'var(--green)' : c.attn === 'med' ? 'var(--yellow)' : 'var(--red)'}`,
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', color: 'var(--accent-light)', width: 24 }}>
              #{c.pos}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', flex: 1 }}>
              score: {c.score.toFixed(2)}
            </span>
            <span>{c.icon}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section id="solution">
      <div className="section-label">The Solution</div>
      <h2>Strategic Reordering</h2>
      <p style={{ marginBottom: 32 }}>
        Place the most important chunks where LLMs pay the most attention — at the start and end.
        Low-relevance chunks go in the middle where they cause the least harm.
      </p>

      <div className="grid-2">
        <ChunkRow items={before} label="❌ Before — Naive Descending" />
        <ChunkRow items={after} label="✅ After — ScoreSpread" />
      </div>

      <div style={{ marginTop: 32, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { icon: '🧠', title: 'Primacy Bias', desc: 'LLMs weight the first tokens heavily. We put the best chunk first.' },
          { icon: '🔚', title: 'Recency Bias', desc: 'The last chunk also gets high attention. We place #2 there.' },
          { icon: '💤', title: 'Middle Demotion', desc: 'Low-relevance chunks go to the middle where attention is lowest.' },
        ].map(c => (
          <div key={c.title} className="card" style={{ flex: '1 1 280px' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{c.icon}</div>
            <h3>{c.title}</h3>
            <p style={{ fontSize: '0.9rem' }}>{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
