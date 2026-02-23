import { useState } from 'react';

export function Hero() {
  const [copied, setCopied] = useState(false);
  const cmd = 'npm install rag-chunk-reorder';

  const copy = () => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="hero" style={{ paddingTop: 140, textAlign: 'center' }}>
      <div className="badge badge-purple" style={{ marginBottom: 16 }}>Open Source · MIT License</div>
      <h1 style={{ fontSize: '3.2rem', fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
        <span style={{ color: 'var(--accent-light)' }}>rag-chunk-reorder</span>
      </h1>
      <p style={{ fontSize: '1.25rem', maxWidth: 620, margin: '0 auto 32px', color: 'var(--text-dim)' }}>
        Context-aware chunk reordering for RAG pipelines. Put the right information where LLMs actually pay attention.
      </p>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 12,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '12px 20px', cursor: 'pointer',
      }} onClick={copy} role="button" aria-label="Copy install command">
        <code style={{ border: 'none', background: 'none', fontSize: '0.95rem', color: 'var(--green)' }}>
          $ {cmd}
        </code>
        <span style={{ fontSize: '0.8rem', color: copied ? 'var(--green)' : 'var(--text-dim)' }}>
          {copied ? '✓ Copied' : '📋'}
        </span>
      </div>
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
        {['TypeScript-first', 'Zero dependencies', '4 strategies', 'Async + Streaming', 'Dual CJS/ESM'].map(tag => (
          <span key={tag} style={{
            fontSize: '0.85rem', color: 'var(--text-dim)',
            padding: '6px 14px', borderRadius: 20,
            border: '1px solid var(--border)',
          }}>{tag}</span>
        ))}
      </div>
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <img
          src="https://img.shields.io/npm/v/rag-chunk-reorder.svg"
          alt="npm version"
          style={{ height: 20 }}
        />
        <img
          src="https://img.shields.io/npm/dm/rag-chunk-reorder.svg"
          alt="npm downloads"
          style={{ height: 20 }}
        />
        <img
          src="https://github.com/Mayureshju/rag-chunk-reorder/actions/workflows/test.yml/badge.svg"
          alt="CI status"
          style={{ height: 20 }}
        />
      </div>
    </section>
  );
}
