import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Tournament, TournamentTier } from '../features/tournament/types';
import { useTournament } from '../features/tournament/store';
import { useOrganization } from '../features/organizations/store';
import { VerifyBracketModal } from '../features/tournament/components/VerifyBracketModal';
import {
  Layers,
  ChevronDown,
  Trophy,
  BarChart3,
  Sheet,
  GitBranch,
  Scale,
  Video,
  Users,
  Settings,
  Globe2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Check,
  Building2,
} from 'lucide-react';

export type SidebarNavView =
  | 'leaderboard'
  | 'standings'
  | 'sheet'
  | 'bracket'
  | 'judge'
  | 'obs'
  | 'players'
  | 'settings'
  | 'globalPlayers'
  | 'organizations'
  | 'tournaments';

interface TournamentSidebarProps {
  tournament?: Tournament;
  activeTier?: TournamentTier;
  activeView?: SidebarNavView;
  onNavigate?: (url: string) => boolean | void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const TournamentSidebar: React.FC<TournamentSidebarProps> = ({
  tournament,
  activeTier,
  activeView,
  onNavigate,
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse,
}) => {
  const { tournaments, unlockBrackets, setActiveTournamentId } = useTournament();
  const { getOrganizationById } = useOrganization();
  const navigate = useNavigate();

  // Internal collapse state with localStorage persistence if not controlled externally
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('tm_sidebar_collapsed') === 'true';
  });

  const isCollapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      const nextState = !isCollapsed;
      setInternalCollapsed(nextState);
      localStorage.setItem('tm_sidebar_collapsed', String(nextState));
    }
  };

  const [isTournamentMenuOpen, setIsTournamentMenuOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const activeTourney = tournament || tournaments[0];
  const currentTierSlug = activeTier?.slug || activeTourney?.tiers[0]?.slug;
  const currentOrg = activeTourney?.organizationId ? getOrganizationById(activeTourney.organizationId) : undefined;

  useEffect(() => {
    if (activeTourney?.id) {
      setActiveTournamentId(activeTourney.id);
    }
  }, [activeTourney?.id, setActiveTournamentId]);

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    if (onNavigate) {
      const allowed = onNavigate(url);
      if (allowed === false) {
        e.preventDefault();
      }
    }
  };

  const handleUnlockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeTourney) return;
    const res = unlockBrackets(activeTourney.id);
    if (!res.success && res.error) {
      setUnlockError(res.error);
    } else {
      setUnlockError(null);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-tournament-menu]')) {
        setIsTournamentMenuOpen(false);
      }
    };
    if (isTournamentMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isTournamentMenuOpen]);

  const slug = activeTourney?.slug;

  const navItems = [
    {
      key: 'leaderboard' as const,
      label: 'Qualifiers',
      icon: BarChart3,
      to: slug ? `/${slug}/leaderboard` : '/',
      badge: null,
    },
    {
      key: 'standings' as const,
      label: 'Standings',
      icon: Trophy,
      to: slug ? `/${slug}/standings` : '/',
      badge: null,
    },
    {
      key: 'sheet' as const,
      label: 'Master Sheet',
      icon: Sheet,
      to: slug ? `/${slug}/manage/sheet` : '/',
      badge: null,
    },
    {
      key: 'bracket' as const,
      label: 'Brackets',
      icon: GitBranch,
      to: slug ? (currentTierSlug ? `/${slug}/${currentTierSlug}` : `/${slug}/brackets`) : '/',
      badge: activeTourney?.tiers.length ? `${activeTourney.tiers.length} Tiers` : null,
    },
    {
      key: 'judge' as const,
      label: 'Floor Judge',
      icon: Scale,
      to: slug ? `/${slug}/manage/judge` : '/',
      badge: null,
    },
    {
      key: 'obs' as const,
      label: 'OBS Hub',
      icon: Video,
      to: slug ? `/${slug}/obs` : '/',
      badge: null,
    },
    {
      key: 'players' as const,
      label: 'Tournament Roster',
      icon: Users,
      to: slug ? `/${slug}/manage/players` : '/',
      badge: activeTourney?.playersPool?.length ? String(activeTourney.playersPool.length) : null,
    },
    {
      key: 'settings' as const,
      label: 'Settings',
      icon: Settings,
      to: slug ? `/${slug}/manage/settings` : '/',
      badge: null,
    },
  ];

  return (
    <>
      <aside
        style={{
          width: isCollapsed ? '60px' : '220px',
          minWidth: isCollapsed ? '60px' : '220px',
          height: '100vh',
          position: 'sticky',
          top: 0,
          background: 'var(--color-bg-surface)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 90,
          overflowY: 'auto',
          overflowX: 'hidden',
          userSelect: 'none',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: isCollapsed ? '0.85rem 0.5rem' : '0.85rem 0.95rem',
            borderBottom: '1px solid var(--color-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              textDecoration: 'none',
              overflow: 'hidden',
            }}
            title="Tournament Manager Home"
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'var(--color-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-gold)',
                flexShrink: 0,
              }}
            >
              <Layers size={16} color="#090d16" />
            </div>
            {!isCollapsed && (
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.1,
                }}
              >
                TOURNAMENT <span style={{ color: 'var(--color-gold-bright)' }}>MGR</span>
              </span>
            )}
          </Link>
        </div>

        {/* Tournament Switcher & Mode Pill */}
        {activeTourney && (
          <div
            style={{
              padding: isCollapsed ? '0.65rem 0.35rem' : '0.65rem 0.75rem',
              borderBottom: '1px solid var(--color-border-subtle)',
              background: 'rgba(0, 0, 0, 0.15)',
              position: 'relative',
            }}
            data-tournament-menu
          >
            {/* Org Shortcut Chip */}
            {currentOrg && !isCollapsed && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.35rem',
                  padding: '0 0.15rem',
                }}
              >
                <Link
                  to={`/org/${currentOrg.slug}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    minWidth: 0,
                    textDecoration: 'none',
                  }}
                  title={`View Organization: ${currentOrg.name}`}
                >
                  <Building2 size={11} color="var(--color-gold-bright, #ffc905)" />
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'var(--color-gold-bright, #ffc905)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {currentOrg.shortName || currentOrg.slug.toUpperCase()}
                  </span>
                </Link>
                <Link
                  to={`/org/${currentOrg.slug}`}
                  style={{
                    fontSize: '0.65rem',
                    color: 'var(--color-text-muted, #64748b)',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                  title={`View ${currentOrg.name} Dashboard`}
                >
                  Org Hub ↗
                </Link>
              </div>
            )}

            {/* Tournament Selector Dropdown Button */}
            <button
              type="button"
              onClick={() => setIsTournamentMenuOpen(prev => !prev)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: '0.35rem 0.45rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-base)',
                color: 'var(--color-text-primary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                overflow: 'hidden',
              }}
              title={activeTourney.name}
            >
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: isCollapsed ? 'none' : 'block',
                }}
              >
                {activeTourney.name}
              </span>
              {isCollapsed ? (
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-gold-bright)' }}>
                  {activeTourney.name.substring(0, 2).toUpperCase()}
                </span>
              ) : (
                <ChevronDown size={13} color="var(--color-text-muted)" style={{ flexShrink: 0, marginLeft: '0.3rem' }} />
              )}
            </button>

            {/* Upgraded Workspace & Context Dropdown Menu */}
            {isTournamentMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: isCollapsed ? '60px' : '0.75rem',
                  width: '260px',
                  background: 'var(--color-bg-surface-elevated, #161922)',
                  border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
                  borderRadius: 'var(--radius-md, 8px)',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.65)',
                  zIndex: 200,
                  overflow: 'hidden',
                  marginTop: '0.35rem',
                }}
              >
                {/* 1. Circuit / Org Header */}
                {currentOrg && (
                  <div
                    style={{
                      padding: '0.6rem 0.85rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderBottom: '1px solid var(--color-border-subtle, rgba(255,255,255,0.06))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                      <Building2 size={13} color="var(--color-gold-bright, #ffc905)" style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#ffffff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {currentOrg.name}
                      </span>
                    </div>
                    <Link
                      to={`/org/${currentOrg.slug}`}
                      onClick={() => setIsTournamentMenuOpen(false)}
                      style={{
                        fontSize: '0.68rem',
                        color: 'var(--color-gold-bright, #ffc905)',
                        textDecoration: 'none',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                      title="Open Organization Dashboard"
                    >
                      Org Hub →
                    </Link>
                  </div>
                )}

                {/* 2. Switch Tournament List */}
                <div
                  style={{
                    padding: '0.45rem 0.85rem 0.25rem',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    color: 'var(--color-text-muted, #64748b)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Tournaments ({tournaments.length})
                </div>
                <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  {tournaments.map(t => {
                    const isSelected = t.id === activeTourney.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setIsTournamentMenuOpen(false);
                          navigate(`/${t.slug}/leaderboard`);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.45rem 0.85rem',
                          fontSize: '0.78rem',
                          color: isSelected ? 'var(--color-gold-bright, #ffc905)' : 'var(--color-text-primary, #ffffff)',
                          background: isSelected ? 'rgba(255, 201, 5, 0.1)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontWeight: isSelected ? 700 : 500,
                          transition: 'background 0.12s ease',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.name}
                        </span>
                        {isSelected && <Check size={13} color="var(--color-gold-bright, #ffc905)" style={{ flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>

                {/* 3. Global Views Quick-Hop */}
                <div
                  style={{
                    borderTop: '1px solid var(--color-border-subtle, rgba(255,255,255,0.06))',
                    background: 'rgba(0, 0, 0, 0.15)',
                    padding: '0.35rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.15rem',
                  }}
                >
                  <div
                    style={{
                      padding: '0.25rem 0.55rem',
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      color: 'var(--color-text-muted, #64748b)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Global Navigation
                  </div>
                  <Link
                    to="/"
                    onClick={() => setIsTournamentMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.35rem 0.55rem',
                      borderRadius: 'var(--radius-sm, 6px)',
                      fontSize: '0.74rem',
                      color: 'var(--color-text-secondary, #94a3b8)',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    <Trophy size={13} />
                    <span>All Tournaments</span>
                  </Link>
                  <Link
                    to="/organizations"
                    onClick={() => setIsTournamentMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.35rem 0.55rem',
                      borderRadius: 'var(--radius-sm, 6px)',
                      fontSize: '0.74rem',
                      color: 'var(--color-text-secondary, #94a3b8)',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    <Building2 size={13} />
                    <span>Organizations Directory</span>
                  </Link>
                  <Link
                    to="/players"
                    onClick={() => setIsTournamentMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.35rem 0.55rem',
                      borderRadius: 'var(--radius-sm, 6px)',
                      fontSize: '0.74rem',
                      color: 'var(--color-text-secondary, #94a3b8)',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    <Users size={13} />
                    <span>Global Player Directory</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Tournament Mode Status Pill */}
            <div style={{ marginTop: '0.45rem' }}>
              {!activeTourney.isLocked ? (
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(true)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    gap: '0.35rem',
                    padding: isCollapsed ? '0.35rem 0.2rem' : '0.25rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: 'var(--color-gold-bright)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Qualifiers running (Draft preview). Click to lock brackets and start match play."
                >
                  <AlertTriangle size={11} color="var(--color-gold-bright)" style={{ flexShrink: 0 }} />
                  {!isCollapsed && (
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Quals Mode (Lock)
                    </span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleUnlockClick}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    gap: '0.35rem',
                    padding: isCollapsed ? '0.35rem 0.2rem' : '0.25rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38bdf8',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Match play in progress (Locked). Click to unlock back to Qualifiers."
                >
                  <ShieldCheck size={11} color="#38bdf8" style={{ flexShrink: 0 }} />
                  {!isCollapsed && (
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Match Play (Unlock)
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section Label: Tournament Views */}
        {!isCollapsed && (
          <div
            style={{
              padding: '0.65rem 0.95rem 0.25rem 0.95rem',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Tournament
          </div>
        )}

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '0.35rem 0.4rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {navItems.map(item => {
            const isActive = activeView === item.key;
            const Icon = item.icon;

            return (
              <Link
                key={item.key}
                to={item.to}
                onClick={e => handleLinkClick(e, item.to)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: isCollapsed ? '0.55rem 0' : '0.5rem 0.75rem',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
                  background: isActive ? 'var(--color-gold-bg)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--color-gold-bright)' : '3px solid transparent',
                  textDecoration: 'none',
                  transition: 'background 0.12s ease, color 0.12s ease',
                  position: 'relative',
                }}
                title={item.label}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                {!isCollapsed && (
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>
                )}
                {!isCollapsed && item.badge && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.4rem',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Global / System Divider & Navigation */}
        <div style={{ borderTop: '1px solid var(--color-border-subtle)', padding: '0.35rem 0.4rem' }}>
          {!isCollapsed && (
            <div
              style={{
                padding: '0.45rem 0.55rem 0.25rem 0.55rem',
                fontSize: '0.65rem',
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              System
            </div>
          )}

          {/* All Tournaments */}
          <Link
            to="/"
            onClick={e => handleLinkClick(e, '/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: isCollapsed ? '0.55rem 0' : '0.45rem 0.75rem',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: activeView === 'tournaments' ? 700 : 500,
              color: activeView === 'tournaments' ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
              background: activeView === 'tournaments' ? 'var(--color-gold-bg)' : 'transparent',
              borderLeft: activeView === 'tournaments' ? '3px solid var(--color-gold-bright)' : '3px solid transparent',
              textDecoration: 'none',
              transition: 'background 0.12s ease, color 0.12s ease',
            }}
            title="All Tournaments"
          >
            <Trophy size={16} style={{ flexShrink: 0 }} />
            {!isCollapsed && (
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Tournaments
              </span>
            )}
          </Link>

          {/* Organizations Directory */}
          <Link
            to="/organizations"
            onClick={e => handleLinkClick(e, '/organizations')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: isCollapsed ? '0.55rem 0' : '0.45rem 0.75rem',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: activeView === 'organizations' ? 700 : 500,
              color: activeView === 'organizations' ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
              background: activeView === 'organizations' ? 'var(--color-gold-bg)' : 'transparent',
              borderLeft: activeView === 'organizations' ? '3px solid var(--color-gold-bright)' : '3px solid transparent',
              textDecoration: 'none',
              transition: 'background 0.12s ease, color 0.12s ease',
            }}
            title="Organizations Directory"
          >
            <Building2 size={16} style={{ flexShrink: 0 }} />
            {!isCollapsed && (
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Organizations
              </span>
            )}
          </Link>

          {/* Global Player Pool */}
          <Link
            to="/players"
            onClick={e => handleLinkClick(e, '/players')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: isCollapsed ? '0.55rem 0' : '0.45rem 0.75rem',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: activeView === 'globalPlayers' ? 700 : 500,
              color: activeView === 'globalPlayers' ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
              background: activeView === 'globalPlayers' ? 'var(--color-gold-bg)' : 'transparent',
              borderLeft: activeView === 'globalPlayers' ? '3px solid var(--color-gold-bright)' : '3px solid transparent',
              textDecoration: 'none',
              transition: 'background 0.12s ease, color 0.12s ease',
            }}
            title="Global Master Player Pool"
          >
            <Globe2 size={16} style={{ flexShrink: 0 }} />
            {!isCollapsed && (
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Global Players
              </span>
            )}
          </Link>

          {/* Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={handleToggle}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: isCollapsed ? '0.55rem 0' : '0.45rem 0.75rem',
              marginTop: '0.35rem',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'color 0.12s ease, background 0.12s ease',
            }}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!isCollapsed && <span>Collapse Sidebar</span>}
          </button>
        </div>
      </aside>

      {/* Verification / Lock Modal */}
      {activeTourney && (
        <VerifyBracketModal
          isOpen={isVerifyModalOpen}
          onClose={() => setIsVerifyModalOpen(false)}
          tournament={activeTourney}
        />
      )}

      {/* Unlock Error Notification */}
      {unlockError && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '1.5rem',
            background: '#ef4444',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-xl)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <span>{unlockError}</span>
          <button
            onClick={() => setUnlockError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '1rem',
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
};
