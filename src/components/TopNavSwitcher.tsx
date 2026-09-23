import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Building2, Users, Zap, ArrowRight } from 'lucide-react';
import { useTournament } from '../features/tournament/store';
import { useOrganization } from '../features/organizations/store';

export const TopNavSwitcher: React.FC = () => {
  const location = useLocation();
  const { tournaments, activeTournament, globalPlayers } = useTournament();
  const { organizations } = useOrganization();

  const isTournaments = location.pathname === '/' || location.pathname.startsWith('/tournaments');
  const isOrganizations = location.pathname.startsWith('/organizations') || location.pathname.startsWith('/org/');
  const isPlayers = location.pathname.startsWith('/players');

  const navTabs = [
    {
      to: '/',
      label: 'Tournaments',
      icon: Trophy,
      count: tournaments.length,
      isActive: isTournaments,
    },
    {
      to: '/organizations',
      label: 'Organizations',
      icon: Building2,
      count: organizations.length,
      isActive: isOrganizations,
    },
    {
      to: '/players',
      label: 'Players',
      icon: Users,
      count: globalPlayers ? globalPlayers.length : 0,
      isActive: isPlayers,
    },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.75rem 1.5rem',
        background: 'rgba(9, 13, 22, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border-subtle, rgba(255,255,255,0.06))',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1180px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        {/* Centered Global Navigation Pills with Strict Equal 3-Column Widths */}
        <nav
          aria-label="Global Navigation"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            alignItems: 'center',
            padding: '0.3rem',
            background: 'var(--color-bg-surface-elevated, #161922)',
            borderRadius: 'var(--radius-full, 9999px)',
            border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
            gap: '0.25rem',
            width: '100%',
            maxWidth: '540px',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          {navTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius-full, 9999px)',
                  fontSize: '0.85rem',
                  fontWeight: tab.isActive ? 700 : 500,
                  color: tab.isActive ? '#090d16' : 'var(--color-text-secondary, #94a3b8)',
                  background: tab.isActive
                    ? 'var(--color-gold-bright, #ffc905)'
                    : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.18s ease',
                  boxShadow: tab.isActive ? '0 2px 8px rgba(255, 201, 5, 0.4)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={16} color={tab.isActive ? '#090d16' : 'currentColor'} style={{ flexShrink: 0 }} />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.45rem',
                      borderRadius: 'var(--radius-full, 9999px)',
                      background: tab.isActive ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      color: tab.isActive ? '#090d16' : 'var(--color-text-muted, #64748b)',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Option A: Active Tournament Quick-Return Teleport Chip */}
        {activeTournament && (
          <div
            className="top-nav-teleport-chip"
            style={{
              position: 'absolute',
              right: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Link
              to={`/${activeTournament.slug}/leaderboard`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-full, 9999px)',
                background: 'rgba(255, 201, 5, 0.12)',
                border: '1px solid rgba(255, 201, 5, 0.35)',
                color: 'var(--color-gold-bright, #ffc905)',
                fontSize: '0.8rem',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'all 0.18s ease',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)',
              }}
              title={`Return to active tournament: ${activeTournament.name}`}
            >
              <Zap size={13} color="var(--color-gold-bright, #ffc905)" style={{ flexShrink: 0 }} />
              <span
                style={{
                  maxWidth: '170px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeTournament.name}
              </span>
              <ArrowRight size={13} color="var(--color-gold-bright, #ffc905)" style={{ flexShrink: 0 }} />
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
