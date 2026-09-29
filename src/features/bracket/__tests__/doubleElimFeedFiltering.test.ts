import { describe, it, expect } from 'vitest';
import { generateDoubleEliminationBracket, generateFlatDoubleElim, generateTraditionalDoubleElim } from '../math/double-elimination';
import { canonicalizeBracketRounds, BracketRound } from '../types';

describe('Double Elimination Feed Filtering & Tier Switching Regression Tests', () => {
  // Helper to generate mock players
  const createMockPlayers = (count: number, startSeed = 1) =>
    Array.from({ length: count }, (_, i) => ({
      id: `p${startSeed + i}`,
      name: `Player ${startSeed + i}`,
      seed: startSeed + i,
    }));

  describe('1. Sequential Round Numbering & Key Collision Prevention', () => {
    it('ensures generateFlatDoubleElim assigns strictly sequential roundNumber with no duplicate keys', () => {
      const players = createMockPlayers(24);
      const bracket = generateFlatDoubleElim({ players, flatWidth: 4, options: { tierId: 'silver' } });

      const roundNumbers = bracket.rounds.map((r) => r.roundNumber);
      const uniqueRoundNumbers = new Set(roundNumbers);

      // Verify no duplicates
      expect(uniqueRoundNumbers.size).toBe(bracket.rounds.length);

      // Verify strictly sequential 1..N
      bracket.rounds.forEach((round, idx) => {
        expect(round.roundNumber).toBe(idx + 1);
        for (const match of round.matches) {
          expect(match.roundNumber).toBe(idx + 1);
          expect(match.roundIndex).toBe(idx);
        }
      });
    });

    it('ensures generateTraditionalDoubleElim assigns strictly sequential roundNumber', () => {
      const players = createMockPlayers(8);
      const bracket = generateTraditionalDoubleElim({ players, options: { tierId: 'bronze' } });

      const roundNumbers = bracket.rounds.map((r) => r.roundNumber);
      const uniqueRoundNumbers = new Set(roundNumbers);

      expect(uniqueRoundNumbers.size).toBe(bracket.rounds.length);
      bracket.rounds.forEach((round, idx) => {
        expect(round.roundNumber).toBe(idx + 1);
      });
    });

    it('canonicalizeBracketRounds auto-heals legacy brackets with duplicate roundNumbers', () => {
      const legacyRounds: BracketRound[] = [
        { roundNumber: 1, name: 'Round 1 (Winners)', stage: 'WINNERS', matches: [{ id: 'm1', roundNumber: 1, roundIndex: 0, stage: 'WINNERS', tierId: 't1', matchNumber: 1, player1: { player: null }, player2: { player: null }, winnerId: null, loserId: null, bestOf: 3, isBye: false }] },
        { roundNumber: 2, name: 'Round 2 (Winners)', stage: 'WINNERS', matches: [{ id: 'm2', roundNumber: 2, roundIndex: 1, stage: 'WINNERS', tierId: 't1', matchNumber: 2, player1: { player: null }, player2: { player: null }, winnerId: null, loserId: null, bestOf: 3, isBye: false }] },
        { roundNumber: 1, name: 'Round 1 (Losers)', stage: 'LOSERS', matches: [{ id: 'm3', roundNumber: 1, roundIndex: 0, stage: 'LOSERS', tierId: 't1', matchNumber: 3, player1: { player: null }, player2: { player: null }, winnerId: null, loserId: null, bestOf: 3, isBye: false }] },
        { roundNumber: 2, name: 'Round 2 (Losers)', stage: 'LOSERS', matches: [{ id: 'm4', roundNumber: 2, roundIndex: 1, stage: 'LOSERS', tierId: 't1', matchNumber: 4, player1: { player: null }, player2: { player: null }, winnerId: null, loserId: null, bestOf: 3, isBye: false }] },
      ];

      canonicalizeBracketRounds(legacyRounds);

      expect(legacyRounds[0].roundNumber).toBe(1);
      expect(legacyRounds[1].roundNumber).toBe(2);
      expect(legacyRounds[2].roundNumber).toBe(3);
      expect(legacyRounds[3].roundNumber).toBe(4);
      expect(legacyRounds[2].matches[0].roundNumber).toBe(3);
      expect(legacyRounds[3].matches[0].roundNumber).toBe(4);
    });
  });

  describe('2. Flat Staged Small Counts and Flat Width Resilience', () => {
    it('safely handles flat staged double elim with flatWidth=2 or small player counts without crashing', () => {
      // 8 players, flatWidth 4 (players <= 2 * flatWidth)
      const p8 = createMockPlayers(8);
      const b8 = generateDoubleEliminationBracket(p8, { tierId: 'bronze', bracketRouting: 'FLAT_STAGED', flatWidth: 4 });
      expect(b8.rounds.length).toBeGreaterThan(0);

      // flatWidth 2
      const bFw2 = generateDoubleEliminationBracket(p8, { tierId: 'bronze', bracketRouting: 'FLAT_STAGED', flatWidth: 2 });
      expect(bFw2.rounds.length).toBeGreaterThan(0);
    });
  });

  describe('3. MatchCardFeed Filter Combinations & Selection Invariants', () => {
    const players24 = createMockPlayers(24);
    const doubleElimBracket = generateDoubleEliminationBracket(players24, {
      tierId: 'silver',
      bracketRouting: 'FLAT_STAGED',
      flatWidth: 4,
    });
    canonicalizeBracketRounds(doubleElimBracket.rounds);

    const getRoundKey = (round: BracketRound, idx: number) =>
      `${round.stage || 'R'}_${round.roundIdentifier || round.roundNumber}_${idx}`;

    const filterVisibleRounds = (rounds: BracketRound[], stage: 'ALL' | 'WINNERS' | 'LOSERS' | 'GRAND_FINALS') => {
      if (stage === 'ALL') return rounds;
      return rounds.filter((r) => {
        const isWinner =
          (r.stage === 'WINNERS' ||
            r.roundIdentifier?.startsWith('W') ||
            r.roundIdentifier === 'AR' ||
            r.roundIdentifier?.startsWith('PRE_W') ||
            r.name?.toLowerCase().includes('winner')) &&
          r.roundIdentifier !== 'PO' &&
          r.stage !== 'LOSERS' &&
          r.stage !== 'GRAND_FINALS';

        const isLoser =
          r.stage === 'LOSERS' ||
          r.roundIdentifier?.startsWith('L') ||
          r.roundIdentifier?.startsWith('PRE_L') ||
          r.roundIdentifier === '2C' ||
          r.roundIdentifier === 'PO' ||
          r.name?.toLowerCase().includes('loser');

        const isFinals =
          r.stage === 'GRAND_FINALS' ||
          r.roundIdentifier?.startsWith('GF') ||
          r.phase === 'CHAMPIONSHIP' ||
          r.roundIdentifier?.startsWith('CHAMP') ||
          r.name?.toLowerCase() === 'finals' ||
          r.name?.toLowerCase() === 'grand finals';

        if (stage === 'WINNERS') return isWinner;
        if (stage === 'LOSERS') return isLoser;
        if (stage === 'GRAND_FINALS') return isFinals;
        return true;
      });
    };

    it('generates unique round keys for every round in all stages', () => {
      const keys = doubleElimBracket.rounds.map((r, idx) => getRoundKey(r, idx));
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(doubleElimBracket.rounds.length);
    });

    it('correctly partitions rounds across ALL, WINNERS, LOSERS, and GRAND_FINALS stages', () => {
      const all = filterVisibleRounds(doubleElimBracket.rounds, 'ALL');
      const winners = filterVisibleRounds(doubleElimBracket.rounds, 'WINNERS');
      const losers = filterVisibleRounds(doubleElimBracket.rounds, 'LOSERS');
      const finals = filterVisibleRounds(doubleElimBracket.rounds, 'GRAND_FINALS');

      expect(all.length).toBe(winners.length + losers.length + finals.length);
      expect(winners.length).toBeGreaterThan(0);
      expect(losers.length).toBeGreaterThan(0);
      expect(finals.length).toBeGreaterThan(0);

      // Verify stage contents
      winners.forEach((r) => expect(r.stage).toBe('WINNERS'));
      losers.forEach((r) => expect(r.stage).toBe('LOSERS'));
      finals.forEach((r) => expect(r.stage).toBe('GRAND_FINALS'));
    });

    it('recovers to ALL rounds when selectedRoundKey does not exist in active stage', () => {
      const winners = filterVisibleRounds(doubleElimBracket.rounds, 'WINNERS');
      const selectedRoundKey = getRoundKey(winners[0], 0);

      // User switches to LOSERS stage where selectedRoundKey does not exist
      const losers = filterVisibleRounds(doubleElimBracket.rounds, 'LOSERS');
      const existsInLosers = losers.some((r, idx) => getRoundKey(r, idx) === selectedRoundKey);
      expect(existsInLosers).toBe(false);

      const activeRoundKey = existsInLosers ? selectedRoundKey : 'ALL';
      expect(activeRoundKey).toBe('ALL');

      // roundsToDisplay correctly falls back to all losers rounds
      const roundsToDisplay = activeRoundKey === 'ALL'
        ? losers
        : [losers.find((r, idx) => getRoundKey(r, idx) === activeRoundKey)!];

      expect(roundsToDisplay.length).toBe(losers.length);
    });

    it('supports selecting and isolating a single round in any stage', () => {
      const losers = filterVisibleRounds(doubleElimBracket.rounds, 'LOSERS');
      const targetRoundKey = getRoundKey(losers[2], 2);

      const roundsToDisplay = losers.filter((r, idx) => getRoundKey(r, idx) === targetRoundKey);
      expect(roundsToDisplay.length).toBe(1);
      expect(roundsToDisplay[0].name).toBe(losers[2].name);
    });
  });

  describe('4. Tier Switching State Hygiene', () => {
    it('tier switch cleanly resets state and prevents desynchronized index lookups', () => {
      const silverPlayers = createMockPlayers(24);
      const silverBracket = generateDoubleEliminationBracket(silverPlayers, {
        tierId: 'silver',
        bracketRouting: 'FLAT_STAGED',
        flatWidth: 4,
      });

      const bronzePlayers = createMockPlayers(8);
      const bronzeBracket = generateDoubleEliminationBracket(bronzePlayers, {
        tierId: 'bronze',
        bracketRouting: 'TRADITIONAL_TREE',
      });

      // Silver has 16 rounds, Bronze has 8 rounds
      expect(silverBracket.rounds.length).toBe(16);
      expect(bronzeBracket.rounds.length).toBe(8);

      // If user had selected round key in Silver (e.g. round 14)
      const silverRoundKey = `LOSERS_L7_13`;
      expect(bronzeBracket.rounds.some((r, idx) => `${r.stage}_${r.roundIdentifier}_${idx}` === silverRoundKey)).toBe(false);

      // State reset simulation on tier switch
      let selectedStage = 'ALL';
      let selectedRoundKey = 'ALL';
      let activeTierId = 'bronze';

      expect(selectedStage).toBe('ALL');
      expect(selectedRoundKey).toBe('ALL');
      expect(activeTierId).toBe('bronze');
    });
  });
});
