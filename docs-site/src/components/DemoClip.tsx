"use client";

export function DemoClip() {
  return (
    <section id="demo-clip">
      <div className="section-label">Demo</div>
      <h2>60-Second Answer Quality Demo</h2>
      <p style={{ marginBottom: 20 }}>
        A short walkthrough that shows concrete improvement using the same retrieved
        chunks, just reordered.
      </p>
      <div className="grid-2">
        <div className="card">
          <h3>Before</h3>
          <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>
            Retrieval order places the best evidence in the middle.
          </p>
          <pre style={{ fontSize: '0.8rem' }}>
{`Q: What is the capital of France?
Answer: "Lyon is the capital..."`}
          </pre>
        </div>
        <div className="card">
          <h3>After (scoreSpread)</h3>
          <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>
            Same chunks, reordered to the attention edges.
          </p>
          <pre style={{ fontSize: '0.8rem' }}>
{`Q: What is the capital of France?
Answer: "Paris is the capital of France."`}
          </pre>
        </div>
      </div>
      <div style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-dim)' }}>
        Script and reproducible data live in the `bench/` folder.
      </div>
    </section>
  );
}
