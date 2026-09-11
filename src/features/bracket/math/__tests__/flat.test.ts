import { describe, expect, it } from 'vitest';
import { generateFlatBracket, getValidFlatWidths } from '../flat';
import { SeededPlayer } from '../../types';

function createMockPlayers(count: number): SeededPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `Player ${i + 1}`,
    seed: i + 1,
  }));
}

describe('generateFlatBracket', () => {
  it('throws an error if fewer than 2 players or invalid flatWidth is provided', () => {
    expect(() => generateFlatBracket([], 4)).toThrow('requires at least 2 players');
    expect(() => generateFlatBracket(createMockPlayers(1), 4)).toThrow('requires at least 2 players');
    expect(() => generateFlatBracket(createMockPlayers(4), 0)).toThrow('flatWidth must be >= 1');
  });

  describe('Player counts within championship threshold (N <= 2 * flatWidth)', () => {
    it('behaves like a standard bracket when N=6 and flatWidth=4', () => {
      const players = createMockPlayers(6);
      const bracket = generateFlatBracket(players, 4);

      expect(bracket.type).toBe('FLAT');
      expect(bracket.flatWidth).toBe(4);
      expect(bracket.totalPlayers).toBe(6);

      // Verify no round exceeds flatWidth = 4
      for (const round of bracket.rounds) {
        expect(round.matches.length).toBeLessThanOrEqual(4);
      }
    });

    it('correctly handles N=8 and flatWidth=4', () => {
      const players = createMockPlayers(8);
      const bracket = generateFlatBracket(players, 4);

      expect(bracket.rounds).toHaveLength(3); // QF (4), SF (2), Finals (1)
      expect(bracket.rounds[0].matches).toHaveLength(4);
      expect(bracket.rounds[1].matches).toHaveLength(2);
      expect(bracket.rounds[2].matches).toHaveLength(1);

      for (const round of bracket.rounds) {
        expect(round.matches.length).toBeLessThanOrEqual(4);
      }
    });
  });

  describe('Step-in flat brackets with preliminary rounds (N > 2 * flatWidth)', () => {
    it('correctly structures N=10 and flatWidth=4 (2 prelim matches + 4 QF + 2 SF + 1 Final)', () => {
      const players = createMockPlayers(10);
      const bracket = generateFlatBracket(players, 4);

      expect(bracket.totalPlayers).toBe(10);

      // Total matches must be N - 1 = 9
      const totalMatches = Object.keys(bracket.matchesById).length;
      expect(totalMatches).toBe(9);

      // Round match counts:
      // R1: 2 matches (seeds 7-10)
      // R2: 4 matches (seeds 1-6 + 2 R1 winners)
      // R3: 2 matches (SF)
      // R4: 1 match (Finals)
      expect(bracket.rounds).toHaveLength(4);
      expect(bracket.rounds[0].matches).toHaveLength(2);
      expect(bracket.rounds[1].matches).toHaveLength(4);
      expect(bracket.rounds[2].matches).toHaveLength(2);
      expect(bracket.rounds[3].matches).toHaveLength(1);

      // Enforce width constraint: NO round exceeds flatWidth = 4
      for (const round of bracket.rounds) {
        expect(round.matches.length).toBeLessThanOrEqual(4);
      }

      // Verify Round 1 bottom seeds grouping: {7, 8, 9, 10}
      // Highest vs lowest within subset: 7 vs 10, 8 vs 9
      const r1Matches = bracket.rounds[0].matches;
      expect(r1Matches[0].player1.player?.seed).toBe(7);
      expect(r1Matches[0].player2.player?.seed).toBe(10);

      expect(r1Matches[1].player1.player?.seed).toBe(8);
      expect(r1Matches[1].player2.player?.seed).toBe(9);

      // Verify R1 matches point to R2 matches
      expect(r1Matches[0].nextMatchId).toBeDefined();
      expect(r1Matches[1].nextMatchId).toBeDefined();
    });

    it('correctly structures N=12 and flatWidth=4', () => {
      const players = createMockPlayers(12);
      const bracket = generateFlatBracket(players, 4);

      // Total matches = N - 1 = 11
      expect(Object.keys(bracket.matchesById)).toHaveLength(11);

      // R1: 4 matches (seeds 5-12)
      // R2: 4 matches (seeds 1-4 + 4 R1 winners)
      // R3: 2 matches (SF)
      // R4: 1 match (Finals)
      expect(bracket.rounds).toHaveLength(4);
      expect(bracket.rounds[0].matches).toHaveLength(4);
      expect(bracket.rounds[1].matches).toHaveLength(4);
      expect(bracket.rounds[2].matches).toHaveLength(2);
      expect(bracket.rounds[3].matches).toHaveLength(1);

      for (const round of bracket.rounds) {
        expect(round.matches.length).toBeLessThanOrEqual(4);
      }

      // Verify Round 1 subset {5..12}: highest vs lowest
      const r1 = bracket.rounds[0].matches;
      expect(r1[0].player1.player?.seed).toBe(5);
      expect(r1[0].player2.player?.seed).toBe(12);

      expect(r1[1].player1.player?.seed).toBe(6);
      expect(r1[1].player2.player?.seed).toBe(11);

      expect(r1[2].player1.player?.seed).toBe(7);
      expect(r1[2].player2.player?.seed).toBe(10);

      expect(r1[3].player1.player?.seed).toBe(8);
      expect(r1[3].player2.player?.seed).toBe(9);
    });

    it('correctly structures N=16 and flatWidth=4 across multiple preliminary tiers', () => {
      const players = createMockPlayers(16);
      const bracket = generateFlatBracket(players, 4);

      expect(Object.keys(bracket.matchesById)).toHaveLength(15); // N - 1

      for (const round of bracket.rounds) {
        expect(round.matches.length).toBeLessThanOrEqual(4);
      }
    });

    it('correctly structures N=24 and flatWidth=8', () => {
      const players = createMockPlayers(24);
      const bracket = generateFlatBracket(players, 8);

      expect(Object.keys(bracket.matchesById)).toHaveLength(23); // N - 1

      for (const round of bracket.rounds) {
        expect(round.matches.length).toBeLessThanOrEqual(8);
      }
    });

    it('correctly structures N=24 and flatWidth=4 with strictly N-1 matches and zero phantom byes', () => {
      const players = createMockPlayers(24);
      const bracket = generateFlatBracket(players, 4);

      // Total matches must strictly equal 24 - 1 = 23
      expect(Object.keys(bracket.matchesById)).toHaveLength(23);

      for (const round of bracket.rounds) {
        expect(round.matches.length).toBeLessThanOrEqual(4);
        for (const match of round.matches) {
          expect(match.isBye).toBe(false);
        }
      }
    });
  });

  describe('getValidFlatWidths', () => {
    it('returns [2, 4] for 9 players', () => {
      expect(getValidFlatWidths(9)).toEqual([2, 4]);
    });

    it('returns [2, 4, 8] for 16 players', () => {
      expect(getValidFlatWidths(16)).toEqual([2, 4, 8]);
    });

    it('returns [2, 4] for 8 players', () => {
      expect(getValidFlatWidths(8)).toEqual([2, 4]);
    });

    it('returns [2] for 4 players', () => {
      expect(getValidFlatWidths(4)).toEqual([2]);
    });

    it('returns [2, 4, 8, 16] for 32 players', () => {
      expect(getValidFlatWidths(32)).toEqual([2, 4, 8, 16]);
    });
  });
});

