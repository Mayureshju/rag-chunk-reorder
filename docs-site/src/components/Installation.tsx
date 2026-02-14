import { useState } from 'react';

export function Installation() {
  const [tab, setTab] = useState<'npm' | 'yarn' | 'pnpm'>('npm');
  const cmds = { npm: 'npm install rag-chunk-reorder', yarn: 'yarn add rag-chunk-reorder', pnpm: 'pnpm add rag-chunk-reorder' };

  return (
    <section id="install">
      <div className="section-label">Get Started</div>
      <h2>Installation</h2>
      <p style={{ marginBottom: 24 }}>Works with Node.js ≥ 18. Ships with TypeScript declarations. Dual CJS/ESM.</p>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['npm', 'yarn', 'pnpm'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '4px 14px', borderRadius: 6, border: '1px solid',
              borderColor: tab === t ? 'var(--accent)' : 'var(--border)',
              background: tab === t ? 'var(--accent-glow)' : 'transparent',
              color: tab === t ? 'var(--accent-light)' : 'var(--text-dim)',
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
            }}>{t}</button>
          ))}
        </div>
        <pre style={{ margin: 0 }}><code style={{ color: 'var(--green)', border: 'none', background: 'none' }}>$ {cmds[tab]}</code></pre>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Quick Start</h3>
        <pre style={{ margin: 0, fontSize: '0.82rem' }}>{`import { Reorderer } from 'rag-chunk-reorder';

const chunks = [
  { id: '1', text: 'Most relevant passage', score: 0.95 },
  { id: '2', text: 'Somewhat relevant',     score: 0.72 },
  { id: '3', text: 'Also relevant',         score: 0.85 },
  { id: '4', text: 'Less relevant',         score: 0.60 },
  { id: '5', text: 'Moderately relevant',   score: 0.78 },
];

const reorderer = new Reorderer();
const result = reorderer.reorderSync(chunks);
// → Highest scores at positions 1 and N (primacy + recency)

// Async with reranker
const asyncResult = await reorderer.reorder(chunks, 'my query');

// Streaming
for await (const chunk of reorderer.reorderStream(chunks, 'q')) {
  process.stdout.write(chunk.text);
}`}</pre>
      </div>
    </section>
  );
}
