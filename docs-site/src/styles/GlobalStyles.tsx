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
        overflow-x: hidden;
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
        max-width: 100%;
        word-wrap: break-word;
      }

      .card pre {
        max-width: 100%;
        overflow-x: auto;
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
        overflow: hidden;
      }
      .card:hover {
        border-color: var(--accent);
        background: var(--bg-card-hover);
      }

      .card pre {
        max-width: 100%;
        overflow-x: auto;
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

      html, body {
        overflow-x: hidden;
        max-width: 100vw;
      }

      .navbar {
        position: fixed;
        top: var(--announce-height);
        left: 0;
        right: 0;
        z-index: 100;
        background: rgba(10,10,15,0.95);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--border);
        padding: 0 24px;
      }

      .navbar-inner {
        max-width: 1100px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 12px;
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
        flex-shrink: 0;
      }

      .navbar-links {
        display: flex;
        gap: 12px;
        align-items: center;
        flex: 1 1 auto;
        overflow-x: auto;
        white-space: nowrap;
        min-width: 0;
        scrollbar-width: none;
      }

      .navbar-links::-webkit-scrollbar { display: none; }

      .navbar-links-desktop {
        display: flex;
      }

      .navbar-link {
        font-size: 0.78rem;
        font-weight: 500;
        color: var(--text-dim);
        text-decoration: none;
        transition: color 0.2s;
        flex-shrink: 0;
      }

      .navbar-link:hover { color: var(--text); }
      .navbar-link.active { color: var(--accent-light); }

      .navbar-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
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

      .navbar-hamburger {
        display: none;
        background: none;
        border: none;
        color: var(--text);
        cursor: pointer;
        padding: 8px;
        margin-left: auto;
        flex-shrink: 0;
      }

      .navbar-hamburger:hover {
        color: var(--accent-light);
      }

      .navbar-mobile-menu {
        display: none;
        flex-direction: column;
        background: rgba(10,10,15,0.98);
        border-top: 1px solid var(--border);
        padding: 16px 24px;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease, padding 0.3s ease;
      }

      .navbar-mobile-menu.open {
        max-height: 500px;
        padding: 16px 24px;
      }

      .navbar-mobile-link {
        display: block;
        padding: 12px 0;
        font-size: 0.95rem;
        font-weight: 500;
        color: var(--text-dim);
        text-decoration: none;
        border-bottom: 1px solid var(--border);
        transition: color 0.2s;
      }

      .navbar-mobile-link:hover {
        color: var(--text);
      }

      .navbar-mobile-link.active {
        color: var(--accent-light);
      }

      .navbar-mobile-link:last-of-type {
        border-bottom: none;
      }

      .navbar-mobile-actions {
        display: flex;
        gap: 12px;
        padding-top: 16px;
        margin-top: 8px;
        border-top: 1px solid var(--border);
      }

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

      @media (max-width: 1200px) {
        .nav-badges { display: none; }
        .navbar-links-desktop { gap: 8px; }
        .navbar-link { font-size: 0.72rem; }
      }

      @media (max-width: 1024px) {
        .navbar-links-desktop { display: none; }
        .navbar-actions { display: none; }
        .navbar-hamburger { display: block; }
        .navbar-mobile-menu { display: flex; }
        .navbar-mobile-menu:not(.open) { padding: 0 24px; }
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
        .navbar-mobile-menu { padding-left: 16px; padding-right: 16px; }
        .navbar-mobile-menu:not(.open) { padding: 0 16px; }
      }

      @media (max-width: 640px) {
        .navbar-brand { font-size: 0.85rem; }
        .nav-pill { font-size: 0.72rem; padding: 4px 8px; }
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

      /* Recipes Section Styles */
      .recipes-section {
        background: linear-gradient(180deg, transparent 0%, rgba(108, 99, 255, 0.03) 50%, transparent 100%);
      }

      .recipes-features {
        display: flex;
        gap: 24px;
        margin-bottom: 32px;
        flex-wrap: wrap;
      }

      .recipe-feature {
        font-size: 0.9rem;
        color: var(--green);
        font-weight: 500;
      }

      .recipes-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
      }

      .recipe-card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 24px;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .recipe-card:hover {
        border-color: var(--accent);
        background: var(--bg-card-hover);
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(108, 99, 255, 0.15);
      }

      .recipe-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
      }

      .recipe-icon {
        font-size: 2rem;
        line-height: 1;
        flex-shrink: 0;
      }

      .recipe-title-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: 1;
        min-width: 0;
      }

      .recipe-title-row h3 {
        margin: 0;
        font-size: 1.1rem;
        line-height: 1.3;
      }

      .recipe-desc {
        font-size: 0.88rem;
        color: var(--text-dim);
        margin-bottom: 16px;
        line-height: 1.5;
        flex-grow: 0;
      }

      .recipe-code-wrapper {
        flex: 1;
        min-height: 0;
        margin-bottom: 16px;
      }

      .recipe-code {
        font-size: 0.72rem;
        margin: 0;
        height: 100%;
        max-height: 280px;
        overflow: auto;
        scrollbar-gutter: stable;
        -webkit-overflow-scrolling: touch;
      }

      .recipe-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid var(--border);
        margin-top: auto;
      }

      .recipe-lines {
        font-size: 0.8rem;
        color: var(--text-dim);
      }

      .recipe-copy-btn {
        background: var(--accent);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .recipe-copy-btn:hover {
        background: var(--accent-light);
        transform: scale(1.05);
      }

      @media (max-width: 1024px) {
        .recipes-grid {
          grid-template-columns: 1fr;
        }
        
        .recipe-code {
          max-height: 200px;
        }
      }

      @media (max-width: 640px) {
        .recipes-features {
          gap: 16px;
        }
        
        .recipe-feature {
          font-size: 0.85rem;
        }
        
        .recipe-card {
          padding: 20px;
        }
        
        .recipe-icon {
          font-size: 1.5rem;
        }
        
        .recipe-title-row h3 {
          font-size: 1rem;
        }

        .recipe-code {
          max-height: 180px;
        }

        .drop-in-code {
          max-height: 180px;
        }
      }

      /* Drop-In Recipes Section */
      .drop-in-section {
        background: linear-gradient(180deg, rgba(74, 222, 128, 0.02) 0%, transparent 100%);
      }

      .drop-in-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;
        margin-bottom: 24px;
      }

      .drop-in-card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 24px;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .drop-in-card:hover {
        border-color: var(--green);
        background: var(--bg-card-hover);
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(74, 222, 128, 0.1);
      }

      .drop-in-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }

      .drop-in-icon {
        font-size: 2rem;
        line-height: 1;
      }

      .drop-in-header h3 {
        margin: 0 0 4px 0;
        font-size: 1.1rem;
      }

      .drop-in-lines {
        font-size: 0.75rem;
        color: var(--green);
        font-weight: 600;
        background: rgba(74, 222, 128, 0.1);
        padding: 2px 8px;
        border-radius: 4px;
      }

      .drop-in-code {
        font-size: 0.72rem;
        margin: 0 0 16px 0;
        max-height: 220px;
        overflow: auto;
        scrollbar-gutter: stable;
        -webkit-overflow-scrolling: touch;
        flex: 1;
      }

      .drop-in-link {
        font-size: 0.85rem;
        color: var(--accent-light);
        font-weight: 500;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: gap 0.2s ease;
      }

      .drop-in-link:hover {
        gap: 8px;
        text-decoration: none;
      }

      .drop-in-cta {
        background: linear-gradient(135deg, var(--bg-card) 0%, rgba(108, 99, 255, 0.1) 100%);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 24px 32px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        flex-wrap: wrap;
      }

      .drop-in-cta:hover {
        border-color: var(--accent);
      }

      .drop-in-cta-content {
        display: flex;
        align-items: center;
        gap: 16px;
        flex: 1;
        min-width: 0;
      }

      .drop-in-cta-icon {
        font-size: 2.5rem;
        line-height: 1;
        flex-shrink: 0;
      }

      .drop-in-cta-text h3 {
        margin: 0 0 4px 0;
        font-size: 1.15rem;
      }

      .drop-in-cta-text p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--text-dim);
      }

      .drop-in-cta-btn {
        background: var(--accent);
        color: white;
        padding: 12px 24px;
        border-radius: 999px;
        font-weight: 700;
        font-size: 0.9rem;
        text-decoration: none;
        transition: all 0.2s ease;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .drop-in-cta-btn:hover {
        background: var(--accent-light);
        transform: scale(1.05);
        text-decoration: none;
      }

      @media (max-width: 768px) {
        .drop-in-grid {
          grid-template-columns: 1fr;
        }

        .drop-in-cta {
          flex-direction: column;
          text-align: center;
          padding: 24px;
        }

        .drop-in-cta-content {
          flex-direction: column;
        }

        .drop-in-cta-btn {
          width: 100%;
        }
      }
    `}</style>
  );
}
