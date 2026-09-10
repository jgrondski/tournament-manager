import {
  Tournament,
  TournamentTier,
  PlayerProfile,
  QualifierSubmission,
  PointsThreshold,
} from '../tournament/types';
import { SeededPlayer } from '../bracket/types';
import { generateTraditionalBracket, generateFlatBracket } from '../bracket/math';

export const MAXOUT_THRESHOLD = 999999;

export interface MaxoutKickerResult {
  maxoutCount: number;
  kickerScore: number;
  bestScore: number;
}

export interface LeaderboardRankRow {
  rank: number | 'DQ';
  globalRank: number; // numerical sort position (DQ players at the bottom)
  player: PlayerProfile;
  attempts: number[];
  formattedDetail: string; // e.g. "Ao2 (3 attempts)", "Max of 4", "180 pts"
  finalScore: number;
  maxoutCount?: number;
  kickerScore?: number;
  isDisqualified: boolean;
  assignedTier?: TournamentTier;
  tierSeed?: number;
  isDNQ: boolean;
  earliestTimestamp: number;
}

/**
 * Calculates high score across submissions.
 */
export function calculateHighScore(submissions: QualifierSubmission[]): number {
  if (submissions.length === 0) return 0;
  return Math.max(...submissions.map(s => s.score));
}

/**
 * Calculates maxout count (>= 999,999), kicker score (highest sub-maxout attempt, or 0),
 * and best overall score across qualifier submissions.
 */
export function calculateMaxoutAndKicker(submissions: QualifierSubmission[]): MaxoutKickerResult {
  if (submissions.length === 0) {
    return { maxoutCount: 0, kickerScore: 0, bestScore: 0 };
  }
  const scores = submissions.map(s => s.score);
  const maxoutCount = scores.filter(s => s >= MAXOUT_THRESHOLD).length;
  const nonMaxouts = scores.filter(s => s < MAXOUT_THRESHOLD);
  const kickerScore = nonMaxouts.length > 0 ? Math.max(...nonMaxouts) : 0;
  const bestScore = Math.max(...scores);
  return { maxoutCount, kickerScore, bestScore };
}

/**
 * Calculates Average of X.
 * If in-progress, calculates arithmetic mean of attempts so far.
 * If closed or player completed, missing attempts up to targetX count as 0.
 */
export function calculateAverageOfX(
  submissions: QualifierSubmission[],
  targetX: number = 2,
  isClosedOrComplete: boolean = false
): { average: number; count: number; rawAverage: number } {
  if (submissions.length === 0) {
    return { average: 0, count: 0, rawAverage: 0 };
  }

  const scores = submissions.map(s => s.score);
  const sum = scores.reduce((a, b) => a + b, 0);

  if (isClosedOrComplete) {
    // Missing attempts up to targetX are 0
    const divisor = Math.max(scores.length, targetX);
    const average = Math.round(sum / divisor);
    return { average, count: scores.length, rawAverage: sum / divisor };
  } else {
    // Running count & mean
    const average = Math.round(sum / scores.length);
    return { average, count: scores.length, rawAverage: sum / scores.length };
  }
}

/**
 * Calculates Points format.
 * Each submitted score earns the value of highest threshold met (non-cumulative per attempt).
 * Total points is the sum across all valid attempts.
 */
export function calculatePoints(
  submissions: QualifierSubmission[],
  config: PointsThreshold[] = []
): { totalPoints: number; pointsPerAttempt: number[] } {
  if (submissions.length === 0 || config.length === 0) {
    return { totalPoints: 0, pointsPerAttempt: [] };
  }

  // Sort threshold descending by minScore
  const sortedThresholds = [...config].sort((a, b) => b.minScore - a.minScore);

  const pointsPerAttempt: number[] = [];
  let totalPoints = 0;

  for (const sub of submissions) {
    const matched = sortedThresholds.find(t => sub.score >= t.minScore);
    const earned = matched ? matched.points : 0;
    pointsPerAttempt.push(earned);
    totalPoints += earned;
  }

  return { totalPoints, pointsPerAttempt };
}

/**
 * Derives dynamic leaderboard rows for a tournament, sorted deterministically.
 */
export function deriveLeaderboard(tournament: Tournament): LeaderboardRankRow[] {
  const pool = tournament.playersPool || [];
  const submissions = tournament.qualifierSubmissions || [];
  const tournamentPlayers = tournament.tournamentPlayers || {};

  // Group submissions by player
  const submissionsByPlayer = new Map<string, QualifierSubmission[]>();
  for (const sub of submissions) {
    const list = submissionsByPlayer.get(sub.playerId) || [];
    list.push(sub);
    submissionsByPlayer.set(sub.playerId, list);
  }

  // Calculate score per player
  const rawRows = pool.map(player => {
    const playerSubs = (submissionsByPlayer.get(player.id) || []).sort(
      (a, b) => a.submittedAt - b.submittedAt
    );
    const tPlayer = tournamentPlayers[player.id];
    const isCompleted = tournament.isLocked || Boolean(tPlayer?.qualsCompleted);
    const isDisqualified = Boolean(player.isDisqualified);

    let finalScore = 0;
    let formattedDetail = 'No attempts';
    let maxoutCount: number | undefined = undefined;
    let kickerScore: number | undefined = undefined;

    if (tournament.qualFormat === 'HIGH_SCORE') {
      const res = calculateMaxoutAndKicker(playerSubs);
      finalScore = res.bestScore;
      maxoutCount = res.maxoutCount;
      kickerScore = res.kickerScore;
      if (res.maxoutCount > 0) {
        formattedDetail = res.kickerScore > 0
          ? `${res.maxoutCount}x Max (Kicker: ${res.kickerScore.toLocaleString()})`
          : `${res.maxoutCount}x Max`;
      } else {
        formattedDetail = playerSubs.length > 0
          ? `${playerSubs.length} ${playerSubs.length === 1 ? 'attempt' : 'attempts'}`
          : '0 attempts';
      }
    } else if (tournament.qualFormat === 'AVERAGE_OF_X') {
      const targetX = tournament.qualAverageCount || 2;
      const res = calculateAverageOfX(playerSubs, targetX, isCompleted);
      finalScore = res.average;
      formattedDetail = `Ao${res.count} (${playerSubs.length}/${targetX})`;
    } else if (tournament.qualFormat === 'POINTS') {
      const res = calculatePoints(playerSubs, tournament.pointsConfig || []);
      finalScore = res.totalPoints;
      formattedDetail = `${res.totalPoints} pts (${playerSubs.length} attempts)`;
    }

    const earliestTimestamp = playerSubs.length > 0
      ? Math.min(...playerSubs.map(s => s.submittedAt))
      : Number.MAX_SAFE_INTEGER;

    return {
      player,
      attempts: playerSubs.map(s => s.score),
      formattedDetail,
      finalScore,
      maxoutCount,
      kickerScore,
      isDisqualified,
      earliestTimestamp,
    };
  });

  // Sort rows deterministically:
  // 1. Non-disqualified come before disqualified
  // 2. If HIGH_SCORE:
  //    a. maxout_count descending
  //    b. If maxout_count > 0: kicker_score descending
  //    c. If maxout_count == 0: highest score descending
  //    If other formats: finalScore descending
  // 3. Earlier timestamp first (for ties)
  // 4. Player ID ascending fallback
  rawRows.sort((a, b) => {
    if (a.isDisqualified !== b.isDisqualified) {
      return a.isDisqualified ? 1 : -1;
    }

    if (tournament.qualFormat === 'HIGH_SCORE') {
      const aMax = a.maxoutCount || 0;
      const bMax = b.maxoutCount || 0;
      if (bMax !== aMax) {
        return bMax - aMax;
      }
      if (bMax > 0) {
        const aKicker = a.kickerScore || 0;
        const bKicker = b.kickerScore || 0;
        if (bKicker !== aKicker) {
          return bKicker - aKicker;
        }
        if (b.finalScore !== a.finalScore) {
          return b.finalScore - a.finalScore;
        }
      } else {
        if (b.finalScore !== a.finalScore) {
          return b.finalScore - a.finalScore;
        }
      }
    } else {
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
    }

    if (a.earliestTimestamp !== b.earliestTimestamp) {
      return a.earliestTimestamp - b.earliestTimestamp;
    }
    return a.player.id.localeCompare(b.player.id);
  });

  // Calculate tier cutoff ranges based on priority
  const sortedTiers = [...tournament.tiers].sort((a, b) => a.priority - b.priority);
  const tierRanges: Array<{ tier: TournamentTier; startRank: number; endRank: number }> = [];
  let currentCutoff = 0;
  for (const tier of sortedTiers) {
    const startRank = currentCutoff + 1;
    const endRank = currentCutoff + tier.playerCount;
    tierRanges.push({ tier, startRank, endRank });
    currentCutoff = endRank;
  }

  // Assign ranks, tier cutoffs, and tier seeds
  let activeRankCounter = 1;
  const result: LeaderboardRankRow[] = rawRows.map((item, idx) => {
    if (item.isDisqualified) {
      return {
        ...item,
        rank: 'DQ',
        globalRank: idx + 1,
        isDNQ: false,
        assignedTier: undefined,
        tierSeed: undefined,
      };
    }

    const rank = activeRankCounter++;
    // Find matching tier range
    const matchingRange = tierRanges.find(
      r => rank >= r.startRank && rank <= r.endRank
    );

    if (matchingRange) {
      const tierSeed = rank - matchingRange.startRank + 1;
      return {
        ...item,
        rank,
        globalRank: idx + 1,
        assignedTier: matchingRange.tier,
        tierSeed,
        isDNQ: false,
      };
    }

    return {
      ...item,
      rank,
      globalRank: idx + 1,
      assignedTier: undefined,
      tierSeed: undefined,
      isDNQ: true,
    };
  });

  return result;
}

/**
 * Recalculates brackets for each tier from the dynamic leaderboard standings.
 * Used during DRAFT mode to keep bracket previews live and reactive.
 */
export function generateDraftBracketsForTournament(tournament: Tournament): TournamentTier[] {
  const leaderboard = deriveLeaderboard(tournament);
  const sortedTiers = [...tournament.tiers].sort((a, b) => a.priority - b.priority);

  return sortedTiers.map(tier => {
    // Get seeded players for this tier
    const tierRows = leaderboard.filter(
      row => row.assignedTier?.id === tier.id && row.tierSeed !== undefined
    );

    const seededPlayers: SeededPlayer[] = tierRows.map(row => ({
      id: row.player.id,
      name: row.player.name,
      seed: row.tierSeed!,
    }));

    // If we have at least 2 players, generate fresh mathematical bracket
    if (seededPlayers.length >= 2) {
      const options = { tierId: tier.id, bestOf: tier.bestOf };
      const newBracket =
        tier.bracketType === 'FLAT'
          ? generateFlatBracket(seededPlayers, tier.flatWidth || 4, options)
          : generateTraditionalBracket(seededPlayers, options);

      return {
        ...tier,
        bracket: newBracket,
      };
    }

    // Keep existing structure if insufficient players
    return tier;
  });
}
