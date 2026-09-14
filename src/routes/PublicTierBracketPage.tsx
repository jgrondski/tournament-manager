import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';
import { TournamentNavbar } from '../components/TournamentNavbar';
import { BracketVisualizer } from '../features/bracket/components/BracketVisualizer';

export const PublicTierBracketPage: React.FC = () => {
  const { slug, tierSlug } = useParams<{ slug: string; tierSlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getTierBySlug, getTournamentBySlug } = useTournament();

  const isObsMode = searchParams.get('obs') === 'true';

  const tierData = slug && tierSlug ? getTierBySlug(slug, tierSlug) : undefined;
  const tournamentFallback = slug ? getTournamentBySlug(slug) : undefined;

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
    if (tournamentFallback && tournamentFallback.tiers.length === 0) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <TournamentNavbar
            tournament={tournamentFallback}
            activeView="bracket"
          />
          <main style={{ flex: 1, padding: '3rem 1.5rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <h2 style={{ color: 'var(--color-text-primary)', fontSize: '1.4rem' }}>No Bracket Tiers Configured</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              This tournament does not have any bracket tiers yet. Qualifiers can be entered and ranked on the leaderboard, or you can create bracket tiers in Settings.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={() => navigate(`/${tournamentFallback.slug}/leaderboard`)} className="btn btn-secondary">
                🏆 View Qualifiers
              </button>
              <button onClick={() => navigate(`/${tournamentFallback.slug}/manage/settings`)} className="btn btn-primary">
                ⚙️ Configure Tiers in Settings
              </button>
            </div>
          </main>
        </div>
      );
    }

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
