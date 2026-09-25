import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Tournament, TournamentTier } from '../../tournament/types';
import { setStoredTierSlug } from '../../tournament/tierStorage';
import { getContrastingTextColor } from '../colorUtils';
import { BracketViewMode } from '../bracketLayout';
import {
  Settings,
  Plus,
  Video,
  Monitor,
  Maximize2,
  Split,
} from 'lucide-react';

interface BracketTierBarProps {
  tournament: Tournament;
  activeTier: TournamentTier;
  viewMode?: BracketViewMode;
  onChangeViewMode?: (mode: BracketViewMode) => void;
  canManage?: boolean;
}

export const BracketTierBar: React.FC<BracketTierBarProps> = ({
  tournament,
  activeTier,
  viewMode = 'standard',
  onChangeViewMode,
  canManage = true,
}) => {
  const navigate = useNavigate();
  const sortedTiers = [...tournament.tiers].sort((a, b) => a.priority - b.priority);

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        padding: '0.65rem 1.25rem',
        background: 'var(--color-bg-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        userSelect: 'none',
      }}
    >
      {/* Left: Tier Filter Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginRight: '0.2rem',
          }}
        >
          Tier:
        </span>

        {sortedTiers.map(tier => {
          const isActive = tier.id === activeTier.id;
          const tierColor = tier.primaryColor || '#f59e0b';
          const contrastColor = getContrastingTextColor(tierColor);

          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => {
                if (!isActive) {
                  setStoredTierSlug(tournament.slug, tier.slug);
                  navigate(`/${tournament.slug}/${tier.slug}`);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: isActive ? 800 : 600,
                background: isActive ? tierColor : 'var(--color-bg-base)',
                color: isActive ? contrastColor : 'var(--color-text-secondary)',
                border: isActive ? `1px solid ${tierColor}` : '1px solid var(--color-border)',
                cursor: isActive ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? `0 0 10px ${tierColor}40` : 'none',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: isActive ? contrastColor : tierColor,
                  display: 'inline-block',
                }}
              />
              <span>{tier.name}</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  opacity: isActive ? 0.9 : 0.7,
                  fontWeight: 500,
                }}
              >
                ({tier.playerCount})
              </span>
            </button>
          );
        })}

        {canManage && (
          <Link
            to={`/${tournament.slug}/manage/settings`}
            className="btn btn-secondary"
            style={{
              padding: '0.3rem 0.65rem',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              borderRadius: 'var(--radius-full)',
              color: 'var(--color-text-muted)',
            }}
            title="Configure Tiers in Tournament Settings"
          >
            <Plus size={13} />
            <span>Add Tier</span>
          </Link>
        )}
      </div>

      {/* Right: View Mode Toggle & Broadcast Shortcut */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
        {onChangeViewMode && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => onChangeViewMode('standard')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.6rem',
                borderRadius: 'var(--radius-xs)',
                fontSize: '0.72rem',
                fontWeight: viewMode === 'standard' ? 700 : 500,
                background: viewMode === 'standard' ? 'var(--color-bg-surface-elevated)' : 'transparent',
                color: viewMode === 'standard' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                border: 'none',
                cursor: 'pointer',
              }}
              title="Standard Tree with Horizontal Scroll"
            >
              <Maximize2 size={12} />
              <span>Standard</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeViewMode('fit')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.6rem',
                borderRadius: 'var(--radius-xs)',
                fontSize: '0.72rem',
                fontWeight: viewMode === 'fit' ? 700 : 500,
                background: viewMode === 'fit' ? 'var(--color-bg-surface-elevated)' : 'transparent',
                color: viewMode === 'fit' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                border: 'none',
                cursor: 'pointer',
              }}
              title="Auto-Fit to 1080p / Window (No scroll)"
            >
              <Monitor size={12} />
              <span>Fit Screen</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeViewMode('split')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.6rem',
                borderRadius: 'var(--radius-xs)',
                fontSize: '0.72rem',
                fontWeight: viewMode === 'split' ? 700 : 500,
                background: viewMode === 'split' ? 'var(--color-bg-surface-elevated)' : 'transparent',
                color: viewMode === 'split' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                border: 'none',
                cursor: 'pointer',
              }}
              title="Bilateral Split Wings (Center Finals)"
            >
              <Split size={12} />
              <span>Split Wings</span>
            </button>
          </div>
        )}

        {/* Quick Link to OBS Broadcast Hub */}
        <Link
          to={`/${tournament.slug}/obs`}
          className="btn btn-secondary"
          style={{
            padding: '0.35rem 0.7rem',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: 'var(--color-text-secondary)',
          }}
          title="Open Broadcast Overlay Studio"
        >
          <Video size={13} color="var(--color-gold-bright)" />
          <span>OBS Studio</span>
        </Link>

        {/* Tier Settings */}
        {canManage && (
          <Link
            to={`/${tournament.slug}/manage/settings`}
            className="btn btn-secondary"
            style={{
              padding: '0.35rem 0.6rem',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              color: 'var(--color-text-muted)',
            }}
            title="Edit Tier Settings"
          >
            <Settings size={13} />
          </Link>
        )}
      </div>
    </div>
  );
};
