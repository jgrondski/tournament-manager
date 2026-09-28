import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';
import { TournamentLayout } from '../components/TournamentLayout';
import { SpectatorLayout } from '../components/SpectatorLayout';
import { FinalStandingsTable } from '../features/tournament/components/FinalStandingsTable';
import { ShareBracketModal } from '../features/bracket/components/ShareBracketModal';

export const FinalStandingsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getTournamentBySlug } = useTournament();

  const isManageRoute = location.pathname.includes('/manage/');
  const isObsMode = searchParams.get('obs') === 'true';

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
      <div className="obs-mode-canvas" style={{ width: '100%', minHeight: '100vh', background: 'transparent', padding: '2rem 1.5rem', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          <FinalStandingsTable tournament={tournament} isObsMode={true} />
        </div>
      </div>
    );
  }

  const mainContent = (
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
          : { flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }
      }
    >
      <FinalStandingsTable tournament={tournament} />
    </main>
  );

  if (isManageRoute) {
    return (
      <TournamentLayout tournament={tournament} activeView="standings">
        {mainContent}
      </TournamentLayout>
    );
  }

  return (
    <SpectatorLayout
      tournament={tournament}
      activeView="standings"
      onOpenShare={() => setIsShareModalOpen(true)}
    >
      {mainContent}

      <ShareBracketModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        tournament={tournament}
      />
    </SpectatorLayout>
  );
};
