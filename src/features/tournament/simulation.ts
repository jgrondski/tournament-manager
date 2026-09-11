import {
  Tournament,
  TournamentTier,
  PlayerProfile,
  QualifierSubmission,
  MatchScoreRecord,
} from './types';
import { advanceMatchWinner } from '../bracket/math';
import { generateDraftBracketsForTournament } from '../qualifiers/scoring';

export const REALISTIC_PLAYER_NAMES = [
  'Blue Scuti',
  'Fractal',
  'PixelAndy',
  'DogPlayingTetris',
  'Alex T',
  'Tristop',
  'Huffulufugus',
  'Sharky',
  'Cheez',
  'EricICX',
  'Sodium',
  'Brak',
  'Scallop',
  'Ben Mullen',
  'Jonas Neubauer',
  'Koryan',
  'Harry Hong',
  'Svavar',
  'Matt Martin',
  'DanV',
  'RedScuti',
  'Myles',
  'Frenzy',
  'Trey Harrison',
  'Batfoy',
  'Meme',
  'Bo Steil',
  'Hydrant',
  'GregBOI',
  'Richard Wolf',
  'Tim M',
  'Marcin K',
  'Jeff Moore',
  'Buco',
  'Eden',
  'Pikacube',
  'GreenScuti',
  'Jake B',
  'Sam D',
  'Nate W',
  'Lucas R',
  'Thomas P',
  'Victor L',
  'Jordan C',
  'Chris F',
  'Logan K',
  'Cody M',
  'Leo T',
  'Zack H',
  'Tyler W',
];

const COUNTRIES = ['US', 'JP', 'CA', 'DE', 'GB', 'FR', 'SE', 'PL', 'AU', 'BR', 'KR', 'FI'];
const PLAYSTYLES: Array<'DAS' | 'Rolling' | 'Hypertap'> = ['Rolling', 'Rolling', 'Rolling', 'DAS', 'Hypertap'];

/**
 * Generate a list of realistic competitors with random playstyles, PBs, and countries.
 */
export function generateRealisticPlayers(count: number, existingPool: PlayerProfile[] = []): PlayerProfile[] {
  const existingNames = new Set(existingPool.map(p => p.name.toLowerCase()));
  const players: PlayerProfile[] = [...existingPool];

  let nameIdx = 0;
  let customId = 1;

  while (players.length < count) {
    let name = '';
    if (nameIdx < REALISTIC_PLAYER_NAMES.length) {
      const candidate = REALISTIC_PLAYER_NAMES[nameIdx++];
      if (!existingNames.has(candidate.toLowerCase())) {
        name = candidate;
      }
    }

    if (!name) {
      name = `Player ${customId++}`;
      while (existingNames.has(name.toLowerCase())) {
        name = `Player ${customId++}`;
      }
    }

    existingNames.add(name.toLowerCase());

    const playstyle = PLAYSTYLES[Math.floor(Math.random() * PLAYSTYLES.length)];
    const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    // Personal best between 700,000 and 1,350,000
    const personalBest = Math.floor(700000 + Math.random() * 650000);

    players.push({
      id: `p_sim_${Date.now()}_${players.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      personalBest,
      playstyle,
      country,
      notes: 'Simulated competitor',
    });
  }

  return players;
}

/**
 * Generate exactly `count` new simulated competitors to append to a player pool.
 */
export function generateAdditionalFakePlayers(
  count: number,
  existingPool: PlayerProfile[] = []
): PlayerProfile[] {
  const existingNames = new Set(existingPool.map(p => p.name.toLowerCase()));
  const newPlayers: PlayerProfile[] = [];

  let nameIdx = 0;
  let customId = existingPool.length + 1;

  while (newPlayers.length < count) {
    let name = '';
    while (nameIdx < REALISTIC_PLAYER_NAMES.length) {
      const candidate = REALISTIC_PLAYER_NAMES[nameIdx++];
      if (!existingNames.has(candidate.toLowerCase())) {
        name = candidate;
        break;
      }
    }

    if (!name) {
      name = `Player ${customId++}`;
      while (existingNames.has(name.toLowerCase())) {
        name = `Player ${customId++}`;
      }
    }

    existingNames.add(name.toLowerCase());

    const playstyle = PLAYSTYLES[Math.floor(Math.random() * PLAYSTYLES.length)];
    const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    const personalBest = Math.floor(700000 + Math.random() * 650000);

    newPlayers.push({
      id: `p_sim_${Date.now()}_${existingPool.length + newPlayers.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      personalBest,
      playstyle,
      country,
      notes: 'Simulated competitor',
    });
  }

  return newPlayers;
}

/**
 * Generate simulated qualifier scores for a tournament based on its capacity and format.
 * Uses total bracket capacity + 1d6 extra players who won't make bracket play.
 * Pulls from the global player pool first, keeping any already added players,
 * and falling back to generic players if the global pool is empty or exhausted.
 */
export function generateSimulatedQualifiers(
  tournament: Tournament,
  globalPlayersPool: PlayerProfile[] = []
): {
  players: PlayerProfile[];
  submissions: QualifierSubmission[];
} {
  const totalCapacity = tournament.tiers.reduce((acc, t) => acc + (t.playerCount || 0), 0);
  const extra1d6 = Math.floor(Math.random() * 6) + 1; // 1d6 roll (1 to 6)
  const targetCount = Math.max(8, totalCapacity + extra1d6);

  // Preserve any competitors already added to the tournament
  const players: PlayerProfile[] = [...(tournament.playersPool || [])];
  const existingIds = new Set(players.map(p => p.id));
  const existingNames = new Set(players.map(p => p.name.toLowerCase()));

  // If more players needed, pull from global player pool first
  if (players.length < targetCount && globalPlayersPool.length > 0) {
    const availableFromGlobal = globalPlayersPool.filter(
      p => !existingIds.has(p.id) && !existingNames.has(p.name.toLowerCase())
    );

    // Shuffle available global players randomly
    const shuffledGlobal = [...availableFromGlobal].sort(() => Math.random() - 0.5);

    for (const gp of shuffledGlobal) {
      if (players.length >= targetCount) break;
      players.push({ ...gp });
      existingIds.add(gp.id);
      existingNames.add(gp.name.toLowerCase());
    }
  }

  // If still below targetCount, generate generic realistic players
  if (players.length < targetCount) {
    const needed = targetCount - players.length;
    const genericPlayers = generateAdditionalFakePlayers(needed, players);
    players.push(...genericPlayers);
  }

  // Preserve existing submissions and add simulated submissions for any player needing them
  const existingSubmissions = tournament.qualifierSubmissions || [];
  const existingSubmissionsByPlayer = new Map<string, QualifierSubmission[]>();
  for (const sub of existingSubmissions) {
    const list = existingSubmissionsByPlayer.get(sub.playerId) || [];
    list.push(sub);
    existingSubmissionsByPlayer.set(sub.playerId, list);
  }

  const submissions: QualifierSubmission[] = [...existingSubmissions];
  const baseTime = Date.now() - 3600000 * 4; // 4 hours ago

  const qualFormat = tournament.qualFormat || 'AVERAGE_OF_X';
  const targetAttempts = qualFormat === 'AVERAGE_OF_X' ? (tournament.qualAverageCount || 2) : 3;

  players.forEach((player, pIdx) => {
    const existing = existingSubmissionsByPlayer.get(player.id) || [];
    if (existing.length >= targetAttempts) {
      return;
    }

    // Top-seeded players have higher skill bias
    const skillMultiplier = 1 - (pIdx / players.length) * 0.45; // 1.0 down to 0.55

    for (let attempt = existing.length + 1; attempt <= targetAttempts; attempt++) {
      let score: number;

      if (qualFormat === 'HIGH_SCORE') {
        // # of Maxes: top seeds frequently max out (>= 999,999)
        // 90% of the time, submit a kicker (< 999,999) to establish tiebreaker scores
        const playerCurrentAttempts = submissions.filter(s => s.playerId === player.id);
        const hasKickerAlready = playerCurrentAttempts.some(s => s.score < 999999);
        const isLastAttempt = attempt === targetAttempts;

        let isMaxout = pIdx < Math.min(16, Math.floor(players.length * 0.4)) && Math.random() < 0.75;
        // If player has only maxouts so far, 90% chance to submit a kicker on final attempt
        if (isLastAttempt && !hasKickerAlready && Math.random() < 0.90) {
          isMaxout = false;
        }

        if (isMaxout) {
          score = Math.floor(1000000 + Math.random() * 300000);
        } else {
          score = Math.floor(750000 + Math.random() * 245000); // 750,000 to 995,000
        }
      } else if (qualFormat === 'POINTS') {
        score = Math.floor((600000 + Math.random() * 650000) * skillMultiplier);
      } else {
        // AVERAGE_OF_X
        score = Math.floor((650000 + Math.random() * 550000) * skillMultiplier);
      }

      submissions.push({
        id: `sub_sim_${player.id}_${attempt}`,
        tournamentId: tournament.id,
        playerId: player.id,
        score,
        submittedAt: baseTime + pIdx * 60000 + attempt * 120000,
      });
    }
  });

  return { players, submissions };
}

/**
 * Simulate all matches across all tiers in a tournament up to the champions.
 */
export function simulateTournamentMatches(
  tournament: Tournament,
  tiersToSimulate: TournamentTier[]
): {
  updatedTiers: TournamentTier[];
  matchScores: Record<string, MatchScoreRecord>;
} {
  const matchScores: Record<string, MatchScoreRecord> = { ...tournament.matchScores };
  let currentTiers = [...tiersToSimulate];

  currentTiers = currentTiers.map(tier => {
    let bracket = { ...tier.bracket };

    // Iterate through rounds in sequential order
    for (let rIdx = 0; rIdx < bracket.rounds.length; rIdx++) {
      const round = bracket.rounds[rIdx];

      for (const match of round.matches) {
        if (match.isBye) continue;

        const currentMatch = bracket.matchesById[match.id] || match;
        const p1 = currentMatch.player1.player;
        const p2 = currentMatch.player2.player;

        // Only simulate if both competitors are present
        if (!p1 || !p2) continue;

        const bestOf = currentMatch.bestOf || tier.bestOf || 5;
        const winThreshold = Math.ceil(bestOf / 2);

        let p1Wins = 0;
        let p2Wins = 0;
        const games: MatchScoreRecord['games'] = [];

        // Randomly simulate games until one competitor reaches winThreshold
        // Competitor with higher seed (lower seed number) has slight advantage
        const p1Seed = p1.seed || 16;
        const p2Seed = p2.seed || 16;
        const p1Prob = p2Seed / (p1Seed + p2Seed); // e.g. Seed 1 vs Seed 16 -> 16/17 ~ 94% win probability

        let gameNumber = 1;
        while (p1Wins < winThreshold && p2Wins < winThreshold) {
          const p1Won = Math.random() < Math.max(0.2, Math.min(0.8, p1Prob));
          const winnerId = p1Won ? p1.id : p2.id;

          if (p1Won) p1Wins++;
          else p2Wins++;

          const winningScore = Math.floor(750000 + Math.random() * 350000);
          const losingScore = Math.floor(winningScore - (50000 + Math.random() * 250000));

          games.push({
            gameNumber,
            player1Points: p1Won ? winningScore : losingScore,
            player2Points: p1Won ? losingScore : winningScore,
            winnerPlayerId: winnerId,
          });

          gameNumber++;
        }

        const matchWinnerId = p1Wins >= winThreshold ? p1.id : p2.id;
        const matchLoserId = matchWinnerId === p1.id ? p2.id : p1.id;

        matchScores[currentMatch.id] = {
          matchId: currentMatch.id,
          tierId: tier.id,
          bestOf,
          player1Wins: p1Wins,
          player2Wins: p2Wins,
          winnerPlayerId: matchWinnerId,
          loserPlayerId: matchLoserId,
          isComplete: true,
          games,
        };

        // Advance winner through bracket math
        bracket = advanceMatchWinner(bracket, currentMatch.id, matchWinnerId);
      }
    }

    return {
      ...tier,
      isLocked: true,
      bracket,
    };
  });

  return { updatedTiers: currentTiers, matchScores };
}

/**
 * Execute a full tournament simulation: seeds qualifiers if needed, locks tournament,
 * and simulates matches across all tiers.
 */
export function runFullSimulation(
  tournament: Tournament,
  globalPlayersPool: PlayerProfile[] = []
): Tournament {
  let tourney = { ...tournament };

  // 1. Seed qualifiers if fewer than total bracket capacity
  const totalCapacity = tourney.tiers.reduce((acc, t) => acc + t.playerCount, 0);
  if ((tourney.qualifierSubmissions?.length || 0) < totalCapacity) {
    const { players, submissions } = generateSimulatedQualifiers(tourney, globalPlayersPool);
    tourney = {
      ...tourney,
      playersPool: players,
      qualifierSubmissions: submissions,
      isLocked: false,
    };
  }

  // Always recalculate brackets from current qualifiers before locking
  tourney.tiers = generateDraftBracketsForTournament(tourney);

  // 2. Lock brackets into Match Play Mode
  const lockedTiers = tourney.tiers.map(t => ({ ...t, isLocked: true }));
  tourney.isLocked = true;
  tourney.tiers = lockedTiers;

  // 3. Simulate all match play rounds
  const { updatedTiers, matchScores } = simulateTournamentMatches(tourney, tourney.tiers);
  tourney.tiers = updatedTiers;
  tourney.matchScores = matchScores;

  return tourney;
}
