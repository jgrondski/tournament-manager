import React from 'react';
import { Link } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';
import { Calendar, MapPin, Users, Layers } from 'lucide-react';

export const TournamentSwitcherPage: React.FC = () => {
  const { tournaments } = useTournament();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-base)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Hero Section */}
        <header style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={logoIconLargeStyle}>
              <Layers size={24} color="#090d16" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--color-text-primary)' }}>
              CTWC <span style={{ color: 'var(--color-gold-bright)' }}>TOURNAMENT MANAGER</span>
            </span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Live Regional Tournament Portal
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', maxWidth: '650px', margin: '0 auto' }}>
            Organizer command center, public broadcast brackets, and mobile floor judge portal for Classic Tetris competitions.
          </p>
        </header>

        {/* Tournaments Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '1.5rem' }}>
          {tournaments.map(tournament => {
            const defaultTier = tournament.tiers[0] || { slug: 'gold', name: 'Gold' };
            const totalPlayers = tournament.tiers.reduce((acc, t) => acc + t.playerCount, 0);

            return (
              <div
                key={tournament.id}
                style={{
                  background: 'var(--color-bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.5rem',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span className="badge badge-gold">Active Event</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      ID: {tournament.slug}
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                    {tournament.name}
                  </h2>

                  <div style={{ display: 'flex', gap: '1.25rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={15} color="var(--color-gold-bright)" />
                      {tournament.date}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={15} color="var(--color-gold-bright)" />
                      {tournament.location}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Users size={15} color="var(--color-gold-bright)" />
                      {totalPlayers} Players Seeded
                    </span>
                  </div>

                  {/* Tier Badges */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {tournament.tiers.map(t => (
                      <Link
                        key={t.id}
                        to={`/${tournament.slug}/${t.slug}`}
                        style={{
                          textDecoration: 'none',
                          padding: '0.35rem 0.75rem',
                          background: 'var(--color-bg-surface-elevated)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'var(--color-text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <span>{t.name}</span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                          ({t.playerCount}p • {t.bracketType})
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Quick Action Navigation Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <Link
                    to={`/${tournament.slug}/manage/sheet?tier=${defaultTier.slug}`}
                    className="btn btn-primary"
                    style={{ padding: '0.65rem 1rem', fontSize: '0.875rem' }}
                  >
                    📊 Organizer Sheet
                  </Link>

                  <Link
                    to={`/${tournament.slug}/${defaultTier.slug}`}
                    className="btn btn-secondary"
                    style={{ padding: '0.65rem 1rem', fontSize: '0.875rem' }}
                  >
                    🌲 Public Bracket
                  </Link>

                  <Link
                    to={`/${tournament.slug}/manage/judge?tier=${defaultTier.slug}`}
                    className="btn btn-secondary"
                    style={{ padding: '0.65rem 1rem', fontSize: '0.875rem' }}
                  >
                    📱 Floor Judge View
                  </Link>

                  <Link
                    to={`/${tournament.slug}/leaderboard`}
                    className="btn btn-secondary"
                    style={{ padding: '0.65rem 1rem', fontSize: '0.875rem' }}
                  >
                    🏆 Qualifiers
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          Classic Tetris World Championship Tournament System • LocalStorage Enabled • OBS Broadcast Ready
        </footer>
      </div>
    </div>
  );
};

const logoIconLargeStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, var(--color-gold-bright) 0%, var(--color-gold) 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: 'var(--shadow-gold)',
};
