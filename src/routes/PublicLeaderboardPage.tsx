import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';
import { TournamentNavbar } from '../components/TournamentNavbar';
import { LeaderboardTable } from '../features/qualifiers/components/LeaderboardTable';

export const PublicLeaderboardPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { getTournamentBySlug } = useTournament();

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

  const defaultTier = tournament.tiers[0];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TournamentNavbar
        tournament={tournament}
        activeTier={defaultTier}
        activeView="leaderboard"
      />
      <main style={{ flex: 1, padding: '1rem 0' }}>
        <LeaderboardTable tournament={tournament} />
      </main>
    </div>
  );
};
