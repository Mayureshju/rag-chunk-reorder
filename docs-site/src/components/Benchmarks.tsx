"use client";

const rows = [
  { metric: 'Key-Point Recall', baseline: 0.75, reordered: 0.75 },
  { metric: 'Position Effectiveness', baseline: 0.889, reordered: 0.91 },
  { metric: 'nDCG', baseline: 1.0, reordered: 0.997 },
];

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function Benchmarks() {
  return (
    <section id="benchmarks">
      <div className="section-label">Benchmarks</div>
      <h2>Before vs After Reorder</h2>
      <p style={{ marginBottom: 16 }}>
        Reproducible scripts compare baseline retrieval order vs reordered context.
        These are sample results from the included dataset.
      </p>
      <p style={{ marginBottom: 24, fontSize: '0.85rem', color: 'var(--text-dim)' }}>
        Run <code>npm run bench</code> to compute your own numbers. Expect higher position effectiveness with minimal nDCG change.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="bench-table">
          <div className="bench-header">
            <div style={{ color: 'var(--text-dim)' }}>Metric</div>
            <div style={{ color: 'var(--text-dim)' }}>Baseline</div>
            <div style={{ color: 'var(--text-dim)' }}>Reordered</div>
          </div>
          {rows.map((row) => (
            <div key={row.metric} className="bench-row">
              <div className="bench-metric" style={{ fontWeight: 600 }}>{row.metric}</div>
              <div className="bench-base">{pct(row.baseline)}</div>
              <div className="bench-reorder" style={{ color: 'var(--green)', fontWeight: 700 }}>{pct(row.reordered)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Reproducible Script</h3>
          <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>
            Run the benchmark locally to compare strategies and tune your defaults.
          </p>
          <pre style={{ fontSize: '0.8rem' }}>npm run bench</pre>
        </div>
        <div className="card">
          <h3>Dataset Format</h3>
          <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>
            JSONL with queries, chunks, and key points for recall/position scoring.
          </p>
          <pre style={{ fontSize: '0.8rem' }}>
{`{ "id": "case-1", "query": "...", "keyPoints": ["..."], "chunks": [...] }`}
          </pre>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Benchmark Chart</h3>
        <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>
          Position effectiveness (higher is better).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 6 }}>Baseline</div>
            <div style={{ background: 'var(--bg)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: '88.9%', height: 10, background: 'var(--text-dim)' }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 6 }}>Reordered</div>
            <div style={{ background: 'var(--bg)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: '91%', height: 10, background: 'var(--green)' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
