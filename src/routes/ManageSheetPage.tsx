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

  const requestedTierSlug = searchParams.get('tier') || tournament.tiers[0]?.slug || 'gold';
  const tier = tournament.tiers.find(t => t.slug === requestedTierSlug || t.id === requestedTierSlug) || tournament.tiers[0];

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
