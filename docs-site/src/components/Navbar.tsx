import { useState } from 'react';

const links = [
  { id: 'problem', label: 'Problem' },
  { id: 'solution', label: 'Solution' },
  { id: 'demo', label: 'Demo' },
  { id: 'demo-clip', label: 'Result' },
  { id: 'strategies', label: 'Strategies' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'drop-in-recipes', label: 'Drop-In' },
  { id: 'used-by', label: 'Used By' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'features', label: 'Features' },
  { id: 'benchmarks', label: 'Benchmarks' },
  { id: 'social-proof', label: 'Proof' },
  { id: 'install', label: 'Install' },
  { id: 'api', label: 'API' },
];

function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {isOpen ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </>
      )}
    </svg>
  );
}

export function Navbar({ active, onNavigate }: { active: string; onNavigate: (id: string) => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <a href="#hero" onClick={() => handleNavClick('hero')} className="navbar-brand">
          rag-chunk-reorder
        </a>
        
        {/* Desktop links */}
        <div className="navbar-links navbar-links-desktop">
          {links.map(l => (
            <a key={l.id} href={`#${l.id}`}
              onClick={() => handleNavClick(l.id)}
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

        {/* Hamburger button */}
        <button
          className="navbar-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <HamburgerIcon isOpen={mobileMenuOpen} />
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`navbar-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        {links.map(l => (
          <a
            key={l.id}
            href={`#${l.id}`}
            onClick={() => handleNavClick(l.id)}
            className={`navbar-mobile-link ${active === l.id ? 'active' : ''}`}
          >
            {l.label}
          </a>
        ))}
        <div className="navbar-mobile-actions">
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
