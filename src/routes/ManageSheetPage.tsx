import React from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';
import { TournamentNavbar } from '../components/TournamentNavbar';
import { OrganizerSheetMatrix } from '../features/bracket/components/OrganizerSheetMatrix';

export const ManageSheetPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
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

  const requestedTierSlug = searchParams.get('tier') || tournament.tiers[0]?.slug;
  const tier = tournament.tiers.find(t => t.slug === requestedTierSlug || t.id === requestedTierSlug) || tournament.tiers[0];

  if (!tier) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <TournamentNavbar
          tournament={tournament}
          activeView="sheet"
        />
        <main style={{ flex: 1, padding: '3rem 1.5rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <h2 style={{ color: 'var(--color-text-primary)', fontSize: '1.4rem' }}>No Bracket Tiers Configured</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            This tournament does not have any bracket tiers yet. Qualifiers can be entered and ranked on the leaderboard, or you can create bracket tiers in Settings.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => navigate(`/${tournament.slug}/leaderboard`)} className="btn btn-secondary">
              🏆 View Qualifiers
            </button>
            <button onClick={() => navigate(`/${tournament.slug}/manage/settings`)} className="btn btn-primary">
              ⚙️ Configure Tiers in Settings
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TournamentNavbar
        tournament={tournament}
        activeTier={tier}
        activeView="sheet"
      />
      <main style={{ flex: 1, padding: '1.25rem 1.5rem', maxWidth: '1600px', width: '100%', margin: '0 auto' }}>
        <OrganizerSheetMatrix
          tournament={tournament}
          tier={tier}
        />
      </main>
    </div>
  );
};
