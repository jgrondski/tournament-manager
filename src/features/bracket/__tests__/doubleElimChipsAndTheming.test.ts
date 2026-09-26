import { describe, it, expect } from 'vitest';
import { generateTraditionalDoubleElim, generateFlatDoubleElim } from '../math/double-elimination';
import { getOriginChip, getOutcomeChip, getOutboundChip } from '../components/BracketVisualizer';
import { getDefaultTierColors } from '../colorUtils';
import { SeededPlayer } from '../types';

describe('Double Elimination Destination & Origin Chips and Theming', () => {
  const createPlayers = (count: number): SeededPlayer[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

  describe('6th Tier Color "Lower Bracket" default value', () => {
    it('provides burnt orange #c2410c as the default lowerBracketColor across tier defaults', () => {
      const goldDefaults = getDefaultTierColors({ id: 'gold' });
      expect(goldDefaults.lowerBracketColor).toBe('#c2410c');

      const silverDefaults = getDefaultTierColors({ id: 'silver' });
      expect(silverDefaults.lowerBracketColor).toBe('#c2410c');

      const bronzeDefaults = getDefaultTierColors({ id: 'bronze' });
      expect(bronzeDefaults.lowerBracketColor).toBe('#c2410c');
    });
  });

  describe('Traditional Double Elimination', () => {
    it('creates exiting chips in lowerBracketColor on the right when players lose in Winners Bracket and drop to Losers', () => {
      const players = createPlayers(4);
      const bracket = generateTraditionalDoubleElim(players, { tierId: 'gold' });

      // First Winners match
      const w1 = Object.values(bracket.matchesById).find((m) => m.stage === 'WINNERS' && m.roundNumber === 1);
      expect(w1).toBeDefined();
      expect(w1?.loserNextMatchId).toBeDefined();

      const destMatch = bracket.matchesById[w1!.loserNextMatchId!];
      expect(destMatch).toBeDefined();
      expect(destMatch.stage).toBe('LOSERS');

      // When player loses in Winners (slotWon === false):
      const loserChip = getOutcomeChip(false, w1!, 16, bracket, '#ffc905', '#f59e0b', '#c2410c');
      expect(loserChip).not.toBeNull();
      expect(loserChip?.color).toBe('#c2410c');
      expect(loserChip?.targetMatchId).toBe(destMatch.id);
      expect(loserChip?.text).toContain(String(destMatch.matchNumber));
      expect(loserChip?.tooltip).toContain('Drops to Lower Bracket');

      // When player wins in earlier Winners round (slotWon === true):
      // Advances to Winners Finals via normal bracket connector lines, no chip needed
      const winnerChip = getOutcomeChip(true, w1!, 16, bracket, '#ffc905', '#f59e0b', '#c2410c');
      expect(winnerChip).toBeNull();
    });

    it('creates entering chips in primaryColor on the left when players enter Losers Bracket from Winners', () => {
      const players = createPlayers(4);
      const bracket = generateTraditionalDoubleElim(players, { tierId: 'gold' });

      const l1 = Object.values(bracket.matchesById).find((m) => m.stage === 'LOSERS');
      expect(l1).toBeDefined();

      // Slot 1 and Slot 2 in LR1 entered from Winners round 1
      const slot1Chip = getOriginChip(1, l1!, bracket, 0, false, '#ffc905', '#c2410c');
      expect(slot1Chip).not.toBeNull();
      expect(slot1Chip?.color).toBe('#ffc905');
      expect(slot1Chip?.targetMatchId).toBe(l1?.player1.sourceMatchId || l1?.slotA?.matchId);
      expect(slot1Chip?.tooltip).toContain('From Winners Bracket');

      const slot2Chip = getOriginChip(2, l1!, bracket, 0, false, '#ffc905', '#c2410c');
      expect(slot2Chip).not.toBeNull();
      expect(slot2Chip?.color).toBe('#ffc905');
      expect(slot2Chip?.targetMatchId).toBe(l1?.player2.sourceMatchId || l1?.slotB?.matchId);
      expect(slot2Chip?.tooltip).toContain('From Winners Bracket');
    });

    it('suppresses incoming chips in Grand Finals per Finals Rule', () => {
      const players = createPlayers(4);
      const bracket = generateTraditionalDoubleElim(players, { tierId: 'gold' });

      const gf = Object.values(bracket.matchesById).find((m) => m.stage === 'GRAND_FINALS');
      expect(gf).toBeDefined();

      const gfSlot1Chip = getOriginChip(1, gf!, bracket, 0, false, '#ffc905', '#c2410c');
      expect(gfSlot1Chip).toBeNull();

      const gfSlot2Chip = getOriginChip(2, gf!, bracket, 0, false, '#ffc905', '#c2410c');
      expect(gfSlot2Chip).toBeNull();
    });

    it('suppresses exiting chips to Grand Finals per Finals Rule and Connector Line Rule', () => {
      const players = createPlayers(4);
      const bracket = generateTraditionalDoubleElim(players, { tierId: 'gold' });

      const wf = Object.values(bracket.matchesById).find(
        (m) => m.stage === 'WINNERS' && (m.roundIdentifier === 'WF' || m.roundIdentifier === 'W2')
      );
      expect(wf).toBeDefined();

      // WF Winner -> Grand Finals is connected by SVG line, suppressed per Finals Rule
      const wfWinnerChip = getOutcomeChip(true, wf!, 16, bracket, '#ffc905', '#f59e0b', '#c2410c');
      expect(wfWinnerChip).toBeNull();

      // LF Winner -> Grand Finals is connected by SVG line, suppressed per Finals Rule
      const lf = Object.values(bracket.matchesById).find(
        (m) => m.stage === 'LOSERS' && (m.roundIdentifier === 'LF' || m.roundIdentifier === 'L2')
      );
      expect(lf).toBeDefined();

      const lfWinnerChip = getOutcomeChip(true, lf!, 16, bracket, '#ffc905', '#f59e0b', '#c2410c');
      expect(lfWinnerChip).toBeNull();

      // LF Loser is eliminated -> no chip
      const lfLoserChip = getOutcomeChip(false, lf!, 16, bracket, '#ffc905', '#f59e0b', '#c2410c');
      expect(lfLoserChip).toBeNull();
    });
  });

  describe('Flat Double Elimination', () => {
    it('creates exiting chips linking to losers and entering chips linking to winners in Flat Double Elim', () => {
      const players = createPlayers(16);
      const bracket = generateFlatDoubleElim(players, 4, { tierId: 'silver' });

      // First Winners match
      const w1 = Object.values(bracket.matchesById).find((m) => m.stage === 'WINNERS' && m.roundNumber === 1);
      expect(w1).toBeDefined();

      const loserChip = getOutcomeChip(false, w1!, 16, bracket, '#3b82f6', '#1d4ed8', '#ea580c');
      expect(loserChip).not.toBeNull();
      expect(loserChip?.color).toBe('#ea580c');
      expect(loserChip?.tooltip).toContain('Drops to Lower Bracket');

      // Losers match receiving the drop
      const destMatch = bracket.matchesById[loserChip!.targetMatchId!];
      expect(destMatch).toBeDefined();
      expect(destMatch.stage).toBe('LOSERS');

      // Origin chip in that Losers match
      const slotNum = destMatch.player1.sourceMatchId === w1!.id ? 1 : 2;
      const originChip = getOriginChip(slotNum, destMatch, bracket, 0, false, '#3b82f6', '#ea580c');
      expect(originChip).not.toBeNull();
      expect(originChip?.color).toBe('#3b82f6');
      expect(originChip?.targetMatchId).toBe(w1!.id);
      expect(originChip?.tooltip).toContain('From Winners Bracket');
      expect(originChip?.text).toBe(`${w1!.matchNumber}`);
    });
  });

  describe('Match number syntax and In-Progress Opacity Stakes', () => {
    it('uses clean match number syntax without arrows or dashes for inbound and outbound chips', () => {
      const players = createPlayers(4);
      const bracket = generateTraditionalDoubleElim(players, { tierId: 'gold' });
      const w1 = Object.values(bracket.matchesById).find((m) => m.stage === 'WINNERS' && m.roundNumber === 1);
      const destMatch = bracket.matchesById[w1!.loserNextMatchId!];

      // Outbound loser drop chip format
      const loserChip = getOutcomeChip(false, w1!, 16, bracket, '#ffc905', '#f59e0b', '#c2410c');
      expect(loserChip?.text).toBe(`${destMatch.matchNumber}`);
      expect(loserChip?.text).not.toContain('#');

      // Inbound jump chip format in Losers
      const slotNum = destMatch.player1.sourceMatchId === w1!.id ? 1 : 2;
      const originChip = getOriginChip(slotNum, destMatch, bracket, 0, false, '#ffc905', '#c2410c');
      expect(originChip?.text).toBe(`${w1!.matchNumber}`);
      expect(originChip?.text).not.toContain('#');
    });

    it('displays drop stakes with opacity 0.4 for uncompleted matches on both slots', () => {
      const players = createPlayers(4);
      const bracket = generateTraditionalDoubleElim(players, { tierId: 'gold' });
      const w1 = Object.values(bracket.matchesById).find((m) => m.stage === 'WINNERS' && m.roundNumber === 1);
      const destMatch = bracket.matchesById[w1!.loserNextMatchId!];

      // In-progress / uncompleted match: isComplete = false
      const slot1Stake = getOutboundChip(1, w1!, false, false, false, 16, bracket, '#ffc905', '#f59e0b', '#c2410c');
      expect(slot1Stake).not.toBeNull();
      expect(slot1Stake?.opacity).toBe(0.4);
      expect(slot1Stake?.text).toBe(`${destMatch.matchNumber}`);

      const slot2Stake = getOutboundChip(2, w1!, false, false, false, 16, bracket, '#ffc905', '#f59e0b', '#c2410c');
      expect(slot2Stake).not.toBeNull();
      expect(slot2Stake?.opacity).toBe(0.4);
      expect(slot2Stake?.text).toBe(`${destMatch.matchNumber}`);

      // When completed: winner has null (advances via line), loser has opacity 1
      const winnerSlot = getOutboundChip(1, w1!, true, true, false, 16, bracket, '#ffc905', '#f59e0b', '#c2410c');
      expect(winnerSlot).toBeNull();

      const loserSlot = getOutboundChip(2, w1!, true, true, false, 16, bracket, '#ffc905', '#f59e0b', '#c2410c');
      expect(loserSlot).not.toBeNull();
      expect(loserSlot?.opacity).toBe(1);
    });
  });
});
