import React from 'react';
import { Trophy, Search, Video, ExternalLink, X } from 'lucide-react';

export interface TournamentPageHeaderProps {
  eyebrow: string;
  title: string;
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  searchPlaceholder?: string;
  obsUrl?: string;
  action?: React.ReactNode;
  isObsMode?: boolean;
}

export const TournamentPageHeader: React.FC<TournamentPageHeaderProps> = ({
  eyebrow,
  title,
  icon,
  subtitle,
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search competitor, country, style...',
  obsUrl,
  action,
  isObsMode = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}
    >
      {/* Title & Eyebrow */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--color-gold-bright)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {eyebrow}
          </span>
        </div>
        <h1
          style={{
            fontSize: isObsMode ? '1.5rem' : '1.85rem',
            fontWeight: 800,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          {icon || <Trophy color="var(--color-gold-bright)" size={isObsMode ? 24 : 28} />}
          {title}
        </h1>
        {subtitle && <div style={{ marginTop: '0.35rem' }}>{subtitle}</div>}
      </div>

      {/* Action Controls & Search Group */}
      {!isObsMode && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {action}

          {obsUrl && (
            <a
              href={obsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              title="Open OBS broadcast overlay in new tab (stripped chrome, transparent background)"
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem', gap: '0.4rem', whiteSpace: 'nowrap' }}
            >
              <Video size={15} color="var(--color-gold-bright)" />
              <span>OBS Overlay</span>
              <ExternalLink size={13} />
            </a>
          )}

          {onSearchChange !== undefined && (
            <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
              <Search
                size={16}
                color="var(--color-text-muted)"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm || ''}
                onChange={e => onSearchChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: searchTerm ? '0.55rem 2rem 0.55rem 2.25rem' : '0.55rem 0.85rem 0.55rem 2.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-surface)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                  boxSizing: 'border-box',
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  title="Clear search"
                  aria-label="Clear search"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
