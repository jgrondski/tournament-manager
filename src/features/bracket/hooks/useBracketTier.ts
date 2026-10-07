import { useMemo, useState, useEffect } from 'react';
import { useTournament } from '../../tournament/store';
import { Tournament, TournamentTier } from '../../tournament/types';
import { BracketStructure, BracketRound, SeededPlayer } from '../types';
import {
  calculateBracketLayout,
  BracketLayoutMetadata,
  BracketViewMode,
} from '../bracketLayout';
import { generateDraftBracketsForTournament } from '../../qualifiers/scoring';
import { canonicalizeBracketRounds } from '../types';

export interface UseBracketTierOptions {
  initialViewMode?: BracketViewMode;
}

export interface UseBracketTierResult {
  tournament: Tournament | null;
  tier: TournamentTier | null;
  layout: BracketLayoutMetadata | null;
  rounds: BracketRound[];
  championPlayer: SeededPlayer | null;
  isLoading: boolean;
  notFound: boolean;
  isDraft: boolean;
  viewMode: BracketViewMode;
  setViewMode: (mode: BracketViewMode) => void;
}

/**
 * Headless Hook for Bracket Tier Resolution, Seeding Invariants, and Geometric Layouts.
 * Guarantees that bracket tiers are always populated with valid match nodes even during qualification stage.
 */
export function useBracketTier(
  tournamentSlug?: string,
  tierSlug?: string,
  options?: UseBracketTierOptions
): UseBracketTierResult {
  const { getTournamentBySlug, isLoading: isStoreLoading, isHydrated } = useTournament();

  const [viewMode, setViewMode] = useState<BracketViewMode>(options?.initialViewMode || 'standard');

  useEffect(() => {
    if (options?.initialViewMode) {
      setViewMode(options.initialViewMode);
    }
  }, [options?.initialViewMode]);

  // Loading gate: while store is loading or not yet hydrated
  const isInitializing = isStoreLoading || !isHydrated;

  const rawTournament = tournamentSlug ? getTournamentBySlug(tournamentSlug) : undefined;

  // Resolve tier by slug or fallback to top priority tier
  const rawTier = useMemo(() => {
    if (!rawTournament || rawTournament.tiers.length === 0) return null;
    if (!tierSlug) {
      return [...rawTournament.tiers].sort((a, b) => a.priority - b.priority)[0];
    }
    return (
      rawTournament.tiers.find(t => t.slug === tierSlug || t.id === tierSlug) ||
      rawTournament.tiers[0] ||
      null
    );
  }, [rawTournament, tierSlug]);

  // Guarantee non-empty bracket structure even during pre-lock qualification stage
  const tier = useMemo(() => {
    if (!rawTier || !rawTournament) return null;

    // If tournament is pre-lock or tier has 0 rounds, compute projected/placeholder draft bracket
    if (
      !rawTournament.isLocked ||
      !rawTier.bracket ||
      !rawTier.bracket.rounds ||
      rawTier.bracket.rounds.length === 0
    ) {
      const draftTiers = generateDraftBracketsForTournament(rawTournament);
      const matchedDraft = draftTiers.find(t => t.id === rawTier.id || t.slug === rawTier.slug);
      if (matchedDraft?.bracket && matchedDraft.bracket.rounds?.length > 0) {
        return matchedDraft;
      }
    }

    return rawTier;
  }, [rawTournament, rawTier]);

  const bracket: BracketStructure | null = tier?.bracket || null;

  if (bracket?.rounds) {
    canonicalizeBracketRounds(bracket.rounds);
  }

  const rounds = useMemo(() => bracket?.rounds || [], [bracket?.rounds]);

  // Compute 2D coordinate layout
  const layout = useMemo(() => {
    if (!bracket || rounds.length === 0) return null;
    return calculateBracketLayout(bracket, undefined, viewMode);
  }, [bracket, rounds, viewMode]);

  // Determine Champion if tournament matches are completed
  const championPlayer = useMemo(() => {
    if (!bracket || rounds.length === 0 || !rawTournament) return null;
    if (tier?.eliminationType === 'DOUBLE') {
      const gfResetMatch = Object.values(bracket.matchesById).find(
        m => m.stage === 'GRAND_FINALS_RESET' || m.roundIdentifier === 'GF_RESET'
      );
      const gf1Match = Object.values(bracket.matchesById).find(
        m => m.stage === 'GRAND_FINALS' || m.roundIdentifier === 'GF'
      );
      const activeGfMatch =
        gfResetMatch && (rawTournament.matchScores[gfResetMatch.id]?.winnerPlayerId || gfResetMatch.winnerId)
          ? gfResetMatch
          : gf1Match;
      if (activeGfMatch) {
        const score = rawTournament.matchScores[activeGfMatch.id];
        const winnerId = score?.winnerPlayerId || activeGfMatch.winnerId;
        if (winnerId) {
          return winnerId === activeGfMatch.player1.player?.id
            ? activeGfMatch.player1.player
            : activeGfMatch.player2.player;
        }
      }
      return null;
    }

    const finalRound = rounds[rounds.length - 1];
    const finalMatch = finalRound?.matches[0];
    if (!finalMatch) return null;
    const champWinnerId = finalMatch.winnerId || rawTournament.matchScores[finalMatch.id]?.winnerPlayerId;
    if (champWinnerId) {
      return champWinnerId === finalMatch.player1.player?.id
        ? finalMatch.player1.player
        : champWinnerId === finalMatch.player2.player?.id
        ? finalMatch.player2.player
        : null;
    }
    return null;
  }, [bracket, rounds, rawTournament, tier?.eliminationType]);

  const notFound = !isInitializing && Boolean(tournamentSlug && !rawTournament);

  return {
    tournament: rawTournament || null,
    tier,
    layout,
    rounds,
    championPlayer,
    isLoading: isInitializing && !rawTournament,
    notFound,
    isDraft: Boolean(rawTournament && !rawTournament.isLocked),
    viewMode,
    setViewMode,
  };
}
