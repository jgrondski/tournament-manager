import { describe, it, expect } from 'vitest';
import {
  generateDoubleEliminationBracket,
  generateTraditionalDoubleElim,
  generateFlatDoubleElim,
  generateAcceleratedHybrid,
} from '../double-elimination';
import { advanceMatchWinner } from '../advance';
import { SeededPlayer } from '../../types';

describe('Double Elimination Bracket Generators', () => {
  const createPlayers = (count: number): SeededPlayer[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

  describe('Variant A: TRADITIONAL_TREE', () => {
    it('throws an error if fewer than 2 players are provided', () => {
      expect(() => generateTraditionalDoubleElim([])).toThrow();
      expect(() => generateTraditionalDoubleElim(createPlayers(1))).toThrow();
    });

    describe('Match Invariant (totalMatches === 2N - 2)', () => {
      const testCases = [2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16];

      testCases.forEach((n) => {
        it(`generates exactly 2N - 2 matches for N = ${n} (${2 * n - 2} matches)`, () => {
          const players = createPlayers(n);
          const bracket = generateTraditionalDoubleElim(players, { tierId: 'gold' });

          const totalMatches = Object.keys(bracket.matchesById).length;
          const expectedMatches = 2 * n - 2;

          expect(totalMatches).toBe(expectedMatches);

          // Check rounds matches sum
          const roundMatchesSum = bracket.rounds.reduce((acc, r) => acc + r.matches.length, 0);
          expect(roundMatchesSum).toBe(expectedMatches);

          // Verify that no match is flagged as a bye match
          Object.values(bracket.matchesById).forEach((m) => {
            expect(m.isBye).toBe(false);
          });
        });
      });
    });

    describe('Flat Sequential Match Numbering across Bracket', () => {
      it('numbers all matches sequentially from 1 to 2N - 2 without resetting per round', () => {
        const players = createPlayers(8);
        const bracket = generateTraditionalDoubleElim(players, { tierId: 'gold' });
        const allMatches = bracket.rounds.flatMap((r) => r.matches);

        expect(allMatches.length).toBe(14);
        const matchNumbers = allMatches.map((m) => m.matchNumber);

        // Expect exactly [1, 2, 3, 4, ..., 14]
        expect(matchNumbers).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
      });
    });

    describe('Standard DAG Representation', () => {
      it('ensures every match node conforms to DAG slot structure { id, roundIndex, slotA, slotB }', () => {
        const players = createPlayers(8);
        const bracket = generateTraditionalDoubleElim(players, { tierId: 'gold' });

        for (const match of Object.values(bracket.matchesById)) {
          expect(match.id).toBeDefined();
          expect(typeof match.roundIndex).toBe('number');
          expect(match.slotA).toBeDefined();
          expect(match.slotB).toBeDefined();
          expect(['WINNER', 'LOSER', 'DIRECT']).toContain(match.slotA!.type);
          expect(['WINNER', 'LOSER', 'DIRECT']).toContain(match.slotB!.type);

          if (match.slotA!.type !== 'DIRECT') {
            expect(match.slotA!.matchId).toBeDefined();
            expect(bracket.matchesById[match.slotA!.matchId!]).toBeDefined();
          }
          if (match.slotB!.type !== 'DIRECT') {
            expect(match.slotB!.matchId).toBeDefined();
            expect(bracket.matchesById[match.slotB!.matchId!]).toBeDefined();
          }
        }
      });
    });

    describe('2-Player Bracket Edge Case', () => {
      it('sets up 1 Winners Finals match and 1 Grand Finals match', () => {
        const players = createPlayers(2);
        const bracket = generateTraditionalDoubleElim(players, { tierId: 'gold' });

        expect(bracket.totalRounds).toBe(2);
        expect(bracket.rounds[0].name).toBe('Winners Finals');
        expect(bracket.rounds[1].name).toBe('Grand Finals');

        const w1 = bracket.rounds[0].matches[0];
        const gf1 = bracket.rounds[1].matches[0];

        expect(w1.player1.player?.id).toBe('p1');
        expect(w1.player2.player?.id).toBe('p2');
        expect(w1.nextMatchId).toBe(gf1.id);
        expect(w1.nextMatchSlot).toBe(1);
        expect(w1.loserNextMatchId).toBe(gf1.id);
        expect(w1.loserNextMatchSlot).toBe(2);
        expect(w1.matchNumber).toBe(1);
        expect(gf1.matchNumber).toBe(2);
      });
    });

    describe('4-Player Bracket Structure', () => {
      it('generates 6 matches across Winners, Losers, and Grand Finals', () => {
        const players = createPlayers(4);
        const bracket = generateTraditionalDoubleElim(players, { tierId: 'gold' });

        expect(Object.keys(bracket.matchesById).length).toBe(6);

        const stages = Object.values(bracket.matchesById).map((m) => m.stage);
        const winnersMatches = stages.filter((s) => s === 'WINNERS');
        const losersMatches = stages.filter((s) => s === 'LOSERS');
        const gfMatches = stages.filter((s) => s === 'GRAND_FINALS');

        expect(winnersMatches.length).toBe(3); // W1 (2), W2 (1)
        expect(losersMatches.length).toBe(2); // L1 (1), L2 (1)
        expect(gfMatches.length).toBe(1); // GF1 (1)

        // Winners Finals feeds GF Slot 1
        const wf = Object.values(bracket.matchesById).find(
          (m) => m.stage === 'WINNERS' && m.roundIdentifier === 'W2'
        );
        expect(wf?.nextMatchId).toBe('gold-gf1');
        expect(wf?.nextMatchSlot).toBe(1);

        // Losers Finals feeds GF Slot 2
        const lf = Object.values(bracket.matchesById).find(
          (m) => m.stage === 'LOSERS' && m.roundIdentifier === 'L2'
        );
        expect(lf?.nextMatchId).toBe('gold-gf1');
        expect(lf?.nextMatchSlot).toBe(2);
      });
    });

    describe('8-Player Bracket Structure', () => {
      it('generates 14 matches with cascading loser drops and crossover', () => {
        const players = createPlayers(8);
        const bracket = generateTraditionalDoubleElim(players, { tierId: 'gold' });

        expect(Object.keys(bracket.matchesById).length).toBe(14);

        const wMatches = Object.values(bracket.matchesById).filter((m) => m.stage === 'WINNERS');
        const lMatches = Object.values(bracket.matchesById).filter((m) => m.stage === 'LOSERS');
        const gfMatches = Object.values(bracket.matchesById).filter((m) => m.stage === 'GRAND_FINALS');

        expect(wMatches.length).toBe(7);
        expect(lMatches.length).toBe(6);
        expect(gfMatches.length).toBe(1);

        // Check W1 loser drops point to L1
        const w1Matches = wMatches.filter((m) => m.roundIdentifier === 'W1');
        w1Matches.forEach((m) => {
          expect(m.loserNextMatchId).toBeDefined();
          const dest = bracket.matchesById[m.loserNextMatchId!];
          expect(dest.stage).toBe('LOSERS');
          expect(dest.roundIdentifier).toBe('L1');
        });

        // Check W2 loser drops point to L2
        const w2Matches = wMatches.filter((m) => m.roundIdentifier === 'W2');
        w2Matches.forEach((m) => {
          expect(m.loserNextMatchId).toBeDefined();
          const dest = bracket.matchesById[m.loserNextMatchId!];
          expect(dest.stage).toBe('LOSERS');
          expect(dest.roundIdentifier).toBe('L2');
        });

        // Check W3 (Winners Finals) loser drop points to L4 (Losers Finals)
        const w3Matches = wMatches.filter((m) => m.roundIdentifier === 'W3');
        expect(w3Matches[0].loserNextMatchId).toBeDefined();
        const lfDest = bracket.matchesById[w3Matches[0].loserNextMatchId!];
        expect(lfDest.roundIdentifier).toBe('L4');
      });
    });

    describe('Bye Handling (Section 4.1 Invariants)', () => {
      it('for N = 6, bye recipients drop to Losers R2 (never Losers R1) if they lose in Winners R2', () => {
        const players = createPlayers(6);
        const bracket = generateTraditionalDoubleElim(players, { tierId: 'gold' });

        expect(Object.keys(bracket.matchesById).length).toBe(10);

        // Seeds 1 and 2 received byes directly into W2
        const w2Matches = Object.values(bracket.matchesById).filter((m) => m.roundIdentifier === 'W2');
        const seed1Match = w2Matches.find((m) => m.player1.player?.seed === 1 || m.player2.player?.seed === 1);
        expect(seed1Match).toBeDefined();

        // If Seed 1 loses in W2, they drop to Losers R2 (never L1)
        expect(seed1Match?.loserNextMatchId).toBeDefined();
        const dropDest = bracket.matchesById[seed1Match!.loserNextMatchId!];
        expect(dropDest.stage).toBe('LOSERS');
        expect(dropDest.roundIdentifier).toBe('L2');
      });
    });

    describe('Stage-Specific Round Best-Of Overrides', () => {
      it('applies overrides keyed by stage identifier', () => {
        const players = createPlayers(8);
        const bracket = generateTraditionalDoubleElim(players, {
          tierId: 'gold',
          bestOf: 3,
          roundBestOfOverrides: {
            W1: 3,
            W2: 5,
            W3: 7,
            L1: 3,
            L2: 3,
            L3: 5,
            L4: 7,
            GF: 9,
          },
        });

        const w2Matches = Object.values(bracket.matchesById).filter((m) => m.roundIdentifier === 'W2');
        expect(w2Matches[0].bestOf).toBe(5);

        const w3Matches = Object.values(bracket.matchesById).filter((m) => m.roundIdentifier === 'W3');
        expect(w3Matches[0].bestOf).toBe(7);

        const gf = Object.values(bracket.matchesById).find((m) => m.roundIdentifier === 'GF');
        expect(gf?.bestOf).toBe(9);
      });
    });
  });

  describe('Variant B: FLAT_STAGED (AIE DAS / CTWC DAS 2024-2025 Style)', () => {
    it('validates that participantCount is divisible by flatWidth', () => {
      const players25 = createPlayers(25);
      expect(() => generateFlatDoubleElim({ players: players25, flatWidth: 4 })).toThrow(/multiple of flat width/);
    });

    it('generates a 24-player 4-wide flat staged double-elimination bracket', () => {
      const players24 = createPlayers(24);
      const bracket = generateFlatDoubleElim({ players: players24, flatWidth: 4, options: { tierId: 'gold' } });

      expect(bracket.bracketRouting).toBe('FLAT_STAGED');
      expect(bracket.flatWidth).toBe(4);
      expect(bracket.totalPlayers).toBe(24);

      // Verify flat sequential match numbering across the entire bracket (1..totalMatches)
      const allMatches = bracket.rounds.flatMap((r) => r.matches);
      const totalMatches = allMatches.length;
      expect(totalMatches).toBeGreaterThan(0);

      const matchNumbers = allMatches.map((m) => m.matchNumber);
      expect(matchNumbers).toEqual(Array.from({ length: totalMatches }, (_, i) => i + 1));

      // Verify Winners Bracket Inflow:
      // Round 1 (W1): 4 matches (Seeds 17-24 play)
      const w1Round = bracket.rounds.find((r) => r.roundIdentifier === 'W1');
      expect(w1Round).toBeDefined();
      expect(w1Round!.matches.length).toBe(4);

      // 24 players, 4 wide:
      // K = (24/4) - 1 = 5 injection rounds: W1..W5 (4 matches each = 20 matches)
      // W6: contraction 4 -> 2 matches (Semifinals)
      // W7: contraction 2 -> 1 match (Winners Finals)
      // Total Winners matches = 20 + 2 + 1 = 23 matches.
      // Total Losers matches = 16 (L1..L4) + 2 (L5) + 2 (L6) + 1 (L7) + 1 (L8) = 22 matches.
      // Grand Finals = 1 match.
      // Total tournament matches = 23 + 22 + 1 = 46 matches.
      expect(totalMatches).toBe(46);

      for (let r = 1; r <= 5; r++) {
        const wr = bracket.rounds.find((round) => round.roundIdentifier === `W${r}`);
        expect(wr).toBeDefined();
        expect(wr!.matches.length).toBe(4);
      }

      // Verify Non-Overlapping Seed Injections across rounds:
      // W1: Seeds 17-24 (8 players)
      const w1Matches = bracket.rounds.find((r) => r.roundIdentifier === 'W1')!.matches;
      const w1Seeds = w1Matches.flatMap((m) => [m.player1.player?.seed, m.player2.player?.seed]);
      expect(w1Seeds.sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([17, 18, 19, 20, 21, 22, 23, 24]);

      // W2: Incoming Seeds 13-16 in player1 slot (never seeds 17-24)
      const w2Matches = bracket.rounds.find((r) => r.roundIdentifier === 'W2')!.matches;
      const w2IncomingSeeds = w2Matches.map((m) => m.player1.player?.seed);
      expect(w2IncomingSeeds).toEqual([13, 14, 15, 16]);

      // W3: Incoming Seeds 9-12 in player1 slot
      const w3Matches = bracket.rounds.find((r) => r.roundIdentifier === 'W3')!.matches;
      const w3IncomingSeeds = w3Matches.map((m) => m.player1.player?.seed);
      expect(w3IncomingSeeds).toEqual([9, 10, 11, 12]);

      // W4: Incoming Seeds 5-8 in player1 slot
      const w4Matches = bracket.rounds.find((r) => r.roundIdentifier === 'W4')!.matches;
      const w4IncomingSeeds = w4Matches.map((m) => m.player1.player?.seed);
      expect(w4IncomingSeeds).toEqual([5, 6, 7, 8]);

      // W5: Incoming Seeds 1-4 in player1 slot
      const w5Matches = bracket.rounds.find((r) => r.roundIdentifier === 'W5')!.matches;
      const w5IncomingSeeds = w5Matches.map((m) => m.player1.player?.seed);
      expect(w5IncomingSeeds).toEqual([1, 2, 3, 4]);

      // Advancing WR1 winner to WR2:
      // When WR1 Match 1 winner (Seed 17) advances to WR2 Match 5 (slot 2),
      // slot 1 is Seed 13 and slot 2 is Seed 17 (never the same player).
      const w1m1 = w1Matches[0];
      const w1WinnerId = w1m1.player1.player!.id;
      const advancedBracket = advanceMatchWinner(bracket, w1m1.id, w1WinnerId);
      const advancedW2M1 = advancedBracket.matchesById[w2Matches[0].id];
      expect(advancedW2M1.player1.player?.id).not.toBe(advancedW2M1.player2.player?.id);
      expect(advancedW2M1.player1.player?.seed).toBe(13);
      expect(advancedW2M1.player2.player?.seed).toBe(17);

      // Round 6 (W6): Semifinals (2 matches)
      const w6Round = bracket.rounds.find((r) => r.roundIdentifier === 'W6');
      expect(w6Round).toBeDefined();
      expect(w6Round!.matches.length).toBe(2);

      // Round 7 (W7): Winners Finals (1 match)
      const w7Round = bracket.rounds.find((r) => r.roundIdentifier === 'W7');
      expect(w7Round).toBeDefined();
      expect(w7Round!.matches.length).toBe(1);

      // Verify Losers Bracket Horizontal Rails:
      // In L2, match.slotA strictly receives winner of preceding lower match
      const lr2Round = bracket.rounds.find((r) => r.roundIdentifier === 'L2');
      expect(lr2Round).toBeDefined();
      for (const m of lr2Round!.matches) {
        expect(m.slotA?.type).toBe('WINNER');
        expect(m.slotB?.type).toBe('LOSER');
      }

      // Verify Losers Top 6 cross-drop with Winners Semifinals (W6):
      // Lower R5 winner 1 vs Loser of Winners Semi 2
      // Lower R5 winner 2 vs Loser of Winners Semi 1
      const lr6Round = bracket.rounds.find((r) => r.roundIdentifier === 'L6');
      expect(lr6Round).toBeDefined();
      expect(lr6Round!.matches.length).toBe(2);

      const semi1Match = w6Round!.matches[0];
      const semi2Match = w6Round!.matches[1];

      const lr6M1 = lr6Round!.matches[0];
      const lr6M2 = lr6Round!.matches[1];

      // Match 1 has Semi 2 loser in slotB
      expect(lr6M1.slotB?.matchId).toBe(semi2Match.id);
      expect(lr6M1.slotB?.type).toBe('LOSER');

      // Match 2 has Semi 1 loser in slotB
      expect(lr6M2.slotB?.matchId).toBe(semi1Match.id);
      expect(lr6M2.slotB?.type).toBe('LOSER');

      // Verify Grand Finals feeds from Winners Finals (W7) and Losers Finals (L8)
      const gfRound = bracket.rounds.find((r) => r.roundIdentifier === 'GF');
      expect(gfRound).toBeDefined();
      const gfMatch = gfRound!.matches[0];
      expect(gfMatch.slotA?.matchId).toBe(w7Round!.matches[0].id);
      expect(gfMatch.slotA?.type).toBe('WINNER');
    });
  });

  describe('Variant C: ACCELERATED_HYBRID (CTWC DAS 2026 Style)', () => {
    it('generates a full 48-player CTWC DAS 2026 bracket with Pre-Merge DE, 2nd Chance, Play-Offs, and Top 16 single elimination', () => {
      const players48 = createPlayers(48);
      const bracket = generateAcceleratedHybrid({
        players: players48,
        finalsCutoff: 16,
        options: { tierId: 'gold' },
      });

      expect(bracket.bracketRouting).toBe('ACCELERATED_HYBRID');
      expect(bracket.finalsCutoff).toBe(16);
      expect(bracket.totalPlayers).toBe(48);

      // Phase 1: Accelerated Round for seeds 1..16 (8 matches)
      const arRound = bracket.rounds.find((r) => r.roundIdentifier === 'AR');
      expect(arRound).toBeDefined();
      expect(arRound!.matches.length).toBe(8);

      // Phase 1: Pre-Merge Double Elimination for seeds 17..48 (32 players)
      // Upper Round 1 (16 matches) -> Upper Round 2 (8 matches / Halting Upper)
      const preW1 = bracket.rounds.find((r) => r.roundIdentifier === 'PRE_W1');
      expect(preW1).toBeDefined();
      expect(preW1!.matches.length).toBe(16);

      const preW2 = bracket.rounds.find((r) => r.roundIdentifier === 'PRE_W2');
      expect(preW2).toBeDefined();
      expect(preW2!.matches.length).toBe(8);

      // Lower Round 1 (8 matches) -> Lower Round 2 (8 matches / Halting Lower)
      const preL1 = bracket.rounds.find((r) => r.roundIdentifier === 'PRE_L1');
      expect(preL1).toBeDefined();
      expect(preL1!.matches.length).toBe(8);

      const preL2 = bracket.rounds.find((r) => r.roundIdentifier === 'PRE_L2');
      expect(preL2).toBeDefined();
      expect(preL2!.matches.length).toBe(8);

      // 2nd Chance Round: 8 Lower survivors (Slot A) vs 8 Accelerated losers (Slot B)
      const secondChanceRound = bracket.rounds.find((r) => r.roundIdentifier === '2C');
      expect(secondChanceRound).toBeDefined();
      expect(secondChanceRound!.matches.length).toBe(8);

      // Play-Offs: 8 Upper qualifiers (Slot A) vs 8 2nd Chance winners (Slot B)
      const playOffRound = bracket.rounds.find((r) => r.roundIdentifier === 'PO');
      expect(playOffRound).toBeDefined();
      expect(playOffRound!.matches.length).toBe(8);

      // Phase 2: Clean 16-player Single-Elimination tree (Round of 16 -> Quarters -> Semis -> Finals)
      const champR1 = bracket.rounds.find((r) => r.roundIdentifier === 'CHAMP_R1');
      expect(champR1).toBeDefined();
      expect(champR1!.matches.length).toBe(8);

      const champR2 = bracket.rounds.find((r) => r.roundIdentifier === 'CHAMP_R2');
      expect(champR2).toBeDefined();
      expect(champR2!.matches.length).toBe(4);

      const champR3 = bracket.rounds.find((r) => r.roundIdentifier === 'CHAMP_R3');
      expect(champR3).toBeDefined();
      expect(champR3!.matches.length).toBe(2);

      const champFinals = bracket.rounds.find((r) => r.roundIdentifier === 'CHAMP_R4');
      expect(champFinals).toBeDefined();
      expect(champFinals!.matches.length).toBe(1);
      expect(champFinals!.name).toBe('Championship Finals');

      // Verify Total Match Count: 8 + 16 + 8 + 8 + 8 + 8 + 8 + 8 + 4 + 2 + 1 = 79 matches
      const allMatches = bracket.rounds.flatMap((r) => r.matches);
      expect(allMatches.length).toBe(79);

      // Sequential match numbering across the entire bracket from 1 to 79
      const matchNumbers = allMatches.map((m) => m.matchNumber);
      expect(matchNumbers).toEqual(Array.from({ length: 79 }, (_, i) => i + 1));

      // Invariant: Verify all matches connect forward without dead ends (except Grand Finals)
      allMatches.forEach((m) => {
        if (m.roundIdentifier === 'CHAMP_R4') {
          expect(m.nextMatchId).toBeUndefined();
        } else {
          expect(m.nextMatchId).toBeDefined();
          const target = bracket.matchesById[m.nextMatchId!];
          expect(target).toBeDefined();
        }
      });

      // Verify Edge Routing in Round XB (2nd Chance Round):
      // Slot A receives Lower survivor (WINNER), Slot B receives AR loser (LOSER)
      secondChanceRound!.matches.forEach((m) => {
        expect(m.slotA?.type).toBe('WINNER');
        expect(m.slotB?.type).toBe('LOSER');
        expect(m.slotB?.matchId).toMatch(/ar-m\d+/);
      });

      // Verify Edge Routing in Round B (Play-Offs):
      // Slot A receives Upper qualifier (WINNER), Slot B receives 2nd Chance winner (WINNER)
      playOffRound!.matches.forEach((m) => {
        expect(m.slotA?.type).toBe('WINNER');
        expect(m.slotB?.type).toBe('WINNER');
        expect(m.slotB?.matchId).toMatch(/2c-m\d+/);
      });

      // Verify Edge Routing in Round A (Phase 2 Round 1):
      // Slot A receives AR winner (WINNER), Slot B receives Play-Off winner (WINNER)
      champR1!.matches.forEach((m) => {
        expect(m.slotA?.type).toBe('WINNER');
        expect(m.slotA?.matchId).toMatch(/ar-m\d+/);
        expect(m.slotB?.type).toBe('WINNER');
        expect(m.slotB?.matchId).toMatch(/po-m\d+/);
      });
    });

    it('advances winners and losers through Phase 1 and Phase 2 without disconnects', () => {
      const players48 = createPlayers(48);
      let bracket = generateAcceleratedHybrid({
        players: players48,
        finalsCutoff: 16,
        options: { tierId: 'gold' },
      });

      const ar1 = bracket.rounds.find((r) => r.roundIdentifier === 'AR')!.matches[0];
      const p1 = ar1.player1.player!; // Seed 1
      const p16 = ar1.player2.player!; // Seed 16

      // Seed 1 wins AR Match 1 -> should advance directly to CHAMP_R1 Match 1 Slot 1
      bracket = advanceMatchWinner(bracket, ar1.id, p1.id);
      const champM1 = bracket.rounds.find((r) => r.roundIdentifier === 'CHAMP_R1')!.matches[0];
      expect(champM1.player1.player?.id).toBe(p1.id);

      // Seed 16 lost AR Match 1 -> should advance to 2C Match 1 Slot 2
      const scM1 = bracket.rounds.find((r) => r.roundIdentifier === '2C')!.matches[0];
      expect(scM1.player2.player?.id).toBe(p16.id);

      // Seed 16 wins 2C Match 1 -> should advance to Play-Offs Match 1 Slot 2
      bracket = advanceMatchWinner(bracket, scM1.id, p16.id);
      const poM1 = bracket.rounds.find((r) => r.roundIdentifier === 'PO')!.matches[0];
      expect(poM1.player2.player?.id).toBe(p16.id);

      // Seed 16 wins Play-Offs Match 1 -> should advance to CHAMP_R1 Match 1 Slot 2
      bracket = advanceMatchWinner(bracket, poM1.id, p16.id);
      const updatedChampM1 = bracket.matchesById[champM1.id];
      expect(updatedChampM1.player2.player?.id).toBe(p16.id);

      // In Championship Round 1, Seed 1 faces Seed 16 again. Seed 1 wins.
      bracket = advanceMatchWinner(bracket, champM1.id, p1.id);
      const champR2M1 = bracket.rounds.find((r) => r.roundIdentifier === 'CHAMP_R2')!.matches[0];
      expect(champR2M1.player1.player?.id).toBe(p1.id);
    });

    it('supports 24-player bracket with finalsCutoff = 16', () => {
      const players24 = createPlayers(24);
      const bracket = generateAcceleratedHybrid({
        players: players24,
        finalsCutoff: 16,
        options: { tierId: 'gold' },
      });

      expect(bracket.bracketRouting).toBe('ACCELERATED_HYBRID');
      expect(bracket.finalsCutoff).toBe(16);

      const arRound = bracket.rounds.find((r) => r.roundIdentifier === 'AR');
      expect(arRound?.matches.length).toBe(8);

      const preRound = bracket.rounds.find((r) => r.roundIdentifier === 'PRE_W1');
      expect(preRound?.matches.length).toBe(4);

      const scRound = bracket.rounds.find((r) => r.roundIdentifier === '2C');
      expect(scRound?.matches.length).toBe(8);

      const poRound = bracket.rounds.find((r) => r.roundIdentifier === 'PO');
      expect(poRound?.matches.length).toBe(8);

      const champFinals = bracket.rounds.find((r) => r.roundIdentifier === 'CHAMP_R4');
      expect(champFinals?.matches.length).toBe(1);
    });
  });

  describe('Universal Dispatcher generateDoubleEliminationBracket', () => {
    it('routes correctly based on options.bracketRouting', () => {
      const players = createPlayers(16);

      const trad = generateDoubleEliminationBracket(players, { bracketRouting: 'TRADITIONAL_TREE' });
      expect(trad.bracketRouting).toBe('TRADITIONAL_TREE');

      const flat = generateDoubleEliminationBracket(players, { bracketRouting: 'FLAT_STAGED', flatWidth: 4 });
      expect(flat.bracketRouting).toBe('FLAT_STAGED');

      const hybrid = generateDoubleEliminationBracket(players, { bracketRouting: 'ACCELERATED_HYBRID', finalsCutoff: 16 });
      expect(hybrid.bracketRouting).toBe('ACCELERATED_HYBRID');

      const defaultTree = generateDoubleEliminationBracket(players);
      expect(defaultTree.bracketRouting).toBe('TRADITIONAL_TREE');
    });
  });

  describe('Double Elimination Round Naming & Prioritization', () => {
    it('names rounds prioritizing Quarters, Semis, Finals, Top 6 and full words on bracket with shortName for tables', () => {
      const players = createPlayers(16);
      const bracket = generateFlatDoubleElim(players, 4);

      const wRounds = bracket.rounds.filter(r => r.stage === 'WINNERS');
      const lRounds = bracket.rounds.filter(r => r.stage === 'LOSERS');
      const gfRound = bracket.rounds.find(r => r.stage === 'GRAND_FINALS')!;

      // Winners rounds: W1, W2, Winners Quarters, Winners Semis, Winners Finals
      expect(wRounds[0].name).toBe('Round 1 (Winners)');
      expect(wRounds[0].shortName).toBe('Round 1 (W)');
      expect(wRounds[1].name).toBe('Round 2 (Winners)');
      expect(wRounds[1].shortName).toBe('Round 2 (W)');
      expect(wRounds[2].name).toBe('Winners Quarters');
      expect(wRounds[2].shortName).toBe('Quarters (W)');
      expect(wRounds[3].name).toBe('Winners Semis');
      expect(wRounds[3].shortName).toBe('Semis (W)');
      expect(wRounds[4].name).toBe('Winners Finals');
      expect(wRounds[4].shortName).toBe('Finals (W)');

      // Losers rounds: Round 1 (Losers), Round 2 (Losers), Loser's Top 6, Loser's Quarters, Loser's Semis, Loser's Finals
      expect(lRounds[0].name).toBe('Round 1 (Losers)');
      expect(lRounds[0].shortName).toBe('Round 1 (L)');
      expect(lRounds[1].name).toBe('Round 2 (Losers)');
      expect(lRounds[1].shortName).toBe('Round 2 (L)');
      expect(lRounds[2].name).toBe("Loser's Top 6");
      expect(lRounds[2].shortName).toBe('Top 6');
      expect(lRounds[3].name).toBe("Loser's Quarters");
      expect(lRounds[3].shortName).toBe('Quarters (L)');
      expect(lRounds[4].name).toBe("Loser's Semis");
      expect(lRounds[4].shortName).toBe('Semis (L)');
      expect(lRounds[5].name).toBe("Loser's Finals");
      expect(lRounds[5].shortName).toBe('Finals (L)');

      // Grand finals
      expect(gfRound.name).toBe('Grand Finals');
      expect(gfRound.shortName).toBe('Grand Finals');

      // Verify Grand Finals matchNumber is sequential (30), NOT match #2
      const gfMatch = gfRound.matches[0];
      expect(gfMatch.matchNumber).toBe(30);
    });

    it('names 8-player Traditional DE rounds correctly with Losers Top 6 and sequential finals', () => {
      const players = createPlayers(8);
      const bracket = generateTraditionalDoubleElim(players);

      const wRounds = bracket.rounds.filter(r => r.stage === 'WINNERS');
      const lRounds = bracket.rounds.filter(r => r.stage === 'LOSERS');
      const gfRound = bracket.rounds.find(r => r.stage === 'GRAND_FINALS')!;

      expect(wRounds[0].name).toBe('Winners Quarters');
      expect(wRounds[1].name).toBe('Winners Semis');
      expect(wRounds[2].name).toBe('Winners Finals');

      expect(lRounds[0].name).toBe("Loser's Top 6");
      expect(lRounds[0].shortName).toBe('Top 6');
      expect(lRounds[1].name).toBe("Loser's Quarters");
      expect(lRounds[2].name).toBe("Loser's Semis");
      expect(lRounds[3].name).toBe("Loser's Finals");

      expect(gfRound.name).toBe('Grand Finals');
      expect(gfRound.matches[0].matchNumber).toBe(14);
    });
  });
});
