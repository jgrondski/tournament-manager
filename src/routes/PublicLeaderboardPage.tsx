import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';
import { TournamentLayout } from '../components/TournamentLayout';
import { SpectatorLayout } from '../components/SpectatorLayout';
import { LeaderboardTable } from '../features/qualifiers/components/LeaderboardTable';
import { ManualSeedingManager } from '../features/tournament/components/seeding/ManualSeedingManager';
import { ShareBracketModal } from '../features/bracket/components/ShareBracketModal';
import { LoadingScreen } from '../components/LoadingScreen';

export const PublicLeaderboardPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getTournamentBySlug, isLoading, isHydrated } = useTournament();

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

  if (isLoading || !isHydrated) {
    return <LoadingScreen message="Loading leaderboard..." />;
  }

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

  // If manual seeding is active, render the Manual Seeding Manager
  if (tournament.seedingMethod === 'MANUAL') {
    if (isObsMode) {
      return (
        <div className="obs-mode-canvas" style={{ width: '100%', minHeight: '100vh', background: 'transparent', padding: '2rem 1.5rem', boxSizing: 'border-box' }}>
          <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
            <ManualSeedingManager tournament={tournament} canManage={false} isObsMode={true} />
          </div>
        </div>
      );
    }

    if (isManageRoute) {
      return (
        <TournamentLayout tournament={tournament} activeView="leaderboard">
          <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
            <ManualSeedingManager tournament={tournament} canManage={true} />
          </main>
        </TournamentLayout>
      );
    }

    return (
      <SpectatorLayout
        tournament={tournament}
        activeView="leaderboard"
        onOpenShare={() => setIsShareModalOpen(true)}
      >
        <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <ManualSeedingManager tournament={tournament} canManage={false} />
        </main>

        <ShareBracketModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          tournament={tournament}
        />
      </SpectatorLayout>
    );
  }

  if (isObsMode) {
    return (
      <div className="obs-mode-canvas" style={{ width: '100%', minHeight: '100vh', background: 'transparent', padding: '2rem 1.5rem', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          <LeaderboardTable tournament={tournament} isObsMode={true} />
        </div>
      </div>
    );
  }

  if (isManageRoute) {
    return (
      <TournamentLayout tournament={tournament} activeView="leaderboard">
        <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <LeaderboardTable tournament={tournament} canManage={true} />
        </main>
      </TournamentLayout>
    );
  }

  return (
    <SpectatorLayout
      tournament={tournament}
      activeView="leaderboard"
      onOpenShare={() => setIsShareModalOpen(true)}
    >
      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <LeaderboardTable tournament={tournament} canManage={false} />
      </main>

      <ShareBracketModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        tournament={tournament}
      />
    </SpectatorLayout>
  );
};
