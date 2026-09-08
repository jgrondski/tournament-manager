import { describe, expect, it } from 'vitest';
import { generateTraditionalBracket } from '../traditional';
import { advanceMatchWinner } from '../advance';
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
