export function Problem() {
  const bars = [
    { label: 'Position 1', pct: 95, color: 'var(--green)' },
    { label: 'Position 2', pct: 70, color: 'var(--yellow)' },
    { label: 'Position 3', pct: 45, color: 'var(--orange)' },
    { label: 'Position 4', pct: 30, color: 'var(--red)' },
    { label: 'Position 5', pct: 25, color: 'var(--red)' },
    { label: 'Position 6', pct: 22, color: 'var(--red)' },
    { label: 'Position 7', pct: 35, color: 'var(--orange)' },
    { label: 'Position 8', pct: 55, color: 'var(--yellow)' },
    { label: 'Position 9', pct: 80, color: 'var(--green)' },
    { label: 'Position 10', pct: 90, color: 'var(--green)' },
  ];

  return (
    <section id="problem">
      <div className="section-label">The Problem</div>
      <h2>Lost in the Middle</h2>
      <p style={{ marginBottom: 32 }}>
        Research shows LLMs attend unevenly to their context window. Information at the start and end
        gets high attention, while the middle is largely ignored — even when it contains the most relevant content.
      </p>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>LLM Attention by Position</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {bars.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 72, textAlign: 'right' }}>
                  {b.label}
                </span>
                <div style={{ flex: 1, height: 18, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${b.pct}%`, height: '100%', background: b.color,
                    borderRadius: 4, opacity: 0.8, transition: 'width 0.6s ease',
                  }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 32 }}>{b.pct}%</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.8rem', marginTop: 12, color: 'var(--text-dim)' }}>
            ↑ U-shaped attention curve — middle positions get the least attention
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3>📉 The Impact</h3>
            <p style={{ fontSize: '0.9rem' }}>
              Standard RAG pipelines sort chunks by relevance score descending. The #1 chunk is at position 1 (good),
              but #2 and #3 land in the middle (bad). The LLM misses critical context.
            </p>
          </div>
          <div className="card">
            <h3>📊 The Research</h3>
            <p style={{ fontSize: '0.9rem' }}>
              "Lost in the Middle" (Liu et al., 2023) demonstrated that LLM performance degrades by up to 20%
              when key information is placed in the middle of the context window vs. the start or end.
            </p>
          </div>
          <div className="card">
            <h3>🔄 Naive Ordering</h3>
            <pre style={{ fontSize: '0.78rem', margin: '8px 0 0' }}>{`[0.95] → Position 1  ✅ High attention
[0.85] → Position 2  ⚠️ Declining
[0.78] → Position 3  ❌ Low attention
[0.72] → Position 4  ❌ Lowest
[0.60] → Position 5  ⚠️ Recovering`}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}
