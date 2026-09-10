import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';
import { colorWithAlpha } from '../features/bracket/colorUtils';
import { Calendar, MapPin, Users, Layers, Plus, Settings, Trophy, ShieldCheck, AlertTriangle, X, Trash2 } from 'lucide-react';
import { QualFormat, Tournament, TournamentTier } from '../features/tournament/types';
import { generateTraditionalBracket } from '../features/bracket/math';

export const TournamentSwitcherPage: React.FC = () => {
  const { tournaments, createTournament, deleteTournament } = useTournament();
  const navigate = useNavigate();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);
  const [newTourneyName, setNewTourneyName] = useState('');
  const [newTourneySlug, setNewTourneySlug] = useState('');
  const [newTourneyDate, setNewTourneyDate] = useState('');
  const [newTourneyLocation, setNewTourneyLocation] = useState('');
  const [newTourneyFormat, setNewTourneyFormat] = useState<QualFormat>('AVERAGE_OF_X');
  const [newTourneyAvgCount, setNewTourneyAvgCount] = useState(2);

  const hasRecordedScoresOrQuals = (t: Tournament): boolean => {
    const hasQuals = (t.qualifierSubmissions && t.qualifierSubmissions.length > 0) ||
      (t.qualifiers && t.qualifiers.length > 0);
    const hasMatchScores = Object.values(t.matchScores || {}).some(
      m => m.isComplete || m.player1Wins > 0 || m.player2Wins > 0 ||
        m.games?.some(g => g.player1Points !== null || g.player2Points !== null)
    );
    return Boolean(hasQuals || hasMatchScores);
  };

  const confirmDeleteTournament = () => {
    if (tournamentToDelete) {
      deleteTournament(tournamentToDelete.id);
      setTournamentToDelete(null);
    }
  };

  const handleNameChange = (name: string) => {
    setNewTourneyName(name);
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    setNewTourneySlug(slug);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTourneyName.trim() || !newTourneySlug.trim()) return;

    // Default 2 tiers: Gold (16) and Silver (16)
    const initialTiers: TournamentTier[] = [
      {
        id: `gold_${Date.now()}`,
        slug: 'gold',
        name: 'Gold Championship',
        priority: 1,
        bracketType: 'TRADITIONAL',
        playerCount: 16,
        bestOf: 5,
        primaryColor: '#f59e0b',
        secondaryColor: '#fbbf24',
        isLocked: false,
        bracket: generateTraditionalBracket(
          Array.from({ length: 16 }, (_, i) => ({ id: `p${i + 1}`, name: `Seed ${i + 1}`, seed: i + 1 })),
          { bestOf: 5 }
        ),
      },
      {
        id: `silver_${Date.now()}`,
        slug: 'silver',
        name: 'Silver Bracket',
        priority: 2,
        bracketType: 'FLAT',
        flatWidth: 4,
        playerCount: 16,
        bestOf: 3,
        primaryColor: '#06b6d4',
        secondaryColor: '#38bdf8',
        isLocked: false,
        bracket: generateTraditionalBracket(
          Array.from({ length: 16 }, (_, i) => ({ id: `p${i + 17}`, name: `Seed ${i + 1}`, seed: i + 1 })),
          { bestOf: 3 }
        ),
      },
    ];

    const created = createTournament({
      name: newTourneyName,
      slug: newTourneySlug,
      date: newTourneyDate || 'Upcoming',
      location: newTourneyLocation || 'TBD',
      qualFormat: newTourneyFormat,
      qualAverageCount: newTourneyAvgCount,
      isLocked: false,
      tiers: initialTiers,
    });

    setIsCreateModalOpen(false);
    navigate(`/${created.slug}/manage/settings`);
  };

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
              TOURNAMENT <span style={{ color: 'var(--color-gold-bright)' }}>MANAGER</span>
            </span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Live Regional Tournament Portal
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', maxWidth: '650px', margin: '0 auto 1.5rem' }}>
            Organizer command center, public broadcast brackets, and mobile floor judge portal for competitive gaming tournaments.
          </p>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem', boxShadow: 'var(--shadow-gold)' }}
          >
            <Plus size={18} />
            Create New Tournament
          </button>
        </header>

        {/* Tournament Grid / Empty State */}
        {tournaments.length === 0 ? (
          <div
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '4rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              maxWidth: '620px',
              margin: '1rem auto 3rem',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--color-gold-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-gold-bright)',
                marginBottom: '0.5rem',
              }}
            >
              <Trophy size={30} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              No Tournaments Created Yet
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', maxWidth: '440px', lineHeight: 1.5 }}>
              Get started by creating your first competitive tournament. Configure tiers, record qualifier attempts, seed brackets, and run live match play.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
              style={{ marginTop: '0.75rem', padding: '0.7rem 1.75rem', fontSize: '0.95rem', boxShadow: 'var(--shadow-gold)' }}
            >
              <Plus size={18} />
              Create New Tournament
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '1.5rem' }}>
            {tournaments.map(tournament => {
              const defaultTier = tournament.tiers[0] || { slug: 'default', name: 'Bracket' };
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {!tournament.isLocked ? (
                          <span className="badge badge-gold">
                            <AlertTriangle size={12} /> Qualifiers Mode
                          </span>
                        ) : (
                          <span className="badge badge-green">
                            <ShieldCheck size={12} /> Match Play Mode
                          </span>
                        )}
                        <span className="badge badge-muted">
                          {tournament.qualFormat?.replace(/_/g, ' ') || 'Average'}
                        </span>
                      </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        ID: {tournament.slug}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTournamentToDelete(tournament)}
                        disabled={hasRecordedScoresOrQuals(tournament)}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          color: hasRecordedScoresOrQuals(tournament) ? 'var(--color-text-muted)' : 'var(--color-red)',
                          borderColor: hasRecordedScoresOrQuals(tournament) ? 'var(--color-border)' : 'rgba(239, 68, 68, 0.4)',
                          opacity: hasRecordedScoresOrQuals(tournament) ? 0.35 : 1,
                          cursor: hasRecordedScoresOrQuals(tournament) ? 'not-allowed' : 'pointer',
                        }}
                        title={
                          hasRecordedScoresOrQuals(tournament)
                            ? "Cannot delete tournament with active match or qualifier scores. Clear data in Settings first."
                            : `Delete "${tournament.name}"`
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
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
                    {tournament.tiers.map(t => {
                      const tColor = t.primaryColor || '#f59e0b';
                      return (
                        <Link
                          key={t.id}
                          to={`/${tournament.slug}/${t.slug}`}
                          style={{
                            textDecoration: 'none',
                            padding: '0.35rem 0.75rem',
                            background: colorWithAlpha(tColor, 0.08, 'var(--color-bg-surface-elevated)'),
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${colorWithAlpha(tColor, 0.35, 'var(--color-border)')}`,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: tColor,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ color: tColor }}>{t.name}</span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                            ({t.playerCount}p • {t.bracketType})
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Action Navigation Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                  <Link
                    to={`/${tournament.slug}/manage/sheet?tier=${defaultTier.slug}`}
                    className="btn btn-primary"
                    style={{ padding: '0.55rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    📊 Sheet
                  </Link>

                  <Link
                    to={`/${tournament.slug}/${defaultTier.slug}`}
                    className="btn btn-secondary"
                    style={{ padding: '0.55rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    🌲 Bracket
                  </Link>

                  <Link
                    to={`/${tournament.slug}/manage/judge?tier=${defaultTier.slug}`}
                    className="btn btn-secondary"
                    style={{ padding: '0.55rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    📱 Floor Judge
                  </Link>

                  <Link
                    to={`/${tournament.slug}/leaderboard`}
                    className="btn btn-secondary"
                    style={{ padding: '0.55rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    🏆 Qualifiers
                  </Link>

                  <Link
                    to={`/${tournament.slug}/standings`}
                    className="btn btn-secondary"
                    style={{ padding: '0.55rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    <Trophy size={14} color="var(--color-gold-bright)" /> Standings
                  </Link>

                  <Link
                    to={`/${tournament.slug}/manage/settings`}
                    className="btn btn-secondary"
                    style={{ padding: '0.55rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    <Settings size={14} /> Settings
                  </Link>
                </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          Tournament Manager • LocalStorage Enabled • OBS Broadcast Ready
        </footer>
      </div>

      {/* Create Tournament Modal */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--color-bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              maxWidth: '500px',
              width: '100%',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                background: 'var(--color-bg-surface-elevated)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                Create New Tournament
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={modalLabelStyle}>Tournament Name</label>
                <input
                  type="text"
                  value={newTourneyName}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. St. Louis Open 2026"
                  required
                  style={modalInputStyle}
                />
              </div>

              <div>
                <label style={modalLabelStyle}>URL Slug</label>
                <input
                  type="text"
                  value={newTourneySlug}
                  onChange={e => setNewTourneySlug(e.target.value)}
                  required
                  style={modalInputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={modalLabelStyle}>Event Date</label>
                  <input
                    type="text"
                    value={newTourneyDate}
                    onChange={e => setNewTourneyDate(e.target.value)}
                    placeholder="e.g. April 12, 2026"
                    style={modalInputStyle}
                  />
                </div>
                <div>
                  <label style={modalLabelStyle}>Location</label>
                  <input
                    type="text"
                    value={newTourneyLocation}
                    onChange={e => setNewTourneyLocation(e.target.value)}
                    placeholder="e.g. St. Louis, MO"
                    style={modalInputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={modalLabelStyle}>Qualifying Format</label>
                <select
                  value={newTourneyFormat}
                  onChange={e => setNewTourneyFormat(e.target.value as QualFormat)}
                  style={modalInputStyle}
                >
                  <option value="AVERAGE_OF_X">Average of X Attempts</option>
                  <option value="HIGH_SCORE">High Score (MAX of attempts)</option>
                  <option value="POINTS">Points Threshold System</option>
                </select>
              </div>

              {newTourneyFormat === 'AVERAGE_OF_X' && (
                <div>
                  <label style={modalLabelStyle}>Target Attempt Count (X)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newTourneyAvgCount}
                    onChange={e => setNewTourneyAvgCount(parseInt(e.target.value, 10) || 2)}
                    style={modalInputStyle}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create &amp; Configure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Speedbump Modal for Deleting Tournament */}
      {tournamentToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--color-bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-red)',
              maxWidth: '480px',
              width: '100%',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                background: 'var(--color-bg-surface-elevated)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--color-red)' }}>
                <Trash2 size={20} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Delete Tournament
                </h3>
              </div>
              <button
                onClick={() => setTournamentToDelete(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete <strong>{tournamentToDelete.name}</strong>?
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                This will destroy this tournament record and its bracket configurations. This action cannot be undone.
              </p>
            </div>

            <div
              style={{
                padding: '1rem 1.5rem',
                background: 'var(--color-bg-surface-elevated)',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => setTournamentToDelete(null)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTournament}
                className="btn btn-danger"
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Yes, Delete Tournament
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const modalLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  marginBottom: '0.35rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.85rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-base)',
  color: 'var(--color-text-primary)',
  fontSize: '0.875rem',
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
