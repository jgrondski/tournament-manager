import { describe, expect, it } from 'vitest';
import { generateTraditionalBracket } from '../traditional';
import { advanceMatchWinner, retractMatchWinner } from '../advance';
import { SeededPlayer } from '../../types';

function createMockPlayers(count: number): SeededPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `Player ${i + 1}`,
    seed: i + 1,
  }));
}

describe('advanceMatchWinner', () => {
  it('throws an error if the match ID does not exist', () => {
    const players = createMockPlayers(4);
    const bracket = generateTraditionalBracket(players);

    expect(() => advanceMatchWinner(bracket, 'non-existent-match', 'player-1')).toThrow(
      'Match with id "non-existent-match" not found'
    );
  });

  it('throws an error if the declared winner is not a participant in the match', () => {
    const players = createMockPlayers(4);
    const bracket = generateTraditionalBracket(players);

    // Round 1 Match 1 is between player-1 (seed 1) and player-4 (seed 4)
    expect(() => advanceMatchWinner(bracket, 'r1-m1', 'player-2')).toThrow(
      'Player with id "player-2" is not a participant in match "r1-m1"'
    );
  });

  it('preserves functional immutability and does not mutate the original bracket', () => {
    const players = createMockPlayers(4);
    const initialBracket = generateTraditionalBracket(players);

    const updatedBracket = advanceMatchWinner(initialBracket, 'r1-m1', 'player-1');

    // Original bracket must remain un-advanced
    expect(initialBracket.matchesById['r1-m1'].winnerId).toBeNull();
    expect(initialBracket.matchesById['r2-m1'].player1.player).toBeNull();

    // Updated bracket must reflect the win
    expect(updatedBracket.matchesById['r1-m1'].winnerId).toBe('player-1');
    expect(updatedBracket.matchesById['r1-m1'].loserId).toBe('player-4');
    expect(updatedBracket.matchesById['r2-m1'].player1.player?.id).toBe('player-1');
  });

  it('accurately simulates an entire 4-player tournament to completion', () => {
    const players = createMockPlayers(4);
    let bracket = generateTraditionalBracket(players);

    // Semifinals (Round 1):
    // r1-m1: Player 1 vs Player 4
    // r1-m2: Player 2 vs Player 3
    expect(bracket.rounds[0].matches[0].player1.player?.seed).toBe(1);
    expect(bracket.rounds[0].matches[0].player2.player?.seed).toBe(4);

    expect(bracket.rounds[0].matches[1].player1.player?.seed).toBe(2);
    expect(bracket.rounds[0].matches[1].player2.player?.seed).toBe(3);

    // Player 1 beats Player 4
    bracket = advanceMatchWinner(bracket, 'r1-m1', 'player-1');
    expect(bracket.matchesById['r1-m1'].winnerId).toBe('player-1');
    expect(bracket.matchesById['r1-m1'].loserId).toBe('player-4');
    expect(bracket.matchesById['r2-m1'].player1.player?.id).toBe('player-1');

    // Player 3 upsets Player 2
    bracket = advanceMatchWinner(bracket, 'r1-m2', 'player-3');
    expect(bracket.matchesById['r1-m2'].winnerId).toBe('player-3');
    expect(bracket.matchesById['r1-m2'].loserId).toBe('player-2');
    expect(bracket.matchesById['r2-m1'].player2.player?.id).toBe('player-3');

    // Finals (Round 2):
    // r2-m1: Player 1 vs Player 3
    const finalMatch = bracket.matchesById['r2-m1'];
    expect(finalMatch.player1.player?.id).toBe('player-1');
    expect(finalMatch.player2.player?.id).toBe('player-3');

    // Player 1 wins the championship
    bracket = advanceMatchWinner(bracket, 'r2-m1', 'player-1');
    expect(bracket.matchesById['r2-m1'].winnerId).toBe('player-1');
    expect(bracket.matchesById['r2-m1'].loserId).toBe('player-3');
  });

  it('accurately simulates an 8-player bracket with byes and cascading advances', () => {
    // 6 players -> 2 byes in Round 1 (seeds 1 & 2)
    const players = createMockPlayers(6);
    let bracket = generateTraditionalBracket(players);

    // Verify bye auto-advancements were pre-placed into Semifinals
    expect(bracket.matchesById['r2-m1'].player1.player?.seed).toBe(1);
    expect(bracket.matchesById['r2-m2'].player1.player?.seed).toBe(2);

    // Play active Round 1 matches:
    // r1-m1: Seed 4 vs Seed 5
    // r1-m2: Seed 3 vs Seed 6
    bracket = advanceMatchWinner(bracket, 'r1-m1', 'player-4');
    expect(bracket.matchesById['r2-m1'].player2.player?.seed).toBe(4);

    bracket = advanceMatchWinner(bracket, 'r1-m2', 'player-6');
    expect(bracket.matchesById['r2-m2'].player2.player?.seed).toBe(6);

    // Semifinals:
    // r2-m1: Seed 1 vs Seed 4
    bracket = advanceMatchWinner(bracket, 'r2-m1', 'player-1');
    expect(bracket.matchesById['r3-m1'].player1.player?.seed).toBe(1);

    // r2-m2: Seed 2 vs Seed 6
    bracket = advanceMatchWinner(bracket, 'r2-m2', 'player-2');
    expect(bracket.matchesById['r3-m1'].player2.player?.seed).toBe(2);

    // Finals:
    // r3-m1: Seed 1 vs Seed 2
    bracket = advanceMatchWinner(bracket, 'r3-m1', 'player-2');
    expect(bracket.matchesById['r3-m1'].winnerId).toBe('player-2');
    expect(bracket.matchesById['r3-m1'].loserId).toBe('player-1');
  });
});

describe('retractMatchWinner', () => {
  it('clears match winner/loser and downstream feeder slot', () => {
    const players = createMockPlayers(8);
    let bracket = generateTraditionalBracket(players);

    // Advance player 1 in r1-m1
    bracket = advanceMatchWinner(bracket, 'r1-m1', 'player-1');
    expect(bracket.matchesById['r1-m1'].winnerId).toBe('player-1');
    expect(bracket.matchesById['r2-m1'].player1.player?.id).toBe('player-1');

    // Retract r1-m1 winner
    bracket = retractMatchWinner(bracket, 'r1-m1');
    expect(bracket.matchesById['r1-m1'].winnerId).toBeNull();
    expect(bracket.matchesById['r1-m1'].loserId).toBeNull();
    expect(bracket.matchesById['r2-m1'].player1.player).toBeNull();
  });

  it('cascades retraction if downstream match had also declared a winner', () => {
    const players = createMockPlayers(8);
    let bracket = generateTraditionalBracket(players);

    // Advance r1-m1 (player 1) and r1-m2 (player 4)
    bracket = advanceMatchWinner(bracket, 'r1-m1', 'player-1');
    bracket = advanceMatchWinner(bracket, 'r1-m2', 'player-4');

    // Advance r2-m1 (player 1) into Finals r3-m1
    bracket = advanceMatchWinner(bracket, 'r2-m1', 'player-1');
    expect(bracket.matchesById['r3-m1'].player1.player?.id).toBe('player-1');

    // Retract r1-m1 (player 1 winner undone)
    bracket = retractMatchWinner(bracket, 'r1-m1');

    // r1-m1 has no winner
    expect(bracket.matchesById['r1-m1'].winnerId).toBeNull();
    // r2-m1 lost player 1 and had its winner retracted
    expect(bracket.matchesById['r2-m1'].player1.player).toBeNull();
    expect(bracket.matchesById['r2-m1'].winnerId).toBeNull();
    // r3-m1 (Finals) also had player 1 retracted
    expect(bracket.matchesById['r3-m1'].player1.player).toBeNull();
  });
});

describe('advanceMatchWinner and retractMatchWinner for Double Elimination', () => {
  it('propagates losers into Losers bracket and handles Grand Finals Reset', async () => {
    const { generateDoubleEliminationBracket } = await import('../double-elimination');
    const players = createMockPlayers(4);
    let bracket = generateDoubleEliminationBracket(players, { tierId: 'gold' });

    // Initial matches: 2(4) - 2 = 6
    expect(Object.keys(bracket.matchesById).length).toBe(6);

    // 1. W1-M1: Player 1 beats Player 4
    bracket = advanceMatchWinner(bracket, 'gold-w1-m1', 'player-1');
    expect(bracket.matchesById['gold-w1-m1'].winnerId).toBe('player-1');
    expect(bracket.matchesById['gold-w1-m1'].loserId).toBe('player-4');
    // Player 1 advances to Winners Finals (W2-M1) Slot 1
    expect(bracket.matchesById['gold-w2-m1'].player1.player?.id).toBe('player-1');
    // Player 4 drops to Losers R1 (L1-M1) Slot 1
    expect(bracket.matchesById['gold-l1-m1'].player1.player?.id).toBe('player-4');

    // 2. W1-M2: Player 2 beats Player 3
    bracket = advanceMatchWinner(bracket, 'gold-w1-m2', 'player-2');
    expect(bracket.matchesById['gold-w2-m1'].player2.player?.id).toBe('player-2');
    expect(bracket.matchesById['gold-l1-m1'].player2.player?.id).toBe('player-3');

    // 3. L1-M1: Player 3 beats Player 4 (Player 4 eliminated with 2 losses)
    bracket = advanceMatchWinner(bracket, 'gold-l1-m1', 'player-3');
    // Player 3 advances to Losers Finals (L2-M1) Slot 1
    expect(bracket.matchesById['gold-l2-m1'].player1.player?.id).toBe('player-3');

    // 4. W2-M1 (Winners Finals): Player 1 beats Player 2
    bracket = advanceMatchWinner(bracket, 'gold-w2-m1', 'player-1');
    // Player 1 advances to Grand Finals (GF1) Slot 1
    expect(bracket.matchesById['gold-gf1'].player1.player?.id).toBe('player-1');
    // Player 2 drops to Losers Finals (L2-M1) Slot 2
    expect(bracket.matchesById['gold-l2-m1'].player2.player?.id).toBe('player-2');

    // 5. L2-M1 (Losers Finals): Player 2 beats Player 3 (Player 3 eliminated with 2 losses)
    bracket = advanceMatchWinner(bracket, 'gold-l2-m1', 'player-2');
    // Player 2 advances to Grand Finals (GF1) Slot 2
    expect(bracket.matchesById['gold-gf1'].player2.player?.id).toBe('player-2');

    // Grand Finals Match 1: Player 1 (WB Champ) vs Player 2 (LB Champ)
    expect(bracket.matchesById['gold-gf1'].player1.player?.id).toBe('player-1');
    expect(bracket.matchesById['gold-gf1'].player2.player?.id).toBe('player-2');

    // Case A: WB Champion wins GF1 -> Tournament complete, NO reset match
    let wbWinBracket = advanceMatchWinner(bracket, 'gold-gf1', 'player-1');
    expect(wbWinBracket.matchesById['gold-gf1'].winnerId).toBe('player-1');
    expect(wbWinBracket.grandFinalsResetMatchId).toBeUndefined();
    expect(Object.keys(wbWinBracket.matchesById).length).toBe(6);

    // Case B: LB Champion wins GF1 -> Instigate Grand Finals Reset (Match 2)
    let lbWinBracket = advanceMatchWinner(bracket, 'gold-gf1', 'player-2');
    expect(lbWinBracket.matchesById['gold-gf1'].winnerId).toBe('player-2');
    expect(lbWinBracket.grandFinalsResetMatchId).toBe('gold-gf-reset');
    // Match count increases to 2N - 1 = 7 matches
    expect(Object.keys(lbWinBracket.matchesById).length).toBe(7);

    const resetMatch = lbWinBracket.matchesById['gold-gf-reset'];
    expect(resetMatch).toBeDefined();
    expect(resetMatch.stage).toBe('GRAND_FINALS_RESET');
    expect(resetMatch.roundIdentifier).toBe('GF_RESET');
    expect(resetMatch.matchNumber).toBe(7);
    expect(resetMatch.player1.player?.id).toBe('player-1');
    expect(resetMatch.player2.player?.id).toBe('player-2');

    // GF Reset can now be won
    let gfResetWon = advanceMatchWinner(lbWinBracket, 'gold-gf-reset', 'player-2');
    expect(gfResetWon.matchesById['gold-gf-reset'].winnerId).toBe('player-2');

    // Retracting GF1 removes the GF Reset match
    let retractedGf = retractMatchWinner(lbWinBracket, 'gold-gf1');
    expect(retractedGf.grandFinalsResetMatchId).toBeUndefined();
    expect(retractedGf.matchesById['gold-gf-reset']).toBeUndefined();
    expect(Object.keys(retractedGf.matchesById).length).toBe(6);
  });
});
