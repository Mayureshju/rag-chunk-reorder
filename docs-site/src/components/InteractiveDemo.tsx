import { useState } from 'react';

interface DemoChunk {
  id: string;
  text: string;
  score: number;
  metadata?: { timestamp?: number; sourceId?: string; sectionIndex?: number };
}

const INITIAL_CHUNKS: DemoChunk[] = [
  { id: '1', text: 'Paris is the capital of France', score: 0.95, metadata: { timestamp: 1000, sourceId: 'wiki', sectionIndex: 0 } },
  { id: '2', text: 'The Eiffel Tower is 330m tall', score: 0.72, metadata: { timestamp: 1200, sourceId: 'wiki', sectionIndex: 2 } },
  { id: '3', text: 'France is in Western Europe', score: 0.88, metadata: { timestamp: 800, sourceId: 'geo', sectionIndex: 0 } },
  { id: '4', text: 'French cuisine is world-renowned', score: 0.55, metadata: { timestamp: 1500, sourceId: 'food', sectionIndex: 0 } },
  { id: '5', text: 'The Louvre is the largest museum', score: 0.81, metadata: { timestamp: 1100, sourceId: 'wiki', sectionIndex: 1 } },
  { id: '6', text: 'Paris hosted the 2024 Olympics', score: 0.67, metadata: { timestamp: 1400, sourceId: 'sports', sectionIndex: 0 } },
];

type Strategy = 'scoreSpread' | 'preserveOrder' | 'chronological';

function scoreSpread(chunks: DemoChunk[]): DemoChunk[] {
  const sorted = [...chunks].sort((a, b) => b.score - a.score);
  const result: DemoChunk[] = new Array(sorted.length);
  let left = 0, right = sorted.length - 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i % 2 === 0) result[left++] = sorted[i];
    else result[right--] = sorted[i];
  }
  return result;
}

function preserveOrder(chunks: DemoChunk[]): DemoChunk[] {
  const groups = new Map<string, DemoChunk[]>();
  for (const c of chunks) {
    const key = c.metadata?.sourceId ?? 'unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  for (const g of groups.values()) {
    g.sort((a, b) => (a.metadata?.sectionIndex ?? 0) - (b.metadata?.sectionIndex ?? 0));
  }
  const ordered = [...groups.entries()].sort((a, b) => {
    const maxA = Math.max(...a[1].map(c => c.score));
    const maxB = Math.max(...b[1].map(c => c.score));
    return maxB - maxA;
  });
  return ordered.flatMap(([, g]) => g);
}

function chronological(chunks: DemoChunk[]): DemoChunk[] {
  return [...chunks].sort((a, b) => (a.metadata?.timestamp ?? 0) - (b.metadata?.timestamp ?? 0));
}

const STRATEGIES: { key: Strategy; label: string; desc: string }[] = [
  { key: 'scoreSpread', label: 'ScoreSpread', desc: 'High scores at start + end, low in middle' },
  { key: 'preserveOrder', label: 'PreserveOrder', desc: 'Maintain document order within sources' },
  { key: 'chronological', label: 'Chronological', desc: 'Sort by timestamp ascending' },
];

function getAttentionColor(index: number, total: number): string {
  const mid = (total - 1) / 2;
  const dist = Math.abs(index - mid) / mid;
  if (dist > 0.6) return 'var(--green)';
  if (dist > 0.3) return 'var(--yellow)';
  return 'var(--red)';
}

export function InteractiveDemo() {
  const [strategy, setStrategy] = useState<Strategy>('scoreSpread');

  const reordered = strategy === 'scoreSpread'
    ? scoreSpread(INITIAL_CHUNKS)
    : strategy === 'preserveOrder'
      ? preserveOrder(INITIAL_CHUNKS)
      : chronological(INITIAL_CHUNKS);

  const ChunkList = ({ chunks, showAttention }: { chunks: DemoChunk[]; showAttention: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {chunks.map((c, i) => (
        <div key={c.id} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          borderRadius: 8, background: 'var(--bg)',
          borderLeft: `3px solid ${showAttention ? getAttentionColor(i, chunks.length) : 'var(--border)'}`,
          transition: 'all 0.3s ease',
        }}>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: '0.78rem', width: 40,
            color: 'var(--accent-light)', fontWeight: 600,
          }}>#{i + 1}</span>
          <span style={{ flex: 1, fontSize: '0.88rem' }}>{c.text}</span>
          <span className="badge badge-blue" style={{ fontFamily: 'var(--mono)' }}>
            {c.score.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <section id="demo">
      <div className="section-label">Interactive</div>
      <h2>Try It Yourself</h2>
      <p style={{ marginBottom: 24 }}>
        See how different strategies reorder the same set of chunks. The left column shows the original
        retrieval order, the right shows the reordered result with attention indicators.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {STRATEGIES.map(s => (
          <button key={s.key} onClick={() => setStrategy(s.key)} style={{
            padding: '8px 18px', borderRadius: 8, border: '1px solid',
            borderColor: strategy === s.key ? 'var(--accent)' : 'var(--border)',
            background: strategy === s.key ? 'var(--accent-glow)' : 'var(--bg-card)',
            color: strategy === s.key ? 'var(--accent-light)' : 'var(--text-dim)',
            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            transition: 'all 0.2s',
          }}>
            {s.label}
          </button>
        ))}
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 16 }}>
        {STRATEGIES.find(s => s.key === strategy)?.desc}
      </p>

      <div className="grid-2">
        <div>
          <h3 style={{ marginBottom: 10, fontSize: '0.9rem', color: 'var(--text-dim)' }}>
            Original (by retrieval score ↓)
          </h3>
          <ChunkList chunks={[...INITIAL_CHUNKS].sort((a, b) => b.score - a.score)} showAttention={false} />
        </div>
        <div>
          <h3 style={{ marginBottom: 10, fontSize: '0.9rem', color: 'var(--accent-light)' }}>
            Reordered — {STRATEGIES.find(s => s.key === strategy)?.label}
          </h3>
          <ChunkList chunks={reordered} showAttention={true} />
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
        <span>🟢 High attention zone</span>
        <span>🟡 Medium attention</span>
        <span>🔴 Low attention (middle)</span>
      </div>
    </section>
  );
}
