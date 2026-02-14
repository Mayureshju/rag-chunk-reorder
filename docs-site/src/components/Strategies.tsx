export function Strategies() {
  const strategies = [
    {
      name: 'ScoreSpread',
      badge: 'Default',
      badgeClass: 'badge-green',
      icon: '📊',
      desc: 'Interleaves chunks by priority — highest at start and end, lowest in the middle. Exploits the U-shaped attention curve.',
      visual: ['🥇 #1 (0.95)', '🥉 #3 (0.78)', '💤 #5 (0.60)', '🥈 #4 (0.72)', '🥈 #2 (0.85)'],
      code: `new Reorderer({ strategy: 'scoreSpread' })
// With explicit counts:
new Reorderer({
  strategy: 'scoreSpread',
  startCount: 3,
  endCount: 2,
})`,
    },
    {
      name: 'PreserveOrder',
      badge: 'OP-RAG',
      badgeClass: 'badge-blue',
      icon: '📄',
      desc: 'Maintains original document order within each source. Groups by sourceId, sorts by sectionIndex, orders groups by max score.',
      visual: ['[wiki] §0 Intro', '[wiki] §1 Louvre', '[wiki] §2 Eiffel', '[geo] §0 Europe', '[food] §0 Cuisine'],
      code: `new Reorderer({ strategy: 'preserveOrder' })
// Chunks need sourceId + sectionIndex metadata`,
    },
    {
      name: 'Chronological',
      badge: 'Time-series',
      badgeClass: 'badge-orange',
      icon: '⏱️',
      desc: 'Sorts by timestamp ascending. Ideal for event logs, chat transcripts, and any time-ordered data.',
      visual: ['t=800  Europe', 't=1000 Paris', 't=1100 Louvre', 't=1200 Eiffel', 't=1400 Olympics'],
      code: `new Reorderer({ strategy: 'chronological' })
// Chunks need timestamp metadata`,
    },
    {
      name: 'Custom',
      badge: 'Flexible',
      badgeClass: 'badge-purple',
      icon: '🔧',
      desc: 'Supply your own comparator function for domain-specific ordering. Full control over the sort logic.',
      visual: ['Your logic', 'Your rules', 'Your order'],
      code: `new Reorderer({
  strategy: 'custom',
  customComparator: (a, b) =>
    (b.metadata?.priority as number)
    - (a.metadata?.priority as number),
})`,
    },
  ];

  return (
    <section id="strategies">
      <div className="section-label">Algorithms</div>
      <h2>4 Reordering Strategies</h2>
      <p style={{ marginBottom: 32 }}>
        Choose the strategy that fits your use case, or supply your own comparator.
      </p>

      <div className="grid-2">
        {strategies.map(s => (
          <div key={s.name} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
              <h3 style={{ margin: 0 }}>{s.name}</h3>
              <span className={`badge ${s.badgeClass}`}>{s.badge}</span>
            </div>
            <p style={{ fontSize: '0.9rem', marginBottom: 14 }}>{s.desc}</p>
            <div style={{
              background: 'var(--bg)', borderRadius: 8, padding: '10px 14px',
              marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 3,
            }}>
              {s.visual.map((v, i) => (
                <span key={i} style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  {v}
                </span>
              ))}
            </div>
            <pre style={{ margin: 0, fontSize: '0.8rem' }}>{s.code}</pre>
          </div>
        ))}
      </div>
    </section>
  );
}
