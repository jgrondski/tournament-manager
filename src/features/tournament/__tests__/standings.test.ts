import { describe, it, expect } from 'vitest';
import { calculateTierStandings } from '../standings';
import { generateTraditionalBracket, advanceMatchWinner } from '../../bracket/math';
import { TournamentTier, MatchScoreRecord } from '../types';

describe('Final Standings Rollup Engine', () => {
  it('correctly derives 1st, 2nd, 3rd/4th placements from completed bracket matches', () => {
    const players = [
      { id: 'p1', name: 'Alpha', seed: 1 },
      { id: 'p2', name: 'Beta', seed: 2 },
      { id: 'p3', name: 'Gamma', seed: 3 },
      { id: 'p4', name: 'Delta', seed: 4 },
    ];

    let bracket = generateTraditionalBracket(players, { tierId: 'gold', bestOf: 3 });

    // Round 1 (Semifinals):
    // Match 1: Alpha (1) vs Delta (4) -> Alpha wins
    const m1Id = bracket.rounds[0].matches[0].id;
    bracket = advanceMatchWinner(bracket, m1Id, 'p1');

    // Match 2: Gamma (3) vs Beta (2) -> Beta wins
    const m2Id = bracket.rounds[0].matches[1].id;
    bracket = advanceMatchWinner(bracket, m2Id, 'p2');

    // Finals: Alpha vs Beta -> Alpha wins
    const finalsMatchId = bracket.rounds[1].matches[0].id;
    bracket = advanceMatchWinner(bracket, finalsMatchId, 'p1');

    const matchScores: Record<string, MatchScoreRecord> = {
      [m1Id]: {
        matchId: m1Id,
        tierId: 'gold',
        bestOf: 3,
        player1Wins: 2,
        player2Wins: 0,
        games: [],
        winnerPlayerId: 'p1',
        loserPlayerId: 'p4',
        isComplete: true,
      },
      [m2Id]: {
        matchId: m2Id,
        tierId: 'gold',
        bestOf: 3,
        player1Wins: 0,
        player2Wins: 2,
        games: [],
        winnerPlayerId: 'p2',
        loserPlayerId: 'p3',
        isComplete: true,
      },
      [finalsMatchId]: {
        matchId: finalsMatchId,
        tierId: 'gold',
        bestOf: 3,
        player1Wins: 2,
        player2Wins: 1,
        games: [],
        winnerPlayerId: 'p1',
        loserPlayerId: 'p2',
        isComplete: true,
      },
    };

    const tier: TournamentTier = {
      id: 'gold',
      slug: 'gold',
      name: 'Gold Championship',
      priority: 1,
      bracketType: 'TRADITIONAL',
      playerCount: 4,
      bestOf: 3,
      bracket,
      isLocked: true,
    };

    const standings = calculateTierStandings(tier, matchScores);

    expect(standings).toHaveLength(4);

    // 1st Place: Alpha (Champion)
    expect(standings[0].player.name).toBe('Alpha');
    expect(standings[0].rankNumber).toBe(1);
    expect(standings[0].status).toBe('champion');

    // 2nd Place: Beta (Runner-up)
    expect(standings[1].player.name).toBe('Beta');
    expect(standings[1].rankNumber).toBe(2);
    expect(standings[1].status).toBe('runner_up');

    // 3rd/4th Place: Delta and Gamma
    const semifinalistNames = [standings[2].player.name, standings[3].player.name];
    expect(semifinalistNames).toContain('Delta');
    expect(semifinalistNames).toContain('Gamma');
    expect(standings[2].status).toBe('semifinalist');
    expect(standings[3].status).toBe('semifinalist');
  });
});
