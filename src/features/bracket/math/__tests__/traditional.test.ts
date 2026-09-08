import { describe, expect, it } from 'vitest';
import { generateTraditionalBracket } from '../traditional';
import { SeededPlayer } from '../../types';

function createMockPlayers(count: number): SeededPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `Player ${i + 1}`,
    seed: i + 1,
  }));
}

describe('generateTraditionalBracket', () => {
  it('throws an error if fewer than 2 players are provided', () => {
    expect(() => generateTraditionalBracket([])).toThrow('requires at least 2 players');
    expect(() => generateTraditionalBracket(createMockPlayers(1))).toThrow('requires at least 2 players');
  });

  describe('Power-of-two participant sizes', () => {
    it('correctly generates a 2-player bracket (Finals only)', () => {
      const players = createMockPlayers(2);
      const bracket = generateTraditionalBracket(players);

      expect(bracket.type).toBe('TRADITIONAL');
      expect(bracket.totalPlayers).toBe(2);
      expect(bracket.totalRounds).toBe(1);
      expect(bracket.rounds).toHaveLength(1);
      expect(bracket.rounds[0].name).toBe('Finals');
      expect(bracket.rounds[0].matches).toHaveLength(1);

      const match = bracket.rounds[0].matches[0];
      expect(match.player1.player?.seed).toBe(1);
      expect(match.player2.player?.seed).toBe(2);
      expect(match.isBye).toBe(false);
      expect(match.nextMatchId).toBeUndefined();
    });

    it('correctly generates an 8-player bracket with standard seeding', () => {
      const players = createMockPlayers(8);
      const bracket = generateTraditionalBracket(players);

      expect(bracket.totalPlayers).toBe(8);
      expect(bracket.totalRounds).toBe(3); // QF, SF, Finals
      expect(bracket.rounds[0].name).toBe('Quarterfinals');
      expect(bracket.rounds[1].name).toBe('Semifinals');
      expect(bracket.rounds[2].name).toBe('Finals');

      // 4 QF matches, 2 SF matches, 1 Final match = 7 total matches
      expect(Object.keys(bracket.matchesById)).toHaveLength(7);

      const qfMatches = bracket.rounds[0].matches;
      expect(qfMatches).toHaveLength(4);

      // Verify standard tournament pairings: [1 vs 8], [4 vs 5], [2 vs 7], [3 vs 6]
      expect(qfMatches[0].player1.player?.seed).toBe(1);
      expect(qfMatches[0].player2.player?.seed).toBe(8);

      expect(qfMatches[1].player1.player?.seed).toBe(4);
      expect(qfMatches[1].player2.player?.seed).toBe(5);

      expect(qfMatches[2].player1.player?.seed).toBe(2);
      expect(qfMatches[2].player2.player?.seed).toBe(7);

      expect(qfMatches[3].player1.player?.seed).toBe(3);
      expect(qfMatches[3].player2.player?.seed).toBe(6);

      // Verify nextMatch routing:
      // Match 0 and 1 feed into Semifinal 1 (r2-m1)
      expect(qfMatches[0].nextMatchId).toBe('r2-m1');
      expect(qfMatches[0].nextMatchSlot).toBe(1);

      expect(qfMatches[1].nextMatchId).toBe('r2-m1');
      expect(qfMatches[1].nextMatchSlot).toBe(2);

      // Match 2 and 3 feed into Semifinal 2 (r2-m2)
      expect(qfMatches[2].nextMatchId).toBe('r2-m2');
      expect(qfMatches[2].nextMatchSlot).toBe(1);

      expect(qfMatches[3].nextMatchId).toBe('r2-m2');
      expect(qfMatches[3].nextMatchSlot).toBe(2);

      // Semifinals feed into Finals (r3-m1)
      const sfMatches = bracket.rounds[1].matches;
      expect(sfMatches[0].nextMatchId).toBe('r3-m1');
      expect(sfMatches[0].nextMatchSlot).toBe(1);
      expect(sfMatches[1].nextMatchId).toBe('r3-m1');
      expect(sfMatches[1].nextMatchSlot).toBe(2);
    });

    it('correctly generates a 16-player bracket with Round 1, Quarterfinals, Semifinals, Finals', () => {
      const players = createMockPlayers(16);
      const bracket = generateTraditionalBracket(players);

      expect(bracket.totalRounds).toBe(4);
      expect(bracket.rounds[0].name).toBe('Round 1');
      expect(bracket.rounds[1].name).toBe('Quarterfinals');
      expect(bracket.rounds[2].name).toBe('Semifinals');
      expect(bracket.rounds[3].name).toBe('Finals');

      expect(bracket.rounds[0].matches).toHaveLength(8);
      expect(bracket.rounds[1].matches).toHaveLength(4);
      expect(bracket.rounds[2].matches).toHaveLength(2);
      expect(bracket.rounds[3].matches).toHaveLength(1);
      expect(Object.keys(bracket.matchesById)).toHaveLength(15);
    });

    it('correctly generates a 32-player bracket with Round 1, Round 2, Quarterfinals, Semifinals, Finals', () => {
      const players = createMockPlayers(32);
      const bracket = generateTraditionalBracket(players);

      expect(bracket.totalRounds).toBe(5);
      expect(bracket.rounds[0].name).toBe('Round 1');
      expect(bracket.rounds[1].name).toBe('Round 2');
      expect(bracket.rounds[2].name).toBe('Quarterfinals');
      expect(bracket.rounds[3].name).toBe('Semifinals');
      expect(bracket.rounds[4].name).toBe('Finals');
    });
  });

  describe('Non-power-of-two sizes with cascading byes', () => {
    it('correctly assigns 2 byes to top seeds in a 6-player bracket', () => {
      // 6 players in an 8-player bracket -> 2 byes (Seed 1 and Seed 2 receive byes)
      const players = createMockPlayers(6);
      const bracket = generateTraditionalBracket(players);

      expect(bracket.totalPlayers).toBe(6);
      expect(bracket.totalRounds).toBe(3);

      // Total matches strictly equals totalPlayers - 1 = 5
      expect(Object.keys(bracket.matchesById)).toHaveLength(5);

      const r1Matches = bracket.rounds[0].matches;
      // Exactly 2 active matches in Round 1
      expect(r1Matches).toHaveLength(2);

      // Match 1: Seed 4 vs Seed 5
      expect(r1Matches[0].id).toBe('r1-m1');
      expect(r1Matches[0].player1.player?.seed).toBe(4);
      expect(r1Matches[0].player2.player?.seed).toBe(5);
      expect(r1Matches[0].isBye).toBe(false);

      // Match 2: Seed 3 vs Seed 6
      expect(r1Matches[1].id).toBe('r1-m2');
      expect(r1Matches[1].player1.player?.seed).toBe(3);
      expect(r1Matches[1].player2.player?.seed).toBe(6);
      expect(r1Matches[1].isBye).toBe(false);

      // Check that bye players (Seed 1 and 2) are placed directly into Round 2 (Semifinals)
      const r2Matches = bracket.rounds[1].matches;
      expect(r2Matches).toHaveLength(2);
      expect(r2Matches[0].player1.player?.seed).toBe(1);
      expect(r2Matches[0].player1.sourceMatchId).toBeUndefined();
      expect(r2Matches[0].player2.sourceMatchId).toBe('r1-m1');

      expect(r2Matches[1].player1.player?.seed).toBe(2);
      expect(r2Matches[1].player1.sourceMatchId).toBeUndefined();
      expect(r2Matches[1].player2.sourceMatchId).toBe('r1-m2');
    });

    it('correctly handles 5 players (3 byes: seeds 1, 2, 3)', () => {
      const players = createMockPlayers(5);
      const bracket = generateTraditionalBracket(players);

      // Total matches = 5 - 1 = 4
      expect(Object.keys(bracket.matchesById)).toHaveLength(4);

      const r1Matches = bracket.rounds[0].matches;
      // Only 1 active match in Round 1: Seed 4 vs Seed 5
      expect(r1Matches).toHaveLength(1);
      expect(r1Matches[0].player1.player?.seed).toBe(4);
      expect(r1Matches[0].player2.player?.seed).toBe(5);
      expect(r1Matches[0].isBye).toBe(false);

      // Round 2 (Semifinals):
      // Match 1: Seed 1 vs (winner of 4v5)
      // Match 2: Seed 2 vs Seed 3 (both pre-placed!)
      const r2Matches = bracket.rounds[1].matches;
      expect(r2Matches[0].player1.player?.seed).toBe(1);
      expect(r2Matches[0].player2.sourceMatchId).toBe('r1-m1');

      expect(r2Matches[1].player1.player?.seed).toBe(2);
      expect(r2Matches[1].player2.player?.seed).toBe(3);
    });

    it('correctly handles 7 players (1 bye: seed 1)', () => {
      const players = createMockPlayers(7);
      const bracket = generateTraditionalBracket(players);

      // Total matches = 7 - 1 = 6
      expect(Object.keys(bracket.matchesById)).toHaveLength(6);

      const r1Matches = bracket.rounds[0].matches;
      // 3 active matches in Round 1
      expect(r1Matches).toHaveLength(3);
      for (const m of r1Matches) {
        expect(m.isBye).toBe(false);
      }

      // Seed 1 placed directly into Round 2
      const r2Matches = bracket.rounds[1].matches;
      expect(r2Matches[0].player1.player?.seed).toBe(1);
      expect(r2Matches[0].player1.sourceMatchId).toBeUndefined();
    });

    it('correctly handles 9 players (7 byes, 1 active match) and names earliest round "Round 0"', () => {
      const players = createMockPlayers(9);
      const bracket = generateTraditionalBracket(players);

      expect(bracket.totalPlayers).toBe(9);
      expect(bracket.totalRounds).toBe(4);
      // Total matches = 9 - 1 = 8
      expect(Object.keys(bracket.matchesById)).toHaveLength(8);

      const r0 = bracket.rounds[0];
      // 9 players in 16-size: 7 byes, 1 active match (8 vs 9)
      expect(r0.name).toBe('Round 0');
      expect(r0.matches).toHaveLength(1);
      expect(r0.matches[0].isBye).toBe(false);
      expect(r0.matches[0].player1.player?.seed).toBe(8);
      expect(r0.matches[0].player2.player?.seed).toBe(9);

      // Subsequent rounds follow standard names
      expect(bracket.rounds[1].name).toBe('Quarterfinals');
      expect(bracket.rounds[2].name).toBe('Semifinals');
      expect(bracket.rounds[3].name).toBe('Finals');
    });

    it('enforces Round 0 break-even threshold (11 players -> Round 0, 12 players -> not Round 0)', () => {
      // 11 players: 5 byes, 3 active matches (3 < 5) -> Round 0
      const bracket11 = generateTraditionalBracket(createMockPlayers(11));
      expect(bracket11.rounds[0].name).toBe('Round 0');
      expect(Object.keys(bracket11.matchesById)).toHaveLength(10); // 11 - 1 = 10

      // 12 players: 4 byes, 4 active matches (4 == 4, not less) -> Not Round 0
      const bracket12 = generateTraditionalBracket(createMockPlayers(12));
      expect(bracket12.rounds[0].name).not.toBe('Round 0');
      expect(Object.keys(bracket12.matchesById)).toHaveLength(11); // 12 - 1 = 11
    });

    it('correctly handles 11 players with direct Round 2 placement of seeds 1-5', () => {
      const players = createMockPlayers(11);
      const bracket = generateTraditionalBracket(players);

      expect(Object.keys(bracket.matchesById)).toHaveLength(10); // 11 - 1
      expect(bracket.rounds[0].matches).toHaveLength(3); // 3 active matches in R0 (6v11, 7v10, 8v9)
      expect(bracket.rounds[1].matches).toHaveLength(4); // 4 QF matches

      // In Round 2 (QF):
      // QF1: Seed 1 vs (winner of 8v9)
      // QF2: Seed 4 vs Seed 5 (both byes directly placed!)
      // QF3: Seed 2 vs (winner of 7v10)
      // QF4: Seed 3 vs (winner of 6v11)
      const qf = bracket.rounds[1].matches;
      expect(qf[0].player1.player?.seed).toBe(1);
      expect(qf[1].player1.player?.seed).toBe(4);
      expect(qf[1].player2.player?.seed).toBe(5);
      expect(qf[2].player1.player?.seed).toBe(2);
      expect(qf[3].player1.player?.seed).toBe(3);
    });
  });

  describe('Seating order guarantees (top match -> top seat, bottom match -> bottom seat)', () => {
    it('always routes the top match winner to Slot 1 (top) and bottom match winner to Slot 2 (bottom)', () => {
      const players = createMockPlayers(4);
      const bracket = generateTraditionalBracket(players);

      const m0 = bracket.rounds[0].matches[0]; // Top match
      const m1 = bracket.rounds[0].matches[1]; // Bottom match

      // Both feed into Finals (r2-m1)
      expect(m0.nextMatchId).toBe('r2-m1');
      expect(m0.nextMatchSlot).toBe(1); // Top seat

      expect(m1.nextMatchId).toBe('r2-m1');
      expect(m1.nextMatchSlot).toBe(2); // Bottom seat
    });
  });

  describe('Custom options', () => {
    it('supports custom tierId and bestOf settings', () => {
      const players = createMockPlayers(4);
      const bracket = generateTraditionalBracket(players, {
        tierId: 'tier-gold',
        bestOf: 5,
      });

      expect(bracket.tierId).toBe('tier-gold');
      expect(bracket.rounds[0].matches[0].id).toContain('tier-gold');
      expect(bracket.rounds[0].matches[0].bestOf).toBe(5);
    });
  });
});
