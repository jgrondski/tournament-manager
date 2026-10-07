import React, { useMemo, useEffect } from 'react';
import { Tournament, TournamentTier } from '../../tournament/types';
import { BracketVisualizer } from '../../bracket/components/BracketVisualizer';
import { BracketViewMode } from '../../bracket/bracketLayout';
import { generateDraftBracketsForTournament } from '../../qualifiers/scoring';

export interface ObsBracketViewProps {
  tournament: Tournament;
  tier: TournamentTier;
  viewMode?: BracketViewMode;
  chroma?: string | null;
}

export const ObsBracketView: React.FC<ObsBracketViewProps> = ({
  tournament,
  tier,
  viewMode = 'fit',
  chroma = null,
}) => {
  // Ensure document body has transparent overlay styling
  useEffect(() => {
    document.body.classList.add('obs-overlay-mode');
    return () => {
      document.body.classList.remove('obs-overlay-mode');
    };
  }, []);

  // Guarantee draft bracket preview when tournament is unlocked / pre-match play
  const effectiveTier = useMemo(() => {
    if (!tier) return tier;
    if (!tournament.isLocked && (!tier.bracket || !tier.bracket.rounds || tier.bracket.rounds.length === 0)) {
      const draftTiers = generateDraftBracketsForTournament(tournament);
      const matched = draftTiers.find(t => t.id === tier.id || t.slug === tier.slug);
      if (matched?.bracket && matched.bracket.rounds?.length > 0) {
        return matched;
      }
    }
    return tier;
  }, [tournament, tier]);

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
    <div
      className="obs-bracket-container"
      style={{
        width: '100vw',
        minHeight: '100vh',
        background: chromaBg,
        overflow: viewMode === 'fit' ? 'hidden' : 'auto',
      }}
    >
      <BracketVisualizer
        tournament={tournament}
        tier={effectiveTier}
        isObsMode={true}
        canManage={false}
        obsView={viewMode}
        chroma={chroma}
      />
    </div>
  );
};
