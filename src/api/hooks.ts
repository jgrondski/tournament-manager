import { useState, useEffect, useCallback } from 'react';
import {
  listTournaments,
  createTournament,
  deleteTournament,
  TournamentRecord,
  TournamentInput,
} from './tournaments';
import {
  listPlayers,
  createPlayer,
  updatePlayer,
  deletePlayer,
  PlayerRecord,
} from './players';
import {
  getQualifierLeaderboard,
  submitQualifierScore,
  LeaderboardEntry,
} from './qualifiers';
import {
  listMatchesByTier,
  recordGameScore,
  MatchRecord,
} from './brackets';

export function useTournaments() {
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listTournaments();
      setTournaments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tournaments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async (input: TournamentInput) => {
    const res = await createTournament(input);
    await refresh();
    return res;
  };

  const remove = async (id: string) => {
    const ok = await deleteTournament(id);
    await refresh();
    return ok;
  };

  return { tournaments, loading, error, refresh, create, remove };
}

export function usePlayers() {
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listPlayers();
      setPlayers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch players');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async (data: Parameters<typeof createPlayer>[0]) => {
    const p = await createPlayer(data);
    await refresh();
    return p;
  };

  const update = async (id: string, updates: Parameters<typeof updatePlayer>[1]) => {
    const p = await updatePlayer(id, updates);
    await refresh();
    return p;
  };

  const remove = async (id: string) => {
    const ok = await deletePlayer(id);
    await refresh();
    return ok;
  };

  return { players, loading, error, refresh, create, update, remove };
}

export function useQualifiers(tournamentId?: string) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tournamentId) {
      setLeaderboard([]);
      return;
    }
    try {
      setLoading(true);
      const data = await getQualifierLeaderboard(tournamentId);
      setLeaderboard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch qualifiers');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submitScore = async (playerId: string, score: number) => {
    if (!tournamentId) throw new Error('Tournament ID required');
    const res = await submitQualifierScore(tournamentId, playerId, score);
    await refresh();
    return res;
  };

  return { leaderboard, loading, error, refresh, submitScore };
}

export function useMatches(tierId?: string) {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tierId) {
      setMatches([]);
      return;
    }
    try {
      setLoading(true);
      const data = await listMatchesByTier(tierId);
      setMatches(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  }, [tierId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const recordScore = async (
    tournamentId: string,
    matchId: string,
    gameNumber: number,
    player1Score: number,
    player2Score: number
  ) => {
    const res = await recordGameScore({
      tournamentId,
      matchId,
      gameNumber,
      player1Score,
      player2Score,
    });
    await refresh();
    return res;
  };

  return { matches, loading, error, refresh, recordScore };
}
