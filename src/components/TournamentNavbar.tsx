import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Tournament, TournamentTier } from '../features/tournament/types';
import { useTournament } from '../features/tournament/store';
import { colorWithAlpha } from '../features/bracket/colorUtils';
import { Layers, ExternalLink, ChevronDown, Video, ShieldCheck, AlertTriangle } from 'lucide-react';

interface TournamentNavbarProps {
  tournament: Tournament;
  activeTier?: TournamentTier;
  activeView: 'bracket' | 'sheet' | 'judge' | 'leaderboard' | 'standings' | 'settings';
  onNavigate?: (url: string) => boolean | void;
}

export const TournamentNavbar: React.FC<TournamentNavbarProps> = ({
  tournament,
  activeTier,
  activeView,
  onNavigate,
}) => {
  const { tournaments } = useTournament();
  const navigate = useNavigate();
  const [isTournamentMenuOpen, setIsTournamentMenuOpen] = useState(false);

  const currentTierSlug = activeTier?.slug || tournament.tiers[0]?.slug || 'gold';
  const isBracketSpecificView = activeView === 'bracket' || activeView === 'sheet' || activeView === 'judge';

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

  return (
    <header style={headerContainerStyle}>
      {/* Top Level Bar: Tournament Switcher + Global Actions */}
      <div style={topRowStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Logo */}
          <Link
            to="/"
            onClick={e => handleLinkClick(e, '/')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <div style={logoIconStyle}>
              <Layers size={18} color="#090d16" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
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
              <ChevronDown size={14} color="var(--color-text-muted)" />
            </button>

            {isTournamentMenuOpen && (
              <div style={dropdownStyle} onClick={() => setIsTournamentMenuOpen(false)}>
                {tournaments.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleDropdownNavigate(`/${t.slug}/${t.tiers[0]?.slug || 'gold'}`)}
                    style={{
                      ...dropdownItemStyle,
                      background: t.id === tournament.id ? 'var(--color-gold-bg)' : 'transparent',
                      color: t.id === tournament.id ? 'var(--color-gold-bright)' : 'var(--color-text-primary)',
                      fontWeight: t.id === tournament.id ? 700 : 400,
                    }}
                  >
                    <div>
                      <div>{t.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t.date} • {t.location}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Verification Status Badge */}
          {!tournament.isLocked ? (
            <span className="badge badge-gold" style={{ fontSize: '0.7rem' }} title="Brackets in dynamic qualifier preview">
              <AlertTriangle size={12} /> QUALIFIERS MODE
            </span>
          ) : (
            <span className="badge badge-green" style={{ fontSize: '0.7rem' }} title="Match play active">
              <ShieldCheck size={12} /> MATCH PLAY MODE
            </span>
          )}
        </div>

        {/* Global Toolbar Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* OBS Mode Direct Link */}
          <a
            href={`/${tournament.slug}/${currentTierSlug}?obs=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            title="Open OBS broadcast overlay in new tab (stripped chrome, transparent background)"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
          >
            <Video size={14} color="var(--color-gold-bright)" />
            <span>OBS Overlay</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Sub-Bar: Tier Selector Tabs & View Personas */}
      <div style={subRowStyle}>
        {/* Dynamic Tier Tabs (Gold, Silver, Bronze, etc.) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto' }}>
          {tournament.tiers.map(tier => {
            const isTierActive = isBracketSpecificView && activeTier?.id === tier.id;
            const tierPrimary = tier.primaryColor || '#f59e0b';
            // Target route based on activeView
            let targetPath = `/${tournament.slug}/${tier.slug}`;
            if (activeView === 'sheet') targetPath = `/${tournament.slug}/manage/sheet?tier=${tier.slug}`;
            else if (activeView === 'judge') targetPath = `/${tournament.slug}/manage/judge?tier=${tier.slug}`;

            return (
              <Link
                key={tier.id}
                to={targetPath}
                onClick={e => handleLinkClick(e, targetPath)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
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
                  gap: '0.45rem',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
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
          })}
        </div>

        {/* View Switcher: Organizer Sheet | Bracket View | Floor Judge | Qualifiers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--color-bg-surface-highlight)', padding: '0.2rem', borderRadius: 'var(--radius-sm)' }}>
          <Link
            to={`/${tournament.slug}/manage/sheet?tier=${currentTierSlug}`}
            onClick={e => handleLinkClick(e, `/${tournament.slug}/manage/sheet?tier=${currentTierSlug}`)}
            style={{
              ...viewTabStyle,
              background: activeView === 'sheet' ? 'var(--color-bg-surface)' : 'transparent',
              color: activeView === 'sheet' ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
              fontWeight: activeView === 'sheet' ? 700 : 500,
            }}
          >
            📊 Organizer Sheet
          </Link>

          <Link
            to={`/${tournament.slug}/${currentTierSlug}`}
            onClick={e => handleLinkClick(e, `/${tournament.slug}/${currentTierSlug}`)}
            style={{
              ...viewTabStyle,
              background: activeView === 'bracket' ? 'var(--color-bg-surface)' : 'transparent',
              color: activeView === 'bracket' ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
              fontWeight: activeView === 'bracket' ? 700 : 500,
            }}
          >
            🌲 Visual Bracket
          </Link>

          <Link
            to={`/${tournament.slug}/manage/judge?tier=${currentTierSlug}`}
            onClick={e => handleLinkClick(e, `/${tournament.slug}/manage/judge?tier=${currentTierSlug}`)}
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
    </header>
  );
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
  padding: '0.75rem 1.5rem',
  borderBottom: '1px solid var(--color-border-subtle)',
  flexWrap: 'wrap',
  gap: '0.75rem',
};

const subRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.45rem 1.5rem',
  background: 'var(--color-bg-surface-elevated)',
  flexWrap: 'wrap',
  gap: '0.75rem',
};

const logoIconStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '6px',
  background: 'linear-gradient(135deg, var(--color-gold-bright) 0%, var(--color-gold) 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.4)',
};

const tournamentSelectBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  background: 'var(--color-bg-surface-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.35rem 0.75rem',
  color: 'var(--color-text-primary)',
  fontSize: '0.85rem',
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
  padding: '0.65rem 0.85rem',
  border: 'none',
  cursor: 'pointer',
  borderBottom: '1px solid var(--color-border-subtle)',
};

const viewTabStyle: React.CSSProperties = {
  padding: '0.3rem 0.65rem',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.8rem',
  textDecoration: 'none',
  transition: 'all 0.1s ease',
  whiteSpace: 'nowrap',
};
