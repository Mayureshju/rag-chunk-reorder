export function Pipeline() {
  const steps = [
    { num: 1, label: 'Validate/Coerce', desc: 'Check id, text, score fields', icon: '✅', color: 'var(--yellow)' },
    { num: 2, label: 'minScore Filter', desc: 'Drop chunks below threshold', icon: '🎯', color: 'var(--red)' },
    { num: 3, label: 'Deduplicate', desc: 'Remove exact/fuzzy duplicates', icon: '🧹', color: 'var(--orange)' },
    { num: 4, label: 'Score', desc: 'Compute priorityScore from weights', icon: '📊', color: 'var(--green)' },
    { num: 5, label: 'Diversity Rerank', desc: 'MMR + source diversity', icon: '🧩', color: 'var(--blue)', optional: true },
    { num: 6, label: 'Auto Strategy', desc: 'Route based on query intent', icon: '🧭', color: 'var(--accent-light)', optional: true },
    { num: 7, label: 'Group', desc: 'Partition by metadata field', icon: '📦', color: 'var(--blue)', optional: true },
    { num: 8, label: 'Strategy', desc: 'Apply reordering algorithm', icon: '🔀', color: 'var(--accent-light)' },
    { num: 9, label: 'Strip Internals', desc: 'Remove priorityScore/originalIndex', icon: '🧼', color: 'var(--accent)' },
    { num: 10, label: 'Token Budget', desc: 'Trim to fit context window', icon: '📏', color: 'var(--orange)' },
    { num: 11, label: 'Top-K', desc: 'Limit output count', icon: '🔝', color: 'var(--yellow)' },
  ];

  return (
    <section id="pipeline" className="pipeline">
      <div className="section-label">Architecture</div>
      <h2>Processing Pipeline</h2>
      <p style={{ marginBottom: 32 }}>
        Every call flows through a deterministic pipeline. Each step is optional and configurable.
      </p>

      <div className="pipeline-track" style={{ position: 'relative' }}>
        {/* Connector line */}
        <div className="pipeline-line" style={{
          position: 'absolute', left: 28, top: 20, bottom: 20, width: 2,
          background: 'linear-gradient(to bottom, var(--accent), var(--border))',
        }} />

        <div className="pipeline-steps" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {steps.map(s => (
            <div key={s.num} className="pipeline-step" style={{
              display: 'flex', alignItems: 'center', gap: 16, position: 'relative',
            }}>
              {/* Step number circle */}
              <div className="pipeline-icon" style={{
                width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                background: 'var(--bg-card)', border: `2px solid ${s.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', zIndex: 1,
              }}>
                {s.icon}
              </div>

              {/* Step content */}
              <div className="pipeline-content" style={{
                flex: 1, padding: '14px 18px', borderRadius: 'var(--radius)',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span className="pipeline-num" style={{
                  fontFamily: 'var(--mono)', fontSize: '0.75rem', color: s.color,
                  fontWeight: 700, width: 20,
                }}>{s.num}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{s.label}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>{s.desc}</div>
                </div>
                {s.optional && (
                  <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>Optional</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
