"use client";

const adopters = [
  { name: 'Search + Docs', desc: 'Place the most relevant passages at attention edges.' },
  { name: 'Support Assistants', desc: 'More grounded answers under tight budgets.' },
  { name: 'Research Copilots', desc: 'Evaluate ordering strategies with reproducible metrics.' },
];

export function SocialProof() {
  return (
    <section id="social-proof">
      <div className="section-label">Proof</div>
      <h2>Built for Production RAG</h2>
      <p style={{ marginBottom: 28 }}>
        Teams use rag-chunk-reorder to improve answer quality without swapping their retriever.
        Share your benchmark wins to get featured.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <img
          src="https://img.shields.io/npm/dm/rag-chunk-reorder.svg"
          alt="npm downloads"
          style={{ height: 20 }}
        />
        <img
          src="https://img.shields.io/github/actions/workflow/status/Mayureshju/rag-chunk-reorder/test.yml"
          alt="CI status"
          style={{ height: 20 }}
        />
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        {adopters.map((a) => (
          <div key={a.name} className="card">
            <h3>{a.name}</h3>
            <p style={{ fontSize: '0.9rem' }}>{a.desc}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Sample Result</h3>
        <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>
          Reordering makes the top evidence visible where models pay attention.
        </p>
        <pre style={{ fontSize: '0.8rem' }}>
{`Baseline answer: "It might be Lyon."
After reorder:     "Paris is the capital of France."`}
        </pre>
      </div>
    </section>
  );
}
