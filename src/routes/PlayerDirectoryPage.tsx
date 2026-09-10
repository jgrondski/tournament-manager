import React from 'react';
import { Link } from 'react-router-dom';
import { PlayerDirectory } from '../features/players/components/PlayerDirectory';
import { Layers, ArrowLeft } from 'lucide-react';

export const PlayerDirectoryPage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-base)' }}>
      {/* Global Top Navbar */}
      <header
        style={{
          background: 'var(--color-bg-surface)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0.75rem 1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link
              to="/"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: 'var(--color-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-gold)',
                }}
              >
                <Layers size={18} color="#090d16" />
              </div>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                TOURNAMENT <span style={{ color: 'var(--color-gold-bright)' }}>MANAGER</span>
              </span>
            </Link>

            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-gold-bg)',
                color: 'var(--color-gold-bright)',
                fontWeight: 700,
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              GLOBAL CATALOG
            </span>
          </div>

          {/* Nav Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link
              to="/"
              className="btn btn-secondary"
              style={{
                fontSize: '0.8rem',
                padding: '0.45rem 0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={14} />
              Tournaments
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        <PlayerDirectory />
      </main>
    </div>
  );
};
