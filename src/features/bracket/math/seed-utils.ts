/**
 * Mathematical utilities for tournament bracket seeding, pairing, and sizing.
 */

/**
 * Returns the smallest power of 2 greater than or equal to n (minimum 2).
 */
export function getNextPowerOfTwo(n: number): number {
  if (n <= 2) return 2;
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Returns the standard seeding pairs for a single-elimination bracket of given power-of-two size.
 * Each pair represents [seed1, seed2] for round 1 matches.
 * The order ensures that if higher seeds win:
 * - Seed 1 and Seed 2 can only meet in the Finals.
 * - Seeds 1, 2, 3, 4 only meet in the Semifinals.
 * - Match 2i and Match 2i + 1 feed directly into the same match in the next round.
 *
 * Example for size 8:
 * [ [1, 8], [4, 5], [2, 7], [3, 6] ]
 */
export function getStandardSeedingPairs(bracketSize: number): [number, number][] {
  if (bracketSize < 2 || (bracketSize & (bracketSize - 1)) !== 0) {
    throw new Error(`bracketSize must be a power of 2 >= 2, received ${bracketSize}`);
  }

  // Generate recursive standard seeding order of match seed leaders
  // For size 2: [1]
  // For size 4: [1, 4]
  // For size 8: [1, 4, 2, 3]
  // For size 16: [1, 8, 4, 5, 2, 7, 3, 6]
  let leaders: number[] = [1];
  let currentRoundSize = 2;

  while (currentRoundSize < bracketSize) {
    const nextLeaders: number[] = [];
    const sum = currentRoundSize + 1;
    for (const leader of leaders) {
      nextLeaders.push(leader);
      nextLeaders.push(sum - leader);
    }
    leaders = nextLeaders;
    currentRoundSize *= 2;
  }

  // For the final round 1 matches, pair each leader with (bracketSize + 1 - leader)
  const sum = bracketSize + 1;
  return leaders.map((leader) => [leader, sum - leader]);
}

/**
 * Returns a human-friendly name for a bracket round.
 * Only Quarterfinals, Semifinals, and Finals receive named stages.
 * Earlier rounds are named "Round {#}" (or "Round 0" for play-in rounds).
 */
export function getRoundName(
  roundNumber: number,
  totalRounds: number,
  _matchCount?: number,
  isRoundZero: boolean = false
): string {
  const roundsFromFinals = totalRounds - roundNumber;
  if (roundsFromFinals === 0) return 'Finals';
  if (roundsFromFinals === 1) return 'Semifinals';
  if (roundsFromFinals === 2) return 'Quarterfinals';

  if (isRoundZero && roundNumber === 1) {
    return 'Round 0';
  }

  const adjustedNumber = isRoundZero ? roundNumber - 1 : roundNumber;
  return `Round ${adjustedNumber}`;
}
