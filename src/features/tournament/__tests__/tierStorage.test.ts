import { describe, it, expect, beforeEach } from 'vitest';
import { getStoredTierSlug, setStoredTierSlug } from '../tierStorage';
import { generateFlatDoubleElim } from '../../bracket/math/double-elimination';
import { advanceMatchWinner } from '../../bracket/math/advance';
import { SeededPlayer } from '../../bracket/types';

describe('Tier Storage & Cross-View Retention', () => {
  let mockStore: Record<string, string>;

  beforeEach(() => {
    mockStore = {};
    (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStore[key] = String(value);
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
      length: 0,
      key: () => null,
    };
  });

  it('stores and retrieves active tier slugs per tournament', () => {
    expect(getStoredTierSlug('kc-open')).toBeNull();

    setStoredTierSlug('kc-open', 'silver');
    expect(getStoredTierSlug('kc-open')).toBe('silver');

    setStoredTierSlug('das-championship', 'gold');
    expect(getStoredTierSlug('das-championship')).toBe('gold');

    // Does not mutate other tournament's stored tier
    expect(getStoredTierSlug('kc-open')).toBe('silver');

    // Overwrites correctly when changing tier
    setStoredTierSlug('kc-open', 'bronze');
    expect(getStoredTierSlug('kc-open')).toBe('bronze');
  });

  it('safely handles missing or empty tournament slugs', () => {
    expect(getStoredTierSlug(undefined)).toBeNull();
    expect(getStoredTierSlug('')).toBeNull();

    setStoredTierSlug('', 'gold');
    setStoredTierSlug(undefined, 'gold');
    setStoredTierSlug('kc-open', undefined);
    expect(getStoredTierSlug('kc-open')).toBeNull();
  });
});

describe('Flat Staged Double Elimination Non-Self-Matching WR2 Guarantee', () => {
  it('guarantees WR2 matches inject seeds (totalPlayers - 2*flatWidth - flatWidth + 1) and never duplicates WR1 participants', () => {
    const players: SeededPlayer[] = Array.from({ length: 24 }, (_, i) => ({
      id: `p_${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

    const bracket = generateFlatDoubleElim({
      players,
      flatWidth: 4,
      options: { tierId: 'gold' },
    });

    // Round 1 (WR1): 4 matches with seeds 17..24
    const wr1 = bracket.rounds.find((r) => r.roundIdentifier === 'W1')!;
    expect(wr1).toBeDefined();
    for (const m of wr1.matches) {
      expect(m.player1.player!.seed).toBeGreaterThanOrEqual(17);
      expect(m.player2.player!.seed).toBeGreaterThanOrEqual(17);
    }

    // Round 2 (WR2): 4 matches with seeds 13..16 on slotA (player1)
    const wr2 = bracket.rounds.find((r) => r.roundIdentifier === 'W2')!;
    expect(wr2).toBeDefined();
    const wr2DirectSeeds = wr2.matches.map((m) => m.player1.player!.seed);
    expect(wr2DirectSeeds).toEqual([13, 14, 15, 16]);

    // Simulate winning all 4 matches in WR1 (seeds 17, 18, 19, 20 win)
    let currentBracket = bracket;
    for (const m of wr1.matches) {
      const winnerId = m.player1.player!.id;
      currentBracket = advanceMatchWinner(currentBracket, m.id, winnerId);
    }

    // Inspect WR2 after WR1 winners advance
    const updatedWr2 = currentBracket.rounds.find((r) => r.roundIdentifier === 'W2')!;
    for (let i = 0; i < 4; i++) {
      const match = updatedWr2.matches[i];
      const p1 = match.player1.player!;
      const p2 = match.player2.player!;

      expect(p1).toBeDefined();
      expect(p2).toBeDefined();

      // INVARIANT: Player 1 and Player 2 must NEVER be the same person!
      expect(p1.id).not.toBe(p2.id);
      expect(p1.name).not.toBe(p2.name);
      expect(p1.seed).not.toBe(p2.seed);

      // Verify specific seeds: slot 1 is 13+i, slot 2 is 17+i
      expect(p1.seed).toBe(13 + i);
      expect(p2.seed).toBe(17 + i);
    }
  });
});
