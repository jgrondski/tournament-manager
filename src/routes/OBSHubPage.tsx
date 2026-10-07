import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';
import { TournamentLayout } from '../components/TournamentLayout';
import { getDefaultTierColors, colorWithAlpha } from '../features/bracket/colorUtils';
import {
  Video,
  Copy,
  Check,
  ExternalLink,
  Monitor,
  Split,
  Maximize2,
  Trophy,
  BarChart3,
  Sparkles,
  GitBranch,
  Shield,
  Zap,
  LayoutGrid,
} from 'lucide-react';

export const OBSHubPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { getTournamentBySlug } = useTournament();

  const [selectedChroma, setSelectedChroma] = useState<'none' | 'green' | 'magenta' | 'blue'>('none');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const tournament = slug ? getTournamentBySlug(slug) : undefined;
  if (!tournament) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <h2>Tournament Not Found</h2>
        <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Tournaments
        </button>
      </div>
    );
  }

  const chromaParam = selectedChroma !== 'none' ? `&chroma=${selectedChroma}` : '';

  const copyUrl = (path: string, key: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const openPopout = (path: string) => {
    window.open(path, '_blank', 'width=1280,height=720,menubar=no,toolbar=no,location=no');
  };

  return (
    <TournamentLayout tournament={tournament} activeView="obs">
      <main
        style={{
          flex: 1,
          padding: '2rem 1.5rem',
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2.25rem',
        }}
      >
        {/* Hub Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: 'var(--color-gold-bright)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Broadcast &amp; OBS Studio Hub
              </span>
            </div>
            <h1
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              <Video color="var(--color-gold-bright)" size={28} />
              {tournament.name}
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', margin: '0.35rem 0 0 0', maxWidth: '680px' }}>
              Clean, transparent browser sources tailored for OBS Studio, vMix, and Twitch streams. Click to copy or test in a popout window.
            </p>
          </div>

          {/* Chroma Preset Selector */}
          <div
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.65rem 0.95rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Chroma Background
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {[
                { id: 'none' as const, label: 'Transparent', color: 'transparent' },
                { id: 'green' as const, label: 'Green', color: '#00ff00' },
                { id: 'magenta' as const, label: 'Magenta', color: '#ff00ff' },
                { id: 'blue' as const, label: 'Blue', color: '#0000ff' },
              ].map(opt => {
                const isSelected = selectedChroma === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedChroma(opt.id)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? 'var(--color-gold-bg)' : 'var(--color-bg-base)',
                      border: isSelected ? '1px solid var(--color-gold)' : '1px solid var(--color-border)',
                      color: isSelected ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    {opt.color !== 'transparent' && (
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.color, border: '1px solid rgba(255,255,255,0.4)' }} />
                    )}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 1: Tournament-Wide Overlays (Original Neutral Palette) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            <Sparkles size={16} color="var(--color-gold-bright)" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Tournament-Wide Broadcast Overlays
            </h2>
          </div>

          <div className="obs-cards-grid">
            {/* Leaderboard Overlay */}
            {(() => {
              const url = `/${tournament.slug}/leaderboard?obs=true${chromaParam}`;
              const key = 'leaderboard-overlay';
              const isCopied = copiedKey === key;
              return (
                <div style={neutralCardStyle}>
                  {/* Title Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Trophy size={18} color="var(--color-gold-bright)" style={{ flexShrink: 0 }} />
                    <h3 style={{ fontSize: '0.96rem', fontWeight: 700, margin: 0, color: '#ffffff', lineHeight: 1.35 }}>
                      Qualifying Leaderboard
                    </h3>
                  </div>

                  {/* Bottom Row: Chip on Left, Actions on Right */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.65rem' }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: 'var(--color-gold-bright)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Live Table
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <button
                        type="button"
                        onClick={() => copyUrl(url, key)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.76rem', padding: '0.4rem 0.75rem', gap: '0.35rem' }}
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{isCopied ? 'Copied URL!' : 'Copy URL'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openPopout(url)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.76rem', padding: '0.4rem 0.65rem' }}
                        title="Open popout window"
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Standings Overlay */}
            {(() => {
              const url = `/${tournament.slug}/standings?obs=true${chromaParam}`;
              const key = 'standings-overlay';
              const isCopied = copiedKey === key;
              return (
                <div style={neutralCardStyle}>
                  {/* Title Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <BarChart3 size={18} color="#38bdf8" style={{ flexShrink: 0 }} />
                    <h3 style={{ fontSize: '0.96rem', fontWeight: 700, margin: 0, color: '#ffffff', lineHeight: 1.35 }}>
                      Tournament Standings
                    </h3>
                  </div>

                  {/* Bottom Row: Chip on Left, Actions on Right */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.65rem' }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Final Results
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <button
                        type="button"
                        onClick={() => copyUrl(url, key)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.76rem', padding: '0.4rem 0.75rem', gap: '0.35rem' }}
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{isCopied ? 'Copied URL!' : 'Copy URL'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openPopout(url)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.76rem', padding: '0.4rem 0.65rem' }}
                        title="Open popout window"
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Section 2: Bracket Tier Overlays (Themed by Tier Palette) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            <Video size={16} color="var(--color-gold-bright)" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Bracket Overlays by Tier
            </h2>
          </div>

          {tournament.tiers.map(tier => {
            const tierPalette = getDefaultTierColors(tier);
            const primaryColor = tier.primaryColor || tierPalette.primaryColor || '#f59e0b';
            const cardBg = tier.cardColor || tierPalette.cardColor || '#141824';
            const isAcceleratedHybrid = tier.bracket?.bracketRouting === 'ACCELERATED_HYBRID';
            const finalsCutoff = tier.bracket?.finalsCutoff || 16;

            const cards = isAcceleratedHybrid
              ? [
                  {
                    keySuffix: 'champ-fit',
                    title: `Top ${finalsCutoff} Championship Finals`,
                    badge: '1080p Fit',
                    icon: Trophy,
                    url: `/${tournament.slug}/obs/bracket/${tier.slug}?stage=championship&view=fit${chromaParam}`,
                  },
                  {
                    keySuffix: 'qual-fit',
                    title: 'Early Rounds Grid (3 Pods)',
                    badge: '1080p Fit',
                    icon: LayoutGrid,
                    url: `/${tournament.slug}/obs/bracket/${tier.slug}?stage=qualifiers&view=fit${chromaParam}`,
                  },
                  {
                    keySuffix: 'accel-fit',
                    title: 'Pod 1: Accelerated Round',
                    badge: `Seeds 1–${finalsCutoff}`,
                    icon: Zap,
                    url: `/${tournament.slug}/obs/bracket/${tier.slug}?stage=accel&view=fit${chromaParam}`,
                  },
                  {
                    keySuffix: 'upper-fit',
                    title: 'Pod 2: Upper Qualifying Bracket',
                    badge: '4 Columns',
                    icon: GitBranch,
                    url: `/${tournament.slug}/obs/bracket/${tier.slug}?stage=upper&view=fit${chromaParam}`,
                  },
                  {
                    keySuffix: 'lower-fit',
                    title: 'Pod 3: Lower Play-In Bracket',
                    badge: 'Consolidated',
                    icon: Shield,
                    url: `/${tournament.slug}/obs/bracket/${tier.slug}?stage=lower&view=fit${chromaParam}`,
                  },
                  {
                    keySuffix: 'combined-fit',
                    title: 'Full Tournament Stacked',
                    badge: '1080p Fit',
                    icon: Monitor,
                    url: `/${tournament.slug}/obs/bracket/${tier.slug}?stage=combined&view=fit${chromaParam}`,
                  },
                  {
                    keySuffix: 'combined-standard',
                    title: 'Full Tournament Standard',
                    badge: 'Full Res',
                    icon: Maximize2,
                    url: `/${tournament.slug}/obs/bracket/${tier.slug}?stage=combined&view=standard${chromaParam}`,
                  },
                ]
              : [
                  {
                    keySuffix: 'fit',
                    title: '1080p Auto-Fit Bracket',
                    badge: 'Recommended',
                    icon: Monitor,
                    url: `/${tournament.slug}/obs/bracket/${tier.slug}?view=fit${chromaParam}`,
                  },
                  {
                    keySuffix: 'split',
                    title: 'Split Wings (Center Finals)',
                    badge: 'Bilateral',
                    icon: Split,
                    url: `/${tournament.slug}/obs/bracket/${tier.slug}?view=split${chromaParam}`,
                  },
                  {
                    keySuffix: 'standard',
                    title: 'Standard Full Resolution',
                    badge: 'Full Tree',
                    icon: Maximize2,
                    url: `/${tournament.slug}/obs/bracket/${tier.slug}?view=standard${chromaParam}`,
                  },
                ];

            return (
              <div
                key={tier.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  padding: '1.15rem 1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: `1px solid ${colorWithAlpha(primaryColor, 0.22)}`,
                }}
              >
                {/* Tier Title Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: primaryColor,
                        boxShadow: `0 0 10px ${colorWithAlpha(primaryColor, 0.65)}`,
                        flexShrink: 0,
                      }}
                    />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                      <span style={{ color: primaryColor }}>{tier.name}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-text-muted)', marginLeft: '0.55rem' }}>
                        ({tier.playerCount} Players • Best of {tier.bestOf})
                      </span>
                    </h3>
                  </div>

                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-full)',
                      background: colorWithAlpha(primaryColor, 0.12),
                      color: primaryColor,
                      border: `1px solid ${colorWithAlpha(primaryColor, 0.35)}`,
                    }}
                  >
                    {isAcceleratedHybrid ? `Accelerated Hybrid (${cards.length} Views)` : `${tier.eliminationType === 'DOUBLE' ? 'Double Elimination' : 'Single Elimination'}`}
                  </span>
                </div>

                {/* Cards Grid: strictly maximum 3 cards per row */}
                <div className="obs-cards-grid">
                  {cards.map(c => {
                    const key = `${tier.id}-${c.keySuffix}`;
                    const isCopied = copiedKey === key;
                    const Icon = c.icon;
                    return (
                      <div
                        key={c.keySuffix}
                        style={{
                          ...getThemedCardStyle(primaryColor, cardBg),
                          borderLeft: `4px solid ${primaryColor}`,
                        }}
                      >
                        {/* Title Row with Icon */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                          <Icon size={17} color={primaryColor} style={{ marginTop: '0.12rem', flexShrink: 0 }} />
                          <h4
                            style={{
                              fontSize: '0.92rem',
                              fontWeight: 700,
                              margin: 0,
                              color: '#ffffff',
                              lineHeight: 1.35,
                              whiteSpace: 'normal',
                            }}
                          >
                            {c.title}
                          </h4>
                        </div>

                        {/* Bottom Row: Chip on Left, Action Buttons on Right */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            marginTop: 'auto',
                            paddingTop: '0.75rem',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.45rem',
                              borderRadius: 'var(--radius-sm)',
                              background: colorWithAlpha(primaryColor, 0.14),
                              color: primaryColor,
                              border: `1px solid ${colorWithAlpha(primaryColor, 0.35)}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {c.badge}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <button
                              type="button"
                              onClick={() => copyUrl(c.url, key)}
                              className="btn btn-primary"
                              style={{ fontSize: '0.76rem', padding: '0.4rem 0.75rem', gap: '0.35rem' }}
                            >
                              {isCopied ? <Check size={13} /> : <Copy size={13} />}
                              <span>{isCopied ? 'Copied URL!' : 'Copy URL'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openPopout(c.url)}
                              className="btn btn-primary"
                              style={{ fontSize: '0.76rem', padding: '0.4rem 0.65rem' }}
                              title="Open popout window"
                            >
                              <ExternalLink size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </TournamentLayout>
  );
};

const neutralCardStyle: React.CSSProperties = {
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '1.1rem 1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  minHeight: '115px',
  boxShadow: 'var(--shadow-sm)',
  boxSizing: 'border-box',
};

function getThemedCardStyle(primaryColor: string, cardBg: string): React.CSSProperties {
  return {
    background: `linear-gradient(135deg, ${colorWithAlpha(cardBg, 0.95)} 0%, ${colorWithAlpha(primaryColor, 0.08)} 100%)`,
    border: `1px solid ${colorWithAlpha(primaryColor, 0.3)}`,
    borderRadius: 'var(--radius-md)',
    padding: '1.1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    minHeight: '115px',
    boxShadow: `0 3px 10px rgba(0, 0, 0, 0.35)`,
    transition: 'border-color 0.15s ease, transform 0.15s ease',
    boxSizing: 'border-box',
  };
}
