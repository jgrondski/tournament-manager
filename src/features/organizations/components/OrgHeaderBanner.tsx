import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Trophy, Users, Gamepad2, Palette, Settings, ExternalLink, ArrowLeft, Edit2, Layers } from 'lucide-react';
import { Organization } from '../../tournament/types';
import { TierThemeColors } from '../../bracket/colorUtils';
import { OrganizationMetrics } from '../types';

interface OrgHeaderBannerProps {
  org: Organization;
  primaryTheme: TierThemeColors;
  metrics: OrganizationMetrics;
  orgTournamentsCount: number;
  activeTab: 'tournaments' | 'branding' | 'settings';
  onSelectTab: (tab: 'tournaments' | 'branding' | 'settings') => void;
  onOpenEditMetadata: () => void;
}

export const OrgHeaderBanner: React.FC<OrgHeaderBannerProps> = ({
  org,
  primaryTheme,
  metrics,
  orgTournamentsCount,
  activeTab,
  onSelectTab,
  onOpenEditMetadata,
}) => {
  return (
    <div
      style={{
        background: 'var(--color-bg-surface, #161922)',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
        overflow: 'hidden',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Unimpeded Top Banner */}
      <div
        style={{
          height: '150px',
          position: 'relative',
          background: org.bannerUrl || org.branding?.bannerUrl
            ? `url(${org.bannerUrl || org.branding?.bannerUrl}) center/cover no-repeat`
            : `linear-gradient(135deg, ${primaryTheme.secondaryColor || '#1e293b'}, ${primaryTheme.primaryColor || '#ffc905'}33)`,
          borderBottom: `2px solid ${primaryTheme.primaryColor || '#ffc905'}`,
        }}
      >
        <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
          <Link
            to="/organizations"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full, 9999px)',
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(4px)',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <ArrowLeft size={13} />
            <span>All Organizations</span>
          </Link>
        </div>
      </div>

      {/* Org Details Cleanly Below Banner */}
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Left: Avatar + Title + Slug */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: 'var(--radius-md, 8px)',
                background: primaryTheme.cardColor || '#161922',
                border: `2px solid ${primaryTheme.primaryColor || '#ffc905'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {org.logoUrl || org.branding?.logoUrl ? (
                <img src={org.logoUrl || org.branding?.logoUrl} alt={org.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <Building2 size={34} color={primaryTheme.primaryColor || '#ffc905'} />
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                  {org.name}
                </h1>
                <span
                  style={{
                    padding: '0.2rem 0.65rem',
                    borderRadius: 'var(--radius-full, 9999px)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: primaryTheme.primaryColor || '#ffc905',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  /{org.slug}
                </span>
              </div>
              {org.website && (
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.82rem',
                    color: 'var(--color-text-secondary, #94a3b8)',
                    textDecoration: 'none',
                    marginTop: '0.3rem',
                  }}
                >
                  <span>{org.website.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={onOpenEditMetadata}
              className="btn btn-secondary"
              style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
            >
              <Edit2 size={14} />
              <span>Edit Details</span>
            </button>
          </div>
        </div>

        {org.description && (
          <p style={{ color: 'var(--color-text-secondary, #94a3b8)', fontSize: '0.92rem', lineHeight: 1.5, margin: 0 }}>
            {org.description}
          </p>
        )}

        {/* 4 Stat Overview Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            paddingTop: '0.5rem',
          }}
        >
          {[
            { label: 'Tournaments Hosted', value: metrics.totalTournaments, icon: Trophy },
            { label: 'Total Competitors', value: metrics.totalCompetitors, icon: Users },
            { label: 'Matches Played', value: metrics.totalMatches, icon: Gamepad2 },
            { label: 'Qualifier Attempts', value: metrics.totalSubmissions, icon: Layers },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    background: 'rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: primaryTheme.primaryColor || '#ffc905',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {stat.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          borderTop: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
          background: 'var(--color-bg-surface-elevated, #161922)',
        }}
      >
        {[
          { id: 'tournaments', label: `Tournaments (${orgTournamentsCount})`, icon: Trophy },
          { id: 'branding', label: 'Branding & Palettes', icon: Palette },
          { id: 'settings', label: 'Default Rules & Webhooks', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id as 'tournaments' | 'branding' | 'settings')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.9rem 1rem',
                background: isActive ? 'var(--color-bg-surface, #161922)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? `3px solid ${primaryTheme.primaryColor || '#ffc905'}` : '3px solid transparent',
                color: isActive ? '#ffffff' : 'var(--color-text-secondary, #94a3b8)',
                fontSize: '0.88rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} color={isActive ? (primaryTheme.primaryColor || '#ffc905') : 'currentColor'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
