import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';
import { getStoredTierSlug, setStoredTierSlug } from '../features/tournament/tierStorage';
import { TournamentLayout } from '../components/TournamentLayout';
import { SpectatorLayout } from '../components/SpectatorLayout';
import { BracketVisualizer } from '../features/bracket/components/BracketVisualizer';
import { BracketTierBar } from '../features/bracket/components/BracketTierBar';
import { BracketViewMode } from '../features/bracket/bracketLayout';
import { MatchCardFeed } from '../features/bracket/components/MatchCardFeed';
import { ShareBracketModal } from '../features/bracket/components/ShareBracketModal';
import { useBracketTier } from '../features/bracket/hooks/useBracketTier';
import { ObsBracketView } from '../features/obs/components/ObsBracketView';
import { LoadingScreen } from '../components/LoadingScreen';

export const PublicTierBracketPage: React.FC = () => {
  const { slug, tierSlug } = useParams<{ slug: string; tierSlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getTournamentBySlug, isLoading: isStoreLoading, isHydrated } = useTournament();

  const isManageRoute = location.pathname.includes('/manage/');
  const canManage = isManageRoute;

  const isObsMode = searchParams.get('obs') === 'true';
  const urlView = searchParams.get('view') as BracketViewMode | null;
  const chroma = searchParams.get('chroma');

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Initialize view mode: URL param > OBS fit > Mobile feed (< 768px) > Standard
  const [localViewMode, setLocalViewMode] = useState<BracketViewMode>(() => {
    if (urlView) return urlView;
    if (isObsMode) return 'fit';
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'feed';
    }
    return 'standard';
  });

  // Update view mode if query param changes
  useEffect(() => {
    if (urlView) {
      setLocalViewMode(urlView);
    }
  }, [urlView]);

  const {
    tournament,
    tier,
    isLoading: isBracketLoading,
  } = useBracketTier(slug, tierSlug, { initialViewMode: localViewMode });

  const tournamentFallback = slug ? getTournamentBySlug(slug) : undefined;
  const tierData = tournament && tier ? { tournament, tier } : undefined;

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

  // Persist current explored tier to sessionStorage
  useEffect(() => {
    if (tierData && slug) {
      setStoredTierSlug(slug, tierData.tier.slug);
    }
  }, [tierData?.tier?.slug, slug]);

  // Loading state gate: prevent false "Bracket Not Found" flash while database initializes
  if (isStoreLoading || isBracketLoading || !isHydrated) {
    return <LoadingScreen message="Loading tournament bracket..." />;
  }

  // Handle missing tier / friendly aliases (e.g. /:slug/brackets, /:slug/view, /:slug/manage/bracket)
  if (!tierData) {
    if (tournamentFallback && tournamentFallback.tiers.length > 0) {
      const stored = getStoredTierSlug(slug);
      const targetTier =
        tournamentFallback.tiers.find(t => t.slug === stored || t.id === stored) ||
        tournamentFallback.tiers[0];
      const prefix = isManageRoute
        ? `/${tournamentFallback.slug}/manage/bracket`
        : `/${tournamentFallback.slug}`;
      const targetPath = `${prefix}/${targetTier.slug}`;
      if (location.pathname !== targetPath) {
        return <Navigate to={targetPath} replace />;
      }
    }

    if (tournamentFallback && tournamentFallback.tiers.length === 0) {
      const emptyContent = (
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
            <button onClick={() => navigate(isManageRoute ? `/${tournamentFallback.slug}/manage/qualifiers` : `/${tournamentFallback.slug}/leaderboard`)} className="btn btn-secondary">
              🏆 View Qualifiers
            </button>
            {isManageRoute && (
              <button onClick={() => navigate(`/${tournamentFallback.slug}/manage/settings`)} className="btn btn-primary">
                ⚙️ Configure Tiers in Settings
              </button>
            )}
          </div>
        </main>
      );

      return isManageRoute ? (
        <TournamentLayout tournament={tournamentFallback} activeView="bracket">
          {emptyContent}
        </TournamentLayout>
      ) : (
        <SpectatorLayout tournament={tournamentFallback} activeView="bracket" onOpenShare={() => setIsShareModalOpen(true)}>
          {emptyContent}
        </SpectatorLayout>
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

  const { tournament: activeTournament, tier: activeTier } = tierData;
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');

  // Reset player search when switching tiers
  useEffect(() => {
    setPlayerSearchTerm('');
  }, [activeTier.id]);

  // Compute matching player in the active tier bracket
  const highlightedPlayer = useMemo(() => {
    const q = playerSearchTerm.trim().toLowerCase();
    if (!q || !activeTier.bracket) return null;

    // Collect all players participating in this tier bracket
    const playerMap = new Map<string, { id: string; name: string }>();
    Object.values(activeTier.bracket.matchesById).forEach(m => {
      if (m.player1?.player?.id && m.player1.player.name) {
        playerMap.set(m.player1.player.id, { id: m.player1.player.id, name: m.player1.player.name });
      }
      if (m.player2?.player?.id && m.player2.player.name) {
        playerMap.set(m.player2.player.id, { id: m.player2.player.id, name: m.player2.player.name });
      }
    });

    const candidates = Array.from(playerMap.values());
    const matches = candidates.filter(p => p.name.toLowerCase().includes(q));

    if (matches.length === 1) {
      return matches[0];
    }
    if (matches.length > 1) {
      const exact = matches.find(p => p.name.toLowerCase() === q);
      if (exact) return exact;
    }
    return null;
  }, [playerSearchTerm, activeTier.bracket]);

  // OBS Overlay Mode: strip all chrome, navbars, and sidebars completely
  if (isObsMode) {
    return (
      <ObsBracketView
        tournament={activeTournament}
        tier={activeTier}
        viewMode={localViewMode}
        chroma={chroma}
      />
    );
  }

  const tierBg = activeTier.backgroundColor || 'var(--color-bg-base)';

  const pageContent = (
    <>
      <BracketTierBar
        tournament={activeTournament}
        activeTier={activeTier}
        viewMode={localViewMode}
        onChangeViewMode={setLocalViewMode}
        canManage={canManage}
        onOpenShare={() => setIsShareModalOpen(true)}
        playerSearchTerm={playerSearchTerm}
        onPlayerSearchTermChange={setPlayerSearchTerm}
        highlightedPlayerName={highlightedPlayer?.name || null}
      />

      {localViewMode === 'feed' ? (
        <main
          style={{
            flex: 1,
            padding: '0.75rem 0.5rem',
            width: '100%',
            maxWidth: '520px',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ marginBottom: '0.85rem', padding: '0 0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.15rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-gold-bright)' }}>
                {canManage ? 'Manage Bracket' : 'Tournament Bracket'}
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>•</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: activeTier.primaryColor || 'var(--color-gold-bright)' }}>
                {activeTier.name}
              </span>
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              {activeTournament.name}
            </h1>
          </div>

          <MatchCardFeed
            key={activeTier.id}
            tournament={activeTournament}
            tier={activeTier}
            canManage={canManage}
          />
        </main>
      ) : (
        <main
          style={{
            flex: 1,
            padding: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: localViewMode === 'fit' ? 'hidden' : 'visible',
          }}
        >
          <BracketVisualizer
            tournament={activeTournament}
            tier={activeTier}
            isObsMode={false}
            canManage={canManage}
            obsView={localViewMode}
            highlightedPlayerId={highlightedPlayer?.id || null}
          />
        </main>
      )}

      {/* Share Bracket Modal */}
      <ShareBracketModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        tournament={activeTournament}
        tier={activeTier}
      />
    </>
  );

  if (isManageRoute) {
    return (
      <TournamentLayout
        tournament={activeTournament}
        activeTier={activeTier}
        activeView="bracket"
        contentStyle={{
          background: tierBg,
          minHeight: localViewMode === 'fit' ? '100vh' : '100vh',
          height: localViewMode === 'fit' ? '100vh' : undefined,
          maxHeight: localViewMode === 'fit' ? '100vh' : undefined,
          overflow: localViewMode === 'fit' ? 'hidden' : undefined,
        }}
      >
        {pageContent}
      </TournamentLayout>
    );
  }

  return (
    <SpectatorLayout
      tournament={activeTournament}
      activeTier={activeTier}
      activeView="bracket"
      onOpenShare={() => setIsShareModalOpen(true)}
      contentStyle={{
        background: tierBg,
        minHeight: localViewMode === 'fit' ? 'calc(100vh - 56px)' : '100vh',
        height: localViewMode === 'fit' ? 'calc(100vh - 56px)' : undefined,
        maxHeight: localViewMode === 'fit' ? 'calc(100vh - 56px)' : undefined,
        overflow: localViewMode === 'fit' ? 'hidden' : undefined,
      }}
    >
      {pageContent}
    </SpectatorLayout>
  );
};

