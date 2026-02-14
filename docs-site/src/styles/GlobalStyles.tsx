export function GlobalStyles() {
  return (
    <style>{`
      :root {
        --bg: #0a0a0f;
        --bg-card: #12121a;
        --bg-card-hover: #1a1a2e;
        --border: #2a2a3e;
        --text: #e4e4ef;
        --text-dim: #8888a0;
        --accent: #6c63ff;
        --accent-light: #8b83ff;
        --accent-glow: rgba(108, 99, 255, 0.15);
        --green: #4ade80;
        --red: #f87171;
        --orange: #fb923c;
        --yellow: #facc15;
        --blue: #60a5fa;
        --radius: 12px;
        --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        --mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      }

      * { margin: 0; padding: 0; box-sizing: border-box; }

      html { scroll-behavior: smooth; }

      body {
        font-family: var(--font);
        background: var(--bg);
        color: var(--text);
        line-height: 1.7;
        -webkit-font-smoothing: antialiased;
      }

      ::selection {
        background: var(--accent);
        color: white;
      }

      section {
        padding: 80px 24px;
        max-width: 1100px;
        margin: 0 auto;
      }

      h2 {
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 16px;
        color: var(--text);
      }

      h3 {
        font-size: 1.3rem;
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--text);
      }

      p {
        color: var(--text-dim);
        font-size: 1.05rem;
        max-width: 700px;
      }

      a {
        color: var(--accent-light);
        text-decoration: none;
      }
      a:hover { text-decoration: underline; }

      code {
        font-family: var(--mono);
        background: var(--bg-card);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.9em;
        border: 1px solid var(--border);
      }

      pre {
        font-family: var(--mono);
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 20px;
        overflow-x: auto;
        font-size: 0.88rem;
        line-height: 1.6;
        margin: 16px 0;
      }

      .section-label {
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: var(--accent);
        margin-bottom: 8px;
      }

      .card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 24px;
        transition: border-color 0.2s, background 0.2s;
      }
      .card:hover {
        border-color: var(--accent);
        background: var(--bg-card-hover);
      }

      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }

      .grid-3 {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 20px;
      }

      @media (max-width: 768px) {
        section { padding: 48px 16px; }
        h2 { font-size: 1.6rem; }
        .grid-2, .grid-3 { grid-template-columns: 1fr; }
      }

      .badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .badge-green { background: rgba(74, 222, 128, 0.15); color: var(--green); }
      .badge-blue { background: rgba(96, 165, 250, 0.15); color: var(--blue); }
      .badge-orange { background: rgba(251, 146, 60, 0.15); color: var(--orange); }
      .badge-purple { background: rgba(108, 99, 255, 0.15); color: var(--accent-light); }
    `}</style>
  );
}
