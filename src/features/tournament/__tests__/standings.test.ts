import { describe, it, expect } from 'vitest';
import { calculateTierStandings, calculateGlobalStandings } from '../standings';
import { generateTraditionalBracket, advanceMatchWinner } from '../../bracket/math';
import { Tournament, TournamentTier, MatchScoreRecord, PlayerProfile } from '../types';

const makePlayer = (id: string, name: string, overrides: Partial<PlayerProfile> = {}): PlayerProfile => ({
  id,
  name,
  personalBest: 1000000,
  playstyle: 'DAS',
  ...overrides,
});

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
    // Match 1: Alpha (1) vs Delta (4) -> Alpha wins 2-0
    const m1Id = bracket.rounds[0].matches[0].id;
    bracket = advanceMatchWinner(bracket, m1Id, 'p1');

    // Match 2: Gamma (3) vs Beta (2) -> Beta wins 2-1
    const m2Id = bracket.rounds[0].matches[1].id;
    bracket = advanceMatchWinner(bracket, m2Id, 'p2');

    // Finals: Alpha vs Beta -> Alpha wins 2-1
    const finalsMatchId = bracket.rounds[1].matches[0].id;
    bracket = advanceMatchWinner(bracket, finalsMatchId, 'p1');

    const matchScores: Record<string, MatchScoreRecord> = {
      [m1Id]: {
        matchId: m1Id,
        tierId: 'gold',
        bestOf: 3,
        player1Wins: 2,
        player2Wins: 0,
        games: [
          { gameNumber: 1, player1Points: 800000, player2Points: 500000, winnerPlayerId: 'p1' },
          { gameNumber: 2, player1Points: 850000, player2Points: 520000, winnerPlayerId: 'p1' },
        ],
        winnerPlayerId: 'p1',
        loserPlayerId: 'p4',
        isComplete: true,
      },
      [m2Id]: {
        matchId: m2Id,
        tierId: 'gold',
        bestOf: 3,
        player1Wins: 2,
        player2Wins: 1,
        games: [
          { gameNumber: 1, player1Points: 800000, player2Points: 700000, winnerPlayerId: 'p2' },
          { gameNumber: 2, player1Points: 700000, player2Points: 900000, winnerPlayerId: 'p3' },
          { gameNumber: 3, player1Points: 800000, player2Points: 700000, winnerPlayerId: 'p2' },
        ],
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
        games: [
          { gameNumber: 1, player1Points: 950000, player2Points: 850000, winnerPlayerId: 'p1' },
          { gameNumber: 2, player1Points: 800000, player2Points: 900000, winnerPlayerId: 'p2' },
          { gameNumber: 3, player1Points: 920000, player2Points: 880000, winnerPlayerId: 'p1' },
        ],
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

    // 3rd Place: Gamma (won 1 game in exit match: 1-2)
    // 4th Place: Delta (won 0 games in exit match: 0-2)
    expect(standings[2].player.name).toBe('Gamma');
    expect(standings[2].rankNumber).toBe(3);
    expect(standings[2].status).toBe('semifinalist');

    expect(standings[3].player.name).toBe('Delta');
    expect(standings[3].rankNumber).toBe(4);
    expect(standings[3].status).toBe('semifinalist');
  });

  describe('Competitive Intra-Round Exit Tiebreaker Engine', () => {
    it('breaks ties between round losers using exit game wins (e.g. 1-2 vs 0-2)', () => {
      const players: PlayerProfile[] = [
        makePlayer('p1', 'Alpha', { playstyle: 'DAS' }),
        makePlayer('p2', 'Beta', { playstyle: 'Rolling' }),
        makePlayer('p3', 'Gamma', { playstyle: 'Hypertap' }),
        makePlayer('p4', 'Delta', { playstyle: 'DAS' }),
      ];

      const seeded = players.map((p, idx) => ({ id: p.id, name: p.name, seed: idx + 1 }));
      let bracket = generateTraditionalBracket(seeded, { tierId: 'gold', bestOf: 3 });

      const m1Id = bracket.rounds[0].matches[0].id;
      bracket = advanceMatchWinner(bracket, m1Id, 'p1');
      const m2Id = bracket.rounds[0].matches[1].id;
      bracket = advanceMatchWinner(bracket, m2Id, 'p2');
      const finalsId = bracket.rounds[1].matches[0].id;
      bracket = advanceMatchWinner(bracket, finalsId, 'p1');

      const matchScores: Record<string, MatchScoreRecord> = {
        [m1Id]: {
          matchId: m1Id,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 2,
          player2Wins: 0, // Delta lost 0-2
          games: [
            { gameNumber: 1, player1Points: 800000, player2Points: 700000, winnerPlayerId: 'p1' },
            { gameNumber: 2, player1Points: 800000, player2Points: 700000, winnerPlayerId: 'p1' },
          ],
          winnerPlayerId: 'p1',
          loserPlayerId: 'p4',
          isComplete: true,
        },
        [m2Id]: {
          matchId: m2Id,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 2, // Beta (p1) won 2
          player2Wins: 1, // Gamma (p2) lost with 1 win
          games: [
            { gameNumber: 1, player1Points: 800000, player2Points: 700000, winnerPlayerId: 'p2' },
            { gameNumber: 2, player1Points: 700000, player2Points: 900000, winnerPlayerId: 'p3' },
            { gameNumber: 3, player1Points: 800000, player2Points: 700000, winnerPlayerId: 'p2' },
          ],
          winnerPlayerId: 'p2',
          loserPlayerId: 'p3',
          isComplete: true,
        },
        [finalsId]: {
          matchId: finalsId,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 2,
          player2Wins: 0,
          games: [
            { gameNumber: 1, player1Points: 900000, player2Points: 800000, winnerPlayerId: 'p1' },
            { gameNumber: 2, player1Points: 900000, player2Points: 800000, winnerPlayerId: 'p1' },
          ],
          winnerPlayerId: 'p1',
          loserPlayerId: 'p2',
          isComplete: true,
        },
      };

      const tournament: Tournament = {
        id: 't1',
        slug: 't1',
        name: 'Championship',
        date: '2026-09-10',
        location: 'Online',
        tournamentPlayers: {},
        qualFormat: 'HIGH_SCORE',
        tiers: [
          {
            id: 'gold',
            slug: 'gold',
            name: 'Gold Bracket',
            priority: 1,
            bracketType: 'TRADITIONAL',
            playerCount: 4,
            bestOf: 3,
            bracket,
            isLocked: true,
          },
        ],
        playersPool: players,
        qualifierSubmissions: [
          { id: 'q1', tournamentId: 't1', playerId: 'p1', score: 1000000, submittedAt: 1 },
          { id: 'q2', tournamentId: 't1', playerId: 'p2', score: 900000, submittedAt: 2 },
          { id: 'q3', tournamentId: 't1', playerId: 'p3', score: 800000, submittedAt: 3 },
          { id: 'q4', tournamentId: 't1', playerId: 'p4', score: 700000, submittedAt: 4 },
        ],
        matchScores,
        isLocked: true,
      };

      const standings = calculateGlobalStandings(tournament);

      expect(standings).toHaveLength(4);
      expect(standings[0].player.name).toBe('Alpha'); // 1st
      expect(standings[1].player.name).toBe('Beta');  // 2nd
      // Gamma (1 win in exit match) should beat Delta (0 wins in exit match)
      expect(standings[2].player.name).toBe('Gamma'); // 3rd
      expect(standings[2].finalRank).toBe(3);
      expect(standings[2].exitDetails?.playerWins).toBe(1);
      expect(standings[3].player.name).toBe('Delta'); // 4th
      expect(standings[3].finalRank).toBe(4);
      expect(standings[3].exitDetails?.playerWins).toBe(0);
    });

    it('breaks ties using avg_loss_score when exit game wins tie', () => {
      const players: PlayerProfile[] = [
        makePlayer('p1', 'Alpha', { playstyle: 'DAS' }),
        makePlayer('p2', 'Beta', { playstyle: 'Rolling' }),
        makePlayer('p3', 'Gamma', { playstyle: 'Hypertap' }),
        makePlayer('p4', 'Delta', { playstyle: 'DAS' }),
      ];

      const seeded = players.map((p, idx) => ({ id: p.id, name: p.name, seed: idx + 1 }));
      let bracket = generateTraditionalBracket(seeded, { tierId: 'gold', bestOf: 3 });

      const m1Id = bracket.rounds[0].matches[0].id;
      bracket = advanceMatchWinner(bracket, m1Id, 'p1');
      const m2Id = bracket.rounds[0].matches[1].id;
      bracket = advanceMatchWinner(bracket, m2Id, 'p2');
      const finalsId = bracket.rounds[1].matches[0].id;
      bracket = advanceMatchWinner(bracket, finalsId, 'p1');

      // Both Gamma and Delta lost 0-2 (0 exit wins each).
      // Delta had higher loss scores (850k, 830k -> avg 840k) than Gamma (600k, 620k -> avg 610k).
      const matchScores: Record<string, MatchScoreRecord> = {
        [m1Id]: {
          matchId: m1Id,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 2,
          player2Wins: 0,
          games: [
            { gameNumber: 1, player1Points: 900000, player2Points: 850000, winnerPlayerId: 'p1' },
            { gameNumber: 2, player1Points: 900000, player2Points: 830000, winnerPlayerId: 'p1' },
          ],
          winnerPlayerId: 'p1',
          loserPlayerId: 'p4',
          isComplete: true,
        },
        [m2Id]: {
          matchId: m2Id,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 2,
          player2Wins: 0,
          games: [
            { gameNumber: 1, player1Points: 800000, player2Points: 600000, winnerPlayerId: 'p2' },
            { gameNumber: 2, player1Points: 800000, player2Points: 620000, winnerPlayerId: 'p2' },
          ],
          winnerPlayerId: 'p2',
          loserPlayerId: 'p3',
          isComplete: true,
        },
        [finalsId]: {
          matchId: finalsId,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 2,
          player2Wins: 0,
          games: [
            { gameNumber: 1, player1Points: 900000, player2Points: 800000, winnerPlayerId: 'p1' },
            { gameNumber: 2, player1Points: 900000, player2Points: 800000, winnerPlayerId: 'p1' },
          ],
          winnerPlayerId: 'p1',
          loserPlayerId: 'p2',
          isComplete: true,
        },
      };

      const tournament: Tournament = {
        id: 't1',
        slug: 't1',
        name: 'Championship',
        date: '2026-09-10',
        location: 'Online',
        tournamentPlayers: {},
        qualFormat: 'HIGH_SCORE',
        tiers: [
          {
            id: 'gold',
            slug: 'gold',
            name: 'Gold Bracket',
            priority: 1,
            bracketType: 'TRADITIONAL',
            playerCount: 4,
            bestOf: 3,
            bracket,
            isLocked: true,
          },
        ],
        playersPool: players,
        qualifierSubmissions: [
          { id: 'q1', tournamentId: 't1', playerId: 'p1', score: 1000000, submittedAt: 1 },
          { id: 'q2', tournamentId: 't1', playerId: 'p2', score: 900000, submittedAt: 2 },
          { id: 'q3', tournamentId: 't1', playerId: 'p3', score: 800000, submittedAt: 3 },
          { id: 'q4', tournamentId: 't1', playerId: 'p4', score: 700000, submittedAt: 4 },
        ],
        matchScores,
        isLocked: true,
      };

      const standings = calculateGlobalStandings(tournament);

      // Delta should be 3rd because avg loss score (840,000) > Gamma's (610,000)
      expect(standings[2].player.name).toBe('Delta');
      expect(standings[2].finalRank).toBe(3);
      expect(standings[2].exitDetails?.avgLossScore).toBe(840000);

      expect(standings[3].player.name).toBe('Gamma');
      expect(standings[3].finalRank).toBe(4);
      expect(standings[3].exitDetails?.avgLossScore).toBe(610000);
    });

    it('penalizes forfeit unplayed games as score 0 in avg_loss_score', () => {
      const players: PlayerProfile[] = [
        makePlayer('p1', 'Alpha', { playstyle: 'DAS' }),
        makePlayer('p2', 'Beta', { playstyle: 'Rolling' }),
        makePlayer('p3', 'Gamma', { playstyle: 'Hypertap' }),
        makePlayer('p4', 'Delta', { playstyle: 'DAS' }),
      ];

      const seeded = players.map((p, idx) => ({ id: p.id, name: p.name, seed: idx + 1 }));
      let bracket = generateTraditionalBracket(seeded, { tierId: 'gold', bestOf: 3 });

      const m1Id = bracket.rounds[0].matches[0].id;
      bracket = advanceMatchWinner(bracket, m1Id, 'p1');
      const m2Id = bracket.rounds[0].matches[1].id;
      bracket = advanceMatchWinner(bracket, m2Id, 'p2');
      const finalsId = bracket.rounds[1].matches[0].id;
      bracket = advanceMatchWinner(bracket, finalsId, 'p1');

      // Delta played 2 games, scored 300k and 300k -> avg 300k.
      // Gamma played 1 game (scored 500k), then forfeited (game 2 unplayed counts as 0).
      // Gamma's avg loss score is (500k + 0) / 2 = 250k.
      // Delta's avg loss score (300k) > Gamma's (250k), so Delta finishes ahead of Gamma!
      const matchScores: Record<string, MatchScoreRecord> = {
        [m1Id]: {
          matchId: m1Id,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 2,
          player2Wins: 0,
          games: [
            { gameNumber: 1, player1Points: 800000, player2Points: 300000, winnerPlayerId: 'p1' },
            { gameNumber: 2, player1Points: 800000, player2Points: 300000, winnerPlayerId: 'p1' },
          ],
          winnerPlayerId: 'p1',
          loserPlayerId: 'p4',
          isComplete: true,
        },
        [m2Id]: {
          matchId: m2Id,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 2,
          player2Wins: 0,
          games: [
            { gameNumber: 1, player1Points: 800000, player2Points: 500000, winnerPlayerId: 'p2' },
          ],
          winnerPlayerId: 'p2',
          loserPlayerId: 'p3',
          isComplete: true,
          forfeitWinnerId: 'p2',
          notes: 'Forfeit win',
        },
        [finalsId]: {
          matchId: finalsId,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 2,
          player2Wins: 0,
          games: [
            { gameNumber: 1, player1Points: 900000, player2Points: 800000, winnerPlayerId: 'p1' },
            { gameNumber: 2, player1Points: 900000, player2Points: 800000, winnerPlayerId: 'p1' },
          ],
          winnerPlayerId: 'p1',
          loserPlayerId: 'p2',
          isComplete: true,
        },
      };

      const tournament: Tournament = {
        id: 't1',
        slug: 't1',
        name: 'Championship',
        date: '2026-09-10',
        location: 'Online',
        tournamentPlayers: {},
        qualFormat: 'HIGH_SCORE',
        tiers: [
          {
            id: 'gold',
            slug: 'gold',
            name: 'Gold Bracket',
            priority: 1,
            bracketType: 'TRADITIONAL',
            playerCount: 4,
            bestOf: 3,
            bracket,
            isLocked: true,
          },
        ],
        playersPool: players,
        qualifierSubmissions: [
          { id: 'q1', tournamentId: 't1', playerId: 'p1', score: 1000000, submittedAt: 1 },
          { id: 'q2', tournamentId: 't1', playerId: 'p2', score: 900000, submittedAt: 2 },
          { id: 'q3', tournamentId: 't1', playerId: 'p3', score: 800000, submittedAt: 3 },
          { id: 'q4', tournamentId: 't1', playerId: 'p4', score: 700000, submittedAt: 4 },
        ],
        matchScores,
        isLocked: true,
      };

      const standings = calculateGlobalStandings(tournament);

      expect(standings[2].player.name).toBe('Delta');
      expect(standings[2].finalRank).toBe(3);
      expect(standings[2].exitDetails?.avgLossScore).toBe(300000);

      expect(standings[3].player.name).toBe('Gamma');
      expect(standings[3].finalRank).toBe(4);
      expect(standings[3].exitDetails?.avgLossScore).toBe(250000);
      expect(standings[3].exitDetails?.isForfeit).toBe(true);
    });

    it('falls back to initial qualifying seed when all game and score tiebreakers tie', () => {
      const players: PlayerProfile[] = [
        makePlayer('p1', 'Alpha'),
        makePlayer('p2', 'Beta'),
        makePlayer('p3', 'Gamma'),
        makePlayer('p4', 'Delta'),
      ];

      const seeded = players.map((p, idx) => ({ id: p.id, name: p.name, seed: idx + 1 }));
      let bracket = generateTraditionalBracket(seeded, { tierId: 'gold', bestOf: 3 });

      const m1Id = bracket.rounds[0].matches[0].id;
      bracket = advanceMatchWinner(bracket, m1Id, 'p1');
      const m2Id = bracket.rounds[0].matches[1].id;
      bracket = advanceMatchWinner(bracket, m2Id, 'p2');
      const finalsId = bracket.rounds[1].matches[0].id;
      bracket = advanceMatchWinner(bracket, finalsId, 'p1');

      // Both Gamma and Delta lost 0-2 with identical 700k loss scores.
      const matchScores: Record<string, MatchScoreRecord> = {
        [m1Id]: {
          matchId: m1Id,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 2,
          player2Wins: 0,
          games: [
            { gameNumber: 1, player1Points: 800000, player2Points: 700000, winnerPlayerId: 'p1' },
            { gameNumber: 2, player1Points: 800000, player2Points: 700000, winnerPlayerId: 'p1' },
          ],
          winnerPlayerId: 'p1',
          loserPlayerId: 'p4',
          isComplete: true,
        },
        [m2Id]: {
          matchId: m2Id,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 2,
          player2Wins: 0,
          games: [
            { gameNumber: 1, player1Points: 800000, player2Points: 700000, winnerPlayerId: 'p2' },
            { gameNumber: 2, player1Points: 800000, player2Points: 700000, winnerPlayerId: 'p2' },
          ],
          winnerPlayerId: 'p2',
          loserPlayerId: 'p3',
          isComplete: true,
        },
        [finalsId]: {
          matchId: finalsId,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 2,
          player2Wins: 0,
          games: [],
          winnerPlayerId: 'p1',
          loserPlayerId: 'p2',
          isComplete: true,
        },
      };

      const tournament: Tournament = {
        id: 't1',
        slug: 't1',
        name: 'Championship',
        date: '2026-09-10',
        location: 'Online',
        tournamentPlayers: {},
        qualFormat: 'HIGH_SCORE',
        tiers: [
          {
            id: 'gold',
            slug: 'gold',
            name: 'Gold Bracket',
            priority: 1,
            bracketType: 'TRADITIONAL',
            playerCount: 4,
            bestOf: 3,
            bracket,
            isLocked: true,
          },
        ],
        playersPool: players,
        qualifierSubmissions: [
          { id: 'q1', tournamentId: 't1', playerId: 'p1', score: 1000000, submittedAt: 1 },
          { id: 'q2', tournamentId: 't1', playerId: 'p2', score: 900000, submittedAt: 2 },
          { id: 'q3', tournamentId: 't1', playerId: 'p3', score: 800000, submittedAt: 3 },
          { id: 'q4', tournamentId: 't1', playerId: 'p4', score: 700000, submittedAt: 4 },
        ],
        matchScores,
        isLocked: true,
      };

      const standings = calculateGlobalStandings(tournament);

      // Gamma (seed 3) should beat Delta (seed 4) on initial seed fallback!
      expect(standings[2].player.name).toBe('Gamma');
      expect(standings[2].finalRank).toBe(3);
      expect(standings[3].player.name).toBe('Delta');
      expect(standings[3].finalRank).toBe(4);
    });
  });

  describe('Multi-Tier Sequential Ranking & DNQ / DQ handling', () => {
    it('ranks Tier 1, then Tier 2 starting at Tier 1 count + 1, followed by DNQ and DQ', () => {
      // 8 players in 2 tiers + 2 DNQ + 1 DQ = 11 total players
      const players: PlayerProfile[] = [
        makePlayer('g1', 'Gold 1'),
        makePlayer('g2', 'Gold 2'),
        makePlayer('g3', 'Gold 3'),
        makePlayer('g4', 'Gold 4'),
        makePlayer('s1', 'Silver 1'),
        makePlayer('s2', 'Silver 2'),
        makePlayer('s3', 'Silver 3'),
        makePlayer('s4', 'Silver 4'),
        makePlayer('dnq1', 'DNQ Player 1'),
        makePlayer('dnq2', 'DNQ Player 2'),
        makePlayer('dq1', 'Cheater DQ', { isDisqualified: true }),
      ];

      const goldPlayers = [
        { id: 'g1', name: 'Gold 1', seed: 1 },
        { id: 'g2', name: 'Gold 2', seed: 2 },
        { id: 'g3', name: 'Gold 3', seed: 3 },
        { id: 'g4', name: 'Gold 4', seed: 4 },
      ];
      let goldBracket = generateTraditionalBracket(goldPlayers, { tierId: 'gold', bestOf: 3 });
      goldBracket = advanceMatchWinner(goldBracket, goldBracket.rounds[0].matches[0].id, 'g1');
      goldBracket = advanceMatchWinner(goldBracket, goldBracket.rounds[0].matches[1].id, 'g2');
      goldBracket = advanceMatchWinner(goldBracket, goldBracket.rounds[1].matches[0].id, 'g1');

      const silverPlayers = [
        { id: 's1', name: 'Silver 1', seed: 1 },
        { id: 's2', name: 'Silver 2', seed: 2 },
        { id: 's3', name: 'Silver 3', seed: 3 },
        { id: 's4', name: 'Silver 4', seed: 4 },
      ];
      let silverBracket = generateTraditionalBracket(silverPlayers, { tierId: 'silver', bestOf: 3 });
      silverBracket = advanceMatchWinner(silverBracket, silverBracket.rounds[0].matches[0].id, 's1');
      silverBracket = advanceMatchWinner(silverBracket, silverBracket.rounds[0].matches[1].id, 's2');
      silverBracket = advanceMatchWinner(silverBracket, silverBracket.rounds[1].matches[0].id, 's1');

      const matchScores: Record<string, MatchScoreRecord> = {
        // Gold matches
        [goldBracket.rounds[0].matches[0].id]: {
          matchId: goldBracket.rounds[0].matches[0].id,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 2,
          player2Wins: 0,
          games: [],
          winnerPlayerId: 'g1',
          loserPlayerId: 'g4',
          isComplete: true,
        },
        [goldBracket.rounds[0].matches[1].id]: {
          matchId: goldBracket.rounds[0].matches[1].id,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 0,
          player2Wins: 2,
          games: [],
          winnerPlayerId: 'g2',
          loserPlayerId: 'g3',
          isComplete: true,
        },
        [goldBracket.rounds[1].matches[0].id]: {
          matchId: goldBracket.rounds[1].matches[0].id,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 2,
          player2Wins: 1,
          games: [],
          winnerPlayerId: 'g1',
          loserPlayerId: 'g2',
          isComplete: true,
        },
        // Silver matches
        [silverBracket.rounds[0].matches[0].id]: {
          matchId: silverBracket.rounds[0].matches[0].id,
          tierId: 'silver',
          bestOf: 3,
          player1Wins: 2,
          player2Wins: 0,
          games: [],
          winnerPlayerId: 's1',
          loserPlayerId: 's4',
          isComplete: true,
        },
        [silverBracket.rounds[0].matches[1].id]: {
          matchId: silverBracket.rounds[0].matches[1].id,
          tierId: 'silver',
          bestOf: 3,
          player1Wins: 0,
          player2Wins: 2,
          games: [],
          winnerPlayerId: 's2',
          loserPlayerId: 's3',
          isComplete: true,
        },
        [silverBracket.rounds[1].matches[0].id]: {
          matchId: silverBracket.rounds[1].matches[0].id,
          tierId: 'silver',
          bestOf: 3,
          player1Wins: 2,
          player2Wins: 0,
          games: [],
          winnerPlayerId: 's1',
          loserPlayerId: 's2',
          isComplete: true,
        },
      };

      const tournament: Tournament = {
        id: 't2',
        slug: 't2',
        name: 'Two Tier Championship',
        date: '2026-09-10',
        location: 'Online',
        tournamentPlayers: {},
        qualFormat: 'HIGH_SCORE',
        tiers: [
          {
            id: 'gold',
            slug: 'gold',
            name: 'Gold Bracket',
            priority: 1,
            bracketType: 'TRADITIONAL',
            playerCount: 4,
            bestOf: 3,
            bracket: goldBracket,
            isLocked: true,
          },
          {
            id: 'silver',
            slug: 'silver',
            name: 'Silver Bracket',
            priority: 2,
            bracketType: 'TRADITIONAL',
            playerCount: 4,
            bestOf: 3,
            bracket: silverBracket,
            isLocked: true,
          },
        ],
        playersPool: players,
        qualifierSubmissions: [
          { id: 'q1', tournamentId: 't2', playerId: 'g1', score: 1100000, submittedAt: 1 },
          { id: 'q2', tournamentId: 't2', playerId: 'g2', score: 1050000, submittedAt: 2 },
          { id: 'q3', tournamentId: 't2', playerId: 'g3', score: 1000000, submittedAt: 3 },
          { id: 'q4', tournamentId: 't2', playerId: 'g4', score: 950000, submittedAt: 4 },
          { id: 'q5', tournamentId: 't2', playerId: 's1', score: 900000, submittedAt: 5 },
          { id: 'q6', tournamentId: 't2', playerId: 's2', score: 850000, submittedAt: 6 },
          { id: 'q7', tournamentId: 't2', playerId: 's3', score: 800000, submittedAt: 7 },
          { id: 'q8', tournamentId: 't2', playerId: 's4', score: 750000, submittedAt: 8 },
          { id: 'q9', tournamentId: 't2', playerId: 'dnq1', score: 700000, submittedAt: 9 },
          { id: 'q10', tournamentId: 't2', playerId: 'dnq2', score: 650000, submittedAt: 10 },
          { id: 'q11', tournamentId: 't2', playerId: 'dq1', score: 1200000, submittedAt: 11 },
        ],
        matchScores,
        isLocked: true,
      };

      const standings = calculateGlobalStandings(tournament);

      // Total standings should be 11 players
      expect(standings).toHaveLength(11);

      // Gold Tier: ranks 1 - 4
      expect(standings[0].finalRank).toBe(1);
      expect(standings[0].player.name).toBe('Gold 1');
      expect(standings[0].tier?.id).toBe('gold');

      expect(standings[1].finalRank).toBe(2);
      expect(standings[1].player.name).toBe('Gold 2');

      expect(standings[2].finalRank).toBe(3);
      expect(standings[3].finalRank).toBe(4);

      // Silver Tier: ranks 5 - 8 (Silver Champion begins at Gold Capacity + 1 = 5th Place)
      expect(standings[4].finalRank).toBe(5);
      expect(standings[4].player.name).toBe('Silver 1');
      expect(standings[4].tier?.id).toBe('silver');
      expect(standings[4].rankLabel).toBe('5th Place (Tier Champion)');

      expect(standings[5].finalRank).toBe(6);
      expect(standings[5].player.name).toBe('Silver 2');

      expect(standings[6].finalRank).toBe(7);
      expect(standings[7].finalRank).toBe(8);

      // DNQ Players: ranks 9 & 10
      expect(standings[8].finalRank).toBe(9);
      expect(standings[8].player.name).toBe('DNQ Player 1');
      expect(standings[8].isDNQ).toBe(true);

      expect(standings[9].finalRank).toBe(10);
      expect(standings[9].player.name).toBe('DNQ Player 2');
      expect(standings[9].isDNQ).toBe(true);

      // Disqualified Player: at bottom
      expect(standings[10].finalRank).toBe('DQ');
      expect(standings[10].player.name).toBe('Cheater DQ');
      expect(standings[10].isDisqualified).toBe(true);
    });

    it('correctly calculates qualRank and rankDelta', () => {
      const players: PlayerProfile[] = [
        makePlayer('p1', 'Alpha'),
        makePlayer('p2', 'Beta'),
        makePlayer('p3', 'Gamma'),
        makePlayer('p4', 'Delta'),
      ];

      // Alpha qualified 4th (lowest seed), but wins tournament (1st)!
      // Delta qualified 1st, but gets eliminated in round 1 (4th)!
      const seeded = [
        { id: 'p4', name: 'Delta', seed: 1 },
        { id: 'p2', name: 'Beta', seed: 2 },
        { id: 'p3', name: 'Gamma', seed: 3 },
        { id: 'p1', name: 'Alpha', seed: 4 },
      ];

      let bracket = generateTraditionalBracket(seeded, { tierId: 'gold', bestOf: 3 });

      // Round 1: Delta (1) vs Alpha (4) -> Alpha wins
      const m1Id = bracket.rounds[0].matches[0].id;
      bracket = advanceMatchWinner(bracket, m1Id, 'p1');

      // Round 1: Gamma (3) vs Beta (2) -> Beta wins
      const m2Id = bracket.rounds[0].matches[1].id;
      bracket = advanceMatchWinner(bracket, m2Id, 'p2');

      // Finals: Alpha vs Beta -> Alpha wins
      const finalsId = bracket.rounds[1].matches[0].id;
      bracket = advanceMatchWinner(bracket, finalsId, 'p1');

      const matchScores: Record<string, MatchScoreRecord> = {
        [m1Id]: {
          matchId: m1Id,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 0,
          player2Wins: 2,
          games: [],
          winnerPlayerId: 'p1',
          loserPlayerId: 'p4',
          isComplete: true,
        },
        [m2Id]: {
          matchId: m2Id,
          tierId: 'gold',
          bestOf: 3,
          player1Wins: 1, // Gamma got 1 win
          player2Wins: 2,
          games: [],
          winnerPlayerId: 'p2',
          loserPlayerId: 'p3',
          isComplete: true,
        },
        [finalsId]: {
          matchId: finalsId,
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

      const tournament: Tournament = {
        id: 't1',
        slug: 't1',
        name: 'Cinderella Tournament',
        date: '2026-09-10',
        location: 'Online',
        tournamentPlayers: {},
        qualFormat: 'HIGH_SCORE',
        tiers: [
          {
            id: 'gold',
            slug: 'gold',
            name: 'Gold Bracket',
            priority: 1,
            bracketType: 'TRADITIONAL',
            playerCount: 4,
            bestOf: 3,
            bracket,
            isLocked: true,
          },
        ],
        playersPool: players,
        qualifierSubmissions: [
          { id: 'q4', tournamentId: 't1', playerId: 'p4', score: 1100000, submittedAt: 1 }, // Delta: rank 1
          { id: 'q2', tournamentId: 't1', playerId: 'p2', score: 1000000, submittedAt: 2 }, // Beta: rank 2
          { id: 'q3', tournamentId: 't1', playerId: 'p3', score: 900000, submittedAt: 3 },  // Gamma: rank 3
          { id: 'q1', tournamentId: 't1', playerId: 'p1', score: 800000, submittedAt: 4 },  // Alpha: rank 4
        ],
        matchScores,
        isLocked: true,
      };

      const standings = calculateGlobalStandings(tournament);

      // Alpha: qualified 4th, finished 1st -> delta = 4 - 1 = +3
      const alpha = standings.find(s => s.player.id === 'p1');
      expect(alpha?.finalRank).toBe(1);
      expect(alpha?.qualRank).toBe(4);
      expect(alpha?.rankDelta).toBe(3);

      // Delta: qualified 1st, finished 4th -> delta = 1 - 4 = -3
      const delta = standings.find(s => s.player.id === 'p4');
      expect(delta?.finalRank).toBe(4);
      expect(delta?.qualRank).toBe(1);
      expect(delta?.rankDelta).toBe(-3);

      // Beta: qualified 2nd, finished 2nd -> delta = 2 - 2 = 0
      const beta = standings.find(s => s.player.id === 'p2');
      expect(beta?.finalRank).toBe(2);
      expect(beta?.qualRank).toBe(2);
      expect(beta?.rankDelta).toBe(0);
    });

    it('retains country and playstyle metadata for bracket players and non-bracket qualifiers in standings', () => {
      const pool: PlayerProfile[] = [
        makePlayer('p1', 'Alpha', { country: 'US', playstyle: 'Rolling' }),
        makePlayer('p2', 'Beta', { country: 'JP', playstyle: 'Hypertap' }),
        makePlayer('p3', 'Gamma', { country: 'DE', playstyle: 'DAS' }),
        makePlayer('p4', 'Delta', { country: 'CA', playstyle: 'Hypertap' }),
        makePlayer('p5', 'Epsilon', { country: 'FR', playstyle: 'DAS' }), // did not qualify for bracket
      ];

      const bracketPlayers = [
        { id: 'p1', name: 'Alpha', seed: 1 },
        { id: 'p2', name: 'Beta', seed: 2 },
        { id: 'p3', name: 'Gamma', seed: 3 },
        { id: 'p4', name: 'Delta', seed: 4 },
      ];

      let bracket = generateTraditionalBracket(bracketPlayers, { tierId: 'gold', bestOf: 3 });
      const m1Id = bracket.rounds[0].matches[0].id;
      bracket = advanceMatchWinner(bracket, m1Id, 'p1');
      const m2Id = bracket.rounds[0].matches[1].id;
      bracket = advanceMatchWinner(bracket, m2Id, 'p2');
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
          player1Wins: 2,
          player2Wins: 0,
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
          player2Wins: 0,
          games: [],
          winnerPlayerId: 'p1',
          loserPlayerId: 'p2',
          isComplete: true,
        },
      };

      const tournament: Tournament = {
        id: 't-chips',
        name: 'Chip Test Tournament',
        slug: 'chip-test',
        date: '2026-09-10',
        location: 'Online',
        tournamentPlayers: {},
        qualFormat: 'HIGH_SCORE',
        tiers: [
          {
            id: 'gold',
            slug: 'gold',
            name: 'Gold Championship',
            priority: 1,
            bracketType: 'TRADITIONAL',
            playerCount: 4,
            bestOf: 3,
            bracket,
            isLocked: true,
          },
        ],
        playersPool: pool,
        qualifierSubmissions: [
          { id: 'q1', tournamentId: 't-chips', playerId: 'p1', score: 1000, submittedAt: 1 },
          { id: 'q2', tournamentId: 't-chips', playerId: 'p2', score: 900, submittedAt: 2 },
          { id: 'q3', tournamentId: 't-chips', playerId: 'p3', score: 800, submittedAt: 3 },
          { id: 'q4', tournamentId: 't-chips', playerId: 'p4', score: 700, submittedAt: 4 },
          { id: 'q5', tournamentId: 't-chips', playerId: 'p5', score: 600, submittedAt: 5 },
        ],
        matchScores,
        isLocked: true,
      };

      const standings = calculateGlobalStandings(tournament);

      // Verify champion p1
      const alpha = standings.find(s => s.player.id === 'p1');
      expect(alpha?.player.country).toBe('US');
      expect(alpha?.player.playstyle).toBe('Rolling');

      // Verify runner-up p2
      const beta = standings.find(s => s.player.id === 'p2');
      expect(beta?.player.country).toBe('JP');
      expect(beta?.player.playstyle).toBe('Hypertap');

      // Verify eliminated bracket player p4
      const delta = standings.find(s => s.player.id === 'p4');
      expect(delta?.player.country).toBe('CA');
      expect(delta?.player.playstyle).toBe('Hypertap');

      // Verify non-bracket player p5
      const epsilon = standings.find(s => s.player.id === 'p5');
      expect(epsilon?.player.country).toBe('FR');
      expect(epsilon?.player.playstyle).toBe('DAS');
    });
  });
});

