import { describe, it, expect } from 'vitest';
import {
  getMatchStatus,
  getAbbreviatedRoundName,
  getInheritedRoundBestOf,
  getEffectiveRoundGameCount,
  SHEET_SIZE_CONFIG,
} from '../components/OrganizerSheetMatrix';
import { BracketMatch } from '../types';
import { MatchScoreRecord, TournamentTier } from '../../tournament/types';
import { getDefaultTierColors, getAlternateShade, colorWithAlpha } from '../colorUtils';

describe('OrganizerSheetMatrix - getAbbreviatedRoundName', () => {
  it('correctly abbreviates single elimination championship rounds', () => {
    expect(getAbbreviatedRoundName('Round of 128')).toBe('R128');
    expect(getAbbreviatedRoundName('Round of 64')).toBe('R64');
    expect(getAbbreviatedRoundName('Round of 32')).toBe('R32');
    expect(getAbbreviatedRoundName('Round of 16')).toBe('R16');
    expect(getAbbreviatedRoundName('Round of 8')).toBe('QF');
    expect(getAbbreviatedRoundName('Quarterfinals')).toBe('QF');
    expect(getAbbreviatedRoundName('Round of 4')).toBe('SF');
    expect(getAbbreviatedRoundName('Semifinals')).toBe('SF');
    expect(getAbbreviatedRoundName('Finals')).toBe('F');
    expect(getAbbreviatedRoundName('Championship Finals')).toBe('F');
  });

  it('correctly abbreviates double elimination winners and losers rounds', () => {
    expect(getAbbreviatedRoundName('Winners Round 1')).toBe('WR1');
    expect(getAbbreviatedRoundName('Winners Round 2')).toBe('WR2');
    expect(getAbbreviatedRoundName('Winners Round 3')).toBe('WR3');
    expect(getAbbreviatedRoundName('Winners Quarterfinals')).toBe('WQF');
    expect(getAbbreviatedRoundName('Winners Semifinals')).toBe('WSF');
    expect(getAbbreviatedRoundName('Winners Finals')).toBe('WF');

    expect(getAbbreviatedRoundName('Losers Round 1')).toBe('LR1');
    expect(getAbbreviatedRoundName('Losers Round 2')).toBe('LR2');
    expect(getAbbreviatedRoundName('Losers Round 3')).toBe('LR3');
    expect(getAbbreviatedRoundName('Losers Quarterfinals')).toBe('LQF');
    expect(getAbbreviatedRoundName('Losers Semifinals')).toBe('LSF');
    expect(getAbbreviatedRoundName('Losers Finals')).toBe('LF');

    expect(getAbbreviatedRoundName('Grand Finals')).toBe('GF');
    expect(getAbbreviatedRoundName('Grand Finals Reset')).toBe('GFR');
  });

  it('correctly abbreviates hybrid accelerated rounds and identifiers', () => {
    expect(getAbbreviatedRoundName('Accelerated Round', 'AR')).toBe('AR');
    expect(getAbbreviatedRoundName('Upper Bracket R1', 'PRE_W1')).toBe('WR1');
    expect(getAbbreviatedRoundName('Upper Bracket R2', 'PRE_W2')).toBe('WR2');
    expect(getAbbreviatedRoundName('Lower Bracket R1', 'PRE_L1')).toBe('LR1');
    expect(getAbbreviatedRoundName('Lower Bracket R2', 'PRE_L2')).toBe('LR2');
    expect(getAbbreviatedRoundName('Lower Bracket R3', '2C')).toBe('2C');
    expect(getAbbreviatedRoundName('Lower Bracket R4', 'PO')).toBe('PO');
    expect(getAbbreviatedRoundName('Playoffs')).toBe('PO');
    expect(getAbbreviatedRoundName('Round 1')).toBe('R1');
  });
});

describe('OrganizerSheetMatrix - getMatchStatus', () => {
  const dummyMatch: BracketMatch = {
    id: 'match-1',
    roundNumber: 1,
    matchNumber: 1,
    player1: { player: { id: 'p1', name: 'Alice', seed: 1, playstyle: 'DAS' } },
    player2: { player: { id: 'p2', name: 'Bob', seed: 2, playstyle: 'Roll' } },
    bestOf: 5,
    winnerId: null,
    loserId: null,
    isBye: false,
  };

  it('returns not_started when no score record exists', () => {
    const status = getMatchStatus(dummyMatch);
    expect(status.type).toBe('not_started');
    expect(status.label).toBe('Not Started');
  });

  it('returns in_progress when partial games or wins exist below threshold', () => {
    const record: MatchScoreRecord = {
      tierId: 'tier-1',
      matchId: 'match-1',
      bestOf: 5,
      player1Wins: 1,
      player2Wins: 0,
      winnerPlayerId: null,
      loserPlayerId: null,
      games: [{ gameNumber: 1, player1Points: 500000, player2Points: 400000, winnerPlayerId: 'p1' }],
      isComplete: false,
    };
    const status = getMatchStatus(dummyMatch, record);
    expect(status.type).toBe('in_progress');
    expect(status.label).toBe('In Progress');
  });

  it('returns complete when player reaches bestOf threshold (3 of 5)', () => {
    const record: MatchScoreRecord = {
      tierId: 'tier-1',
      matchId: 'match-1',
      bestOf: 5,
      player1Wins: 3,
      player2Wins: 1,
      winnerPlayerId: 'p1',
      loserPlayerId: 'p2',
      games: [],
      isComplete: false,
    };
    const status = getMatchStatus(dummyMatch, record);
    expect(status.type).toBe('complete');
    expect(status.label).toBe('Complete');
  });

  it('returns complete when record.isComplete is true', () => {
    const record: MatchScoreRecord = {
      tierId: 'tier-1',
      matchId: 'match-1',
      bestOf: 5,
      player1Wins: 2,
      player2Wins: 1,
      winnerPlayerId: 'p1',
      loserPlayerId: 'p2',
      games: [],
      isComplete: true,
    };
    const status = getMatchStatus(dummyMatch, record);
    expect(status.type).toBe('complete');
  });

  it('returns complete when match.winnerId is explicitly set', () => {
    const wonMatch: BracketMatch = {
      ...dummyMatch,
      winnerId: 'p2',
    };
    const status = getMatchStatus(wonMatch);
    expect(status.type).toBe('complete');
  });
});

describe('OrganizerSheetMatrix - Bracket Color Theming & Compact Layout', () => {
  it('applies distinct tier themes and lowerBracketColor', () => {
    const goldTheme = getDefaultTierColors({ id: 'gold', priority: 1 });
    expect(goldTheme.primaryColor).toBe('#ffc905');
    expect(goldTheme.cardColor).toBe('#1b1c1d');
    expect(goldTheme.lowerBracketColor).toBe('#c2410c');

    const silverTheme = getDefaultTierColors({ id: 'silver', priority: 2 });
    expect(silverTheme.primaryColor).toBe('#CBD5E1');
    expect(silverTheme.cardColor).toBe('#0E1420');

    const bronzeTheme = getDefaultTierColors({ id: 'bronze', priority: 3 });
    expect(bronzeTheme.primaryColor).toBe('#db5f00');
    expect(bronzeTheme.cardColor).toBe('#181410');
  });

  it('generates consistent alternating card shades for dense master sheet rows', () => {
    const baseCard = '#161922';
    const altCard = getAlternateShade(baseCard, 5);
    expect(altCard).not.toBe(baseCard);
    expect(altCard.startsWith('#')).toBe(true);

    const hoverTint = colorWithAlpha('#ffc905', 0.10);
    expect(hoverTint).toContain('rgba');

    // Master sheet hover state uses a light theme-appropriate border using primaryColor
    const primaryColor = '#ffc905';
    const hoverBorderColor = colorWithAlpha(primaryColor, 0.75, 'var(--color-gold, #f59e0b)');
    expect(hoverBorderColor).toBe('rgba(255, 201, 5, 0.75)');
  });
});

describe('OrganizerSheetMatrix - Dynamic Round Best-Of & Game Columns', () => {
  const baseTier: TournamentTier = {
    id: 'tier-1',
    name: 'Gold Tier',
    bestOf: 3,
    roundBestOfOverrides: { 3: 5, 4: 7, GF: 9 },
  } as unknown as TournamentTier;

  const mockRound1 = {
    roundNumber: 1,
    name: 'Round of 16',
    matches: [
      { id: 'm1', roundNumber: 1, matchNumber: 1, bestOf: 3, player1: {}, player2: {}, winnerId: null, loserId: null, isBye: false },
      { id: 'm2', roundNumber: 1, matchNumber: 2, bestOf: 3, player1: {}, player2: {}, winnerId: null, loserId: null, isBye: false },
    ] as BracketMatch[],
  };

  const mockRound3 = {
    roundNumber: 3,
    name: 'Semifinals',
    matches: [
      { id: 'm5', roundNumber: 3, matchNumber: 5, bestOf: 5, player1: {}, player2: {}, winnerId: null, loserId: null, isBye: false },
    ] as BracketMatch[],
  };

  it('resolves inherited round best-of using tier default or round overrides', () => {
    // Un-overridden round 1 inherits tier default (Bo3)
    expect(getInheritedRoundBestOf(mockRound1, baseTier)).toBe(3);

    // Overridden round 3 uses round override (Bo5)
    expect(getInheritedRoundBestOf(mockRound3, baseTier)).toBe(5);

    // Overridden round with identifier (e.g. GF => Bo9)
    const gfRound = {
      roundNumber: 5,
      roundIdentifier: 'GF',
      name: 'Grand Finals',
      matches: [{ id: 'mgf', roundNumber: 5, matchNumber: 15, bestOf: 9, player1: {}, player2: {}, winnerId: null, loserId: null, isBye: false }] as BracketMatch[],
    };
    expect(getInheritedRoundBestOf(gfRound, baseTier)).toBe(9);
  });

  it('shows exactly 3 scores for Bo3 and 5 scores for Bo5 when no match overrides exist', () => {
    const resR1 = getEffectiveRoundGameCount(mockRound1, baseTier, {});
    expect(resR1.inheritedBestOf).toBe(3);
    expect(resR1.effectiveGameCount).toBe(3);

    const resR3 = getEffectiveRoundGameCount(mockRound3, baseTier, {});
    expect(resR3.inheritedBestOf).toBe(5);
    expect(resR3.effectiveGameCount).toBe(5);
  });

  it('expands all matches in a round to the largest overridden match if a match override exists', () => {
    // Round 1 is Bo3, but match m2 was overridden to Bo5 in scorekeeper drawer
    const matchScoresWithOverride: Record<string, MatchScoreRecord> = {
      m2: {
        tierId: 'tier-1',
        matchId: 'm2',
        bestOf: 5,
        player1Wins: 0,
        player2Wins: 0,
        winnerPlayerId: null,
        loserPlayerId: null,
        games: [],
        isComplete: false,
      },
    };

    const res = getEffectiveRoundGameCount(mockRound1, baseTier, matchScoresWithOverride);
    expect(res.inheritedBestOf).toBe(3);
    expect(res.effectiveGameCount).toBe(5);
  });
});

describe('OrganizerSheetMatrix - SHEET_SIZE_CONFIG', () => {
  it('provides complete configurations for xs, sm, md, and lg densities', () => {
    const densities = ['xs', 'sm', 'md', 'lg'] as const;
    for (const d of densities) {
      expect(SHEET_SIZE_CONFIG[d]).toBeDefined();
      expect(SHEET_SIZE_CONFIG[d].colMatch).toBeGreaterThan(0);
      expect(SHEET_SIZE_CONFIG[d].colGamesWon).toBeGreaterThan(0);
      expect(SHEET_SIZE_CONFIG[d].colGame).toBeGreaterThan(0);
      expect(SHEET_SIZE_CONFIG[d].colComplete).toBeGreaterThan(0);
      expect(SHEET_SIZE_CONFIG[d].fontSizePlayerName).toBeDefined();
      expect(SHEET_SIZE_CONFIG[d].thPadding).toBeDefined();
      expect(SHEET_SIZE_CONFIG[d].tdPadding).toBeDefined();
    }
  });

  it('maintains strict progressive scaling across density tiers', () => {
    const { xs, sm, md, lg } = SHEET_SIZE_CONFIG;
    // Col widths scale progressively
    expect(xs.colMatch).toBeLessThan(sm.colMatch);
    expect(sm.colMatch).toBeLessThan(md.colMatch);
    expect(md.colMatch).toBeLessThan(lg.colMatch);

    expect(xs.colGamesWon).toBeLessThan(sm.colGamesWon);
    expect(sm.colGamesWon).toBeLessThan(md.colGamesWon);
    expect(md.colGamesWon).toBeLessThan(lg.colGamesWon);

    expect(xs.colGame).toBeLessThan(sm.colGame);
    expect(sm.colGame).toBeLessThan(md.colGame);
    expect(md.colGame).toBeLessThan(lg.colGame);

    expect(xs.colComplete).toBeLessThan(sm.colComplete);
    expect(sm.colComplete).toBeLessThan(md.colComplete);
    expect(md.colComplete).toBeLessThan(lg.colComplete);
  });
});

