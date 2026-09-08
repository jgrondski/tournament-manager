import React, { createContext, useContext, useState, useEffect } from 'react';
import { Tournament, MatchScoreRecord, QualifierScore } from './types';
import { createInitialTournaments } from './mock-data';
import { advanceMatchWinner } from '../bracket/math';

interface TournamentContextType {
  tournaments: Tournament[];
  getTournamentBySlug: (slug: string) => Tournament | undefined;
  getTierBySlug: (tournamentSlug: string, tierSlug: string) => { tournament: Tournament; tier: Tournament['tiers'][0] } | undefined;
  recordGameScore: (
    tournamentId: string,
    tierId: string,
    matchId: string,
    gameNumber: number,
    p1Points: number | null,
    p2Points: number | null,
    declaredWinnerId?: string | null
  ) => void;
  updateMatchBestOf: (tournamentId: string, tierId: string, matchId: string, bestOf: number) => void;
  forfeitMatch: (tournamentId: string, tierId: string, matchId: string, winnerPlayerId: string) => void;
  addQualifierScore: (tournamentId: string, entry: Omit<QualifierScore, 'id' | 'totalScore'>) => void;
  verifyQualifierScore: (tournamentId: string, qualifierId: string, verified: boolean) => void;
  resetTournamentData: (tournamentId?: string) => void;
}

const STORAGE_KEY = 'ctwc_tournaments_v2';

const TournamentContext = createContext<TournamentContextType | null>(null);

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore parse errors and fallback
    }
    return createInitialTournaments();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
    } catch {
      // storage quota or private mode fallback
    }
  }, [tournaments]);

  const getTournamentBySlug = (slug: string) => {
    return tournaments.find(t => t.slug === slug || t.id === slug);
  };

  const getTierBySlug = (tournamentSlug: string, tierSlug: string) => {
    const tournament = getTournamentBySlug(tournamentSlug);
    if (!tournament) return undefined;
    const tier = tournament.tiers.find(t => t.slug === tierSlug || t.id === tierSlug);
    if (!tier) return undefined;
    return { tournament, tier };
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
    _tierId: string,
    matchId: string,
    bestOf: number
  ) => {
    setTournaments(prev =>
      prev.map(tournament => {
        if (tournament.id !== tournamentId) return tournament;
        const currentRecord = tournament.matchScores[matchId];
        if (!currentRecord) return tournament;

        return {
          ...tournament,
          matchScores: {
            ...tournament.matchScores,
            [matchId]: {
              ...currentRecord,
              bestOf,
            },
          },
        };
      })
    );
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
    setTournaments(prev =>
      prev.map(tournament => {
        if (tournament.id !== tournamentId) return tournament;
        const total = (entry.game1 || 0) + (entry.game2 || 0) + (entry.game3 || 0);
        const newScore: QualifierScore = {
          ...entry,
          id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          totalScore: total,
        };
        const updated = [...tournament.qualifiers, newScore].sort(
          (a, b) => b.totalScore - a.totalScore
        );
        // re-rank
        updated.forEach((q, idx) => {
          q.seed = idx + 1;
        });

        return {
          ...tournament,
          qualifiers: updated,
        };
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
          qualifiers: tournament.qualifiers.map(q =>
            q.id === qualifierId ? { ...q, verified } : q
          ),
        };
      })
    );
  };

  const resetTournamentData = (tournamentId?: string) => {
    const initial = createInitialTournaments();
    if (!tournamentId) {
      setTournaments(initial);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } else {
      const match = initial.find(t => t.id === tournamentId);
      if (match) {
        setTournaments(prev =>
          prev.map(t => (t.id === tournamentId ? match : t))
        );
      }
    }
  };

  return (
    <TournamentContext.Provider
      value={{
        tournaments,
        getTournamentBySlug,
        getTierBySlug,
        recordGameScore,
        updateMatchBestOf,
        forfeitMatch,
        addQualifierScore,
        verifyQualifierScore,
        resetTournamentData,
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
