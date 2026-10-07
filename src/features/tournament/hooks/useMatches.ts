import { useTournament } from '../store';
import type { MatchScoreRecord } from '../types';

export interface MatchesHook {
  activeMatchScores: Record<string, MatchScoreRecord>;
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
  clearMatchScores: (tournamentId: string) => void;
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
}

export function useMatches(): MatchesHook {
  const store = useTournament();
  return {
    activeMatchScores: store.activeTournament?.matchScores || {},
    recordGameScore: store.recordGameScore,
    saveMatchScores: store.saveMatchScores,
    updateMatchBestOf: store.updateMatchBestOf,
    forfeitMatch: store.forfeitMatch,
    clearMatchScores: store.clearMatchScores,
    swapMatchSlots: store.swapMatchSlots,
  };
}
