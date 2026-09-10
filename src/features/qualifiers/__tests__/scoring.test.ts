import { describe, it, expect } from 'vitest';
import {
  calculateHighScore,
  calculateAverageOfX,
  calculatePoints,
  deriveLeaderboard,
  generateDraftBracketsForTournament,
} from '../scoring';
import { Tournament, QualifierSubmission, PlayerProfile, TournamentTier } from '../../tournament/types';
import { generateTraditionalBracket } from '../../bracket/math';

describe('Qualifiers Scoring Engine', () => {
  const dummySubs: QualifierSubmission[] = [
    { id: 's1', tournamentId: 't1', playerId: 'p1', score: 950000, submittedAt: 1000 },
    { id: 's2', tournamentId: 't1', playerId: 'p1', score: 1150000, submittedAt: 2000 },
    { id: 's3', tournamentId: 't1', playerId: 'p1', score: 800000, submittedAt: 3000 },
  ];

  it('calculates HIGH_SCORE correctly as MAX(score)', () => {
    expect(calculateHighScore(dummySubs)).toBe(1150000);
    expect(calculateHighScore([])).toBe(0);
  });

  describe('calculateAverageOfX', () => {
    it('calculates in-progress running mean of attempts submitted so far', () => {
      // 2 attempts submitted, target is 3
      const twoSubs = dummySubs.slice(0, 2); // 950k + 1150k = 2100k
      const res = calculateAverageOfX(twoSubs, 3, false);
      expect(res.average).toBe(1050000);
      expect(res.count).toBe(2);
    });

    it('calculates completed average with missing attempts as 0', () => {
      // 2 attempts submitted, target is 3, quals closed / complete -> (950k + 1150k + 0) / 3 = 700000
      const twoSubs = dummySubs.slice(0, 2);
      const res = calculateAverageOfX(twoSubs, 3, true);
      expect(res.average).toBe(700000);
      expect(res.count).toBe(2);
    });

    it('handles empty attempts gracefully', () => {
      const res = calculateAverageOfX([], 3, true);
      expect(res.average).toBe(0);
      expect(res.count).toBe(0);
    });
  });

  describe('calculatePoints', () => {
    const pointsConfig = [
      { minScore: 1200000, points: 100 },
      { minScore: 1000000, points: 50 },
      { minScore: 800000, points: 20 },
    ];

    it('awards non-cumulative points for highest threshold met per attempt', () => {
      // s1: 950000 -> 20 pts
      // s2: 1150000 -> 50 pts
      // s3: 800000 -> 20 pts
      // total = 90
      const res = calculatePoints(dummySubs, pointsConfig);
      expect(res.totalPoints).toBe(90);
      expect(res.pointsPerAttempt).toEqual([20, 50, 20]);
    });

    it('awards 0 points when below lowest threshold', () => {
      const lowSub: QualifierSubmission[] = [
        { id: 's4', tournamentId: 't1', playerId: 'p1', score: 500000, submittedAt: 4000 },
      ];
      const res = calculatePoints(lowSub, pointsConfig);
      expect(res.totalPoints).toBe(0);
      expect(res.pointsPerAttempt).toEqual([0]);
    });
  });

  describe('deriveLeaderboard & Seeding', () => {
    const mockPlayers: PlayerProfile[] = [
      { id: 'p1', name: 'Alice', personalBest: 1200000, playstyle: 'Rolling' },
      { id: 'p2', name: 'Bob', personalBest: 1100000, playstyle: 'Rolling' },
      { id: 'p3', name: 'Charlie', personalBest: 1050000, playstyle: 'DAS' },
      { id: 'p4', name: 'Dave (DQ)', personalBest: 1300000, playstyle: 'Rolling', isDisqualified: true },
      { id: 'p5', name: 'Eve', personalBest: 950000, playstyle: 'DAS' },
      { id: 'p6', name: 'Frank', personalBest: 900000, playstyle: 'DAS' },
    ];

    const mockSubmissions: QualifierSubmission[] = [
      { id: 'sub1', tournamentId: 't1', playerId: 'p1', score: 1000000, submittedAt: 100 },
      { id: 'sub2', tournamentId: 't1', playerId: 'p2', score: 900000, submittedAt: 200 },
      { id: 'sub3', tournamentId: 't1', playerId: 'p3', score: 850000, submittedAt: 300 },
      { id: 'sub4', tournamentId: 't1', playerId: 'p4', score: 1200000, submittedAt: 50 }, // DQ player has high score
      { id: 'sub5', tournamentId: 't1', playerId: 'p5', score: 800000, submittedAt: 400 },
      { id: 'sub6', tournamentId: 't1', playerId: 'p6', score: 700000, submittedAt: 500 },
    ];

    const mockTiers: TournamentTier[] = [
      {
        id: 'gold',
        slug: 'gold',
        name: 'Gold',
        priority: 1,
        bracketType: 'TRADITIONAL',
        playerCount: 2, // ranks 1-2
        bestOf: 5,
        bracket: generateTraditionalBracket(
          [{ id: 'p1', name: 'Alice', seed: 1 }, { id: 'p2', name: 'Bob', seed: 2 }],
          { tierId: 'gold' }
        ),
        isLocked: false,
      },
      {
        id: 'silver',
        slug: 'silver',
        name: 'Silver',
        priority: 2,
        bracketType: 'TRADITIONAL',
        playerCount: 2, // ranks 3-4
        bestOf: 3,
        bracket: generateTraditionalBracket(
          [{ id: 'p3', name: 'Charlie', seed: 1 }, { id: 'p5', name: 'Eve', seed: 2 }],
          { tierId: 'silver' }
        ),
        isLocked: false,
      },
    ];

    const tournament: Tournament = {
      id: 't1',
      slug: 't1-slug',
      name: 'Test Tournament',
      date: '2026-03-20',
      location: 'Online',
      qualFormat: 'HIGH_SCORE',
      isLocked: false,
      tiers: mockTiers,
      matchScores: {},
      playersPool: mockPlayers,
      qualifierSubmissions: mockSubmissions,
      tournamentPlayers: {},
    };

    it('ranks eligible players by score and drops disqualified players to bottom as DQ', () => {
      const rows = deriveLeaderboard(tournament);

      // Total 6 players
      expect(rows).toHaveLength(6);

      // Rank 1 should be Alice (1,000,000)
      expect(rows[0].player.name).toBe('Alice');
      expect(rows[0].rank).toBe(1);
      expect(rows[0].assignedTier?.id).toBe('gold');
      expect(rows[0].tierSeed).toBe(1); // Gold Seed 1

      // Rank 2 should be Bob (900,000)
      expect(rows[1].player.name).toBe('Bob');
      expect(rows[1].rank).toBe(2);
      expect(rows[1].assignedTier?.id).toBe('gold');
      expect(rows[1].tierSeed).toBe(2); // Gold Seed 2

      // Rank 3 should be Charlie (850,000) -> Silver tier (cutoff ranks 3-4)
      expect(rows[2].player.name).toBe('Charlie');
      expect(rows[2].rank).toBe(3);
      expect(rows[2].assignedTier?.id).toBe('silver');
      // Tier-relative seed invariant: rank 3 - tierStartRank 3 + 1 = Seed 1
      expect(rows[2].tierSeed).toBe(1);

      // Rank 4 should be Eve (800,000) -> Silver tier
      expect(rows[3].player.name).toBe('Eve');
      expect(rows[3].rank).toBe(4);
      expect(rows[3].assignedTier?.id).toBe('silver');
      expect(rows[3].tierSeed).toBe(2); // Seed 2

      // Rank 5 should be Frank (700,000) -> DNQ (past Gold 2p + Silver 2p = 4 cutoffs)
      expect(rows[4].player.name).toBe('Frank');
      expect(rows[4].rank).toBe(5);
      expect(rows[4].assignedTier).toBeUndefined();
      expect(rows[4].tierSeed).toBeUndefined();
      expect(rows[4].isDNQ).toBe(true);

      // Last should be Dave (DQ) despite 1,200,000 score
      const dqRow = rows[5];
      expect(dqRow.player.name).toBe('Dave (DQ)');
      expect(dqRow.rank).toBe('DQ');
      expect(dqRow.isDisqualified).toBe(true);
      expect(dqRow.assignedTier).toBeUndefined();
      expect(dqRow.tierSeed).toBeUndefined();
    });

    it('breaks ties deterministically by earlier submission timestamp', () => {
      const tiedTournament: Tournament = {
        ...tournament,
        qualifierSubmissions: [
          { id: 'subA', tournamentId: 't1', playerId: 'p1', score: 1000000, submittedAt: 200 },
          { id: 'subB', tournamentId: 't1', playerId: 'p2', score: 1000000, submittedAt: 100 }, // p2 submitted earlier
        ],
      };

      const rows = deriveLeaderboard(tiedTournament);
      // p2 should be rank 1 because timestamp 100 < 200
      expect(rows[0].player.id).toBe('p2');
      expect(rows[0].rank).toBe(1);
      expect(rows[1].player.id).toBe('p1');
      expect(rows[1].rank).toBe(2);
    });

    it('dynamically generates draft brackets with tier-relative seeding', () => {
      const draftTiers = generateDraftBracketsForTournament(tournament);

      // Gold tier bracket should feature Alice (Seed 1) vs Bob (Seed 2)
      const goldBracket = draftTiers.find(t => t.id === 'gold')!.bracket;
      expect(goldBracket.rounds[0].matches[0].player1.player?.name).toBe('Alice');
      expect(goldBracket.rounds[0].matches[0].player1.player?.seed).toBe(1);
      expect(goldBracket.rounds[0].matches[0].player2.player?.name).toBe('Bob');
      expect(goldBracket.rounds[0].matches[0].player2.player?.seed).toBe(2);

      // Silver tier bracket should feature Charlie (Seed 1) vs Eve (Seed 2)
      const silverBracket = draftTiers.find(t => t.id === 'silver')!.bracket;
      expect(silverBracket.rounds[0].matches[0].player1.player?.name).toBe('Charlie');
      expect(silverBracket.rounds[0].matches[0].player1.player?.seed).toBe(1);
      expect(silverBracket.rounds[0].matches[0].player2.player?.name).toBe('Eve');
      expect(silverBracket.rounds[0].matches[0].player2.player?.seed).toBe(2);
    });
  });
});
