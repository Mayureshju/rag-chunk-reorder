export function AnnouncementBar() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 110,
      background: 'linear-gradient(90deg, rgba(108,99,255,0.25), rgba(96,165,250,0.25))',
      borderBottom: '1px solid var(--border)',
      color: 'var(--text)',
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 24px',
        gap: 16,
        fontSize: '0.85rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--accent-light)' }}>New:</span>
          <span>Benchmarks + eval CLI shipped. See before/after context quality gains.</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href="#benchmarks"
            style={{
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 999,
              padding: '4px 10px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            View Benchmarks
          </a>
          <a
            href="https://www.npmjs.com/package/rag-chunk-reorder"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--green)',
              border: '1px solid var(--border)',
              borderRadius: 999,
              padding: '4px 10px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            npm install
          </a>
        </div>
      </div>
    </div>
  );
}
