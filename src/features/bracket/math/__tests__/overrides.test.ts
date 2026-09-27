import { describe, it, expect } from 'vitest';
import { generateTraditionalBracket } from '../traditional';
import { generateDoubleEliminationBracket } from '../double-elimination';
import { advanceMatchWinner, retractMatchWinner, swapMatchSlots } from '../advance';
import { SeededPlayer } from '../../types';

describe('Manual Bracket Placement & Slot Overrides', () => {
  const createPlayers = (count: number): SeededPlayer[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

  it('swaps two players within the same round in a traditional single-elimination bracket', () => {
    const players = createPlayers(16);
    let bracket = generateTraditionalBracket(players, { bestOf: 3, tierId: 'gold' });

    // Round 1 has 8 matches (R1-M1 to R1-M8).
    // Round 2 is Round of 8 with 4 matches (R2-M1 to R2-M4).
    const r1m1 = bracket.rounds[0].matches[0];
    const r1m7 = bracket.rounds[0].matches[6]; // Seed 3 (Player 3) plays here

    // Advance winners from R1
    bracket = advanceMatchWinner(bracket, r1m1.id, r1m1.player1.player!.id); // Player 1 advances to R2-M1 slot 1
    bracket = advanceMatchWinner(bracket, r1m7.id, r1m7.player1.player!.id); // Player 3 advances to R2-M4 slot 1

    const r2m1 = bracket.rounds[1].matches[0];
    const r2m4 = bracket.rounds[1].matches[3];

    expect(bracket.matchesById[r2m1.id].player1.player?.id).toBe('p1');
    expect(bracket.matchesById[r2m4.id].player1.player?.id).toBe('p3');

    // Perform manual placement override: swap Player 1 (in R2-M1 slot 1) with Player 3 (in R2-M4 slot 1)
    const updatedBracket = swapMatchSlots(bracket, {
      sourceMatchId: r2m1.id,
      sourceSlot: 1,
      targetMatchId: r2m4.id,
      targetSlot: 1,
    });

    // Verify slots swapped with override flag
    const updatedR2M1 = updatedBracket.matchesById[r2m1.id];
    const updatedR2M4 = updatedBracket.matchesById[r2m4.id];

    expect(updatedR2M1.player1.player?.id).toBe('p3');
    expect(updatedR2M1.player1.isManualOverride).toBe(true);

    expect(updatedR2M4.player1.player?.id).toBe('p1');
    expect(updatedR2M4.player1.isManualOverride).toBe(true);
  });

  it('allows moving an advanced player to an empty/unfilled slot in the same round', () => {
    const players = createPlayers(16);
    let bracket = generateTraditionalBracket(players, { bestOf: 3, tierId: 'gold' });

    const r1m1 = bracket.rounds[0].matches[0];
    bracket = advanceMatchWinner(bracket, r1m1.id, r1m1.player1.player!.id); // Player 1 advances to R2-M1 slot 1

    const r2m1 = bracket.rounds[1].matches[0];
    const r2m3 = bracket.rounds[1].matches[2];

    expect(bracket.matchesById[r2m1.id].player1.player?.id).toBe('p1');
    expect(bracket.matchesById[r2m3.id].player2.player).toBeNull();

    // Move Player 1 from R2-M1 slot 1 to empty slot R2-M3 slot 2
    const updatedBracket = swapMatchSlots(bracket, {
      sourceMatchId: r2m1.id,
      sourceSlot: 1,
      targetMatchId: r2m3.id,
      targetSlot: 2,
    });

    const updatedR2M1 = updatedBracket.matchesById[r2m1.id];
    const updatedR2M3 = updatedBracket.matchesById[r2m3.id];

    expect(updatedR2M1.player1.player).toBeNull();
    expect(updatedR2M3.player2.player?.id).toBe('p1');
    expect(updatedR2M3.player2.isManualOverride).toBe(true);
  });

  it('rejects swapping slots across different rounds or different stages', () => {
    const players = createPlayers(16);
    const bracket = generateDoubleEliminationBracket(players, { bestOf: 3, tierId: 'gold' });

    const w1Match = bracket.rounds.find((r) => r.roundIdentifier === 'W1')!.matches[0];
    const w2Match = bracket.rounds.find((r) => r.roundIdentifier === 'W2')!.matches[0];
    const l1Match = bracket.rounds.find((r) => r.roundIdentifier === 'L1')!.matches[0];

    // Attempting cross-round swap (W1 with W2) must throw
    expect(() =>
      swapMatchSlots(bracket, {
        sourceMatchId: w1Match.id,
        sourceSlot: 1,
        targetMatchId: w2Match.id,
        targetSlot: 1,
      })
    ).toThrow(/different rounds/i);

    // Attempting cross-stage swap (W1 with L1) must throw
    expect(() =>
      swapMatchSlots(bracket, {
        sourceMatchId: w1Match.id,
        sourceSlot: 1,
        targetMatchId: l1Match.id,
        targetSlot: 1,
      })
    ).toThrow(/different/i);
  });

  it('safely retracts an upstream winner even after they have been moved to a different match in the round', () => {
    const players = createPlayers(16);
    let bracket = generateTraditionalBracket(players, { bestOf: 3, tierId: 'gold' });

    const r1m1 = bracket.rounds[0].matches[0];
    bracket = advanceMatchWinner(bracket, r1m1.id, r1m1.player1.player!.id); // Player 1 in R2-M1 slot 1

    const r2m1 = bracket.rounds[1].matches[0];
    const r2m4 = bracket.rounds[1].matches[3];

    // Move Player 1 to R2-M4 slot 2
    bracket = swapMatchSlots(bracket, {
      sourceMatchId: r2m1.id,
      sourceSlot: 1,
      targetMatchId: r2m4.id,
      targetSlot: 2,
    });

    expect(bracket.matchesById[r2m4.id].player2.player?.id).toBe('p1');

    // Retract R1-M1 winner
    bracket = retractMatchWinner(bracket, r1m1.id);

    // Verify Player 1 was cleanly removed from R2-M4 slot 2!
    expect(bracket.matchesById[r2m4.id].player2.player).toBeNull();
    expect(bracket.matchesById[r2m1.id].player1.player).toBeNull();
  });

  it('supports swapping Losers bracket drop slots in double-elimination brackets', () => {
    const players = createPlayers(8);
    let bracket = generateDoubleEliminationBracket(players, { bestOf: 3, tierId: 'gold' });

    // In 8-player double elim:
    // W1 has 4 matches (W1-M1..W1-M4)
    // Losers drop into L1 (2 matches: L1-M1, L1-M2)
    const w1Matches = bracket.rounds.find((r) => r.roundIdentifier === 'W1')!.matches;

    // Advance all W1 matches so all 4 losers drop into L1
    w1Matches.forEach((m) => {
      bracket = advanceMatchWinner(bracket, m.id, m.player1.player!.id);
    });

    const l1Round = bracket.rounds.find((r) => r.roundIdentifier === 'L1')!;
    const l1m1 = l1Round.matches[0];
    const l1m2 = l1Round.matches[1];

    const l1m1P1 = bracket.matchesById[l1m1.id].player1.player;
    const l1m2P1 = bracket.matchesById[l1m2.id].player1.player;

    expect(l1m1P1).not.toBeNull();
    expect(l1m2P1).not.toBeNull();

    // Swap L1-M1 slot 1 with L1-M2 slot 1
    const updated = swapMatchSlots(bracket, {
      sourceMatchId: l1m1.id,
      sourceSlot: 1,
      targetMatchId: l1m2.id,
      targetSlot: 1,
    });

    expect(updated.matchesById[l1m1.id].player1.player?.id).toBe(l1m2P1!.id);
    expect(updated.matchesById[l1m1.id].player1.isManualOverride).toBe(true);

    expect(updated.matchesById[l1m2.id].player1.player?.id).toBe(l1m1P1!.id);
    expect(updated.matchesById[l1m2.id].player1.isManualOverride).toBe(true);
  });
});
