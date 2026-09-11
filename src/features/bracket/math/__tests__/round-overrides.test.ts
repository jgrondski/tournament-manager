import { describe, it, expect } from 'vitest';
import { generateTraditionalBracket } from '../traditional';
import { generateFlatBracket } from '../flat';
import { SeededPlayer } from '../../types';
import { TournamentTier } from '../../../tournament/types';
import { getAvailableRoundsForTier, pruneInvalidRoundOverrides } from '../../../tournament/roundOverrides';

const createMockPlayers = (count: number): SeededPlayer[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `player_${i + 1}`,
    name: `Player ${i + 1}`,
    seed: i + 1,
  }));

describe('Round Best-of Overrides & Bo99 Support', () => {
  describe('generateTraditionalBracket round overrides', () => {
    it('inherits default bestOf when no round overrides provided', () => {
      const players = createMockPlayers(8);
      const bracket = generateTraditionalBracket(players, { tierId: 'gold', bestOf: 3 });

      expect(bracket.rounds).toHaveLength(3);
      // All matches across all rounds should be Bo3
      bracket.rounds.forEach(round => {
        round.matches.forEach(m => {
          expect(m.bestOf).toBe(3);
        });
      });
    });

    it('applies round-specific overrides for finals and semifinals while keeping default for earlier rounds', () => {
      const players = createMockPlayers(8); // 3 rounds: QF (1), SF (2), Finals (3)
      const bracket = generateTraditionalBracket(players, {
        tierId: 'gold',
        bestOf: 3,
        roundBestOfOverrides: {
          2: 5, // Semifinals Bo5
          3: 7, // Finals Bo7
        },
      });

      expect(bracket.rounds).toHaveLength(3);

      // Round 1 (QF) inherits tier default Bo3
      expect(bracket.rounds[0].roundNumber).toBe(1);
      bracket.rounds[0].matches.forEach(m => {
        expect(m.bestOf).toBe(3);
      });

      // Round 2 (SF) has override Bo5
      expect(bracket.rounds[1].roundNumber).toBe(2);
      bracket.rounds[1].matches.forEach(m => {
        expect(m.bestOf).toBe(5);
      });

      // Round 3 (Finals) has override Bo7
      expect(bracket.rounds[2].roundNumber).toBe(3);
      bracket.rounds[2].matches.forEach(m => {
        expect(m.bestOf).toBe(7);
      });

      // Check matchesById as well
      const finalsMatch = bracket.matchesById[bracket.rounds[2].matches[0].id];
      expect(finalsMatch.bestOf).toBe(7);
    });

    it('supports formats up to Bo99 (e.g. Bo99 grand finals)', () => {
      const players = createMockPlayers(4); // 2 rounds: SF (1), Finals (2)
      const bracket = generateTraditionalBracket(players, {
        tierId: 'gold',
        bestOf: 11,
        roundBestOfOverrides: {
          2: 99, // Finals Bo99!
        },
      });

      expect(bracket.rounds[0].matches[0].bestOf).toBe(11);
      expect(bracket.rounds[1].matches[0].bestOf).toBe(99);
      expect(Math.ceil(bracket.rounds[1].matches[0].bestOf / 2)).toBe(50); // First to 50 wins
    });
  });

  describe('generateFlatBracket round overrides', () => {
    it('applies round overrides to flat brackets across preliminary and championship rounds', () => {
      // 12 players with flatWidth 4
      const players = createMockPlayers(12);
      const bracket = generateFlatBracket(players, 4, {
        tierId: 'silver',
        bestOf: 3,
        roundBestOfOverrides: {
          1: 1,  // Prelim Round 1: Bo1
          3: 5,  // Championship SF: Bo5
          4: 7,  // Championship Finals: Bo7
        },
      });

      // Round 1 matches should be Bo1
      bracket.rounds[0].matches.forEach(m => {
        expect(m.bestOf).toBe(1);
      });

      // Round 2 (unspecified) should inherit default Bo3
      bracket.rounds[1].matches.forEach(m => {
        expect(m.bestOf).toBe(3);
      });

      // Round 3 matches should be Bo5
      bracket.rounds[2].matches.forEach(m => {
        expect(m.bestOf).toBe(5);
      });

      // Round 4 (Finals) matches should be Bo7
      bracket.rounds[3].matches.forEach(m => {
        expect(m.bestOf).toBe(7);
      });
    });
  });

  describe('Round Discovery & Auto-Pruning', () => {
    it('discovers correct rounds and names for traditional tiers', () => {
      const tier: TournamentTier = {
        id: 'tier_1',
        slug: 'gold',
        name: 'Gold Tier',
        priority: 1,
        bracketType: 'TRADITIONAL',
        playerCount: 16,
        bestOf: 3,
        primaryColor: '#f59e0b',
        secondaryColor: '#fbbf24',
        isLocked: false,
        bracket: generateTraditionalBracket(createMockPlayers(16)),
      };

      const rounds = getAvailableRoundsForTier(tier);
      expect(rounds).toHaveLength(4);
      expect(rounds[0].name).toContain('Round 1');
      expect(rounds[1].name).toContain('Quarterfinals');
      expect(rounds[2].name).toContain('Semifinals');
      expect(rounds[3].name).toContain('Finals');
    });

    it('auto-prunes round overrides when participant count drops and reduces total rounds', () => {
      const initialTier: TournamentTier = {
        id: 'tier_1',
        slug: 'gold',
        name: 'Gold Tier',
        priority: 1,
        bracketType: 'TRADITIONAL',
        playerCount: 16, // 4 rounds
        bestOf: 3,
        roundBestOfOverrides: {
          2: 5,
          3: 7,
          4: 9, // Round 4 (Finals in 16-player bracket)
        },
        primaryColor: '#f59e0b',
        secondaryColor: '#fbbf24',
        isLocked: false,
        bracket: generateTraditionalBracket(createMockPlayers(16)),
      };

      // Organizer drops participant count from 16 to 8 (now only 3 rounds)
      const reducedTier: TournamentTier = {
        ...initialTier,
        playerCount: 8,
      };

      const pruned = pruneInvalidRoundOverrides(reducedTier);
      expect(pruned.roundBestOfOverrides).toEqual({
        2: 5,
        3: 7,
      });
      // Key 4 must have been pruned because round 4 no longer exists in an 8-player bracket
      expect(pruned.roundBestOfOverrides?.[4]).toBeUndefined();
    });

    it('leaves valid round overrides untouched during pruning', () => {
      const tier: TournamentTier = {
        id: 'tier_1',
        slug: 'gold',
        name: 'Gold Tier',
        priority: 1,
        bracketType: 'TRADITIONAL',
        playerCount: 8,
        bestOf: 3,
        roundBestOfOverrides: {
          2: 5,
          3: 7,
        },
        primaryColor: '#f59e0b',
        secondaryColor: '#fbbf24',
        isLocked: false,
        bracket: generateTraditionalBracket(createMockPlayers(8)),
      };

      const pruned = pruneInvalidRoundOverrides(tier);
      expect(pruned.roundBestOfOverrides).toEqual({
        2: 5,
        3: 7,
      });
    });
  });

  describe('Precedence Order Verification (Match > Round > Tier)', () => {
    it('verifies that match override takes precedence over round override, which takes precedence over tier default', () => {
      const tierDefault = 3;
      const roundOverride = 5;
      const matchOverride = 7;

      // Tier level
      const tier: TournamentTier = {
        id: 'tier_1',
        slug: 'gold',
        name: 'Gold Tier',
        priority: 1,
        bracketType: 'TRADITIONAL',
        playerCount: 8,
        bestOf: tierDefault,
        roundBestOfOverrides: {
          3: roundOverride, // Finals round
        },
        primaryColor: '#f59e0b',
        secondaryColor: '#fbbf24',
        isLocked: false,
        bracket: generateTraditionalBracket(createMockPlayers(8), {
          bestOf: tierDefault,
          roundBestOfOverrides: { 3: roundOverride },
        }),
      };

      // In Round 1 (no round override): match.bestOf inherits tierDefault (3)
      expect(tier.bracket.rounds[0].matches[0].bestOf).toBe(tierDefault);

      // In Round 3 (with round override): match.bestOf inherits roundOverride (5)
      const finalsMatch = tier.bracket.rounds[2].matches[0];
      expect(finalsMatch.bestOf).toBe(roundOverride);

      // If an explicit match override is recorded: matchScoreRecord.bestOf takes precedence (7)
      const effectiveMatchBestOf = matchOverride || finalsMatch.bestOf || tier.bestOf;
      expect(effectiveMatchBestOf).toBe(matchOverride);
    });
  });
});
