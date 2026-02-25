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
    <section id="hero" style={{ paddingTop: 180, textAlign: 'center' }}>
      <div className="badge badge-purple" style={{ marginBottom: 16 }}>Open Source · MIT License</div>
      <h1 style={{ fontSize: '3.2rem', fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
        <span style={{ color: 'var(--accent-light)' }}>rag-chunk-reorder</span>
      </h1>
      <p style={{ fontSize: '1.25rem', maxWidth: 620, margin: '0 auto 32px', color: 'var(--text-dim)' }}>
        Context-aware chunk reordering for RAG pipelines. Put the right information where LLMs actually pay attention.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <a
          href="https://www.npmjs.com/package/rag-chunk-reorder"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: 'var(--accent)',
            color: 'white',
            padding: '10px 18px',
            borderRadius: 999,
            fontWeight: 700,
            fontSize: '0.9rem',
            textDecoration: 'none',
            boxShadow: '0 8px 20px rgba(108, 99, 255, 0.25)',
          }}
        >
          Install from npm
        </a>
        <a
          href="https://github.com/Mayureshju/rag-chunk-reorder"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '10px 18px',
            borderRadius: 999,
            fontWeight: 600,
            fontSize: '0.9rem',
            textDecoration: 'none',
          }}
        >
          Star on GitHub
        </a>
        <a
          href="#install"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--accent-light)',
            padding: '10px 18px',
            borderRadius: 999,
            fontWeight: 600,
            fontSize: '0.9rem',
            textDecoration: 'none',
          }}
        >
          Quick Start
        </a>
        <a
          href="#benchmarks"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--green)',
            padding: '10px 18px',
            borderRadius: 999,
            fontWeight: 600,
            fontSize: '0.9rem',
            textDecoration: 'none',
          }}
        >
          Benchmark results
        </a>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        {[
          'Lost-in-the-middle fixes',
          'Budget-aware packing',
          'Eval CLI + benchmarks',
        ].map((point) => (
          <span key={point} style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>• {point}</span>
        ))}
      </div>
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
      <p style={{ margin: '18px auto 0', fontSize: '0.9rem', color: 'var(--text-dim)', maxWidth: 640 }}>
        Drop-in adapters for LangChain, LlamaIndex, and Haystack. Built-in diagnostics, eval harness, and
        budget-aware packing.
      </p>
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
      <div
        style={{
          marginTop: 40,
          background: 'linear-gradient(135deg, rgba(108,99,255,0.18), rgba(96,165,250,0.12))',
          border: '1px solid var(--border)',
          borderRadius: 18,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          flexWrap: 'wrap',
          textAlign: 'left',
        }}
      >
        <div style={{ maxWidth: 620 }}>
          <div style={{ fontSize: '0.85rem', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent-light)', fontWeight: 700 }}>
            Why reorder now?
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', margin: '6px 0 6px' }}>
            Retrieval quality is flat, but context placement drives answer quality.
          </div>
          <p style={{ fontSize: '0.9rem', margin: 0 }}>
            Boost primacy/recency without swapping retrievers. Add one line to surface the highest-signal chunks.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href="#benchmarks"
            style={{
              background: 'var(--accent)',
              color: 'white',
              padding: '8px 14px',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
              boxShadow: '0 6px 16px rgba(108, 99, 255, 0.25)',
            }}
          >
            See benchmarks
          </a>
          <a
            href="#demo"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: '8px 14px',
              borderRadius: 999,
              fontWeight: 600,
              fontSize: '0.85rem',
              textDecoration: 'none',
            }}
          >
            Try the demo
          </a>
        </div>
      </div>
    </section>
  );
}
