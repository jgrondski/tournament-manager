import { Tournament, TournamentTier, MatchScoreRecord } from './types';
import { SeededPlayer, BracketMatch } from '../bracket/types';
import { deriveLeaderboard, LeaderboardRankRow } from '../qualifiers/scoring';
import { getRoundName } from '../bracket/math/seed-utils';

export interface StandingsPlacement {
  rankLabel: string; // "1st Place", "2nd Place", "3rd Place", "4th Place"...
  rankNumber: number; // 1, 2, 3, 4...
  player: SeededPlayer;
  status: 'champion' | 'runner_up' | 'semifinalist' | 'quarterfinalist' | 'participant';
}

export interface ExitMatchDetails {
  matchId: string;
  roundName: string;
  opponentId?: string;
  opponentName?: string;
  playerWins: number;
  opponentWins: number;
  scoreDisplay: string; // e.g. "2–3"
  avgLossScore: number;
  isForfeit?: boolean;
}

export interface PlayerTournamentStats {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchRecordDisplay: string; // e.g. "2–1"
  gamesWon: number;
  gamesLost: number;
  gameRecordDisplay: string; // e.g. "8–6"
  totalGameScore: number;
  totalGamesWithScore: number;
  overallGameAvg: number;
}

export interface GlobalStandingRow {
  finalRank: number | 'DQ';
  rankLabel: string; // e.g. "Champion", "Runner-Up", "3rd Place", "4th Place", ...
  player: {
    id: string;
    name: string;
    seed?: number;
    tierSeed?: number;
    country?: string;
    playstyle?: 'DAS' | 'Rolling' | 'Hypertap';
  };
  tier?: TournamentTier;
  eliminationRound?: string; // "Champion", "Finals", "Semifinals", "Quarterfinals", etc.
  exitDetails?: ExitMatchDetails;
  stats: PlayerTournamentStats;
  qualScore?: number;
  qualRank?: number;
  rankDelta?: number; // qualRank - finalRank (positive = outperformed qualifying seed)
  isDNQ: boolean;
  isDisqualified: boolean;
}

/**
 * Format a rank number into an ordinal label (1st, 2nd, 3rd, 4th...).
 */
export function getRankOrdinal(rank: number): string {
  const j = rank % 10;
  const k = rank % 100;
  if (j === 1 && k !== 11) return `${rank}st Place`;
  if (j === 2 && k !== 12) return `${rank}nd Place`;
  if (j === 3 && k !== 13) return `${rank}rd Place`;
  return `${rank}th Place`;
}

/**
 * Calculate overall tournament stats across all match scores for a given player.
 */
function calculatePlayerStats(
  tournament: Tournament,
  playerId: string
): PlayerTournamentStats {
  let matchesWon = 0;
  let matchesLost = 0;
  let gamesWon = 0;
  let gamesLost = 0;
  let totalGameScore = 0;
  let totalGamesWithScore = 0;

  const matchRecords = Object.values(tournament.matchScores || {});
  for (const record of matchRecords) {
    if (!record || (!record.isComplete && !record.winnerPlayerId && (!record.games || record.games.length === 0))) {
      continue;
    }

    // Find if this player participated in this match
    let isParticipant = false;
    let isP1 = false;

    // Check tiers matchesById
    for (const tier of tournament.tiers) {
      const matchNode = tier.bracket.matchesById[record.matchId];
      if (matchNode) {
        if (matchNode.player1.player?.id === playerId) {
          isParticipant = true;
          isP1 = true;
          break;
        }
        if (matchNode.player2.player?.id === playerId) {
          isParticipant = true;
          isP1 = false;
          break;
        }
      }
    }

    // Fallback: check winner/loser
    if (!isParticipant) {
      if (record.winnerPlayerId === playerId || record.loserPlayerId === playerId) {
        isParticipant = true;
        isP1 = record.winnerPlayerId === playerId ? record.player1Wins >= record.player2Wins : record.player1Wins < record.player2Wins;
      }
    }

    if (!isParticipant) continue;

    if (record.winnerPlayerId === playerId) matchesWon++;
    else if (record.loserPlayerId === playerId) matchesLost++;

    const pWins = isP1 ? record.player1Wins : record.player2Wins;
    const pLosses = isP1 ? record.player2Wins : record.player1Wins;
    gamesWon += pWins;
    gamesLost += pLosses;

    for (const g of record.games || []) {
      const score = isP1 ? g.player1Points : g.player2Points;
      if (typeof score === 'number' && score !== null) {
        totalGameScore += score;
        totalGamesWithScore++;
      }
    }
  }

  const overallGameAvg = totalGamesWithScore > 0 ? Math.round(totalGameScore / totalGamesWithScore) : 0;

  return {
    matchesPlayed: matchesWon + matchesLost,
    matchesWon,
    matchesLost,
    matchRecordDisplay: `${matchesWon}–${matchesLost}`,
    gamesWon,
    gamesLost,
    gameRecordDisplay: `${gamesWon}–${gamesLost}`,
    totalGameScore,
    totalGamesWithScore,
    overallGameAvg,
  };
}

/**
 * Calculates detailed exit match stats for a player eliminated in a match.
 */
function calculateExitDetails(
  record: MatchScoreRecord,
  matchBestOf: number,
  tierBestOf: number,
  playerId: string,
  opponent?: SeededPlayer | null,
  roundName: string = '',
  match?: BracketMatch
): ExitMatchDetails {
  const bestOf = record.bestOf || matchBestOf || tierBestOf || 5;
  const winThreshold = Math.ceil(bestOf / 2);
  const isForfeit = Boolean(record.forfeitWinnerId) || record.notes === 'Forfeit win';

  let isP1 = true;
  if (match?.player1?.player?.id === playerId) {
    isP1 = true;
  } else if (match?.player2?.player?.id === playerId) {
    isP1 = false;
  } else if (record.loserPlayerId === playerId) {
    isP1 = record.player1Wins < record.player2Wins;
  } else if (record.winnerPlayerId === playerId) {
    isP1 = record.player1Wins > record.player2Wins;
  }

  const playerWins = isP1 ? record.player1Wins : record.player2Wins;
  const opponentWins = isP1 ? record.player2Wins : record.player1Wins;

  const lostScores: number[] = [];

  for (const game of record.games || []) {
    const isGameLoss = game.winnerPlayerId
      ? game.winnerPlayerId !== playerId
      : opponent?.id
      ? game.winnerPlayerId === opponent.id
      : false;

    if (isGameLoss) {
      const score = isP1 ? (game.player1Points ?? 0) : (game.player2Points ?? 0);
      lostScores.push(score);
    }
  }

  // Forfeit rule: unplayed games needed to reach winThreshold count as score 0
  if (isForfeit) {
    while (lostScores.length < winThreshold) {
      lostScores.push(0);
    }
  }

  const avgLossScore = lostScores.length > 0
    ? Math.round(lostScores.reduce((acc, s) => acc + s, 0) / lostScores.length)
    : 0;

  return {
    matchId: record.matchId,
    roundName,
    opponentId: opponent?.id,
    opponentName: opponent?.name,
    playerWins,
    opponentWins,
    scoreDisplay: `${playerWins}–${opponentWins}`,
    avgLossScore,
    isForfeit,
  };
}

interface EliminatedCompetitor {
  player: SeededPlayer;
  tier: TournamentTier;
  roundName: string;
  exitDetails: ExitMatchDetails;
  stats: PlayerTournamentStats;
  seed: number;
}

/**
 * Derives final tournament placements for a single tier, sorting round losers
 * using the Competitive Intra-Round Exit Tiebreaker.
 */
export function calculateTierStandings(
  tier: TournamentTier,
  matchScores: Record<string, MatchScoreRecord>
): StandingsPlacement[] {
  const rounds = tier.bracket.rounds;
  if (rounds.length === 0) return [];

  const placements: StandingsPlacement[] = [];
  const placedPlayerIds = new Set<string>();

  // 1. Finals (Round from finals = 0)
  const finalsRound = rounds[rounds.length - 1];
  const finalsMatch = finalsRound?.matches[0];
  if (finalsMatch) {
    const record = matchScores[finalsMatch.id];
    const p1 = finalsMatch.player1.player;
    const p2 = finalsMatch.player2.player;
    const winnerId = record?.winnerPlayerId || finalsMatch.winnerId;

    if (winnerId && (winnerId === p1?.id || winnerId === p2?.id)) {
      const champ = winnerId === p1?.id ? p1 : p2;
      const runnerUp = winnerId === p1?.id ? p2 : p1;

      if (champ && !placedPlayerIds.has(champ.id)) {
        placements.push({
          rankLabel: '1st Place (Champion)',
          rankNumber: 1,
          player: champ,
          status: 'champion',
        });
        placedPlayerIds.add(champ.id);
      }

      if (runnerUp && !placedPlayerIds.has(runnerUp.id)) {
        placements.push({
          rankLabel: '2nd Place (Runner-up)',
          rankNumber: 2,
          player: runnerUp,
          status: 'runner_up',
        });
        placedPlayerIds.add(runnerUp.id);
      }
    }
  }

  // 2. Earlier Elimination Rounds in reverse chronological order
  let currentRankCounter = 3;

  for (let rIdx = rounds.length - 2; rIdx >= 0; rIdx--) {
    const round = rounds[rIdx];
    const roundsFromFinals = rounds.length - 1 - rIdx;
    const roundName = getRoundName(round.roundNumber, rounds.length, round.matches.length);

    const roundLosers: Array<{
      player: SeededPlayer;
      exitGameWins: number;
      avgLossScore: number;
      seed: number;
      status: StandingsPlacement['status'];
    }> = [];

    for (const match of round.matches) {
      if (match.isBye) continue;
      const record = matchScores[match.id];
      const loserId = record?.loserPlayerId || match.loserId;
      const p1 = match.player1.player;
      const p2 = match.player2.player;
      const loser = loserId === p1?.id ? p1 : loserId === p2?.id ? p2 : null;
      const winner = loserId === p1?.id ? p2 : loserId === p2?.id ? p1 : null;

      if (loser && !placedPlayerIds.has(loser.id)) {
        let exitWins = 0;
        let avgLoss = 0;

        if (record) {
          const details = calculateExitDetails(record, match.bestOf || tier.bestOf, tier.bestOf, loser.id, winner, roundName, match);
          exitWins = details.playerWins;
          avgLoss = details.avgLossScore;
        }

        const status: StandingsPlacement['status'] =
          roundsFromFinals === 1 ? 'semifinalist' : roundsFromFinals === 2 ? 'quarterfinalist' : 'participant';

        roundLosers.push({
          player: loser,
          exitGameWins: exitWins,
          avgLossScore: avgLoss,
          seed: loser.seed || 999,
          status,
        });
        placedPlayerIds.add(loser.id);
      }
    }

    // Sort round losers by intra-round exit tiebreaker
    roundLosers.sort((a, b) => {
      if (b.exitGameWins !== a.exitGameWins) return b.exitGameWins - a.exitGameWins;
      if (b.avgLossScore !== a.avgLossScore) return b.avgLossScore - a.avgLossScore;
      return a.seed - b.seed;
    });

    for (const loserItem of roundLosers) {
      placements.push({
        rankLabel: getRankOrdinal(currentRankCounter),
        rankNumber: currentRankCounter,
        player: loserItem.player,
        status: loserItem.status,
      });
      currentRankCounter++;
    }
  }

  return placements;
}

/**
 * Calculates continuous, sequential #1 to #N Global Standings across all tiers,
 * applying the exact mathematical Competitive Intra-Round Exit Tiebreaker hierarchy,
 * followed by ranked DNQ players and Disqualified (DQ) competitors.
 */
export function calculateGlobalStandings(tournament: Tournament): GlobalStandingRow[] {
  const globalStandings: GlobalStandingRow[] = [];
  const placedPlayerIds = new Set<string>();

  // 1. Derive qualifiers leaderboard for seeding, score, and rank baseline
  const leaderboard: LeaderboardRankRow[] = deriveLeaderboard(tournament);
  const qualRankMap = new Map<string, number>();
  const qualScoreMap = new Map<string, number>();

  leaderboard.forEach(row => {
    if (typeof row.rank === 'number') {
      qualRankMap.set(row.player.id, row.rank);
    } else {
      qualRankMap.set(row.player.id, row.globalRank);
    }
    qualScoreMap.set(row.player.id, row.finalScore);
  });

  // Sort tiers by priority (Tier 1 Gold, Tier 2 Silver, Tier 3 Bronze)
  const sortedTiers = [...tournament.tiers].sort((a, b) => a.priority - b.priority);

  let currentRank = 1;

  // 2. Process each tier sequentially
  for (const tier of sortedTiers) {
    const rounds = tier.bracket.rounds;
    if (rounds.length === 0) continue;

    const tierPlacedIds = new Set<string>();

    // A. Finals Round (Champion and Runner-up)
    const finalsRound = rounds[rounds.length - 1];
    const finalsMatch = finalsRound?.matches[0];
    if (finalsMatch) {
      const record = tournament.matchScores[finalsMatch.id];
      const p1 = finalsMatch.player1.player;
      const p2 = finalsMatch.player2.player;
      const winnerId = record?.winnerPlayerId || finalsMatch.winnerId;

      if (winnerId && (winnerId === p1?.id || winnerId === p2?.id)) {
        const champ = winnerId === p1?.id ? p1 : p2;
        const runnerUp = winnerId === p1?.id ? p2 : p1;

        // Champion
        if (champ && !placedPlayerIds.has(champ.id)) {
          const stats = calculatePlayerStats(tournament, champ.id);
          const qualRank = qualRankMap.get(champ.id);
          const finalRank = currentRank++;

          globalStandings.push({
            finalRank,
            rankLabel: finalRank === 1 ? '1st Place (Champion)' : `${getRankOrdinal(finalRank)} (Tier Champion)`,
            player: {
              id: champ.id,
              name: champ.name,
              seed: champ.seed,
              tierSeed: champ.seed,
            },
            tier,
            eliminationRound: 'Champion',
            stats,
            qualScore: qualScoreMap.get(champ.id),
            qualRank,
            rankDelta: qualRank !== undefined ? qualRank - finalRank : undefined,
            isDNQ: false,
            isDisqualified: false,
          });
          placedPlayerIds.add(champ.id);
          tierPlacedIds.add(champ.id);
        }

        // Runner-up
        if (runnerUp && !placedPlayerIds.has(runnerUp.id)) {
          const stats = calculatePlayerStats(tournament, runnerUp.id);
          const exitDetails = record
            ? calculateExitDetails(record, finalsMatch.bestOf || tier.bestOf, tier.bestOf, runnerUp.id, champ, 'Finals', finalsMatch)
            : undefined;
          const qualRank = qualRankMap.get(runnerUp.id);
          const finalRank = currentRank++;

          globalStandings.push({
            finalRank,
            rankLabel: `${getRankOrdinal(finalRank)} (Runner-up)`,
            player: {
              id: runnerUp.id,
              name: runnerUp.name,
              seed: runnerUp.seed,
              tierSeed: runnerUp.seed,
            },
            tier,
            eliminationRound: 'Finals',
            exitDetails,
            stats,
            qualScore: qualScoreMap.get(runnerUp.id),
            qualRank,
            rankDelta: qualRank !== undefined ? qualRank - finalRank : undefined,
            isDNQ: false,
            isDisqualified: false,
          });
          placedPlayerIds.add(runnerUp.id);
          tierPlacedIds.add(runnerUp.id);
        }
      }
    }

    // B. Earlier Elimination Rounds (Semifinals down to Round 1)
    for (let rIdx = rounds.length - 2; rIdx >= 0; rIdx--) {
      const round = rounds[rIdx];
      const roundName = getRoundName(round.roundNumber, rounds.length, round.matches.length);
      const eliminatedInRound: EliminatedCompetitor[] = [];

      for (const match of round.matches) {
        if (match.isBye) continue;

        const record = tournament.matchScores[match.id];
        const loserId = record?.loserPlayerId || match.loserId;
        const p1 = match.player1.player;
        const p2 = match.player2.player;
        const loser = loserId === p1?.id ? p1 : loserId === p2?.id ? p2 : null;
        const winner = loserId === p1?.id ? p2 : loserId === p2?.id ? p1 : null;

        if (loser && !placedPlayerIds.has(loser.id) && !tierPlacedIds.has(loser.id)) {
          const stats = calculatePlayerStats(tournament, loser.id);
          const exitDetails = record
            ? calculateExitDetails(record, match.bestOf || tier.bestOf, tier.bestOf, loser.id, winner, roundName, match)
            : {
                matchId: match.id,
                roundName,
                opponentId: winner?.id,
                opponentName: winner?.name,
                playerWins: 0,
                opponentWins: 0,
                scoreDisplay: '0–0',
                avgLossScore: 0,
              };

          eliminatedInRound.push({
            player: loser,
            tier,
            roundName,
            exitDetails,
            stats,
            seed: loser.seed || 999,
          });
          placedPlayerIds.add(loser.id);
          tierPlacedIds.add(loser.id);
        }
      }

      // Sort competitors eliminated in this same round by the Exit Tiebreaker Hierarchy:
      // 1. exit_game_wins descending
      // 2. avg_loss_score descending
      // 3. Overall tournament match record (wins minus losses) descending
      // 4. Overall tournament game score average descending
      // 5. Initial qualifying seed ascending
      eliminatedInRound.sort((a, b) => {
        // 1. exit_game_wins
        if (b.exitDetails.playerWins !== a.exitDetails.playerWins) {
          return b.exitDetails.playerWins - a.exitDetails.playerWins;
        }

        // 2. avg_loss_score
        if (b.exitDetails.avgLossScore !== a.exitDetails.avgLossScore) {
          return b.exitDetails.avgLossScore - a.exitDetails.avgLossScore;
        }

        // 3. Overall tournament match record (wins - losses)
        const aMatchNet = a.stats.matchesWon - a.stats.matchesLost;
        const bMatchNet = b.stats.matchesWon - b.stats.matchesLost;
        if (bMatchNet !== aMatchNet) {
          return bMatchNet - aMatchNet;
        }

        // 4. Overall tournament game score average
        if (b.stats.overallGameAvg !== a.stats.overallGameAvg) {
          return b.stats.overallGameAvg - a.stats.overallGameAvg;
        }

        // 5. Initial qualifying seed ascending (lower number is higher seed)
        return a.seed - b.seed;
      });

      // Assign sequential ranks
      for (const elim of eliminatedInRound) {
        const qualRank = qualRankMap.get(elim.player.id);
        const finalRank = currentRank++;

        globalStandings.push({
          finalRank,
          rankLabel: getRankOrdinal(finalRank),
          player: {
            id: elim.player.id,
            name: elim.player.name,
            seed: elim.player.seed,
            tierSeed: elim.player.seed,
          },
          tier,
          eliminationRound: roundName,
          exitDetails: elim.exitDetails,
          stats: elim.stats,
          qualScore: qualScoreMap.get(elim.player.id),
          qualRank,
          rankDelta: qualRank !== undefined ? qualRank - finalRank : undefined,
          isDNQ: false,
          isDisqualified: false,
        });
      }
    }
  }

  // 3. Handle any bracket players who were not eliminated or placed yet (e.g. tournament in-progress)
  for (const tier of sortedTiers) {
    const tierRows = leaderboard.filter(r => r.assignedTier?.id === tier.id && !placedPlayerIds.has(r.player.id));
    for (const row of tierRows) {
      if (placedPlayerIds.has(row.player.id)) continue;
      const stats = calculatePlayerStats(tournament, row.player.id);
      const qualRank = qualRankMap.get(row.player.id);
      const finalRank = currentRank++;

      globalStandings.push({
        finalRank,
        rankLabel: getRankOrdinal(finalRank),
        player: {
          id: row.player.id,
          name: row.player.name,
          seed: row.tierSeed,
          tierSeed: row.tierSeed,
          country: row.player.country,
          playstyle: row.player.playstyle,
        },
        tier,
        eliminationRound: 'Bracket Participant',
        stats,
        qualScore: row.finalScore,
        qualRank,
        rankDelta: qualRank !== undefined ? qualRank - finalRank : undefined,
        isDNQ: false,
        isDisqualified: false,
      });
      placedPlayerIds.add(row.player.id);
    }
  }

  // 4. DNQ (Did Not Qualify) Competitors
  // Ranked sequentially after bracket participants based on qualifier leaderboard scores
  const dnqRows = leaderboard.filter(r => r.isDNQ && !r.isDisqualified && !placedPlayerIds.has(r.player.id));
  for (const dnq of dnqRows) {
    const finalRank = currentRank++;
    const qualRank = qualRankMap.get(dnq.player.id);

    globalStandings.push({
      finalRank,
      rankLabel: `${getRankOrdinal(finalRank)} (DNQ)`,
      player: {
        id: dnq.player.id,
        name: dnq.player.name,
        country: dnq.player.country,
        playstyle: dnq.player.playstyle,
      },
      eliminationRound: 'Did Not Qualify',
      stats: {
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        matchRecordDisplay: '0–0',
        gamesWon: 0,
        gamesLost: 0,
        gameRecordDisplay: '0–0',
        totalGameScore: 0,
        totalGamesWithScore: 0,
        overallGameAvg: 0,
      },
      qualScore: dnq.finalScore,
      qualRank,
      rankDelta: 0,
      isDNQ: true,
      isDisqualified: false,
    });
    placedPlayerIds.add(dnq.player.id);
  }

  // 5. Disqualified (DQ) Competitors
  // Placed at the absolute bottom
  const dqRows = leaderboard.filter(r => r.isDisqualified);
  for (const dq of dqRows) {
    globalStandings.push({
      finalRank: 'DQ',
      rankLabel: 'DQ (Disqualified)',
      player: {
        id: dq.player.id,
        name: dq.player.name,
        country: dq.player.country,
        playstyle: dq.player.playstyle,
      },
      eliminationRound: 'Disqualified',
      stats: {
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        matchRecordDisplay: '0–0',
        gamesWon: 0,
        gamesLost: 0,
        gameRecordDisplay: '0–0',
        totalGameScore: 0,
        totalGamesWithScore: 0,
        overallGameAvg: 0,
      },
      qualScore: dq.finalScore,
      qualRank: undefined,
      rankDelta: undefined,
      isDNQ: false,
      isDisqualified: true,
    });
  }

  return globalStandings;
}
