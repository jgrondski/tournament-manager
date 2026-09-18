import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';
import { TournamentLayout } from '../components/TournamentLayout';
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
          gap: '2rem',
        }}
      >
        {/* Hub Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <h1
              style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                margin: 0,
              }}
            >
              <Video color="var(--color-gold-bright)" size={26} />
              Broadcast & OBS Studio
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', margin: '0.35rem 0 0 0', maxWidth: '650px' }}>
              Clean, transparent browser sources tailored for OBS Studio, vMix, and Twitch streams. Click any card to copy the URL or test in a popout window.
            </p>
          </div>

          {/* Chroma Preset Selector */}
          <div
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.65rem 0.9rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Global Chroma Background
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {[
                { id: 'none' as const, label: 'Transparent', color: 'transparent' },
                { id: 'green' as const, label: 'Green (#00ff00)', color: '#00ff00' },
                { id: 'magenta' as const, label: 'Magenta (#ff00ff)', color: '#ff00ff' },
                { id: 'blue' as const, label: 'Blue (#0000ff)', color: '#0000ff' },
              ].map(opt => {
                const isSelected = selectedChroma === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedChroma(opt.id)}
                    style={{
                      padding: '0.3rem 0.6rem',
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
                    <span>{opt.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 1: Tournament-Wide Overlays */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            <Sparkles size={16} color="var(--color-gold-bright)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Tournament-Wide Broadcast Overlays
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {/* Leaderboard Overlay */}
            {(() => {
              const url = `/${tournament.slug}/leaderboard?obs=true${chromaParam}`;
              const key = 'leaderboard-overlay';
              const isCopied = copiedKey === key;
              return (
                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Trophy size={18} color="var(--color-gold-bright)" />
                      <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                        Qualifying Leaderboard Overlay
                      </h3>
                    </div>
                    <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>Live Table</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Shows real-time competitor ranks, maxouts/AoX scores, and qualifier cutoff borders with transparent chrome.
                  </p>
                  <div style={urlBoxStyle}>
                    <span style={urlTextStyle}>{url}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => copyUrl(url, key)}
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: '0.78rem', padding: '0.45rem 0.75rem', gap: '0.4rem' }}
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{isCopied ? 'Copied URL!' : 'Copy Browser Source URL'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openPopout(url)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem', gap: '0.35rem' }}
                      title="Open popout window"
                    >
                      <ExternalLink size={14} />
                      <span>Popout</span>
                    </button>
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
                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <BarChart3 size={18} color="#38bdf8" />
                      <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                        Tournament Standings Overlay
                      </h3>
                    </div>
                    <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>Final Results</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Official global standings table, tiebreaker exit stats, and tournament champion highlight card.
                  </p>
                  <div style={urlBoxStyle}>
                    <span style={urlTextStyle}>{url}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => copyUrl(url, key)}
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: '0.78rem', padding: '0.45rem 0.75rem', gap: '0.4rem' }}
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{isCopied ? 'Copied URL!' : 'Copy Browser Source URL'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openPopout(url)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem', gap: '0.35rem' }}
                      title="Open popout window"
                    >
                      <ExternalLink size={14} />
                      <span>Popout</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Section 2: Bracket Tier Overlays */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            <Video size={16} color="var(--color-gold-bright)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Bracket Overlays by Tier
            </h2>
          </div>

          {tournament.tiers.map(tier => {
            const tierColor = tier.primaryColor || '#f59e0b';
            return (
              <div key={tier.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: tierColor }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: tierColor, margin: 0 }}>
                    {tier.name} ({tier.playerCount} Competitors • Best of {tier.bestOf})
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  {/* 1. Auto-Fit (1080p) */}
                  {(() => {
                    const url = `/${tournament.slug}/${tier.slug}?obs=true&view=fit${chromaParam}`;
                    const key = `${tier.id}-fit`;
                    const isCopied = copiedKey === key;
                    return (
                      <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <Monitor size={17} color="var(--color-gold-bright)" />
                            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                              Auto-Fit (1080p Zero-Scroll)
                            </h4>
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                            Recommended
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>
                          Auto-scales the entire bracket tree proportionally to fit standard 1920x1080 stream scenes with zero scrollbars.
                        </p>
                        <div style={urlBoxStyle}>
                          <span style={urlTextStyle}>{url}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                          <button
                            type="button"
                            onClick={() => copyUrl(url, key)}
                            className="btn btn-primary"
                            style={{ flex: 1, fontSize: '0.75rem', padding: '0.45rem 0.65rem', gap: '0.35rem' }}
                          >
                            {isCopied ? <Check size={13} /> : <Copy size={13} />}
                            <span>{isCopied ? 'Copied!' : 'Copy URL'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openPopout(url)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}
                            title="Open popout window"
                          >
                            <ExternalLink size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. Split Wings */}
                  {(() => {
                    const url = `/${tournament.slug}/${tier.slug}?obs=true&view=split${chromaParam}`;
                    const key = `${tier.id}-split`;
                    const isCopied = copiedKey === key;
                    return (
                      <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <Split size={17} color="#38bdf8" />
                            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                              Split Wings (Center Finals)
                            </h4>
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                            Bilateral
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>
                          Splits into bilateral wings (East vs West) meeting in the center at Finals, cutting vertical height in half.
                        </p>
                        <div style={urlBoxStyle}>
                          <span style={urlTextStyle}>{url}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                          <button
                            type="button"
                            onClick={() => copyUrl(url, key)}
                            className="btn btn-primary"
                            style={{ flex: 1, fontSize: '0.75rem', padding: '0.45rem 0.65rem', gap: '0.35rem' }}
                          >
                            {isCopied ? <Check size={13} /> : <Copy size={13} />}
                            <span>{isCopied ? 'Copied!' : 'Copy URL'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openPopout(url)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}
                            title="Open popout window"
                          >
                            <ExternalLink size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3. Standard Tree */}
                  {(() => {
                    const url = `/${tournament.slug}/${tier.slug}?obs=true&view=standard${chromaParam}`;
                    const key = `${tier.id}-standard`;
                    const isCopied = copiedKey === key;
                    return (
                      <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <Maximize2 size={17} color="var(--color-text-secondary)" />
                            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                              Standard Full Tree
                            </h4>
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--color-text-muted)' }}>
                            Full-Scale
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>
                          Full 100% resolution tree for ultra-wide displays or multi-screen video walls.
                        </p>
                        <div style={urlBoxStyle}>
                          <span style={urlTextStyle}>{url}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                          <button
                            type="button"
                            onClick={() => copyUrl(url, key)}
                            className="btn btn-primary"
                            style={{ flex: 1, fontSize: '0.75rem', padding: '0.45rem 0.65rem', gap: '0.35rem' }}
                          >
                            {isCopied ? <Check size={13} /> : <Copy size={13} />}
                            <span>{isCopied ? 'Copied!' : 'Copy URL'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openPopout(url)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}
                            title="Open popout window"
                          >
                            <ExternalLink size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </TournamentLayout>
  );
};

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
  boxShadow: 'var(--shadow-md)',
  transition: 'border-color 0.15s ease',
};

const urlBoxStyle: React.CSSProperties = {
  background: 'var(--color-bg-base)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.45rem 0.65rem',
  overflow: 'hidden',
};

const urlTextStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--color-text-muted)',
  fontFamily: 'monospace',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: 'block',
};
