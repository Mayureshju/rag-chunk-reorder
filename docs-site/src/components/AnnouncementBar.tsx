export function AnnouncementBar() {
  return (
    <div className="announcement-bar">
      <div className="announcement-inner">
        <div className="announcement-text">
          <span style={{ fontWeight: 700, color: 'var(--accent-light)' }}>New:</span>
          <span className="announcement-long">Reranker batching, maxChars fallback, and richer diagnostics are live.</span>
          <span className="announcement-short">Batching + maxChars + diagnostics shipped.</span>
        </div>
        <div className="announcement-actions">
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
