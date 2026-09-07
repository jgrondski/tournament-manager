import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';
import { TournamentNavbar } from '../components/TournamentNavbar';
import { BracketVisualizer } from '../features/bracket/components/BracketVisualizer';

export const PublicTierBracketPage: React.FC = () => {
  const { slug, tierSlug } = useParams<{ slug: string; tierSlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getTierBySlug } = useTournament();

  const isObsMode = searchParams.get('obs') === 'true';

  const tierData = slug && tierSlug ? getTierBySlug(slug, tierSlug) : undefined;

  // If in OBS mode, ensure background is transparent
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

  if (!tierData) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <h2>Bracket Not Found</h2>
        <p>Could not find tier "{tierSlug}" in tournament "{slug}".</p>
        <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Tournaments
        </button>
      </div>
    );
  }

  const { tournament, tier } = tierData;

  if (isObsMode) {
    return (
      <div className="obs-mode-canvas" style={{ width: '100%', minHeight: '100vh', background: 'transparent' }}>
        <BracketVisualizer
          tournament={tournament}
          tier={tier}
          isObsMode={true}
          canManage={false}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TournamentNavbar
        tournament={tournament}
        activeTier={tier}
        activeView="bracket"
      />
      <main style={{ flex: 1, padding: '1rem 0' }}>
        <BracketVisualizer
          tournament={tournament}
          tier={tier}
          isObsMode={false}
          canManage={true}
        />
      </main>
    </div>
  );
};
