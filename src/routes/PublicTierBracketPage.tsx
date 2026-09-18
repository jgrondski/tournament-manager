import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';
import { TournamentLayout } from '../components/TournamentLayout';
import { BracketVisualizer } from '../features/bracket/components/BracketVisualizer';
import { BracketTierBar } from '../features/bracket/components/BracketTierBar';
import { BracketViewMode } from '../features/bracket/bracketLayout';

export const PublicTierBracketPage: React.FC = () => {
  const { slug, tierSlug } = useParams<{ slug: string; tierSlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getTierBySlug, getTournamentBySlug } = useTournament();

  const isObsMode = searchParams.get('obs') === 'true';
  const urlView = searchParams.get('view') as BracketViewMode | null;
  const [localViewMode, setLocalViewMode] = useState<BracketViewMode>(urlView || (isObsMode ? 'fit' : 'standard'));
  const chroma = searchParams.get('chroma');

  // Update view mode if query param changes
  useEffect(() => {
    if (urlView) {
      setLocalViewMode(urlView);
    }
  }, [urlView]);

  const tierData = slug && tierSlug ? getTierBySlug(slug, tierSlug) : undefined;
  const tournamentFallback = slug ? getTournamentBySlug(slug) : undefined;

  // If in OBS mode, ensure background is transparent or chroma
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

  // Handle missing tier / friendly aliases (e.g. /:slug/brackets)
  if (!tierData) {
    if (tournamentFallback && tournamentFallback.tiers.length > 0) {
      return <Navigate to={`/${tournamentFallback.slug}/${tournamentFallback.tiers[0].slug}`} replace />;
    }

    if (tournamentFallback && tournamentFallback.tiers.length === 0) {
      return (
        <TournamentLayout tournament={tournamentFallback} activeView="bracket">
          <main
            style={{
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
            }}
          >
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
        </TournamentLayout>
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

  // OBS Overlay Mode: strip all chrome, navbars, and sidebars completely
  if (isObsMode) {
    const chromaBg = chroma
      ? chroma.startsWith('#')
        ? chroma
        : chroma.toLowerCase() === 'green'
        ? '#00ff00'
        : chroma.toLowerCase() === 'magenta'
        ? '#ff00ff'
        : chroma.toLowerCase() === 'blue'
        ? '#0000ff'
        : `#${chroma}`
      : 'transparent';

    return (
      <div className="obs-mode-canvas" style={{ width: '100%', minHeight: '100vh', background: chromaBg }}>
        <BracketVisualizer
          tournament={tournament}
          tier={tier}
          isObsMode={true}
          canManage={false}
          obsView={localViewMode}
          chroma={chroma}
        />
      </div>
    );
  }

  const tierBg = tier.backgroundColor || 'var(--color-bg-base)';

  return (
    <TournamentLayout
      tournament={tournament}
      activeTier={tier}
      activeView="bracket"
      contentStyle={{ background: tierBg, minHeight: '100vh' }}
    >
      <BracketTierBar
        tournament={tournament}
        activeTier={tier}
        viewMode={localViewMode}
        onChangeViewMode={setLocalViewMode}
        canManage={true}
      />
      <main style={{ flex: 1, padding: 0, minHeight: 0 }}>
        <BracketVisualizer
          tournament={tournament}
          tier={tier}
          isObsMode={false}
          canManage={true}
          obsView={localViewMode}
        />
      </main>
    </TournamentLayout>
  );
};
