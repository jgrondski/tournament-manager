import { describe, it, expect } from 'vitest';
import {
  generateRealisticPlayers,
  generateSimulatedQualifiers,
  runFullSimulation,
  REALISTIC_PLAYER_NAMES,
} from '../simulation';
import { Tournament, TournamentTier, PlayerProfile } from '../types';
import { generateTraditionalBracket, generateFlatBracket } from '../../bracket/math';

describe('Simulation Engine', () => {
  describe('generateRealisticPlayers', () => {
    it('generates requested count of unique competitors', () => {
      const count = 20;
      const players = generateRealisticPlayers(count);

      expect(players).toHaveLength(count);

      // Check uniqueness of names
      const names = new Set(players.map(p => p.name.toLowerCase()));
      expect(names.size).toBe(count);

      // Check fields
      players.forEach(p => {
        expect(p.id).toBeDefined();
        expect(p.name).toBeTruthy();
        expect(['Rolling', 'DAS', 'Hypertap']).toContain(p.playstyle);
        expect(p.country).toBeTruthy();
        expect(p.personalBest).toBeGreaterThanOrEqual(700000);
        expect(p.personalBest).toBeLessThanOrEqual(1350000);
      });
    });

    it('preserves existing player pool and appends new unique competitors', () => {
      const existing = [
        {
          id: 'p_custom_1',
          name: REALISTIC_PLAYER_NAMES[0], // e.g. 'Blue Scuti'
          personalBest: 1200000,
          playstyle: 'Rolling' as const,
          country: 'US',
        },
      ];

      const players = generateRealisticPlayers(5, existing);
      expect(players).toHaveLength(5);
      expect(players[0].id).toBe('p_custom_1');

      const names = new Set(players.map(p => p.name.toLowerCase()));
      expect(names.size).toBe(5);
    });
  });

  describe('generateSimulatedQualifiers', () => {
    const sampleTiers: TournamentTier[] = [
      {
        id: 'tier-gold',
        slug: 'gold',
        name: 'Gold Tier',
        priority: 1,
        bracketType: 'TRADITIONAL',
        playerCount: 8,
        bestOf: 5,
        primaryColor: '#eab308',
        secondaryColor: '#ca8a04',
        isLocked: false,
        bracket: generateTraditionalBracket(
          Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `Seed ${i + 1}`, seed: i + 1 })),
          { tierId: 'tier-gold', bestOf: 5 }
        ),
      },
    ];

    const mockTournament: Tournament = {
      id: 'tourney-test',
      slug: 'test-tourney',
      name: 'Test Tournament',
      date: '2026-09-10',
      location: 'Online',
      qualFormat: 'AVERAGE_OF_X',
      qualAverageCount: 2,
      tiers: sampleTiers,
      playersPool: [],
      qualifierSubmissions: [],
      tournamentPlayers: {},
      matchScores: {},
      isLocked: false,
    };

    it('generates capacity + 1d6 competitors with correct attempt count', () => {
      const { players, submissions } = generateSimulatedQualifiers(mockTournament);

      // Capacity is 8, 1d6 adds 1..6, so total should be between 9 and 14
      expect(players.length).toBeGreaterThanOrEqual(9);
      expect(players.length).toBeLessThanOrEqual(14);

      // AVERAGE_OF_X with count 2 should generate 2 submissions per competitor
      expect(submissions).toHaveLength(players.length * 2);

      submissions.forEach(sub => {
        expect(sub.tournamentId).toBe('tourney-test');
        expect(sub.score).toBeGreaterThan(0);
        expect(sub.submittedAt).toBeGreaterThan(0);
      });
    });

    it('pulls from global player pool if populated and preserves existing tournament players', () => {
      const existingPlayer: PlayerProfile = {
        id: 'p_existing_1',
        name: 'Existing Champion',
        personalBest: 1250000,
        playstyle: 'Rolling',
      };

      const globalPool: PlayerProfile[] = [
        { id: 'p_glob_1', name: 'Global Star A', personalBest: 1100000, playstyle: 'DAS' },
        { id: 'p_glob_2', name: 'Global Star B', personalBest: 1150000, playstyle: 'Rolling' },
        { id: 'p_glob_3', name: 'Global Star C', personalBest: 950000, playstyle: 'Hypertap' },
      ];

      const tourneyWithPlayer: Tournament = {
        ...mockTournament,
        playersPool: [existingPlayer],
      };

      const { players } = generateSimulatedQualifiers(tourneyWithPlayer, globalPool);

      // Existing player MUST still be present
      expect(players.some(p => p.id === 'p_existing_1')).toBe(true);

      // Global players should be pulled in
      const globalIds = new Set(globalPool.map(g => g.id));
      const pulledGlobal = players.filter(p => globalIds.has(p.id));
      expect(pulledGlobal.length).toBe(3);

      // Total count should still be capacity (8) + 1d6 (1..6)
      expect(players.length).toBeGreaterThanOrEqual(9);
      expect(players.length).toBeLessThanOrEqual(14);
    });

    it('handles HIGH_SCORE mode with 3 attempts per player', () => {
      const highScoreTourney: Tournament = {
        ...mockTournament,
        qualFormat: 'HIGH_SCORE',
      };

      const { players, submissions } = generateSimulatedQualifiers(highScoreTourney);
      expect(players.length).toBeGreaterThanOrEqual(9);
      expect(players.length).toBeLessThanOrEqual(14);
      expect(submissions).toHaveLength(players.length * 3); // 3 attempts per player
    });
  });

  describe('runFullSimulation', () => {
    it('seeds qualifiers, locks brackets, and simulates all rounds to completion', () => {
      const goldTier: TournamentTier = {
        id: 'tier-gold',
        slug: 'gold',
        name: 'Gold Tier',
        priority: 1,
        bracketType: 'TRADITIONAL',
        playerCount: 8,
        bestOf: 5,
        primaryColor: '#eab308',
        secondaryColor: '#ca8a04',
        isLocked: false,
        bracket: generateTraditionalBracket(
          Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `Seed ${i + 1}`, seed: i + 1 })),
          { tierId: 'tier-gold', bestOf: 5 }
        ),
      };

      const silverTier: TournamentTier = {
        id: 'tier-silver',
        slug: 'silver',
        name: 'Silver Tier',
        priority: 2,
        bracketType: 'FLAT',
        playerCount: 8,
        flatWidth: 4,
        bestOf: 3,
        primaryColor: '#94a3b8',
        secondaryColor: '#64748b',
        isLocked: false,
        bracket: generateFlatBracket(
          Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 9}`, name: `Seed ${i + 1}`, seed: i + 1 })),
          4,
          { tierId: 'tier-silver', bestOf: 3 }
        ),
      };

      const cleanTourney: Tournament = {
        id: 'tourney-sim',
        slug: 'sim-tourney',
        name: 'Simulation Open',
        date: '2026-09-10',
        location: 'Virtual',
        qualFormat: 'AVERAGE_OF_X',
        qualAverageCount: 2,
        tiers: [goldTier, silverTier],
        playersPool: [],
        qualifierSubmissions: [],
        tournamentPlayers: {},
        matchScores: {},
        isLocked: false,
      };

      const simulated = runFullSimulation(cleanTourney);

      // 1. Should have seeded players (16 capacity + 1d6 >= 17 players)
      expect(simulated.playersPool.length).toBeGreaterThanOrEqual(17);
      expect(simulated.qualifierSubmissions.length).toBeGreaterThanOrEqual(34);

      // 2. Tournament and all tiers should be locked
      expect(simulated.isLocked).toBe(true);
      simulated.tiers.forEach(t => {
        expect(t.isLocked).toBe(true);
      });

      // 3. Match scores should be recorded and complete
      const matchScoreValues = Object.values(simulated.matchScores);
      expect(matchScoreValues.length).toBeGreaterThan(0);

      matchScoreValues.forEach(m => {
        expect(m.isComplete).toBe(true);
        expect(m.winnerPlayerId).toBeTruthy();
        expect(m.loserPlayerId).toBeTruthy();
        expect(m.games.length).toBeGreaterThan(0);
      });

      // 4. Gold tier final match should have a winner
      const gold = simulated.tiers.find(t => t.slug === 'gold')!;
      const lastGoldRound = gold.bracket.rounds[gold.bracket.rounds.length - 1];
      const championshipMatch = lastGoldRound.matches[0];
      const champScore = simulated.matchScores[championshipMatch.id];
      expect(champScore).toBeDefined();
      expect(champScore.isComplete).toBe(true);
      expect(championshipMatch.winnerId).toBe(champScore.winnerPlayerId);
    });

    it('simulates matches from already-seeded qualifiers without regenerating submissions', () => {
      const tier: TournamentTier = {
        id: 'tier-gold',
        slug: 'gold',
        name: 'Gold Tier',
        priority: 1,
        bracketType: 'TRADITIONAL',
        playerCount: 8,
        bestOf: 3,
        primaryColor: '#eab308',
        secondaryColor: '#ca8a04',
        isLocked: false,
        bracket: generateTraditionalBracket(
          Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `Seed ${i + 1}`, seed: i + 1 })),
          { tierId: 'tier-gold', bestOf: 3 }
        ),
      };

      const baseTourney: Tournament = {
        id: 'tourney-seeded',
        slug: 'seeded-tourney',
        name: 'Seeded Tourney',
        date: '2026-09-10',
        location: 'Virtual',
        qualFormat: 'AVERAGE_OF_X',
        qualAverageCount: 2,
        tiers: [tier],
        playersPool: [],
        qualifierSubmissions: [],
        tournamentPlayers: {},
        matchScores: {},
        isLocked: false,
      };

      // Step 1: Seed qualifiers only
      const { players, submissions } = generateSimulatedQualifiers(baseTourney);
      const seededTourney: Tournament = {
        ...baseTourney,
        playersPool: players,
        qualifierSubmissions: submissions,
      };

      const initialSubIds = submissions.map(s => s.id);

      // Step 2: Run simulation on the already-seeded tournament
      const finishedTourney = runFullSimulation(seededTourney);

      // Verify that existing submissions were preserved, NOT replaced
      expect(finishedTourney.qualifierSubmissions.map(s => s.id)).toEqual(initialSubIds);
      expect(finishedTourney.isLocked).toBe(true);
      expect(Object.keys(finishedTourney.matchScores).length).toBeGreaterThan(0);
    });
  });
});
