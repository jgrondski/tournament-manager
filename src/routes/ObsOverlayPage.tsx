import React, { useMemo, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';
import { ObsBracketView } from '../features/obs/components/ObsBracketView';
import { ObsMatchCardView } from '../features/obs/components/ObsMatchCardView';
import { BracketViewMode } from '../features/bracket/bracketLayout';
import { generateDraftBracketsForTournament } from '../features/qualifiers/scoring';

export const ObsOverlayPage: React.FC = () => {
  const { slug, tierSlug, matchId: routeMatchId } = useParams<{
    slug: string;
    tierSlug?: string;
    matchId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const { getTournamentBySlug } = useTournament();

  const queryMatchId = searchParams.get('match') || undefined;
  const matchId = routeMatchId || queryMatchId;
  const viewMode = (searchParams.get('view') as BracketViewMode) || 'fit';
  const chroma = searchParams.get('chroma');

  useEffect(() => {
    document.body.classList.add('obs-overlay-mode');
    return () => {
      document.body.classList.remove('obs-overlay-mode');
    };
  }, []);

  const tournament = slug ? getTournamentBySlug(slug) : undefined;

  const resolvedTier = useMemo(() => {
    if (!tournament) return undefined;
    const targetSlug = tierSlug || tournament.tiers[0]?.slug;
    let tier = tournament.tiers.find(t => t.slug === targetSlug || t.id === targetSlug) || tournament.tiers[0];
    if (!tier) return undefined;

    // Ensure draft bracket preview is active if tournament is unlocked / pre-lock
    if (!tournament.isLocked && (!tier.bracket || !tier.bracket.rounds || tier.bracket.rounds.length === 0)) {
      const draftTiers = generateDraftBracketsForTournament(tournament);
      const matched = draftTiers.find(t => t.id === tier.id || t.slug === tier.slug);
      if (matched?.bracket && matched.bracket.rounds?.length > 0) {
        tier = matched;
      }
    }
    return tier;
  }, [tournament, tierSlug]);

  if (!tournament) {
    return (
      <div style={{ padding: '2rem', color: '#94a3b8', textAlign: 'center', background: 'transparent' }}>
        <h3>Loading Tournament Broadcast Stream...</h3>
      </div>
    );
  }

  if (matchId) {
    return (
      <ObsMatchCardView
        tournament={tournament}
        tier={resolvedTier}
        matchId={matchId}
        chroma={chroma}
      />
    );
  }

  if (!resolvedTier) {
    return (
      <div style={{ padding: '2rem', color: '#94a3b8', textAlign: 'center', background: 'transparent' }}>
        <h3>No Tier Bracket Configured</h3>
      </div>
    );
  }

  return (
    <ObsBracketView
      tournament={tournament}
      tier={resolvedTier}
      viewMode={viewMode}
      chroma={chroma}
    />
  );
};
