import { useEffect, useState } from 'react';

export function StickyInstall() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 520);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className="sticky-install"
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 120,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <a
        href="https://www.npmjs.com/package/rag-chunk-reorder"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: 'var(--accent)',
          color: 'white',
          padding: '10px 16px',
          borderRadius: 999,
          fontWeight: 700,
          fontSize: '0.85rem',
          textDecoration: 'none',
          boxShadow: '0 10px 20px rgba(108, 99, 255, 0.35)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        npm install
        <span style={{
          background: 'rgba(0,0,0,0.25)',
          padding: '2px 8px',
          borderRadius: 999,
          fontSize: '0.7rem',
        }}>rag-chunk-reorder</span>
      </a>
    </div>
  );
}
