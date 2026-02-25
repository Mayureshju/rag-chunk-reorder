const teams = [
  { name: 'Design Partners', stat: 'Benchmarking in progress' },
  { name: 'Early Access Teams', stat: 'Shipping in production pilots' },
  { name: 'Research Labs', stat: 'Running eval harnesses' },
  { name: 'Docs Platforms', stat: 'Improving context placement' },
];

export function UsedBy() {
  return (
    <section id="used-by">
      <div className="section-label">Early Access</div>
      <h2>Used by Teams Piloting RAG Improvements</h2>
      <p style={{ marginBottom: 20 }}>
        We are collecting public case studies. Add your team logo and results in the next release.
      </p>

      <div className="grid-2">
        {teams.map((t) => (
          <div key={t.name} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>{t.stat}</div>
            </div>
            <span className="badge badge-blue">Early access</span>
          </div>
        ))}
      </div>
    </section>
  );
}
