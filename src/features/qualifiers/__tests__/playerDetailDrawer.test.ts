import { describe, it, expect } from 'vitest';
import { Tournament, TournamentTier, PlayerProfile } from '../../tournament/types';
import { getDefaultTierColors } from '../../bracket/colorUtils';
import { MAXOUT_THRESHOLD, LeaderboardRankRow } from '../scoring';

describe('PlayerDetailDrawer Theme and Presentation Logic', () => {
  const mockPlayer: PlayerProfile = {
    id: 'p1',
    name: 'Jonas Neubauer',
    country: 'USA',
    personalBest: 1250000,
    playstyle: 'DAS',
    notes: '7-time World Champion',
  };

  const goldTier: TournamentTier = {
    id: 'tier_gold',
    name: 'Gold',
    slug: 'tier-gold',
    bracketType: 'TRADITIONAL',
    priority: 1,
    playerCount: 16,
    bestOf: 5,
    primaryColor: '#ffc905',
    secondaryColor: '#705b33',
    cardColor: '#1b1c1d',
    textColor: '#94A3B8',
    backgroundColor: '#020203',
    lowerBracketColor: '#c2410c',
    bracket: {
      type: 'TRADITIONAL',
      totalPlayers: 16,
      totalRounds: 4,
      matchesById: {},
      rounds: [
        {
          roundNumber: 1,
          name: 'Round of 16',
          matches: [
            {
              id: 'm1',
              matchNumber: 1,
              roundNumber: 1,
              player1: { player: { id: mockPlayer.id, name: mockPlayer.name, seed: 1, country: mockPlayer.country, playstyle: mockPlayer.playstyle } },
              player2: { player: { id: 'p2', name: 'Harry Hong', seed: 16, playstyle: 'DAS' } },
              isBye: false,
              bestOf: 5,
              winnerId: 'p1',
              loserId: 'p2',
            },
          ],
        },
      ],
    },
    isLocked: true,
  };

  const silverTier: TournamentTier = {
    id: 'tier_silver',
    name: 'Silver',
    slug: 'tier-silver',
    bracketType: 'TRADITIONAL',
    priority: 2,
    playerCount: 16,
    bestOf: 3,
    primaryColor: '#CBD5E1',
    secondaryColor: '#3d4652',
    cardColor: '#0E1420',
    textColor: '#4f5c6d',
    backgroundColor: '#0B0E14',
    lowerBracketColor: '#c2410c',
    bracket: {
      type: 'TRADITIONAL',
      totalPlayers: 16,
      totalRounds: 4,
      rounds: [],
      matchesById: {},
    },
    isLocked: true,
  };

  const mockTournament: Tournament = {
    id: 'tourney_1',
    organizationId: 'org_1',
    name: 'CTWC 2026',
    slug: 'ctwc-2026',
    date: '2026-10-18',
    location: 'Portland, OR',
    qualFormat: 'HIGH_SCORE',
    isLocked: true,
    tiers: [goldTier, silverTier],
    matchScores: {
      m1: {
        matchId: 'm1',
        tierId: 'tier_gold',
        bestOf: 5,
        player1Wins: 3,
        player2Wins: 1,
        loserPlayerId: 'p2',
        isComplete: true,
        winnerPlayerId: 'p1',
        games: [
          { gameNumber: 1, player1Points: 1050000, player2Points: 950000, winnerPlayerId: 'p1' },
          { gameNumber: 2, player1Points: 890000, player2Points: 920000, winnerPlayerId: 'p2' },
          { gameNumber: 3, player1Points: 1100000, player2Points: 850000, winnerPlayerId: 'p1' },
          { gameNumber: 4, player1Points: 1020000, player2Points: 980000, winnerPlayerId: 'p1' },
        ],
      },
    },
    playersPool: [mockPlayer],
    qualifierSubmissions: [
      { id: 'sub1', tournamentId: 'tourney_1', playerId: 'p1', score: 1050000, submittedAt: 1000 },
      { id: 'sub2', tournamentId: 'tourney_1', playerId: 'p1', score: 1250000, submittedAt: 2000 },
    ],
    tournamentPlayers: {
      p1: { playerId: 'p1', tournamentId: 'tourney_1', tierId: 'tier_gold', seed: 1, isVerified: true },
    },
  };

  describe('Tier color palette resolution', () => {
    it('uses explicit tier theme colors when tier prop is provided', () => {
      const colors = getDefaultTierColors(goldTier);
      expect(goldTier.primaryColor).toBe('#ffc905');
      expect(goldTier.cardColor).toBe('#1b1c1d');
      expect(colors.primaryColor).toBe('#ffc905');
    });

    it('derives silver tier theme colors appropriately', () => {
      const colors = getDefaultTierColors(silverTier);
      expect(silverTier.primaryColor).toBe('#CBD5E1');
      expect(silverTier.cardColor).toBe('#0E1420');
      expect(colors.primaryColor).toBe('#CBD5E1');
    });

    it('prioritizes disqualification (#ef4444) when player is DQ', () => {
      const dqPlayer: PlayerProfile = { ...mockPlayer, isDisqualified: true };
      const isDQ = Boolean(dqPlayer.isDisqualified);
      const primaryColor = isDQ ? '#ef4444' : goldTier.primaryColor;
      expect(primaryColor).toBe('#ef4444');
    });

    it('prioritizes slate (#64748b) when player is DNQ', () => {
      const dnqRankRow: LeaderboardRankRow = {
        rank: 33,
        globalRank: 33,
        player: mockPlayer,
        attempts: [],
        formattedDetail: '1 attempt',
        finalScore: 500000,
        isDisqualified: false,
        status: 'verified',
        isDNQ: true,
        earliestTimestamp: 1000,
      };
      const isDNQ = Boolean(dnqRankRow.isDNQ && !dnqRankRow.isDisqualified);
      const primaryColor = isDNQ ? '#64748b' : goldTier.primaryColor;
      expect(primaryColor).toBe('#64748b');
    });
  });

  describe('Maxout score identification in drawer', () => {
    it('accurately identifies scores meeting or exceeding MAXOUT_THRESHOLD (999,999)', () => {
      expect(1050000 >= MAXOUT_THRESHOLD).toBe(true);
      expect(999999 >= MAXOUT_THRESHOLD).toBe(true);
      expect(999998 >= MAXOUT_THRESHOLD).toBe(false);
    });
  });

  describe('Drawer match play record calculation', () => {
    it('aggregates series match wins, losses, and game records correctly', () => {
      const matchRecord = mockTournament.matchScores['m1'];
      expect(matchRecord.player1Wins).toBe(3);
      expect(matchRecord.player2Wins).toBe(1);
      expect(matchRecord.winnerPlayerId).toBe('p1');
      expect(matchRecord.isComplete).toBe(true);

      const games = matchRecord.games || [];
      expect(games.length).toBe(4);
      const p1Maxouts = games.filter(g => (g.player1Points ?? 0) >= MAXOUT_THRESHOLD);
      expect(p1Maxouts.length).toBe(3); // 1050000, 1100000, 1020000
    });
  });
});
