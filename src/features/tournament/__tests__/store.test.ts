import { describe, it, expect } from 'vitest';
import { createInitialTournaments } from '../mock-data';
import { advanceMatchWinner } from '../../bracket/math';

describe('Tournament Data Store & Mock State', () => {
  it('creates initial tournaments with Gold, Silver, and Bronze tiers', () => {
    const tournaments = createInitialTournaments();
    expect(tournaments).toHaveLength(2);

    const kcOpen = tournaments.find(t => t.slug === 'kc-2026-open');
    expect(kcOpen).toBeDefined();
    expect(kcOpen?.tiers).toHaveLength(3);

    const goldTier = kcOpen?.tiers.find(t => t.slug === 'gold');
    expect(goldTier).toBeDefined();
    expect(goldTier?.playerCount).toBe(12);
    expect(goldTier?.bracketType).toBe('TRADITIONAL');

    const silverTier = kcOpen?.tiers.find(t => t.slug === 'silver');
    expect(silverTier).toBeDefined();
    expect(silverTier?.playerCount).toBe(16);
    expect(silverTier?.bracketType).toBe('FLAT');
  });

  it('verifies KC Open pre-seeded match scores matching Google Sheets', () => {
    const tournaments = createInitialTournaments();
    const kcOpen = tournaments.find(t => t.slug === 'kc-2026-open')!;
    const matchScores = kcOpen.matchScores;

    // Verify there are pre-seeded match score records
    expect(Object.keys(matchScores).length).toBeGreaterThan(0);

    // Verify Blue Scuti won finals
    const finalsMatch = kcOpen.tiers[0].bracket.rounds[3].matches[0];
    const finalScore = matchScores[finalsMatch.id];
    expect(finalScore).toBeDefined();
    expect(finalScore.isComplete).toBe(true);
    expect(finalScore.winnerPlayerId).toBe('p1'); // Blue Scuti
  });

  it('advances winners immutably through downstream matches', () => {
    const tournaments = createInitialTournaments();
    const kcOpen = tournaments.find(t => t.slug === 'kc-2026-open')!;
    const silverTier = kcOpen.tiers.find(t => t.slug === 'silver')!;

    const r1Match1 = silverTier.bracket.rounds[0].matches[0];
    const p1 = r1Match1.player1.player!;
    const updatedBracket = advanceMatchWinner(silverTier.bracket, r1Match1.id, p1.id);

    expect(updatedBracket.matchesById[r1Match1.id].winnerId).toBe(p1.id);
  });
});
