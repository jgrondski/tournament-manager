import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Tournament, TournamentTier } from '../features/tournament/types';
import { useTournament } from '../features/tournament/store';
import { colorWithAlpha } from '../features/bracket/colorUtils';
import { VerifyBracketModal } from '../features/tournament/components/VerifyBracketModal';
import {
  Layers,
  ExternalLink,
  ChevronDown,
  Video,
  ShieldCheck,
  AlertTriangle,
  Users,
  Copy,
  Check,
  Search,
} from 'lucide-react';

interface TournamentNavbarProps {
  tournament: Tournament;
  activeTier?: TournamentTier;
  activeView: 'bracket' | 'sheet' | 'judge' | 'leaderboard' | 'standings' | 'settings' | 'players';
  onNavigate?: (url: string) => boolean | void;
}

export const TournamentNavbar: React.FC<TournamentNavbarProps> = ({
  tournament,
  activeTier,
  activeView,
  onNavigate,
}) => {
  const { tournaments, unlockBrackets } = useTournament();
  const navigate = useNavigate();
  const [isTournamentMenuOpen, setIsTournamentMenuOpen] = useState(false);
  const [isObsMenuOpen, setIsObsMenuOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [obsSearchTerm, setObsSearchTerm] = useState('');
  const [selectedChroma, setSelectedChroma] = useState<'none' | 'green' | 'magenta' | 'blue'>('none');

  const currentTierSlug = activeTier?.slug || tournament.tiers[0]?.slug;
  const isBracketSpecificView = activeView === 'bracket' || activeView === 'sheet' || activeView === 'judge';

  const copyToClipboard = (urlPath: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const fullUrl = `${window.location.origin}${urlPath}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const handleUnlockClick = () => {
    const res = unlockBrackets(tournament.id);
    if (!res.success && res.error) {
      setUnlockError(res.error);
    } else {
      setUnlockError(null);
    }
  };

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    if (onNavigate) {
      const allowed = onNavigate(url);
      if (allowed === false) {
        e.preventDefault();
      }
    }
  };

  const handleDropdownNavigate = (url: string) => {
    setIsTournamentMenuOpen(false);
    if (onNavigate) {
      const allowed = onNavigate(url);
      if (allowed === false) return;
    }
    navigate(url);
  };

  const chromaParam = selectedChroma !== 'none' ? `&chroma=${selectedChroma}` : '';

  // Build searchable list of OBS overlays across all views & tiers
  interface ObsOption {
    key: string;
    category: string;
    title: string;
    subtitle: string;
    url: string;
    badgeColor?: string;
  }

  const allObsOptions: ObsOption[] = [
    {
      key: 'qual',
      category: 'General',
      title: 'Qualifying Leaderboard',
      subtitle: 'Live ranking table with attempt submissions',
      url: `/${tournament.slug}/leaderboard?obs=true${chromaParam}`,
      badgeColor: '#38bdf8',
    },
    {
      key: 'standings',
      category: 'General',
      title: 'Tournament Standings',
      subtitle: 'Official placement & exit tiebreaker rankings',
      url: `/${tournament.slug}/standings?obs=true${chromaParam}`,
      badgeColor: 'var(--color-gold-bright)',
    },
  ];

  tournament.tiers.forEach(tier => {
    const tColor = tier.primaryColor || '#f59e0b';
    allObsOptions.push(
      {
        key: `${tier.id}-fit`,
        category: tier.name,
        title: `${tier.name} — Auto-Fit (1080p)`,
        subtitle: 'Scales entire tree to fit widescreen with 0 scrolling',
        url: `/${tournament.slug}/${tier.slug}?obs=true&view=fit${chromaParam}`,
        badgeColor: tColor,
      },
      {
        key: `${tier.id}-split`,
        category: tier.name,
        title: `${tier.name} — Split Wings (Center Finals)`,
        subtitle: 'Top & bottom wings meeting at center Grand Finals',
        url: `/${tournament.slug}/${tier.slug}?obs=true&view=split${chromaParam}`,
        badgeColor: tColor,
      },
      {
        key: `${tier.id}-focus`,
        category: tier.name,
        title: `${tier.name} — Stage Focus (Top 8 / Top 16)`,
        subtitle: 'Expanded active round focus with collapsed feeder seeds',
        url: `/${tournament.slug}/${tier.slug}?obs=true&view=focus${chromaParam}`,
        badgeColor: tColor,
      },
      {
        key: `${tier.id}-dense`,
        category: tier.name,
        title: `${tier.name} — Dense Micro-Cards`,
        subtitle: '46px slim broadcast strips for large competitor fields',
        url: `/${tournament.slug}/${tier.slug}?obs=true&view=dense${chromaParam}`,
        badgeColor: tColor,
      }
    );
  });

  const filteredObsOptions = allObsOptions.filter(opt => {
    const q = obsSearchTerm.toLowerCase();
    return (
      opt.title.toLowerCase().includes(q) ||
      opt.subtitle.toLowerCase().includes(q) ||
      opt.category.toLowerCase().includes(q)
    );
  });

  return (
    <header style={headerContainerStyle}>
      {/* Row 1: Logo, Tournament Switcher, Mode Pill Button, Bracket Nav, Player Pool, and All OBS Overlays */}
      <div style={topRowStyle}>
        {/* Left Side: Brand, Tournament Select, and Interactive Mode Pill Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Logo */}
          <Link
            to="/"
            onClick={e => handleLinkClick(e, '/')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <div style={logoIconStyle}>
              <Layers size={16} color="#090d16" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--color-text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              TOURNAMENT <span style={{ color: 'var(--color-gold-bright)' }}>MANAGER</span>
            </span>
          </Link>

          {/* Tournament Switcher Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsTournamentMenuOpen(!isTournamentMenuOpen)}
              style={tournamentSelectBtnStyle}
            >
              <span style={{ fontWeight: 600 }}>{tournament.name}</span>
              <ChevronDown size={13} color="var(--color-text-muted)" />
            </button>

            {isTournamentMenuOpen && (
              <div style={dropdownStyle} onClick={() => setIsTournamentMenuOpen(false)}>
                {tournaments.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleDropdownNavigate(t.tiers[0] ? `/${t.slug}/${t.tiers[0].slug}` : `/${t.slug}/leaderboard`)}
                    style={{
                      ...dropdownItemStyle,
                      background: t.id === tournament.id ? 'var(--color-gold-bg)' : 'transparent',
                      color: t.id === tournament.id ? 'var(--color-gold-bright)' : 'var(--color-text-primary)',
                      fontWeight: t.id === tournament.id ? 700 : 400,
                    }}
                  >
                    <div>
                      <div>{t.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{t.date} • {t.location}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Mode Pill Button (Row 4 Banner merged into Row 1 Pill!) */}
          {!tournament.isLocked ? (
            <button
              type="button"
              onClick={() => setIsVerifyModalOpen(true)}
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: 'var(--radius-full)',
                padding: '0.2rem 0.65rem',
                color: 'var(--color-gold-bright)',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease',
              }}
              title="Click to Lock Brackets and Begin Formal Match Play"
            >
              <AlertTriangle size={12} />
              <span>QUALIFIERS MODE</span>
              <span style={{ fontSize: '0.65rem', opacity: 0.85, textDecoration: 'underline' }}>(Click to Lock)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleUnlockClick}
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                borderRadius: 'var(--radius-full)',
                padding: '0.2rem 0.65rem',
                color: '#34d399',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease',
              }}
              title="Click to Unlock Brackets and Revert to Qualifiers Mode"
            >
              <ShieldCheck size={12} />
              <span>MATCH PLAY (LOCKED)</span>
              <span style={{ fontSize: '0.65rem', opacity: 0.85, textDecoration: 'underline' }}>(Unlock)</span>
            </button>
          )}

          {unlockError && (
            <span style={{ color: 'var(--color-red)', fontSize: '0.72rem', fontWeight: 600 }}>
              {unlockError}
            </span>
          )}
        </div>

        {/* Center/Right: Bracket Navigation Pills + Global Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Bracket Views Pill Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--color-bg-surface-highlight)', padding: '0.15rem', borderRadius: 'var(--radius-sm)' }}>
            <Link
              to={currentTierSlug ? `/${tournament.slug}/manage/sheet?tier=${currentTierSlug}` : `/${tournament.slug}/manage/sheet`}
              onClick={e => handleLinkClick(e, currentTierSlug ? `/${tournament.slug}/manage/sheet?tier=${currentTierSlug}` : `/${tournament.slug}/manage/sheet`)}
              style={{
                ...viewTabStyle,
                background: activeView === 'sheet' ? 'var(--color-bg-surface)' : 'transparent',
                color: activeView === 'sheet' ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
                fontWeight: activeView === 'sheet' ? 700 : 500,
              }}
            >
              📊 Sheet
            </Link>

            <Link
              to={currentTierSlug ? `/${tournament.slug}/manage/judge?tier=${currentTierSlug}` : `/${tournament.slug}/manage/judge`}
              onClick={e => handleLinkClick(e, currentTierSlug ? `/${tournament.slug}/manage/judge?tier=${currentTierSlug}` : `/${tournament.slug}/manage/judge`)}
              style={{
                ...viewTabStyle,
                background: activeView === 'judge' ? 'var(--color-bg-surface)' : 'transparent',
                color: activeView === 'judge' ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
                fontWeight: activeView === 'judge' ? 700 : 500,
              }}
            >
              📱 Floor Judge
            </Link>

            <Link
              to={currentTierSlug ? `/${tournament.slug}/${currentTierSlug}` : `/${tournament.slug}/bracket`}
              onClick={e => handleLinkClick(e, currentTierSlug ? `/${tournament.slug}/${currentTierSlug}` : `/${tournament.slug}/bracket`)}
              style={{
                ...viewTabStyle,
                background: activeView === 'bracket' ? 'var(--color-bg-surface)' : 'transparent',
                color: activeView === 'bracket' ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
                fontWeight: activeView === 'bracket' ? 700 : 500,
              }}
            >
              🌲 Bracket
            </Link>
          </div>

          {/* Global Player Pool */}
          <Link
            to="/players"
            onClick={e => handleLinkClick(e, '/players')}
            className="btn btn-secondary"
            title="Open Global Player Pool Directory"
            style={{ fontSize: '0.74rem', padding: '0.28rem 0.55rem', gap: '0.35rem' }}
          >
            <Users size={13} color="var(--color-gold-bright)" />
            <span>Players</span>
          </Link>

          {/* Searchable All OBS Overlays Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsObsMenuOpen(!isObsMenuOpen)}
              className="btn btn-secondary"
              title="Open searchable OBS broadcast overlay links menu"
              style={{ fontSize: '0.74rem', padding: '0.28rem 0.6rem', gap: '0.35rem' }}
            >
              <Video size={13} color="var(--color-gold-bright)" />
              <span>OBS Overlays</span>
              <ChevronDown size={11} />
            </button>

            {isObsMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '380px',
                  maxHeight: '480px',
                  background: 'var(--color-bg-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65)',
                  padding: '0.65rem',
                  zIndex: 250,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {/* Search Header */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-gold-bright)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Video size={13} /> OBS Broadcast Overlays
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>1080p Ready</span>
                  </div>

                  {/* Live Search Input */}
                  <div style={{ position: 'relative' }}>
                    <Search size={13} color="var(--color-text-muted)" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search overlays (e.g. gold, split, qual)..."
                      value={obsSearchTerm}
                      onChange={e => setObsSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.35rem 0.6rem 0.35rem 1.75rem',
                        fontSize: '0.78rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-base)',
                        color: 'var(--color-text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Chroma Key Selector Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Chroma:</span>
                    {(['none', 'green', 'magenta', 'blue'] as const).map(ch => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setSelectedChroma(ch)}
                        style={{
                          fontSize: '0.65rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          border: selectedChroma === ch ? '1px solid var(--color-gold-bright)' : '1px solid var(--color-border-subtle)',
                          background: selectedChroma === ch ? 'var(--color-gold-bg)' : 'var(--color-bg-surface)',
                          color: selectedChroma === ch ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
                          cursor: 'pointer',
                          fontWeight: selectedChroma === ch ? 700 : 500,
                        }}
                      >
                        {ch === 'none' ? 'Alpha (Transparent)' : ch.charAt(0).toUpperCase() + ch.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Overlays List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto', maxHeight: '300px' }}>
                  {filteredObsOptions.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      No OBS layouts matched &quot;{obsSearchTerm}&quot;
                    </div>
                  ) : (
                    filteredObsOptions.map(opt => (
                      <div
                        key={opt.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.35rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-bg-base)',
                          border: '1px solid var(--color-border-subtle)',
                          gap: '0.5rem',
                        }}
                      >
                        <a
                          href={opt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsObsMenuOpen(false)}
                          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.45rem', flex: 1, minWidth: 0 }}
                        >
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: opt.badgeColor || 'var(--color-gold-bright)',
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {opt.title}
                            </div>
                            <div style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {opt.subtitle}
                            </div>
                          </div>
                        </a>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={e => copyToClipboard(opt.url, opt.key, e)}
                            style={{
                              background: 'var(--color-bg-surface)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              padding: '0.25rem 0.4rem',
                              color: 'var(--color-text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: '0.68rem',
                              gap: '0.25rem',
                            }}
                            title="Copy overlay URL to clipboard for OBS browser source"
                          >
                            {copiedKey === opt.key ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                            <span>{copiedKey === opt.key ? 'Copied' : 'Copy'}</span>
                          </button>

                          <a
                            href={opt.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setIsObsMenuOpen(false)}
                            style={{
                              padding: '0.25rem 0.35rem',
                              color: 'var(--color-text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Open in new browser tab"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Bracket Tier Tabs (Left) and Tournament Section Navigation (Right) */}
      <div style={subRowStyle}>
        {/* Left Side: Tier Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflowX: 'auto', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '0.25rem', whiteSpace: 'nowrap' }}>
            Bracket Tier:
          </span>
          {tournament.tiers.length === 0 ? (
            <Link
              to={`/${tournament.slug}/manage/settings`}
              onClick={e => handleLinkClick(e, `/${tournament.slug}/manage/settings`)}
              style={{
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                textDecoration: 'none',
                border: '1px dashed var(--color-border)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
              }}
              title="No bracket tiers configured. Click to configure in Settings."
            >
              <span>+ Add Bracket Tier in Settings</span>
            </Link>
          ) : (
            tournament.tiers.map(tier => {
              const isTierActive = isBracketSpecificView && activeTier?.id === tier.id;
              const tierPrimary = tier.primaryColor || '#f59e0b';
              let targetPath = `/${tournament.slug}/${tier.slug}`;
              if (activeView === 'sheet') targetPath = `/${tournament.slug}/manage/sheet?tier=${tier.slug}`;
              else if (activeView === 'judge') targetPath = `/${tournament.slug}/manage/judge?tier=${tier.slug}`;

              return (
                <Link
                  key={tier.id}
                  to={targetPath}
                  onClick={e => handleLinkClick(e, targetPath)}
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    background: isTierActive ? colorWithAlpha(tierPrimary, 0.2, 'var(--color-gold-bg)') : colorWithAlpha(tierPrimary, 0.05, 'transparent'),
                    color: isTierActive ? tierPrimary : 'var(--color-text-secondary)',
                    border: isTierActive ? `1px solid ${colorWithAlpha(tierPrimary, 0.7, 'var(--color-gold)')}` : `1px solid ${colorWithAlpha(tierPrimary, 0.25, 'var(--color-border)')}`,
                    boxShadow: isTierActive ? `0 0 10px ${colorWithAlpha(tierPrimary, 0.25, 'rgba(245, 158, 11, 0.2)')}` : 'none',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: tierPrimary,
                      boxShadow: isTierActive ? `0 0 6px ${tierPrimary}` : 'none',
                      opacity: isTierActive ? 1 : 0.7,
                      flexShrink: 0,
                    }}
                  />
                  <span>{tier.name}</span>
                </Link>
              );
            })
          )}
        </div>

        {/* Right Side: Section Navigation (Qualifiers, Standings, Register Players, Settings) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--color-bg-surface-highlight)', padding: '0.15rem', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}>
          <Link
            to={`/${tournament.slug}/leaderboard`}
            onClick={e => handleLinkClick(e, `/${tournament.slug}/leaderboard`)}
            style={{
              ...viewTabStyle,
              background: activeView === 'leaderboard' ? 'var(--color-bg-surface)' : 'transparent',
              color: activeView === 'leaderboard' ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
              fontWeight: activeView === 'leaderboard' ? 700 : 500,
            }}
          >
            🏆 Qualifiers
          </Link>

          <Link
            to={`/${tournament.slug}/standings`}
            onClick={e => handleLinkClick(e, `/${tournament.slug}/standings`)}
            style={{
              ...viewTabStyle,
              background: activeView === 'standings' ? 'var(--color-bg-surface)' : 'transparent',
              color: activeView === 'standings' ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
              fontWeight: activeView === 'standings' ? 700 : 500,
            }}
          >
            🏅 Standings
          </Link>

          <Link
            to={`/${tournament.slug}/manage/players`}
            onClick={e => handleLinkClick(e, `/${tournament.slug}/manage/players`)}
            style={{
              ...viewTabStyle,
              background: activeView === 'players' ? 'var(--color-bg-surface)' : 'transparent',
              color: activeView === 'players' ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
              fontWeight: activeView === 'players' ? 700 : 500,
            }}
          >
            👥 Register Players
          </Link>

          <Link
            to={`/${tournament.slug}/manage/settings`}
            onClick={e => handleLinkClick(e, `/${tournament.slug}/manage/settings`)}
            style={{
              ...viewTabStyle,
              background: activeView === 'settings' ? 'var(--color-bg-surface)' : 'transparent',
              color: activeView === 'settings' ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
              fontWeight: activeView === 'settings' ? 700 : 500,
            }}
          >
            ⚙️ Settings
          </Link>
        </div>
      </div>

      {/* Verify / Lock Bracket Modal (triggered from Mode button in Row 1) */}
      <VerifyBracketModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        tournament={tournament}
      />
    </header>
  );
};

const logoIconStyle: React.CSSProperties = {
  width: '26px',
  height: '26px',
  borderRadius: '5px',
  background: 'linear-gradient(135deg, var(--color-gold-bright) 0%, var(--color-gold) 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.4)',
};

const tournamentSelectBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  background: 'var(--color-bg-surface-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.28rem 0.65rem',
  color: 'var(--color-text-primary)',
  fontSize: '0.82rem',
  cursor: 'pointer',
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  minWidth: '260px',
  background: 'var(--color-bg-surface-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-lg)',
  zIndex: 200,
  overflow: 'hidden',
};

const dropdownItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '0.55rem 0.75rem',
  border: 'none',
  cursor: 'pointer',
  borderBottom: '1px solid var(--color-border-subtle)',
};

const viewTabStyle: React.CSSProperties = {
  padding: '0.25rem 0.55rem',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.78rem',
  textDecoration: 'none',
  transition: 'all 0.1s ease',
  whiteSpace: 'nowrap',
};

const headerContainerStyle: React.CSSProperties = {
  background: 'var(--color-bg-surface)',
  borderBottom: '1px solid var(--color-border)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
};

const topRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.45rem 1.25rem',
  borderBottom: '1px solid var(--color-border-subtle)',
  flexWrap: 'wrap',
  gap: '0.65rem',
};

const subRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.32rem 1.25rem',
  background: 'var(--color-bg-surface-elevated)',
  flexWrap: 'wrap',
  gap: '0.65rem',
};
