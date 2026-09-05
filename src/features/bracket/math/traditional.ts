import {
  BracketMatch,
  BracketRound,
  BracketStructure,
  GenerateBracketOptions,
  MatchParticipant,
  SeededPlayer,
} from '../types';
import {
  getNextPowerOfTwo,
  getRoundName,
  getStandardSeedingPairs,
} from './seed-utils';

/**
 * Pure generator for single-elimination Traditional brackets.
 * - Seeds non-powers of two by cascading byes to the highest seeds (Seed 1, 2, ..., B).
 * - Symmetrically separates top seeds so #1 and #2 only meet in the Finals.
 * - Deterministically links match winners to downstream match slots.
 */
export function generateTraditionalBracket(
  players: SeededPlayer[],
  options: GenerateBracketOptions = {}
): BracketStructure {
  if (players.length < 2) {
    throw new Error(`Traditional bracket requires at least 2 players, received ${players.length}`);
  }

  const { tierId, bestOf = 3 } = options;
  const totalPlayers = players.length;
  const bracketSize = getNextPowerOfTwo(totalPlayers);
  const totalRounds = Math.log2(bracketSize);

  // Map players by seed
  const playerBySeed = new Map<number, SeededPlayer>();
  for (const player of players) {
    playerBySeed.set(player.seed, player);
  }

  const matchesById: Record<string, BracketMatch> = {};
  const rounds: BracketRound[] = [];

  // Helper to create deterministic match ID
  const createMatchId = (round: number, matchIndex: number) =>
    tierId ? `${tierId}-r${round}-m${matchIndex + 1}` : `r${round}-m${matchIndex + 1}`;

  // Step 1: Pre-scaffold all matches across all rounds with routing pointers
  for (let r = 1; r <= totalRounds; r++) {
    const matchCount = bracketSize / Math.pow(2, r);
    const roundMatches: BracketMatch[] = [];

    for (let m = 0; m < matchCount; m++) {
      const matchId = createMatchId(r, m);
      const isFinalRound = r === totalRounds;

      const nextMatchId = isFinalRound ? undefined : createMatchId(r + 1, Math.floor(m / 2));
      const nextMatchSlot: 1 | 2 | undefined = isFinalRound ? undefined : (m % 2 === 0 ? 1 : 2);

      const match: BracketMatch = {
        id: matchId,
        tierId,
        roundNumber: r,
        matchNumber: m + 1,
        player1: { player: null },
        player2: { player: null },
        winnerId: null,
        loserId: null,
        nextMatchId,
        nextMatchSlot,
        bestOf,
        isBye: false,
      };

      roundMatches.push(match);
      matchesById[matchId] = match;
    }

    rounds.push({
      roundNumber: r,
      name: getRoundName(r, totalRounds, matchCount),
      matches: roundMatches,
    });
  }

  // Step 2: Populate Round 1 with seeded players and byes
  const seedingPairs = getStandardSeedingPairs(bracketSize);
  const round1 = rounds[0];

  for (let m = 0; m < seedingPairs.length; m++) {
    const [seed1, seed2] = seedingPairs[m];
    const match = round1.matches[m];

    const player1 = playerBySeed.get(seed1) ?? null;
    const player2 = playerBySeed.get(seed2) ?? null;

    if (player1 && player2) {
      // Both players present: active match
      match.player1 = { player: player1 };
      match.player2 = { player: player2 };
      match.isBye = false;

      // Link downstream match slot sourceMatchId
      if (match.nextMatchId && match.nextMatchSlot) {
        const nextMatch = matchesById[match.nextMatchId];
        if (match.nextMatchSlot === 1) {
          nextMatch.player1.sourceMatchId = match.id;
        } else {
          nextMatch.player2.sourceMatchId = match.id;
        }
      }
    } else if (player1 && !player2) {
      // Player 1 receives a bye
      match.player1 = { player: player1 };
      match.player2 = { player: null, isBye: true };
      match.isBye = true;
      match.winnerId = player1.id;

      // Automatically advance Player 1 to next round
      if (match.nextMatchId && match.nextMatchSlot) {
        const nextMatch = matchesById[match.nextMatchId];
        const participant: MatchParticipant = {
          player: player1,
          sourceMatchId: match.id,
        };
        if (match.nextMatchSlot === 1) {
          nextMatch.player1 = participant;
        } else {
          nextMatch.player2 = participant;
        }
      }
    } else if (!player1 && player2) {
      // Player 2 receives a bye
      match.player1 = { player: null, isBye: true };
      match.player2 = { player: player2 };
      match.isBye = true;
      match.winnerId = player2.id;

      // Automatically advance Player 2 to next round
      if (match.nextMatchId && match.nextMatchSlot) {
        const nextMatch = matchesById[match.nextMatchId];
        const participant: MatchParticipant = {
          player: player2,
          sourceMatchId: match.id,
        };
        if (match.nextMatchSlot === 1) {
          nextMatch.player1 = participant;
        } else {
          nextMatch.player2 = participant;
        }
      }
    } else {
      throw new Error(`Invalid bracket state: both players in match ${match.id} are byes.`);
    }
  }

  // Step 3: Wire remaining downstream sourceMatchIds for rounds 2 through N
  for (let r = 2; r <= totalRounds; r++) {
    const currentRound = rounds[r - 1];
    for (const match of currentRound.matches) {
      if (match.nextMatchId && match.nextMatchSlot) {
        const nextMatch = matchesById[match.nextMatchId];
        if (match.nextMatchSlot === 1) {
          nextMatch.player1.sourceMatchId = match.id;
        } else {
          nextMatch.player2.sourceMatchId = match.id;
        }
      }
    }
  }

  return {
    tierId,
    type: 'TRADITIONAL',
    totalPlayers,
    totalRounds,
    rounds,
    matchesById,
  };
}
