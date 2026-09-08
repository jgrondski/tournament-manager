import {
  BracketMatch,
  BracketRound,
  BracketStructure,
  GenerateBracketOptions,
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
 * - Guaranteed invariant: NEVER generates dummy/phantom bye matches.
 * - Total matches generated across the bracket strictly equals (totalPlayers - 1).
 * - Players receiving byes are placed directly into Round 2 in half-open match nodes.
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
  const totalByes = bracketSize - totalPlayers;
  const activeRound1MatchesCount = (totalPlayers - totalByes) / 2;
  // Round 0 naming rule: applies when there are fewer active matches in the earliest round
  // than there are players with byes advancing to the next round.
  const isRoundZero = activeRound1MatchesCount < totalByes;

  // Map players by seed
  const playerBySeed = new Map<number, SeededPlayer>();
  for (const player of players) {
    playerBySeed.set(player.seed, player);
  }

  const matchesById: Record<string, BracketMatch> = {};
  const rounds: BracketRound[] = [];

  const createMatchId = (round: number, matchIndex: number) =>
    tierId ? `${tierId}-r${round}-m${matchIndex + 1}` : `r${round}-m${matchIndex + 1}`;

  // Edge case: Exactly 2 players (Finals only)
  if (totalRounds === 1) {
    const matchId = createMatchId(1, 0);
    const m: BracketMatch = {
      id: matchId,
      tierId,
      roundNumber: 1,
      matchNumber: 1,
      player1: { player: playerBySeed.get(1) ?? null },
      player2: { player: playerBySeed.get(2) ?? null },
      winnerId: null,
      loserId: null,
      bestOf,
      isBye: false,
    };
    matchesById[matchId] = m;
    rounds.push({
      roundNumber: 1,
      name: 'Finals',
      matches: [m],
    });
    return {
      tierId,
      type: 'TRADITIONAL',
      totalPlayers,
      totalRounds: 1,
      rounds,
      matchesById,
    };
  }

  // General case: totalRounds >= 2
  // Step 1: Pre-scaffold matches for Rounds 2 through totalRounds
  const roundsFrom2Onwards: BracketMatch[][] = [];
  for (let r = 2; r <= totalRounds; r++) {
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
    roundsFrom2Onwards.push(roundMatches);
  }

  // Wire downstream sourceMatchId for Rounds 2 through totalRounds
  for (let idx = 0; idx < roundsFrom2Onwards.length - 1; idx++) {
    const currentMatches = roundsFrom2Onwards[idx];
    for (const match of currentMatches) {
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

  // Step 2: Determine Round 1 active matches and direct Round 2 bye placements
  const seedingPairs = getStandardSeedingPairs(bracketSize);
  const r2Matches = roundsFrom2Onwards[0]; // Round 2 matches
  const round1Matches: BracketMatch[] = [];

  let r1MatchIndex = 0;

  for (let r2Idx = 0; r2Idx < r2Matches.length; r2Idx++) {
    const r2Match = r2Matches[r2Idx];
    const topPairIdx = 2 * r2Idx;
    const bottomPairIdx = 2 * r2Idx + 1;

    const [seed1Top, seed2Top] = seedingPairs[topPairIdx];
    const [seed1Bottom, seed2Bottom] = seedingPairs[bottomPairIdx];

    // Check top feeder (feeds r2Match.player1)
    const pTop1 = playerBySeed.get(seed1Top) ?? null;
    const pTop2 = playerBySeed.get(seed2Top) ?? null;

    if (pTop1 && pTop2) {
      // Both players present: active match in Round 1
      const matchId = createMatchId(1, r1MatchIndex);
      const match: BracketMatch = {
        id: matchId,
        tierId,
        roundNumber: 1,
        matchNumber: r1MatchIndex + 1,
        player1: { player: pTop1 },
        player2: { player: pTop2 },
        winnerId: null,
        loserId: null,
        nextMatchId: r2Match.id,
        nextMatchSlot: 1,
        bestOf,
        isBye: false,
      };
      round1Matches.push(match);
      matchesById[matchId] = match;
      r2Match.player1 = { player: null, sourceMatchId: match.id };
      r1MatchIndex++;
    } else if (pTop1 && !pTop2) {
      // pTop1 receives a bye! Placed directly into Round 2 Slot 1
      r2Match.player1 = { player: pTop1 };
    } else if (!pTop1 && pTop2) {
      // pTop2 receives a bye! Placed directly into Round 2 Slot 1
      r2Match.player1 = { player: pTop2 };
    }

    // Check bottom feeder (feeds r2Match.player2)
    const pBot1 = playerBySeed.get(seed1Bottom) ?? null;
    const pBot2 = playerBySeed.get(seed2Bottom) ?? null;

    if (pBot1 && pBot2) {
      // Both players present: active match in Round 1
      const matchId = createMatchId(1, r1MatchIndex);
      const match: BracketMatch = {
        id: matchId,
        tierId,
        roundNumber: 1,
        matchNumber: r1MatchIndex + 1,
        player1: { player: pBot1 },
        player2: { player: pBot2 },
        winnerId: null,
        loserId: null,
        nextMatchId: r2Match.id,
        nextMatchSlot: 2,
        bestOf,
        isBye: false,
      };
      round1Matches.push(match);
      matchesById[matchId] = match;
      r2Match.player2 = { player: null, sourceMatchId: match.id };
      r1MatchIndex++;
    } else if (pBot1 && !pBot2) {
      // pBot1 receives a bye! Placed directly into Round 2 Slot 2
      r2Match.player2 = { player: pBot1 };
    } else if (!pBot1 && pBot2) {
      // pBot2 receives a bye! Placed directly into Round 2 Slot 2
      r2Match.player2 = { player: pBot2 };
    }
  }

  // Step 3: Renumber all matches sequentially 1..totalMatches
  let globalMatchNumber = 1;
  round1Matches.forEach((m) => {
    m.matchNumber = globalMatchNumber++;
  });
  for (const rMatches of roundsFrom2Onwards) {
    rMatches.forEach((m) => {
      m.matchNumber = globalMatchNumber++;
    });
  }

  // Assemble rounds array
  rounds.push({
    roundNumber: 1,
    name: getRoundName(1, totalRounds, round1Matches.length, isRoundZero),
    matches: round1Matches,
  });

  for (let r = 2; r <= totalRounds; r++) {
    const rMatches = roundsFrom2Onwards[r - 2];
    rounds.push({
      roundNumber: r,
      name: getRoundName(r, totalRounds, rMatches.length, isRoundZero),
      matches: rMatches,
    });
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
