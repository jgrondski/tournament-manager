import {
  BracketMatch,
  BracketRound,
  BracketStructure,
  GenerateBracketOptions,
  SeededPlayer,
} from '../types';
import { getRoundName, getStandardSeedingPairs } from './seed-utils';
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

  const { tierId, bestOf = 3, roundBestOfOverrides = {} } = options;
  const getBestOfForRound = (r: number) => roundBestOfOverrides[r] ?? bestOf;
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
        bestOf: getBestOfForRound(r),
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

  // Step 3: Route preliminary rounds forward and connect into Championship Round
  // Preliminary rounds 1 through numPrelimRounds - 1 feed horizontally into the next preliminary round
  for (let r = 1; r < numPrelimRounds; r++) {
    const currentRound = rounds[r - 1];
    const nextRound = rounds[r];
    for (let m = 0; m < currentRound.matches.length; m++) {
      const match = currentRound.matches[m];
      const targetMatch = nextRound.matches[m];
      match.nextMatchId = targetMatch.id;
      match.nextMatchSlot = 2;
      targetMatch.player2.sourceMatchId = match.id;
    }
  }

  // The last preliminary round (Round numPrelimRounds) feeds into the Championship Round (Round numPrelimRounds + 1)
  // Championship round matches follow standard seeding pairs for sFinal (e.g. for 8: [1,8], [4,5], [2,7], [3,6])
  const champPairs = getStandardSeedingPairs(sFinal);
  const champRound = rounds[numPrelimRounds];
  // Sort championship match indices by their opponent seed descending (lowest seed first)
  // e.g. for sFinal=8: match 0 (opp 8), match 2 (opp 7), match 3 (opp 6), match 1 (opp 5)
  const sortedChampMatchIndices = Array.from({ length: mChamp }, (_, i) => i)
    .sort((a, b) => champPairs[b][1] - champPairs[a][1]);

  const lastPrelimRound = rounds[numPrelimRounds - 1];
  const numPrelimFeeds = lastPrelimRound.matches.length;

  for (let i = 0; i < numPrelimFeeds; i++) {
    const prelimMatch = lastPrelimRound.matches[i];
    const targetMatchIndex = sortedChampMatchIndices[i];
    const targetMatch = champRound.matches[targetMatchIndex];

    prelimMatch.nextMatchId = targetMatch.id;
    prelimMatch.nextMatchSlot = 2;
    targetMatch.player2.sourceMatchId = prelimMatch.id;
  }

  // Step 4: Seed entering players into match slots
  // Populate Round 1:
  const round1SeedsStart = totalPlayers - 2 * m1 + 1;
  for (let m = 0; m < m1; m++) {
    const match = rounds[0].matches[m];
    const highSeed = round1SeedsStart + m;
    const lowSeed = totalPlayers - m;

    match.player1 = { player: playerBySeed.get(highSeed) ?? null };
    match.player2 = { player: playerBySeed.get(lowSeed) ?? null };
  }

  // Populate intermediate preliminary rounds (Rounds 2 through numPrelimRounds)
  let currentSeed = round1SeedsStart - 1;
  for (let r = 2; r <= numPrelimRounds; r++) {
    const round = rounds[r - 1];
    for (let m = 0; m < round.matches.length; m++) {
      const match = round.matches[m];
      if (!match.player1.player && currentSeed >= 1) {
        match.player1 = { player: playerBySeed.get(currentSeed) ?? null };
        currentSeed--;
      }
      if (!match.player2.player && !match.player2.sourceMatchId && currentSeed >= 1) {
        match.player2 = { player: playerBySeed.get(currentSeed) ?? null };
        currentSeed--;
      }
    }
  }

  // Populate Championship Round:
  // Slot 1 is always the match leader (champPairs[m][0])
  // Slot 2 is either fed by a preliminary match (already wired with sourceMatchId) OR directly filled by the opponent bye player (champPairs[m][1])
  for (let m = 0; m < mChamp; m++) {
    const champMatch = champRound.matches[m];
    const leaderSeed = champPairs[m][0];
    const opponentSeed = champPairs[m][1];

    champMatch.player1 = { player: playerBySeed.get(leaderSeed) ?? null };

    if (!champMatch.player2.sourceMatchId) {
      champMatch.player2 = { player: playerBySeed.get(opponentSeed) ?? null };
    }
  }

  // Renumber all matches sequentially across all rounds
  let globalMatchNum = 1;
  for (const round of rounds) {
    for (const match of round.matches) {
      match.matchNumber = globalMatchNum++;
      if (matchesById[match.id]) {
        matchesById[match.id].matchNumber = match.matchNumber;
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

/**
 * Calculates the valid powers-of-two flat bracket widths for a given player count.
 * Flat brackets accept powers of 2, up to roughly half the number of players:
 * Powers of 2 starting from 2 up to max(2, floor(playerCount / 2)).
 * e.g.:
 * - 9 players -> maxAllowed = 4 -> [2, 4]
 * - 16 players -> maxAllowed = 8 -> [2, 4, 8]
 * - 4 players -> maxAllowed = 2 -> [2]
 * - 32 players -> maxAllowed = 16 -> [2, 4, 8, 16]
 */
export function getValidFlatWidths(playerCount: number): number[] {
  const maxAllowed = Math.max(2, Math.floor(playerCount / 2));
  const widths: number[] = [];
  let w = 2;
  while (w <= maxAllowed) {
    widths.push(w);
    w *= 2;
  }
  return widths.length > 0 ? widths : [2];
}

