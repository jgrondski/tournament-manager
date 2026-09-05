import {
  BracketMatch,
  BracketRound,
  BracketStructure,
  GenerateBracketOptions,
  SeededPlayer,
} from '../types';
import { getRoundName } from './seed-utils';
import { generateTraditionalBracket } from './traditional';

/**
 * Pure generator for Flat Brackets.
 * - Caps maximum matches per round to flatWidth (width).
 * - Cascades byes to top seeds, allowing bottom seeds to play in early rounds.
 * - Groups adjacent bottom seeds in early rounds (highest vs. lowest within that specific tier subset).
 * - Deterministically links match winners to downstream match slots.
 */
export function generateFlatBracket(
  players: SeededPlayer[],
  flatWidth: number,
  options: GenerateBracketOptions = {}
): BracketStructure {
  if (players.length < 2) {
    throw new Error(`Flat bracket requires at least 2 players, received ${players.length}`);
  }
  if (flatWidth < 1) {
    throw new Error(`flatWidth must be >= 1, received ${flatWidth}`);
  }

  const { tierId, bestOf = 3 } = options;
  const totalPlayers = players.length;

  // Map players by seed
  const playerBySeed = new Map<number, SeededPlayer>();
  for (const player of players) {
    playerBySeed.set(player.seed, player);
  }

  // Calculate largest championship power-of-two size where round matches <= flatWidth
  // If flatWidth is 4, S_final = 8 (championship round has 4 matches).
  // If flatWidth is 8, S_final = 16 (championship round has 8 matches).
  const sFinalPower = Math.floor(Math.log2(Math.max(2, 2 * flatWidth)));
  const sFinal = Math.pow(2, sFinalPower);
  const mChamp = sFinal / 2;

  // If player count fits comfortably inside the championship size,
  // we can use standard bracket logic because the max round width will never exceed flatWidth.
  if (totalPlayers <= sFinal) {
    const traditional = generateTraditionalBracket(players, options);
    return {
      ...traditional,
      type: 'FLAT',
      flatWidth,
    };
  }

  // Otherwise, we have preliminary step-in rounds before the championship stage.
  // Number of players to eliminate before championship stage:
  const elimNeeded = totalPlayers - sFinal;
  const numPrelimRounds = Math.ceil(elimNeeded / flatWidth);
  const m1 = elimNeeded - (numPrelimRounds - 1) * flatWidth;

  const matchesById: Record<string, BracketMatch> = {};
  const rounds: BracketRound[] = [];

  const createMatchId = (round: number, matchIndex: number) =>
    tierId ? `${tierId}-r${round}-m${matchIndex + 1}` : `r${round}-m${matchIndex + 1}`;

  // Plan match counts per round:
  // Round 1: m1 matches
  // Rounds 2 to numPrelimRounds: flatWidth matches each
  // Championship rounds: mChamp, mChamp / 2, ..., 1 match
  const roundMatchCounts: number[] = [];
  roundMatchCounts.push(m1);
  for (let i = 1; i < numPrelimRounds; i++) {
    roundMatchCounts.push(flatWidth);
  }
  let currChamp = mChamp;
  while (currChamp >= 1) {
    roundMatchCounts.push(currChamp);
    currChamp = Math.floor(currChamp / 2);
  }

  const totalRounds = roundMatchCounts.length;

  // Step 1: Scaffold all matches across all rounds
  for (let r = 1; r <= totalRounds; r++) {
    const matchCount = roundMatchCounts[r - 1];
    const roundMatches: BracketMatch[] = [];

    for (let m = 0; m < matchCount; m++) {
      const matchId = createMatchId(r, m);
      const match: BracketMatch = {
        id: matchId,
        tierId,
        roundNumber: r,
        matchNumber: m + 1,
        player1: { player: null },
        player2: { player: null },
        winnerId: null,
        loserId: null,
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

  // Step 2: Route championship rounds (from round numPrelimRounds + 1 to totalRounds)
  // Standard binary tree routing
  for (let r = numPrelimRounds + 1; r < totalRounds; r++) {
    const currentRound = rounds[r - 1];
    for (let m = 0; m < currentRound.matches.length; m++) {
      const match = currentRound.matches[m];
      match.nextMatchId = createMatchId(r + 1, Math.floor(m / 2));
      match.nextMatchSlot = m % 2 === 0 ? 1 : 2;

      const nextMatch = matchesById[match.nextMatchId];
      if (match.nextMatchSlot === 1) {
        nextMatch.player1.sourceMatchId = match.id;
      } else {
        nextMatch.player2.sourceMatchId = match.id;
      }
    }
  }

  // Step 3: Route preliminary rounds forward into subsequent rounds
  // Each match m in preliminary round r feeds into round r+1
  for (let r = 1; r <= numPrelimRounds; r++) {
    const currentRound = rounds[r - 1];
    const nextRound = rounds[r];

    for (let m = 0; m < currentRound.matches.length; m++) {
      const match = currentRound.matches[m];
      // Target match in next round:
      // In flat step-in brackets, the winners from previous round occupy slot 2 of target matches
      const targetMatchIndex = nextRound.matches.length - 1 - m;
      const targetMatch = nextRound.matches[Math.max(0, targetMatchIndex)];

      match.nextMatchId = targetMatch.id;
      match.nextMatchSlot = 2;
      targetMatch.player2.sourceMatchId = match.id;
    }
  }

  // Step 4: Seed entering players into match slots
  // Calculate which seeds enter in which round:
  // - Round 1: bottom 2 * m1 seeds (e.g. seeds (N - 2*m1 + 1) to N)
  // - Round 2 to numPrelimRounds: next (2 * flatWidth - prevMatches) seeds
  // - Championship round 1: remaining top seeds into remaining open slots

  // Populate Round 1:
  const round1SeedsStart = totalPlayers - 2 * m1 + 1;
  const round1Subset: number[] = [];
  for (let s = round1SeedsStart; s <= totalPlayers; s++) {
    round1Subset.push(s);
  }

  // Pair highest vs lowest in this subset
  for (let m = 0; m < m1; m++) {
    const match = rounds[0].matches[m];
    const highSeed = round1Subset[m];
    const lowSeed = round1Subset[round1Subset.length - 1 - m];

    const p1 = playerBySeed.get(highSeed) ?? null;
    const p2 = playerBySeed.get(lowSeed) ?? null;

    match.player1 = { player: p1 };
    match.player2 = { player: p2 };
  }

  // Populate entering seeds for subsequent rounds (Rounds 2 through numPrelimRounds + 1)
  let currentTopSeed = round1SeedsStart - 1;

  for (let r = 2; r <= numPrelimRounds + 1; r++) {
    const round = rounds[r - 1];
    // Find matches in this round whose player1 slot is currently empty
    for (let m = 0; m < round.matches.length; m++) {
      const match = round.matches[m];
      if (!match.player1.player && currentTopSeed >= 1) {
        const p = playerBySeed.get(currentTopSeed) ?? null;
        match.player1 = { player: p };
        currentTopSeed--;
      }
      if (!match.player2.player && !match.player2.sourceMatchId && currentTopSeed >= 1) {
        const p = playerBySeed.get(currentTopSeed) ?? null;
        match.player2 = { player: p };
        currentTopSeed--;
      }
    }
  }

  return {
    tierId,
    type: 'FLAT',
    totalPlayers,
    totalRounds,
    flatWidth,
    rounds,
    matchesById,
  };
}
