const links = [
  { id: 'problem', label: 'Problem' },
  { id: 'solution', label: 'Solution' },
  { id: 'demo', label: 'Demo' },
  { id: 'strategies', label: 'Strategies' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'features', label: 'Features' },
  { id: 'install', label: 'Install' },
  { id: 'api', label: 'API' },
];

export function Navbar({ active, onNavigate }: { active: string; onNavigate: (id: string) => void }) {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)', padding: '0 24px',
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', height: 56,
      }}>
        <a href="#hero" onClick={() => onNavigate('hero')} style={{
          fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '1rem',
          color: 'var(--accent-light)', textDecoration: 'none',
        }}>
          rag-chunk-reorder
        </a>
        <div style={{ display: 'flex', gap: 20 }}>
          {links.map(l => (
            <a key={l.id} href={`#${l.id}`}
              onClick={() => onNavigate(l.id)}
              style={{
                fontSize: '0.82rem', fontWeight: 500,
                color: active === l.id ? 'var(--accent-light)' : 'var(--text-dim)',
                textDecoration: 'none', transition: 'color 0.2s',
              }}
            >{l.label}</a>
          ))}
        </div>
      </div>
    </nav>
  );
}
