const links = [
  { id: 'problem', label: 'Problem' },
  { id: 'solution', label: 'Solution' },
  { id: 'demo', label: 'Demo' },
  { id: 'demo-clip', label: 'Result' },
  { id: 'strategies', label: 'Strategies' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'drop-in-recipes', label: 'Drop-In' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'features', label: 'Features' },
  { id: 'benchmarks', label: 'Benchmarks' },
  { id: 'social-proof', label: 'Proof' },
  { id: 'install', label: 'Install' },
  { id: 'api', label: 'API' },
];

export function Navbar({ active, onNavigate }: { active: string; onNavigate: (id: string) => void }) {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <a href="#hero" onClick={() => onNavigate('hero')} className="navbar-brand">
          rag-chunk-reorder
        </a>
        <div className="navbar-links">
          {links.map(l => (
            <a key={l.id} href={`#${l.id}`}
              onClick={() => onNavigate(l.id)}
              className={`navbar-link ${active === l.id ? 'active' : ''}`}
            >{l.label}</a>
          ))}
        </div>
        <div className="navbar-actions">
          <div className="nav-badges">
            <img
              src="https://img.shields.io/github/stars/Mayureshju/rag-chunk-reorder?style=flat&color=8b83ff"
              alt="GitHub stars"
              style={{ height: 18 }}
            />
            <img
              src="https://img.shields.io/npm/dw/rag-chunk-reorder?style=flat&color=4ade80"
              alt="npm weekly downloads"
              style={{ height: 18 }}
            />
          </div>
          <a
            href="https://www.npmjs.com/package/rag-chunk-reorder"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-pill nav-pill-npm"
          >
            npm
          </a>
          <a
            href="https://github.com/Mayureshju/rag-chunk-reorder"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-pill nav-pill-github"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
