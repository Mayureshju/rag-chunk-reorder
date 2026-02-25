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
        --announce-height: 40px;
        --navbar-height: 56px;
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
        scroll-margin-top: calc(var(--announce-height) + var(--navbar-height) + 24px);
      }

      .hero-section {
        padding-top: calc(var(--announce-height) + var(--navbar-height) + 100px);
        text-align: center;
      }

      .hero-title {
        font-size: 3.2rem;
        font-weight: 800;
        line-height: 1.15;
        margin-bottom: 16px;
      }

      .hero-subtitle {
        font-size: 1.25rem;
        max-width: 620px;
        margin: 0 auto 32px;
        color: var(--text-dim);
      }

      .hero-install {
        max-width: 100%;
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

      .navbar {
        position: fixed;
        top: var(--announce-height);
        left: 0;
        right: 0;
        z-index: 100;
        background: rgba(10,10,15,0.85);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--border);
        padding: 0 24px;
      }

      .navbar-inner {
        max-width: 1100px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 18px;
        height: var(--navbar-height);
        min-width: 0;
      }

      .navbar-brand {
        font-family: var(--mono);
        font-weight: 700;
        font-size: 1rem;
        color: var(--accent-light);
        text-decoration: none;
        white-space: nowrap;
      }

      .navbar-links {
        display: flex;
        gap: 16px;
        align-items: center;
        flex: 1 1 auto;
        overflow-x: auto;
        white-space: nowrap;
        min-width: 0;
        scrollbar-width: none;
      }

      .navbar-links::-webkit-scrollbar { display: none; }

      .navbar-link {
        font-size: 0.82rem;
        font-weight: 500;
        color: var(--text-dim);
        text-decoration: none;
        transition: color 0.2s;
      }

      .navbar-link.active { color: var(--accent-light); }

      .navbar-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
        flex-wrap: wrap;
      }

      .nav-badges {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .nav-pill {
        font-size: 0.78rem;
        font-weight: 600;
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 4px 10px;
        text-decoration: none;
      }

      .nav-pill-npm { color: var(--green); }
      .nav-pill-github { color: var(--accent-light); }

      .announcement-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 110;
        background: linear-gradient(90deg, rgba(108,99,255,0.25), rgba(96,165,250,0.25));
        border-bottom: 1px solid var(--border);
        color: var(--text);
        height: var(--announce-height);
      }

      .announcement-inner {
        max-width: 1100px;
        margin: 0 auto;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        gap: 16px;
        font-size: 0.85rem;
        min-width: 0;
      }

      .announcement-text {
        display: flex;
        align-items: center;
        gap: 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
      }

      .announcement-short { display: none; }

      .announcement-actions {
        display: flex;
        gap: 10px;
        flex-shrink: 0;
      }

      .bench-table {
        display: grid;
        gap: 10px;
        font-size: 0.85rem;
      }

      .bench-header,
      .bench-row {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
        gap: 16px;
        align-items: center;
      }

      .bench-row {
        padding: 8px 0;
        border-bottom: 1px dashed var(--border);
      }

      .bench-row:last-child {
        border-bottom: none;
      }

      @media (max-width: 1024px) {
        .nav-badges { display: none; }
      }

      @media (max-width: 860px) {
        .navbar-inner {
          height: auto;
          padding: 8px 0;
          flex-wrap: wrap;
          gap: 10px;
        }
        .navbar-links { order: 3; width: 100%; }
        .navbar-actions { order: 2; width: 100%; justify-content: flex-end; }
      }

      @media (max-width: 860px) {
        .announcement-long { display: none; }
        .announcement-short { display: inline; }
      }

      @media (max-width: 768px) {
        section { padding: 48px 16px; }
        h2 { font-size: 1.6rem; }
        .grid-2, .grid-3 { grid-template-columns: 1fr; }
        .navbar { padding: 0 16px; }
        .announcement-inner { padding: 0 16px; }
      }

      @media (max-width: 640px) {
        .navbar-brand { font-size: 0.9rem; }
        .nav-pill { font-size: 0.72rem; padding: 4px 8px; }
        .navbar-actions { gap: 6px; }
        .navbar-actions { justify-content: flex-start; }
        .navbar-links { gap: 12px; }
        .announcement-actions { flex-wrap: wrap; }
        .hero-title { font-size: 2.2rem; }
        .hero-subtitle { font-size: 1.05rem; margin-bottom: 24px; }
        .hero-section { padding-top: calc(var(--announce-height) + var(--navbar-height) + 60px); }
        .hero-install { width: 100%; justify-content: center; flex-wrap: wrap; }
        .bench-header { display: none; }
        .bench-row { grid-template-columns: 1fr 1fr; }
        .bench-metric { grid-column: 1 / -1; }
        .pipeline-step { align-items: flex-start; }
        .pipeline-icon { width: 44px; height: 44px; font-size: 1rem; }
        .pipeline-line { left: 22px; }
        .pipeline-content { padding: 12px 14px; flex-wrap: wrap; }
        .pipeline-num { width: auto; }
        .sticky-install {
          left: 12px;
          right: 12px;
          bottom: 12px;
        }
        .sticky-install a {
          width: 100%;
          justify-content: center;
        }
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
