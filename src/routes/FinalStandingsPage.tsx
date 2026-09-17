import React, { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';
import { TournamentNavbar } from '../components/TournamentNavbar';
import { FinalStandingsTable } from '../features/tournament/components/FinalStandingsTable';

export const FinalStandingsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getTournamentBySlug } = useTournament();

  const isObsMode = searchParams.get('obs') === 'true';

  useEffect(() => {
    if (isObsMode) {
      document.body.classList.add('obs-overlay-mode');
    } else {
      document.body.classList.remove('obs-overlay-mode');
    }
    return () => {
      document.body.classList.remove('obs-overlay-mode');
    };
  }, [isObsMode]);

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

  const isStandingsGated = tournament.tiers.length === 0 || !tournament.isLocked;

  if (isObsMode) {
    return (
      <div className="obs-mode-canvas" style={{ width: '100%', minHeight: '100vh', background: 'transparent', padding: '1rem' }}>
        <FinalStandingsTable tournament={tournament} isObsMode={true} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TournamentNavbar
        tournament={tournament}
        activeView="standings"
      />
      <main
        style={
          isStandingsGated
            ? {
                flex: 1,
                padding: '3rem 1.5rem',
                textAlign: 'center',
                maxWidth: '600px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
              }
            : { flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', width: '100%', margin: '0 auto' }
        }
      >
        <FinalStandingsTable tournament={tournament} />
      </main>
    </div>
  );
};
