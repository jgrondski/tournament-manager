import { describe, it, expect } from 'vitest';
import {
  generateAcceleratedHybrid,
  generateTraditionalDoubleElim,
} from '../math/double-elimination';
import {
  getInboundChip,
  getOutboundChip,
} from '../components/BracketVisualizer';
import { SeededPlayer } from '../types';

describe('Unified Embedded Routing Chips & Disconnected Routing Rules', () => {
  const createPlayers = (count: number): SeededPlayer[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

  describe('Traditional and Flat Double Elimination', () => {
    it('Winners Bracket: suppresses inbound chips, suppresses winner outbound (advances via line), and shows loser drop chips', () => {
      const players = createPlayers(8);
      const bracket = generateTraditionalDoubleElim(players, { tierId: 'gold' });
      const w1 = Object.values(bracket.matchesById).find((m) => m.stage === 'WINNERS' && m.roundNumber === 1);
      expect(w1).toBeDefined();

      // Inbound Rule: No inbound chips in Winners Bracket (initial round or connected by lines)
      expect(getInboundChip(1, w1!, bracket, 0, false)).toBeNull();
      expect(getInboundChip(2, w1!, bracket, 0, false)).toBeNull();

      // Outbound for completed match: winner advances via SVG line -> null
      const winnerChip = getOutboundChip(1, w1!, true, true, false, 16, bracket);
      expect(winnerChip).toBeNull();

      // Outbound for completed match: loser drops to Losers Bracket -> [MatchNumber]
      const destMatch = bracket.matchesById[w1!.loserNextMatchId!];
      const loserChip = getOutboundChip(2, w1!, true, true, false, 16, bracket);
      expect(loserChip).not.toBeNull();
      expect(loserChip?.text).toBe(`${destMatch.matchNumber}`);
      expect(loserChip?.text).not.toContain('#');
      expect(loserChip?.opacity).toBe(1);

      // Outbound for uncompleted / in-progress match: drop stakes shown at opacity 0.4 on both slots
      const uncompletedSlot1 = getOutboundChip(1, w1!, false, false, false, 16, bracket);
      expect(uncompletedSlot1).not.toBeNull();
      expect(uncompletedSlot1?.text).toBe(`${destMatch.matchNumber}`);
      expect(uncompletedSlot1?.opacity).toBe(0.4);

      const uncompletedSlot2 = getOutboundChip(2, w1!, false, false, false, 16, bracket);
      expect(uncompletedSlot2).not.toBeNull();
      expect(uncompletedSlot2?.text).toBe(`${destMatch.matchNumber}`);
      expect(uncompletedSlot2?.opacity).toBe(0.4);
    });

    it('Losers Bracket: displays inbound chip only for slots entering from Winners Bracket, suppresses outbound', () => {
      const players = createPlayers(8);
      const bracket = generateTraditionalDoubleElim(players, { tierId: 'gold' });

      // First Losers round (L1): both slots come from Winners
      const l1 = Object.values(bracket.matchesById).find((m) => m.stage === 'LOSERS');
      expect(l1).toBeDefined();

      const l1Slot1Chip = getInboundChip(1, l1!, bracket, 0, false);
      expect(l1Slot1Chip).not.toBeNull();
      expect(l1Slot1Chip?.text).toMatch(/^\d+$/);
      expect(l1Slot1Chip?.text).not.toContain('#');

      const l1Slot2Chip = getInboundChip(2, l1!, bracket, 0, false);
      expect(l1Slot2Chip).not.toBeNull();
      expect(l1Slot2Chip?.text).toMatch(/^\d+$/);

      // Outbound chip in Losers Bracket is suppressed (winner advances via line, loser eliminated)
      expect(getOutboundChip(1, l1!, true, true, false, 16, bracket)).toBeNull();
      expect(getOutboundChip(2, l1!, true, true, false, 16, bracket)).toBeNull();

      // Later Losers round (e.g. L2 where one slot comes from earlier Losers round)
      const l2 = Object.values(bracket.matchesById).find((m) => m.stage === 'LOSERS' && m.roundNumber === 2);
      if (l2) {
        // Slot connected from previous Losers round via SVG connector line should be suppressed
        const slotFromLosers = l2.slotA?.type !== 'LOSER' ? 1 : 2;
        const lineConnectedChip = getInboundChip(slotFromLosers as 1 | 2, l2, bracket, 0, false);
        expect(lineConnectedChip).toBeNull();
      }
    });

    it('Finals Rule: suppresses all inbound and outbound chips for Grand Finals, GF Reset, and WF/LF winners', () => {
      const players = createPlayers(4);
      const bracket = generateTraditionalDoubleElim(players, { tierId: 'gold' });

      const gf = Object.values(bracket.matchesById).find((m) => m.stage === 'GRAND_FINALS');
      expect(gf).toBeDefined();

      // GF Inbound suppressed
      expect(getInboundChip(1, gf!, bracket, 0, false)).toBeNull();
      expect(getInboundChip(2, gf!, bracket, 0, false)).toBeNull();

      // GF Outbound suppressed
      expect(getOutboundChip(1, gf!, true, true, false, 16, bracket)).toBeNull();
      expect(getOutboundChip(2, gf!, true, true, false, 16, bracket)).toBeNull();
      expect(getOutboundChip(1, gf!, false, false, false, 16, bracket)).toBeNull();

      // WF Winner to GF suppressed
      const wf = Object.values(bracket.matchesById).find(
        (m) => m.stage === 'WINNERS' && (m.roundIdentifier === 'WF' || m.roundIdentifier === 'W2')
      );
      expect(getOutboundChip(1, wf!, true, true, false, 16, bracket)).toBeNull();

      // LF Winner to GF suppressed
      const lf = Object.values(bracket.matchesById).find(
        (m) => m.stage === 'LOSERS' && (m.roundIdentifier === 'LF' || m.roundIdentifier === 'L2')
      );
      expect(getOutboundChip(1, lf!, true, true, false, 16, bracket)).toBeNull();
    });
  });

  describe('Accelerated Hybrid Bracket', () => {
    const players48 = createPlayers(48);
    const bracket = generateAcceleratedHybrid({
      players: players48,
      finalsCutoff: 16,
      options: { tierId: 'gold' },
    });

    it('Accelerated Round (AR): no inbound chip, outbound winner qualifies to T16, outbound loser drops to LB', () => {
      const arMatch = Object.values(bracket.matchesById).find((m) => m.roundIdentifier === 'AR');
      expect(arMatch).toBeDefined();

      // Inbound: suppressed (initial entrants)
      expect(getInboundChip(1, arMatch!, bracket, 0, false)).toBeNull();
      expect(getInboundChip(2, arMatch!, bracket, 0, false)).toBeNull();

      // Outbound completed winner: [MatchNumber]
      const winnerChip = getOutboundChip(1, arMatch!, true, true, false, 16, bracket);
      expect(winnerChip).not.toBeNull();
      expect(winnerChip?.text).toMatch(/^\d+$/);
      expect(winnerChip?.text).not.toContain('#');
      expect(winnerChip?.opacity).toBe(1);

      // Outbound completed loser: [MatchNumber]
      const loserChip = getOutboundChip(2, arMatch!, true, true, false, 16, bracket);
      expect(loserChip).not.toBeNull();
      expect(loserChip?.text).toMatch(/^\d+$/);
      expect(loserChip?.text).not.toContain('#');
      expect(loserChip?.opacity).toBe(1);

      // Outbound uncompleted: both slots show drop stake [MatchNumber] at opacity 0.4
      const uncompletedSlot1 = getOutboundChip(1, arMatch!, false, false, false, 16, bracket);
      expect(uncompletedSlot1?.text).toMatch(/^\d+$/);
      expect(uncompletedSlot1?.opacity).toBe(0.4);

      const uncompletedSlot2 = getOutboundChip(2, arMatch!, false, false, false, 16, bracket);
      expect(uncompletedSlot2?.text).toMatch(/^\d+$/);
      expect(uncompletedSlot2?.opacity).toBe(0.4);
    });

    it('Upper Bracket Round 1 (PRE_W1): suppresses winner outbound (SVG line), loser drops to LB, uncompleted drop stake', () => {
      const w1 = Object.values(bracket.matchesById).find((m) => m.roundIdentifier === 'PRE_W1');
      expect(w1).toBeDefined();

      // Inbound: suppressed
      expect(getInboundChip(1, w1!, bracket, 0, false)).toBeNull();

      // Outbound completed winner: suppressed (advances to PRE_W2 via SVG line)
      expect(getOutboundChip(1, w1!, true, true, false, 16, bracket)).toBeNull();

      // Outbound completed loser: [MatchNumber]
      const loserChip = getOutboundChip(2, w1!, true, true, false, 16, bracket);
      expect(loserChip).not.toBeNull();
      expect(loserChip?.text).toMatch(/^\d+$/);
      expect(loserChip?.opacity).toBe(1);

      // Outbound uncompleted: drop stake at opacity 0.4
      const uncompletedStake = getOutboundChip(1, w1!, false, false, false, 16, bracket);
      expect(uncompletedStake?.text).toMatch(/^\d+$/);
      expect(uncompletedStake?.opacity).toBe(0.4);
    });

    it('Upper Bracket Round 2 (PRE_W2): suppresses inbound (SVG line from PRE_W1), outbound winner advances to LB Play-Offs', () => {
      const w2 = Object.values(bracket.matchesById).find((m) => m.roundIdentifier === 'PRE_W2');
      expect(w2).toBeDefined();

      // Inbound: suppressed (connected by SVG line from PRE_W1)
      expect(getInboundChip(1, w2!, bracket, 0, false)).toBeNull();
      expect(getInboundChip(2, w2!, bracket, 0, false)).toBeNull();

      // Outbound completed winner: [MatchNumber]
      const winnerChip = getOutboundChip(1, w2!, true, true, false, 16, bracket);
      expect(winnerChip).not.toBeNull();
      expect(winnerChip?.text).toMatch(/^\d+$/);
      expect(winnerChip?.text).not.toContain('#');

      // Outbound completed loser: eliminated -> null
      expect(getOutboundChip(2, w2!, true, true, false, 16, bracket)).toBeNull();
    });

    it('Lower Bracket Round 1 (PRE_L1): both slots enter via inter-pod jump from Upper Bracket [MatchNumber]', () => {
      const l1 = Object.values(bracket.matchesById).find((m) => m.roundIdentifier === 'PRE_L1');
      expect(l1).toBeDefined();

      const slot1Chip = getInboundChip(1, l1!, bracket, 0, false);
      expect(slot1Chip).not.toBeNull();
      expect(slot1Chip?.text).toMatch(/^\d+$/);
      expect(slot1Chip?.text).not.toContain('#');

      const slot2Chip = getInboundChip(2, l1!, bracket, 0, false);
      expect(slot2Chip).not.toBeNull();
      expect(slot2Chip?.text).toMatch(/^\d+$/);

      // Outbound: winner advances via line -> null; loser eliminated -> null
      expect(getOutboundChip(1, l1!, true, true, false, 16, bracket)).toBeNull();
      expect(getOutboundChip(2, l1!, true, true, false, 16, bracket)).toBeNull();
    });

    it('Lower Bracket Round 2 (PRE_L2): Slot 1 suppressed (line from PRE_L1), Slot 2 has jump from UB [MatchNumber]', () => {
      const l2 = Object.values(bracket.matchesById).find((m) => m.roundIdentifier === 'PRE_L2');
      expect(l2).toBeDefined();

      // Slot 1 from PRE_L1 via SVG line -> null
      expect(getInboundChip(1, l2!, bracket, 0, false)).toBeNull();

      // Slot 2 from PRE_W1 inter-pod jump
      const slot2Chip = getInboundChip(2, l2!, bracket, 0, false);
      expect(slot2Chip).not.toBeNull();
      expect(slot2Chip?.text).toMatch(/^\d+$/);
    });

    it('Lower Bracket Round 3 (2C): Slot 1 suppressed (line from PRE_L2), Slot 2 has jump from AR [MatchNumber]', () => {
      const sc = Object.values(bracket.matchesById).find((m) => m.roundIdentifier === '2C');
      expect(sc).toBeDefined();

      // Slot 1 from PRE_L2 via SVG line -> null
      expect(getInboundChip(1, sc!, bracket, 0, false)).toBeNull();

      // Slot 2 from AR inter-pod jump
      const slot2Chip = getInboundChip(2, sc!, bracket, 0, false);
      expect(slot2Chip).not.toBeNull();
      expect(slot2Chip?.text).toMatch(/^\d+$/);
    });

    it('Lower Bracket Round 4 (PO): Slot 1 has jump from UB [MatchNumber], Slot 2 suppressed (line from 2C), winner qualifies to T16', () => {
      const po = Object.values(bracket.matchesById).find((m) => m.roundIdentifier === 'PO');
      expect(po).toBeDefined();

      // Slot 1 from PRE_W2
      const slot1Chip = getInboundChip(1, po!, bracket, 0, false);
      expect(slot1Chip).not.toBeNull();
      expect(slot1Chip?.text).toMatch(/^\d+$/);

      // Slot 2 from 2C via SVG line -> null
      expect(getInboundChip(2, po!, bracket, 0, false)).toBeNull();

      // Outbound winner: qualifies to Top 16 Championship [MatchNumber]
      const winnerChip = getOutboundChip(1, po!, true, true, false, 16, bracket);
      expect(winnerChip).not.toBeNull();
      expect(winnerChip?.text).toMatch(/^\d+$/);

      // Outbound loser: eliminated -> null
      expect(getOutboundChip(2, po!, true, true, false, 16, bracket)).toBeNull();
    });

    it('Top 16 Championship (Phase 2): opening round shows qualifiers from AR and LB, subsequent rounds suppressed', () => {
      const champR1 = Object.values(bracket.matchesById).find((m) => m.roundIdentifier === 'CHAMP_R1');
      expect(champR1).toBeDefined();

      // Opening round Slot 1 from AR
      const slot1Chip = getInboundChip(1, champR1!, bracket, 0, true);
      expect(slot1Chip).not.toBeNull();
      expect(slot1Chip?.text).toMatch(/^\d+$/);

      // Opening round Slot 2 from LB
      const slot2Chip = getInboundChip(2, champR1!, bracket, 0, true);
      expect(slot2Chip).not.toBeNull();
      expect(slot2Chip?.text).toMatch(/^\d+$/);

      // Outbound chips in Phase 2 are suppressed (all advance via SVG lines)
      expect(getOutboundChip(1, champR1!, true, true, false, 16, bracket)).toBeNull();

      // Finals Rule: Championship Finals matches suppress all chips
      const champFinal = Object.values(bracket.matchesById).find(
        (m) => m.phase === 'CHAMPIONSHIP' && m.roundIdentifier !== 'CHAMP_R1'
      );
      if (champFinal) {
        expect(getInboundChip(1, champFinal, bracket, 0, false)).toBeNull();
        expect(getInboundChip(2, champFinal, bracket, 0, false)).toBeNull();
        expect(getOutboundChip(1, champFinal, true, true, false, 16, bracket)).toBeNull();
      }
    });
  });
});
