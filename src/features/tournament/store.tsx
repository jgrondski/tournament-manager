import React, { createContext, useContext, useState } from 'react';
import {
  Tournament,
  TournamentTier,
  MatchScoreRecord,
  GameScoreEntry,
  QualifierScore,
  PlayerProfile,
  QualifierSubmission,
  SeedingMethod,
} from './types';
import { advanceMatchWinner, retractMatchWinner, swapMatchSlots } from '../bracket/math';
import { canonicalizeBracketRounds } from '../bracket/types';
import { generateDraftBracketsForTournament } from '../qualifiers/scoring';
import {
  generateSimulatedQualifiers,
  runFullSimulation,
  generateAdditionalFakePlayers,
} from './simulation';

interface TournamentContextType {
  tournaments: Tournament[];
  globalPlayers: PlayerProfile[];
  activeTournamentId: string | null;
  activeTournament?: Tournament;
  setActiveTournamentId: (id: string | null) => void;
  getTournamentBySlug: (slug: string) => Tournament | undefined;
  getTierBySlug: (
    tournamentSlug: string,
    tierSlug: string
  ) => { tournament: Tournament; tier: TournamentTier } | undefined;
  createTournament: (
    data: Omit<
      Tournament,
      'id' | 'matchScores' | 'playersPool' | 'qualifierSubmissions' | 'tournamentPlayers'
    >
  ) => Tournament;
  updateTournament: (tournamentId: string, updates: Partial<Tournament>) => void;
  saveTiers: (tournamentId: string, tiers: TournamentTier[]) => void;
  addPlayerToPool: (tournamentId: string, player: Omit<PlayerProfile, 'id'>) => PlayerProfile;
  updatePlayerInPool: (tournamentId: string, playerId: string, updates: Partial<PlayerProfile>) => void;
  submitQualifierScore: (tournamentId: string, playerId: string, score: number) => void;
  deleteQualifierScore: (tournamentId: string, submissionId: string) => void;
  togglePlayerDisqualification: (
    tournamentId: string,
    playerId: string,
    isDisqualified: boolean
  ) => void;
  togglePlayerQualsCompleted: (
    tournamentId: string,
    playerId: string,
    qualsCompleted: boolean
  ) => void;
  togglePlayerQualifierVerified: (
    tournamentId: string,
    playerId: string,
    isVerified?: boolean
  ) => void;
  lockTournament: (tournamentId: string) => void;
  unlockBrackets: (tournamentId: string) => { success: boolean; error?: string };
  recordGameScore: (
    tournamentId: string,
    tierId: string,
    matchId: string,
    gameNumber: number,
    p1Points: number | null,
    p2Points: number | null,
    declaredWinnerId?: string | null
  ) => void;
  saveMatchScores: (
    tournamentId: string,
    tierId: string,
    matchId: string,
    scoredGames: Array<{
      gameNumber: number;
      player1Points: number | null;
      player2Points: number | null;
      winnerPlayerId: string | null;
    }>,
    hasTiebreaker?: boolean
  ) => void;
  updateMatchBestOf: (tournamentId: string, tierId: string, matchId: string, bestOf: number) => void;
  forfeitMatch: (tournamentId: string, tierId: string, matchId: string, winnerPlayerId: string) => void;
  addQualifierScore: (tournamentId: string, entry: Omit<QualifierScore, 'id' | 'totalScore'>) => void;
  verifyQualifierScore: (tournamentId: string, qualifierId: string, verified: boolean) => void;
  clearMatchScores: (tournamentId: string) => void;
  clearQualifierScores: (tournamentId: string) => void;
  clearAllTournamentData: (tournamentId: string) => void;
  seedQualifiers: (tournamentId: string) => void;
  simulateFullTournament: (tournamentId: string) => void;
  deleteTournament: (tournamentId: string) => void;
  addGlobalPlayer: (player: Omit<PlayerProfile, 'id'>) => PlayerProfile;
  updateGlobalPlayer: (playerId: string, updates: Partial<PlayerProfile>) => void;
  deleteGlobalPlayer: (playerId: string) => void;
  clearAllGlobalPlayers: () => void;
  generateFakeGlobalPlayers: (count: number) => PlayerProfile[];
  importPlayersToTournament: (tournamentId: string, players: PlayerProfile[]) => void;
  removePlayerFromTournament: (
    tournamentId: string,
    playerId: string
  ) => { success: boolean; error?: string };
  swapMatchSlots: (
    tournamentId: string,
    tierId: string,
    payload: {
      sourceMatchId: string;
      sourceSlot: 1 | 2;
      targetMatchId: string;
      targetSlot: 1 | 2;
    }
  ) => { success: boolean; error?: string };
  setSeedingMethod: (tournamentId: string, method: SeedingMethod) => void;
  setManualSeeds: (tournamentId: string, playerIds: string[]) => void;
  reorderManualSeed: (tournamentId: string, fromIndex: number, toIndex: number) => void;
  shuffleManualSeeds: (tournamentId: string) => void;
  addManualSeed: (tournamentId: string, playerId: string) => void;
  removeManualSeed: (tournamentId: string, playerId: string) => void;
  batchMoveManualSeeds: (tournamentId: string, playerIds: string[], direction: 'UP' | 'DOWN') => void;
  batchJumpManualSeeds: (tournamentId: string, playerIds: string[], targetSeed: number) => void;
  batchRemoveManualSeeds: (tournamentId: string, playerIds: string[]) => void;
  batchAddManualSeeds: (tournamentId: string, playerIds: string[], position: 'TOP' | 'BOTTOM') => void;
}

import { assertDatabaseConfig } from '../../db/config';

/**
 * Shifts clusters of selected seeds UP or DOWN.
 * Non-contiguous items move independently by 1 step (e.g. 3, 6, 9 -> 2, 5, 8).
 * Contiguous blocks shift together as a cluster, displacing the adjacent boundary item.
 */
export function shiftSeedsCluster(
  seeds: string[],
  playerIds: string[],
  direction: 'UP' | 'DOWN'
): string[] {
  if (!seeds || seeds.length <= 1 || !playerIds || playerIds.length === 0) {
    return seeds ? [...seeds] : [];
  }

  const selectedSet = new Set(playerIds);
  const result = [...seeds];

  if (direction === 'UP') {
    let i = 0;
    while (i < result.length) {
      if (selectedSet.has(result[i])) {
        const start = i;
        while (i < result.length && selectedSet.has(result[i])) {
          i++;
        }
        const end = i - 1;

        if (start > 0) {
          // Shift cluster up by 1, displacing the item at start - 1 to end
          const displaced = result[start - 1];
          for (let k = start; k <= end; k++) {
            result[k - 1] = result[k];
          }
          result[end] = displaced;
        }
      } else {
        i++;
      }
    }
  } else {
    // DOWN
    let i = result.length - 1;
    while (i >= 0) {
      if (selectedSet.has(result[i])) {
        const end = i;
        while (i >= 0 && selectedSet.has(result[i])) {
          i--;
        }
        const start = i + 1;

        if (end < result.length - 1) {
          // Shift cluster down by 1, displacing the item at end + 1 to start
          const displaced = result[end + 1];
          for (let k = end; k >= start; k--) {
            result[k + 1] = result[k];
          }
          result[start] = displaced;
        }
      } else {
        i--;
      }
    }
  }

  return result;
}

/**
 * Bunches selected seeds contiguously at the target seed in their existing relative order.
 * E.g., selecting 3, 6, 9 and jumping to 1 produces 1, 2, 3 (from 3, 6, 9 respectively).
 */
export function jumpSeedsBunched(
  seeds: string[],
  playerIds: string[],
  targetSeed: number
): string[] {
  if (!seeds || seeds.length <= 1 || !playerIds || playerIds.length === 0) {
    return seeds ? [...seeds] : [];
  }

  const selectedSet = new Set(playerIds);
  const selectedOrdered = seeds.filter(id => selectedSet.has(id));
  const remaining = seeds.filter(id => !selectedSet.has(id));

  const targetIndex = targetSeed - 1;
  const clampedIndex = Math.max(0, Math.min(targetIndex, remaining.length));

  return [
    ...remaining.slice(0, clampedIndex),
    ...selectedOrdered,
    ...remaining.slice(clampedIndex),
  ];
}

const TournamentContext = createContext<TournamentContextType | null>(null);

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  assertDatabaseConfig();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [globalPlayers, setGlobalPlayers] = useState<PlayerProfile[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);

  const activeTournament = tournaments.find(
    t => t.id === activeTournamentId || t.slug === activeTournamentId
  );
  if (activeTournament) {
    activeTournament.tiers.forEach(tier => {
      if (tier.bracket?.rounds) {
        canonicalizeBracketRounds(tier.bracket.rounds);
      }
    });
  }

  const getTournamentBySlug = (slug: string) => {
    const t = tournaments.find(t => t.slug === slug || t.id === slug);
    if (t) {
      t.tiers.forEach(tier => {
        if (tier.bracket?.rounds) {
          canonicalizeBracketRounds(tier.bracket.rounds);
        }
      });
    }
    return t;
  };

  const getTierBySlug = (tournamentSlug: string, tierSlug: string) => {
    const tournament = getTournamentBySlug(tournamentSlug);
    if (!tournament) return undefined;
    const tier = tournament.tiers.find(t => t.slug === tierSlug || t.id === tierSlug);
    if (!tier) return undefined;
    if (tier.bracket?.rounds) {
      canonicalizeBracketRounds(tier.bracket.rounds);
    }
    return { tournament, tier };
  };

  const createTournament = (
    data: Omit<
      Tournament,
      'id' | 'matchScores' | 'playersPool' | 'qualifierSubmissions' | 'tournamentPlayers'
    >
  ): Tournament => {
    const id = data.slug || `tourney_${Date.now()}`;
    const newTourney: Tournament = {
      ...data,
      id,
      organizationId: data.organizationId || 'org_ctwc',
      slug: data.slug || id,
      matchScores: {},
      playersPool: [],
      qualifierSubmissions: [],
      tournamentPlayers: {},
      seedingMethod: data.seedingMethod || 'QUALIFIERS',
      manualSeeds: data.manualSeeds || [],
      isLocked: Boolean(data.isLocked),
      tiers: data.tiers || [],
      useOrgBranding: data.useOrgBranding !== undefined ? data.useOrgBranding : true,
    };

    // Calculate initial draft brackets if tiers exist
    if (newTourney.tiers.length > 0) {
      newTourney.tiers = generateDraftBracketsForTournament(newTourney);
    }

    setTournaments(prev => [newTourney, ...prev]);
    return newTourney;
  };

  const updateTournament = (tournamentId: string, updates: Partial<Tournament>) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const updated = { ...t, ...updates };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const saveTiers = (tournamentId: string, tiers: TournamentTier[]) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const updated = { ...t, tiers };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const addPlayerToPool = (
    tournamentId: string,
    player: Omit<PlayerProfile, 'id'>
  ): PlayerProfile => {
    const newPlayer: PlayerProfile = {
      ...player,
      id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    };

    // Also sync to global players if not already present
    setGlobalPlayers(prev => {
      if (prev.some(p => p.name.toLowerCase() === newPlayer.name.toLowerCase())) {
        return prev;
      }
      return [...prev, newPlayer];
    });

    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const currentPool = t.playersPool || [];
        const updatedPool = [...currentPool, newPlayer];
        const currentTournamentPlayers = { ...(t.tournamentPlayers || {}) };
        currentTournamentPlayers[newPlayer.id] = {
          playerId: newPlayer.id,
          tournamentId,
          organizationId: t.organizationId,
        };
        const updated = {
          ...t,
          playersPool: updatedPool,
          tournamentPlayers: currentTournamentPlayers,
        };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );

    return newPlayer;
  };

  const updatePlayerInPool = (
    tournamentId: string,
    playerId: string,
    updates: Partial<PlayerProfile>
  ) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const currentPool = t.playersPool || [];
        const updatedPool = currentPool.map(p =>
          p.id === playerId ? { ...p, ...updates } : p
        );
        const updated = { ...t, playersPool: updatedPool };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const submitQualifierScore = (tournamentId: string, playerId: string, score: number) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const newSubmission: QualifierSubmission = {
          id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          tournamentId,
          organizationId: t.organizationId,
          playerId,
          score,
          submittedAt: Date.now(),
        };
        const currentSubs = t.qualifierSubmissions || [];
        const updatedSubs = [...currentSubs, newSubmission];
        const updated = { ...t, qualifierSubmissions: updatedSubs };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const deleteQualifierScore = (tournamentId: string, submissionId: string) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const currentSubs = t.qualifierSubmissions || [];
        const updatedSubs = currentSubs.filter(s => s.id !== submissionId);
        const updated = { ...t, qualifierSubmissions: updatedSubs };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const togglePlayerDisqualification = (
    tournamentId: string,
    playerId: string,
    isDisqualified: boolean
  ) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const currentPool = t.playersPool || [];
        const updatedPool = currentPool.map(p =>
          p.id === playerId ? { ...p, isDisqualified } : p
        );
        const updated = { ...t, playersPool: updatedPool };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const togglePlayerQualsCompleted = (
    tournamentId: string,
    playerId: string,
    qualsCompleted: boolean
  ) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const currentPlayers = t.tournamentPlayers || {};
        const existing = currentPlayers[playerId] || {
          playerId,
          tournamentId,
          organizationId: t.organizationId,
        };
        const updatedPlayers = {
          ...currentPlayers,
          [playerId]: { ...existing, qualsCompleted },
        };
        const updated = { ...t, tournamentPlayers: updatedPlayers };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const togglePlayerQualifierVerified = (
    tournamentId: string,
    playerId: string,
    isVerified?: boolean
  ) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const currentPlayers = t.tournamentPlayers || {};
        const existing = currentPlayers[playerId] || {
          playerId,
          tournamentId,
          organizationId: t.organizationId,
        };
        const newVerified = isVerified !== undefined ? isVerified : !existing.isVerified;
        const updatedPlayers = {
          ...currentPlayers,
          [playerId]: { ...existing, isVerified: newVerified },
        };
        return { ...t, tournamentPlayers: updatedPlayers };
      })
    );
  };

  const lockTournament = (tournamentId: string) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        // Lock brackets and freeze static match structure
        const lockedTiers = t.tiers.map(tier => ({
          ...tier,
          isLocked: true,
        }));
        // If the bracket is finalized and locked, all players not verified and completed will be auto-flipped to "verified"
        const currentPlayers = t.tournamentPlayers || {};
        const updatedPlayers = { ...currentPlayers };
        (t.playersPool || []).forEach(p => {
          const existing = updatedPlayers[p.id] || {
            playerId: p.id,
            tournamentId: t.id,
          };
          updatedPlayers[p.id] = {
            ...existing,
            isVerified: true,
            qualsCompleted: true,
          };
        });
        return {
          ...t,
          isLocked: true,
          tiers: lockedTiers,
          tournamentPlayers: updatedPlayers,
        };
      })
    );
  };

  const unlockBrackets = (tournamentId: string): { success: boolean; error?: string } => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) {
      return { success: false, error: 'Tournament not found' };
    }

    // Safety Invariant: "Unlock Brackets" is blocked if any match in the tournament contains recorded game scores.
    const hasRecordedScores = Object.values(tournament.matchScores || {}).some(
      record =>
        record.isComplete ||
        record.games.some(
          g => g.player1Points !== null || g.player2Points !== null || g.winnerPlayerId !== null
        ) ||
        record.player1Wins > 0 ||
        record.player2Wins > 0 ||
        Boolean(record.winnerPlayerId)
    );

    if (hasRecordedScores) {
      return {
        success: false,
        error: 'Cannot unlock: Match play has begun. Clear recorded scores before unlocking.',
      };
    }

    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const updated = {
          ...t,
          isLocked: false,
          tiers: t.tiers.map(tier => ({ ...tier, isLocked: false })),
        };
        // Re-generate draft brackets with current qualifiers
        updated.tiers = generateDraftBracketsForTournament(updated);
        return updated;
      })
    );

    return { success: true };
  };

  const recordGameScore = (
    tournamentId: string,
    tierId: string,
    matchId: string,
    gameNumber: number,
    p1Points: number | null,
    p2Points: number | null,
    declaredWinnerId?: string | null
  ) => {
    setTournaments(prev =>
      prev.map(tournament => {
        if (tournament.id !== tournamentId) return tournament;

        const tier = tournament.tiers.find(t => t.id === tierId);
        if (!tier) return tournament;

        const targetMatch = tier.bracket.matchesById[matchId];
        if (!targetMatch) return tournament;

        const currentRecord = tournament.matchScores[matchId] || {
          matchId,
          tierId,
          organizationId: tournament.organizationId,
          bestOf: targetMatch.bestOf || tier.bestOf,
          player1Wins: 0,
          player2Wins: 0,
          games: [],
          winnerPlayerId: null,
          loserPlayerId: null,
          isComplete: false,
        };

        const existingGames = [...currentRecord.games];
        const p1 = targetMatch.player1.player;
        const p2 = targetMatch.player2.player;

        // Determine winner of this game
        let gameWinner: string | null = declaredWinnerId ?? null;
        if (!gameWinner && p1 && p2 && p1Points !== null && p2Points !== null) {
          if (p1Points > p2Points) {
            gameWinner = p1.id;
          } else if (p2Points > p1Points) {
            gameWinner = p2.id;
          } else if (p1Points === p2Points) {
            gameWinner = 'TIE';
          }
        }

        const gameIdx = existingGames.findIndex(g => g.gameNumber === gameNumber);
        if (gameIdx >= 0) {
          existingGames[gameIdx] = {
            gameNumber,
            player1Points: p1Points,
            player2Points: p2Points,
            winnerPlayerId: gameWinner,
          };
        } else {
          existingGames.push({
            gameNumber,
            player1Points: p1Points,
            player2Points: p2Points,
            winnerPlayerId: gameWinner,
          });
        }

        existingGames.sort((a, b) => a.gameNumber - b.gameNumber);

        // Recalculate series wins
        let p1Wins = 0;
        let p2Wins = 0;
        for (const g of existingGames) {
          if (p1 && g.winnerPlayerId === p1.id) p1Wins++;
          else if (p2 && g.winnerPlayerId === p2.id) p2Wins++;
        }

        const threshold = Math.ceil(currentRecord.bestOf / 2);
        let matchWinnerId: string | null = null;
        let matchLoserId: string | null = null;
        let isComplete = false;

        if (p1 && p1Wins >= threshold) {
          matchWinnerId = p1.id;
          matchLoserId = p2 ? p2.id : null;
          isComplete = true;
        } else if (p2 && p2Wins >= threshold) {
          matchWinnerId = p2.id;
          matchLoserId = p1 ? p1.id : null;
          isComplete = true;
        }

        const updatedRecord: MatchScoreRecord = {
          ...currentRecord,
          player1Wins: p1Wins,
          player2Wins: p2Wins,
          games: existingGames,
          winnerPlayerId: matchWinnerId,
          loserPlayerId: matchLoserId,
          isComplete,
        };

        let updatedBracket = tier.bracket;
        if (matchWinnerId && isComplete) {
          try {
            updatedBracket = advanceMatchWinner(tier.bracket, matchId, matchWinnerId);
          } catch {
            // ignore advancement error if already advanced
          }
        } else {
          try {
            updatedBracket = retractMatchWinner(tier.bracket, matchId);
          } catch {
            // ignore retraction error if not advanced
          }
        }

        return {
          ...tournament,
          tiers: tournament.tiers.map(t =>
            t.id === tierId ? { ...t, bracket: updatedBracket } : t
          ),
          matchScores: {
            ...tournament.matchScores,
            [matchId]: updatedRecord,
          },
        };
      })
    );
  };

  const saveMatchScores = (
    tournamentId: string,
    tierId: string,
    matchId: string,
    scoredGames: Array<{
      gameNumber: number;
      player1Points: number | null;
      player2Points: number | null;
      winnerPlayerId: string | null;
    }>,
    hasTiebreaker?: boolean
  ) => {
    setTournaments(prev =>
      prev.map(tournament => {
        if (tournament.id !== tournamentId) return tournament;
        const tier = tournament.tiers.find(t => t.id === tierId);
        if (!tier) return tournament;

        const targetMatch = tier.bracket.matchesById[matchId];
        if (!targetMatch) return tournament;

        const p1 = targetMatch.player1.player;
        const p2 = targetMatch.player2.player;
        const currentRecord = tournament.matchScores[matchId] || {
          matchId,
          tierId,
          organizationId: tournament.organizationId,
          bestOf: targetMatch.bestOf || tier.bestOf || 5,
          player1Wins: 0,
          player2Wins: 0,
          games: [],
          winnerPlayerId: null,
          loserPlayerId: null,
          isComplete: false,
        };

        // Format and clean game entries:
        // Exclude empty games or 0-0 with no declared winner
        const cleanedGames: GameScoreEntry[] = scoredGames
          .map(g => {
            const isZeroZero = g.player1Points === 0 && g.player2Points === 0 && !g.winnerPlayerId;
            const isEmpty = g.player1Points === null && g.player2Points === null && !g.winnerPlayerId;
            if (isEmpty || isZeroZero) {
              return {
                gameNumber: g.gameNumber,
                player1Points: null,
                player2Points: null,
                winnerPlayerId: null,
              };
            }
            return {
              gameNumber: g.gameNumber,
              player1Points: g.player1Points,
              player2Points: g.player2Points,
              winnerPlayerId: g.winnerPlayerId,
            };
          })
          .sort((a, b) => a.gameNumber - b.gameNumber);

        // Recalculate series wins
        let p1Wins = 0;
        let p2Wins = 0;
        for (const g of cleanedGames) {
          if (p1 && g.winnerPlayerId === p1.id) p1Wins++;
          else if (p2 && g.winnerPlayerId === p2.id) p2Wins++;
        }

        const matchBestOf = currentRecord.bestOf || targetMatch.bestOf || tier.bestOf || 5;
        const threshold = Math.ceil(matchBestOf / 2);
        let matchWinnerId: string | null = null;
        let matchLoserId: string | null = null;
        let isComplete = false;

        if (p1 && p1Wins >= threshold) {
          matchWinnerId = p1.id;
          matchLoserId = p2 ? p2.id : null;
          isComplete = true;
        } else if (p2 && p2Wins >= threshold) {
          matchWinnerId = p2.id;
          matchLoserId = p1 ? p1.id : null;
          isComplete = true;
        }

        const hasTiedGame = cleanedGames.some(
          g => g.winnerPlayerId === 'TIE' || (g.player1Points !== null && g.player1Points === g.player2Points && g.player1Points > 0)
        );
        const hasTiebreakerGames = cleanedGames.some(
          g => g.gameNumber > matchBestOf && (g.player1Points !== null || g.player2Points !== null || g.winnerPlayerId !== null)
        );
        const tiebreakerActive = Boolean((hasTiebreaker || hasTiebreakerGames || hasTiedGame) && (hasTiedGame || hasTiebreakerGames));

        const updatedRecord: MatchScoreRecord = {
          ...currentRecord,
          player1Wins: p1Wins,
          player2Wins: p2Wins,
          games: cleanedGames,
          winnerPlayerId: matchWinnerId,
          loserPlayerId: matchLoserId,
          isComplete,
          hasTiebreaker: tiebreakerActive,
        };

        let updatedBracket = tier.bracket;
        if (matchWinnerId && isComplete) {
          try {
            updatedBracket = advanceMatchWinner(tier.bracket, matchId, matchWinnerId);
          } catch {
            // ignore advancement error
          }
        } else {
          try {
            updatedBracket = retractMatchWinner(tier.bracket, matchId);
          } catch {
            // ignore retraction error
          }
        }

        return {
          ...tournament,
          tiers: tournament.tiers.map(t =>
            t.id === tierId ? { ...t, bracket: updatedBracket } : t
          ),
          matchScores: {
            ...tournament.matchScores,
            [matchId]: updatedRecord,
          },
        };
      })
    );
  };

  const updateMatchBestOf = (
    tournamentId: string,
    tierId: string,
    matchId: string,
    bestOf: number
  ) => {
    setTournaments(prev =>
      prev.map(tournament => {
        if (tournament.id !== tournamentId) return tournament;
        const tier = tournament.tiers.find(t => t.id === tierId);
        const targetMatch = tier?.bracket.matchesById[matchId];

        const currentRecord = tournament.matchScores[matchId] || {
          matchId,
          tierId,
          organizationId: tournament.organizationId,
          bestOf,
          player1Wins: 0,
          player2Wins: 0,
          games: [],
          winnerPlayerId: null,
          loserPlayerId: null,
          isComplete: false,
        };

        const threshold = Math.ceil(bestOf / 2);
        const p1Wins = currentRecord.player1Wins;
        const p2Wins = currentRecord.player2Wins;
        const p1 = targetMatch?.player1.player;
        const p2 = targetMatch?.player2.player;
        let isComplete = false;
        let winnerPlayerId: string | null = null;
        let loserPlayerId: string | null = null;
        if (p1 && p1Wins >= threshold) {
          winnerPlayerId = p1.id;
          loserPlayerId = p2 ? p2.id : null;
          isComplete = true;
        } else if (p2 && p2Wins >= threshold) {
          winnerPlayerId = p2.id;
          loserPlayerId = p1 ? p1.id : null;
          isComplete = true;
        }

        const updatedTiers = tier
          ? tournament.tiers.map(t => {
              if (t.id !== tierId) return t;
              let bracketToUpdate = t.bracket;
              if (isComplete && winnerPlayerId) {
                try {
                  bracketToUpdate = advanceMatchWinner(t.bracket, matchId, winnerPlayerId);
                } catch {
                  // ignore
                }
              } else {
                try {
                  bracketToUpdate = retractMatchWinner(t.bracket, matchId);
                } catch {
                  // ignore
                }
              }

              const matchInTier = bracketToUpdate.matchesById[matchId];
              if (!matchInTier) return { ...t, bracket: bracketToUpdate };
              return {
                ...t,
                bracket: {
                  ...bracketToUpdate,
                  matchesById: {
                    ...bracketToUpdate.matchesById,
                    [matchId]: {
                      ...matchInTier,
                      bestOf,
                    },
                  },
                  rounds: bracketToUpdate.rounds.map(r => ({
                    ...r,
                    matches: r.matches.map(m => (m.id === matchId ? { ...m, bestOf } : m)),
                  })),
                },
              };
            })
          : tournament.tiers;

        return {
          ...tournament,
          tiers: updatedTiers,
          matchScores: {
            ...tournament.matchScores,
            [matchId]: {
              ...currentRecord,
              bestOf,
              isComplete,
              winnerPlayerId,
              loserPlayerId,
            },
          },
        };
      })
    );
  };

  const swapMatchSlotsAction = (
    tournamentId: string,
    tierId: string,
    payload: {
      sourceMatchId: string;
      sourceSlot: 1 | 2;
      targetMatchId: string;
      targetSlot: 1 | 2;
    }
  ): { success: boolean; error?: string } => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return { success: false, error: 'Tournament not found' };
    const tier = tournament.tiers.find(t => t.id === tierId);
    if (!tier || !tier.bracket) return { success: false, error: 'Tier or bracket not found' };

    // Safety Invariant: cannot swap slots if either match has recorded scores or games
    const srcRecord = tournament.matchScores?.[payload.sourceMatchId];
    const tgtRecord = tournament.matchScores?.[payload.targetMatchId];

    const hasSrcScore = srcRecord && (srcRecord.games?.length > 0 || srcRecord.isComplete || Boolean(srcRecord.winnerPlayerId));
    const hasTgtScore = tgtRecord && (tgtRecord.games?.length > 0 || tgtRecord.isComplete || Boolean(tgtRecord.winnerPlayerId));

    if (hasSrcScore || hasTgtScore) {
      return {
        success: false,
        error: 'Cannot swap slots: Match play or scores have already begun in one of the matches.',
      };
    }

    try {
      const updatedBracket = swapMatchSlots(tier.bracket, payload);
      setTournaments(prev =>
        prev.map(t => {
          if (t.id !== tournamentId) return t;
          return {
            ...t,
            tiers: t.tiers.map(tr => (tr.id === tierId ? { ...tr, bracket: updatedBracket } : tr)),
          };
        })
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to swap match slots' };
    }
  };

  const forfeitMatch = (
    tournamentId: string,
    tierId: string,
    matchId: string,
    winnerPlayerId: string
  ) => {
    setTournaments(prev =>
      prev.map(tournament => {
        if (tournament.id !== tournamentId) return tournament;
        const tier = tournament.tiers.find(t => t.id === tierId);
        if (!tier) return tournament;
        const targetMatch = tier.bracket.matchesById[matchId];
        if (!targetMatch) return tournament;

        const p1 = targetMatch.player1.player;
        const p2 = targetMatch.player2.player;
        const loserId = p1?.id === winnerPlayerId ? p2?.id ?? null : p1?.id ?? null;

        const currentRecord = tournament.matchScores[matchId] || {
          matchId,
          tierId,
          organizationId: tournament.organizationId,
          bestOf: targetMatch.bestOf || tier.bestOf,
          player1Wins: 0,
          player2Wins: 0,
          games: [],
          winnerPlayerId: null,
          loserPlayerId: null,
          isComplete: false,
        };

        const updatedRecord: MatchScoreRecord = {
          ...currentRecord,
          winnerPlayerId,
          loserPlayerId: loserId,
          isComplete: true,
          notes: 'Forfeit win',
          forfeitWinnerId: winnerPlayerId,
        };

        let updatedBracket = tier.bracket;
        try {
          updatedBracket = advanceMatchWinner(tier.bracket, matchId, winnerPlayerId);
        } catch {
          // ignore
        }

        return {
          ...tournament,
          tiers: tournament.tiers.map(t =>
            t.id === tierId ? { ...t, bracket: updatedBracket } : t
          ),
          matchScores: {
            ...tournament.matchScores,
            [matchId]: updatedRecord,
          },
        };
      })
    );
  };

  const addQualifierScore = (
    tournamentId: string,
    entry: Omit<QualifierScore, 'id' | 'totalScore'>
  ) => {
    // Legacy support: also submit as qualifier submissions
    setTournaments(prev =>
      prev.map(tournament => {
        if (tournament.id !== tournamentId) return tournament;
        const total = (entry.game1 || 0) + (entry.game2 || 0) + (entry.game3 || 0);
        const newScore: QualifierScore = {
          ...entry,
          id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          totalScore: total,
        };
        const currentQuals = tournament.qualifiers || [];
        const updated = [...currentQuals, newScore].sort(
          (a, b) => b.totalScore - a.totalScore
        );
        updated.forEach((q, idx) => {
          q.seed = idx + 1;
        });

        // Add corresponding submission
        const newSub: QualifierSubmission = {
          id: `sub_${Date.now()}`,
          tournamentId,
          organizationId: tournament.organizationId,
          playerId: entry.playerId,
          score: entry.game1,
          submittedAt: Date.now(),
        };

        const updatedTourney: Tournament = {
          ...tournament,
          qualifiers: updated,
          qualifierSubmissions: [...(tournament.qualifierSubmissions || []), newSub],
        };

        if (!updatedTourney.isLocked) {
          updatedTourney.tiers = generateDraftBracketsForTournament(updatedTourney);
        }

        return updatedTourney;
      })
    );
  };

  const verifyQualifierScore = (
    tournamentId: string,
    qualifierId: string,
    verified: boolean
  ) => {
    setTournaments(prev =>
      prev.map(tournament => {
        if (tournament.id !== tournamentId) return tournament;
        return {
          ...tournament,
          qualifiers: (tournament.qualifiers || []).map(q =>
            q.id === qualifierId ? { ...q, verified } : q
          ),
        };
      })
    );
  };

  const clearMatchScores = (tournamentId: string) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const updated = {
          ...t,
          matchScores: {},
          isLocked: false,
          tiers: t.tiers.map(tier => ({ ...tier, isLocked: false })),
        };
        updated.tiers = generateDraftBracketsForTournament(updated);
        return updated;
      })
    );
  };

  const clearQualifierScores = (tournamentId: string) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const hasRecordedMatches = Object.values(t.matchScores || {}).some(
          m => m.isComplete || m.player1Wins > 0 || m.player2Wins > 0 ||
            m.games?.some(g => g.player1Points !== null || g.player2Points !== null)
        );
        const updated = {
          ...t,
          qualifierSubmissions: [],
          qualifiers: [],
          manualSeeds: [],
          isLocked: hasRecordedMatches ? t.isLocked : false,
          tiers: t.tiers.map(tier => ({
            ...tier,
            isLocked: hasRecordedMatches ? tier.isLocked : false,
          })),
        };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const clearAllTournamentData = (tournamentId: string) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const updated = {
          ...t,
          playersPool: [],
          qualifierSubmissions: [],
          qualifiers: [],
          manualSeeds: [],
          matchScores: {},
          tournamentPlayers: {},
          isLocked: false,
          tiers: t.tiers.map(tier => ({ ...tier, isLocked: false })),
        };
        updated.tiers = generateDraftBracketsForTournament(updated);
        return updated;
      })
    );
  };

  const seedQualifiers = (tournamentId: string) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const { players, submissions } = generateSimulatedQualifiers(t, globalPlayers);
        const updated: Tournament = {
          ...t,
          playersPool: players,
          manualSeeds: t.seedingMethod === 'MANUAL' ? players.map(p => p.id) : (t.manualSeeds || []),
          qualifierSubmissions: submissions,
          qualifiers: [],
          matchScores: {},
          isLocked: false,
          tiers: t.tiers.map(tier => ({ ...tier, isLocked: false })),
        };
        updated.tiers = generateDraftBracketsForTournament(updated);
        return updated;
      })
    );
  };

  const simulateFullTournament = (tournamentId: string) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        return runFullSimulation(t, globalPlayers);
      })
    );
  };

  const deleteTournament = (tournamentId: string) => {
    setTournaments(prev => prev.filter(t => t.id !== tournamentId && t.slug !== tournamentId));
    if (activeTournamentId === tournamentId || activeTournament?.slug === tournamentId) {
      setActiveTournamentId(null);
    }
  };

  const addGlobalPlayer = (player: Omit<PlayerProfile, 'id'>): PlayerProfile => {
    const newPlayer: PlayerProfile = {
      ...player,
      id: `p_global_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    };
    setGlobalPlayers(prev => [newPlayer, ...prev]);
    return newPlayer;
  };

  const updateGlobalPlayer = (playerId: string, updates: Partial<PlayerProfile>) => {
    setGlobalPlayers(prev =>
      prev.map(p => (p.id === playerId ? { ...p, ...updates } : p))
    );

    // Propagate updates to any tournament currently containing this player
    setTournaments(prev =>
      prev.map(t => {
        const hasPlayer = (t.playersPool || []).some(p => p.id === playerId);
        if (!hasPlayer) return t;
        const updatedPool = t.playersPool.map(p =>
          p.id === playerId ? { ...p, ...updates } : p
        );
        const updated = { ...t, playersPool: updatedPool };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const deleteGlobalPlayer = (playerId: string) => {
    setGlobalPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  const clearAllGlobalPlayers = () => {
    setGlobalPlayers([]);
  };

  const generateFakeGlobalPlayers = (count: number): PlayerProfile[] => {
    const newPlayers = generateAdditionalFakePlayers(count, globalPlayers);
    setGlobalPlayers(prev => [...prev, ...newPlayers]);
    return newPlayers;
  };

  const importPlayersToTournament = (tournamentId: string, playersToImport: PlayerProfile[]) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const existingPool = t.playersPool || [];
        const existingIds = new Set(existingPool.map(p => p.id));
        const existingNames = new Set(existingPool.map(p => p.name.toLowerCase()));

        const toAdd = playersToImport.filter(
          p => !existingIds.has(p.id) && !existingNames.has(p.name.toLowerCase())
        );

        if (toAdd.length === 0) return t;

        const updatedTournamentPlayers = { ...(t.tournamentPlayers || {}) };
        toAdd.forEach(p => {
          if (!updatedTournamentPlayers[p.id]) {
            updatedTournamentPlayers[p.id] = {
              playerId: p.id,
              tournamentId,
              organizationId: t.organizationId,
            };
          }
        });

        const updated = {
          ...t,
          playersPool: [...existingPool, ...toAdd],
          tournamentPlayers: updatedTournamentPlayers,
        };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const removePlayerFromTournament = (
    tournamentId: string,
    playerId: string
  ): { success: boolean; error?: string } => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return { success: false, error: 'Tournament not found' };

    // Check if player has recorded match play
    const hasRecordedMatches = Object.values(tournament.matchScores || {}).some(
      m =>
        (m.winnerPlayerId === playerId || m.loserPlayerId === playerId) ||
        (m.isComplete && (m.games || []).length > 0)
    );
    if (hasRecordedMatches) {
      return {
        success: false,
        error: 'Cannot remove competitor who has recorded matches. Clear match scores first.',
      };
    }

    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const updatedPool = (t.playersPool || []).filter(p => p.id !== playerId);
        const updatedSubs = (t.qualifierSubmissions || []).filter(s => s.playerId !== playerId);
        const updatedQuals = (t.qualifiers || []).filter(q => q.playerId !== playerId);
        const updatedManualSeeds = (t.manualSeeds || []).filter(id => id !== playerId);
        const updatedTournamentPlayers = { ...(t.tournamentPlayers || {}) };
        delete updatedTournamentPlayers[playerId];
        updatedManualSeeds.forEach((id, idx) => {
          if (updatedTournamentPlayers[id]) {
            updatedTournamentPlayers[id] = {
              ...updatedTournamentPlayers[id],
              seed: idx + 1,
            };
          }
        });

        const updated: Tournament = {
          ...t,
          playersPool: updatedPool,
          qualifierSubmissions: updatedSubs,
          qualifiers: updatedQuals,
          manualSeeds: updatedManualSeeds,
          tournamentPlayers: updatedTournamentPlayers,
        };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );

    return { success: true };
  };

  const setSeedingMethod = (tournamentId: string, method: SeedingMethod) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const updated = { ...t, seedingMethod: method };
        // If switching to MANUAL and manualSeeds is empty, initialize from playersPool
        if (method === 'MANUAL' && (!updated.manualSeeds || updated.manualSeeds.length === 0)) {
          updated.manualSeeds = (updated.playersPool || []).map(p => p.id);
          const updatedTournamentPlayers = { ...(updated.tournamentPlayers || {}) };
          updated.manualSeeds.forEach((id, idx) => {
            if (updatedTournamentPlayers[id]) {
              updatedTournamentPlayers[id] = {
                ...updatedTournamentPlayers[id],
                seed: idx + 1,
              };
            }
          });
          updated.tournamentPlayers = updatedTournamentPlayers;
        }
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const setManualSeeds = (tournamentId: string, playerIds: string[]) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const updatedTournamentPlayers = { ...(t.tournamentPlayers || {}) };
        playerIds.forEach((id, idx) => {
          if (updatedTournamentPlayers[id]) {
            updatedTournamentPlayers[id] = {
              ...updatedTournamentPlayers[id],
              seed: idx + 1,
            };
          }
        });

        const updated = {
          ...t,
          manualSeeds: playerIds,
          tournamentPlayers: updatedTournamentPlayers,
        };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const reorderManualSeed = (tournamentId: string, fromIndex: number, toIndex: number) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const seeds = [...(t.manualSeeds || [])];
        if (fromIndex < 0 || fromIndex >= seeds.length || toIndex < 0 || toIndex >= seeds.length) {
          return t;
        }
        const [moved] = seeds.splice(fromIndex, 1);
        seeds.splice(toIndex, 0, moved);

        const updatedTournamentPlayers = { ...(t.tournamentPlayers || {}) };
        seeds.forEach((id, idx) => {
          if (updatedTournamentPlayers[id]) {
            updatedTournamentPlayers[id] = {
              ...updatedTournamentPlayers[id],
              seed: idx + 1,
            };
          }
        });

        const updated = {
          ...t,
          manualSeeds: seeds,
          tournamentPlayers: updatedTournamentPlayers,
        };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const shuffleManualSeeds = (tournamentId: string) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const seeds = [...(t.manualSeeds || [])];
        for (let i = seeds.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [seeds[i], seeds[j]] = [seeds[j], seeds[i]];
        }

        const updatedTournamentPlayers = { ...(t.tournamentPlayers || {}) };
        seeds.forEach((id, idx) => {
          if (updatedTournamentPlayers[id]) {
            updatedTournamentPlayers[id] = {
              ...updatedTournamentPlayers[id],
              seed: idx + 1,
            };
          }
        });

        const updated = {
          ...t,
          manualSeeds: seeds,
          tournamentPlayers: updatedTournamentPlayers,
        };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const addManualSeed = (tournamentId: string, playerId: string) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const seeds = t.manualSeeds || [];
        if (seeds.includes(playerId)) return t;
        const updatedSeeds = [...seeds, playerId];

        const updatedTournamentPlayers = { ...(t.tournamentPlayers || {}) };
        if (updatedTournamentPlayers[playerId]) {
          updatedTournamentPlayers[playerId] = {
            ...updatedTournamentPlayers[playerId],
            seed: updatedSeeds.length,
          };
        }

        const updated = {
          ...t,
          manualSeeds: updatedSeeds,
          tournamentPlayers: updatedTournamentPlayers,
        };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const removeManualSeed = (tournamentId: string, playerId: string) => {
    batchRemoveManualSeeds(tournamentId, [playerId]);
  };

  const batchRemoveManualSeeds = (tournamentId: string, playerIds: string[]) => {
    if (playerIds.length === 0) return;
    const toRemoveSet = new Set(playerIds);
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const updatedSeeds = (t.manualSeeds || []).filter(id => !toRemoveSet.has(id));
        const updatedTournamentPlayers = { ...(t.tournamentPlayers || {}) };
        playerIds.forEach(id => {
          if (updatedTournamentPlayers[id]) {
            updatedTournamentPlayers[id] = {
              ...updatedTournamentPlayers[id],
              seed: undefined,
            };
          }
        });
        updatedSeeds.forEach((id, idx) => {
          if (updatedTournamentPlayers[id]) {
            updatedTournamentPlayers[id] = {
              ...updatedTournamentPlayers[id],
              seed: idx + 1,
            };
          }
        });

        const updated = {
          ...t,
          manualSeeds: updatedSeeds,
          tournamentPlayers: updatedTournamentPlayers,
        };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const batchAddManualSeeds = (
    tournamentId: string,
    playerIds: string[],
    position: 'TOP' | 'BOTTOM'
  ) => {
    if (playerIds.length === 0) return;
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const existingSeeds = t.manualSeeds || [];
        const existingSet = new Set(existingSeeds);
        const uniqueToAdd = playerIds.filter(id => !existingSet.has(id));
        if (uniqueToAdd.length === 0) return t;

        const updatedSeeds =
          position === 'TOP'
            ? [...uniqueToAdd, ...existingSeeds]
            : [...existingSeeds, ...uniqueToAdd];

        const updatedTournamentPlayers = { ...(t.tournamentPlayers || {}) };
        updatedSeeds.forEach((id, idx) => {
          if (updatedTournamentPlayers[id]) {
            updatedTournamentPlayers[id] = {
              ...updatedTournamentPlayers[id],
              seed: idx + 1,
            };
          }
        });

        const updated = {
          ...t,
          manualSeeds: updatedSeeds,
          tournamentPlayers: updatedTournamentPlayers,
        };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const batchMoveManualSeeds = (
    tournamentId: string,
    playerIds: string[],
    direction: 'UP' | 'DOWN'
  ) => {
    if (playerIds.length === 0) return;
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const seeds = t.manualSeeds || [];
        const updatedSeeds = shiftSeedsCluster(seeds, playerIds, direction);

        const updatedTournamentPlayers = { ...(t.tournamentPlayers || {}) };
        updatedSeeds.forEach((id, idx) => {
          if (updatedTournamentPlayers[id]) {
            updatedTournamentPlayers[id] = {
              ...updatedTournamentPlayers[id],
              seed: idx + 1,
            };
          }
        });

        const updated = {
          ...t,
          manualSeeds: updatedSeeds,
          tournamentPlayers: updatedTournamentPlayers,
        };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  const batchJumpManualSeeds = (
    tournamentId: string,
    playerIds: string[],
    targetSeed: number
  ) => {
    if (playerIds.length === 0) return;
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tournamentId) return t;
        const seeds = t.manualSeeds || [];
        const updatedSeeds = jumpSeedsBunched(seeds, playerIds, targetSeed);

        const updatedTournamentPlayers = { ...(t.tournamentPlayers || {}) };
        updatedSeeds.forEach((id, idx) => {
          if (updatedTournamentPlayers[id]) {
            updatedTournamentPlayers[id] = {
              ...updatedTournamentPlayers[id],
              seed: idx + 1,
            };
          }
        });

        const updated = {
          ...t,
          manualSeeds: updatedSeeds,
          tournamentPlayers: updatedTournamentPlayers,
        };
        if (!updated.isLocked) {
          updated.tiers = generateDraftBracketsForTournament(updated);
        }
        return updated;
      })
    );
  };

  return (
    <TournamentContext.Provider
      value={{
        tournaments,
        globalPlayers,
        activeTournamentId,
        activeTournament,
        setActiveTournamentId,
        getTournamentBySlug,
        getTierBySlug,
        createTournament,
        updateTournament,
        saveTiers,
        addPlayerToPool,
        updatePlayerInPool,
        submitQualifierScore,
        deleteQualifierScore,
        togglePlayerDisqualification,
        togglePlayerQualsCompleted,
        togglePlayerQualifierVerified,
        lockTournament,
        unlockBrackets,
        recordGameScore,
        saveMatchScores,
        updateMatchBestOf,
        forfeitMatch,
        addQualifierScore,
        verifyQualifierScore,
        clearMatchScores,
        clearQualifierScores,
        clearAllTournamentData,
        seedQualifiers,
        simulateFullTournament,
        deleteTournament,
        addGlobalPlayer,
        updateGlobalPlayer,
        deleteGlobalPlayer,
        clearAllGlobalPlayers,
        generateFakeGlobalPlayers,
        importPlayersToTournament,
        removePlayerFromTournament,
        swapMatchSlots: swapMatchSlotsAction,
        setSeedingMethod,
        setManualSeeds,
        reorderManualSeed,
        shuffleManualSeeds,
        addManualSeed,
        removeManualSeed,
        batchMoveManualSeeds,
        batchJumpManualSeeds,
        batchRemoveManualSeeds,
        batchAddManualSeeds,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
};

