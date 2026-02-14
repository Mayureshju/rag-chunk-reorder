export function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)', padding: '40px 24px',
      textAlign: 'center', color: 'var(--text-dim)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: '1rem', fontWeight: 700,
          color: 'var(--accent-light)', marginBottom: 16,
        }}>
          rag-chunk-reorder
        </div>
        <p style={{ fontSize: '0.9rem', margin: '0 auto 20px', maxWidth: 500 }}>
          Context-aware chunk reordering for RAG pipelines. MIT Licensed.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          <a href="https://www.npmjs.com/package/rag-chunk-reorder" target="_blank" rel="noopener noreferrer">
            npm
          </a>
          <a href="https://github.com/Mayureshju/rag-chunk-reorder" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href="https://github.com/Mayureshju/rag-chunk-reorder/issues" target="_blank" rel="noopener noreferrer">
            Issues
          </a>
          <a href="https://github.com/Mayureshju/rag-chunk-reorder/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">
            License
          </a>
        </div>
        <p style={{ fontSize: '0.75rem', marginTop: 24, color: 'var(--text-dim)' }}>
          Built to fix the lost-in-the-middle problem.
        </p>
      </div>
    </footer>
  );
}
