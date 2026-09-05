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

    it('correctly generates a 16-player bracket', () => {
      const players = createMockPlayers(16);
      const bracket = generateTraditionalBracket(players);

      expect(bracket.totalRounds).toBe(4);
      expect(bracket.rounds[0].matches).toHaveLength(8);
      expect(bracket.rounds[1].matches).toHaveLength(4);
      expect(bracket.rounds[2].matches).toHaveLength(2);
      expect(bracket.rounds[3].matches).toHaveLength(1);
      expect(Object.keys(bracket.matchesById)).toHaveLength(15);
    });
  });

  describe('Non-power-of-two sizes with cascading byes', () => {
    it('correctly assigns 2 byes to top seeds in a 6-player bracket', () => {
      // 6 players in an 8-player bracket -> 2 byes (Seed 1 and Seed 2 receive byes)
      const players = createMockPlayers(6);
      const bracket = generateTraditionalBracket(players);

      expect(bracket.totalPlayers).toBe(6);
      expect(bracket.totalRounds).toBe(3);

      const r1Matches = bracket.rounds[0].matches;
      expect(r1Matches).toHaveLength(4);

      // Match 1: Seed 1 vs BYE (opponent 8 is absent)
      expect(r1Matches[0].player1.player?.seed).toBe(1);
      expect(r1Matches[0].player2.isBye).toBe(true);
      expect(r1Matches[0].isBye).toBe(true);
      expect(r1Matches[0].winnerId).toBe('player-1');

      // Match 2: Seed 4 vs Seed 5 (both present)
      expect(r1Matches[1].player1.player?.seed).toBe(4);
      expect(r1Matches[1].player2.player?.seed).toBe(5);
      expect(r1Matches[1].isBye).toBe(false);

      // Match 3: Seed 2 vs BYE (opponent 7 is absent)
      expect(r1Matches[2].player1.player?.seed).toBe(2);
      expect(r1Matches[2].player2.isBye).toBe(true);
      expect(r1Matches[2].isBye).toBe(true);
      expect(r1Matches[2].winnerId).toBe('player-2');

      // Match 4: Seed 3 vs Seed 6 (both present)
      expect(r1Matches[3].player1.player?.seed).toBe(3);
      expect(r1Matches[3].player2.player?.seed).toBe(6);
      expect(r1Matches[3].isBye).toBe(false);

      // Check that bye winners are auto-seeded into Round 2 (Semifinals)
      const r2Matches = bracket.rounds[1].matches;
      expect(r2Matches[0].player1.player?.seed).toBe(1);
      expect(r2Matches[0].player1.sourceMatchId).toBe(r1Matches[0].id);

      expect(r2Matches[1].player1.player?.seed).toBe(2);
      expect(r2Matches[1].player1.sourceMatchId).toBe(r1Matches[2].id);
    });

    it('correctly handles 5 players (3 byes: seeds 1, 2, 3)', () => {
      const players = createMockPlayers(5);
      const bracket = generateTraditionalBracket(players);

      const r1Matches = bracket.rounds[0].matches;
      // Seeds 1, 2, 3 receive byes; seeds 4 and 5 play
      const byeMatches = r1Matches.filter((m) => m.isBye);
      const activeMatches = r1Matches.filter((m) => !m.isBye);

      expect(byeMatches).toHaveLength(3);
      expect(activeMatches).toHaveLength(1);

      // Active match must be seed 4 vs seed 5
      expect(activeMatches[0].player1.player?.seed).toBe(4);
      expect(activeMatches[0].player2.player?.seed).toBe(5);
    });

    it('correctly handles 7 players (1 bye: seed 1)', () => {
      const players = createMockPlayers(7);
      const bracket = generateTraditionalBracket(players);

      const r1Matches = bracket.rounds[0].matches;
      const byeMatches = r1Matches.filter((m) => m.isBye);
      const activeMatches = r1Matches.filter((m) => !m.isBye);

      expect(byeMatches).toHaveLength(1);
      expect(activeMatches).toHaveLength(3);
      expect(byeMatches[0].player1.player?.seed).toBe(1);
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
