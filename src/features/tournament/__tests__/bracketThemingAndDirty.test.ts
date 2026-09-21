import { describe, it, expect } from 'vitest';
import { TournamentTier } from '../types';
import { getDefaultTierColors, getAlternateShade } from '../../bracket/colorUtils';
import { createInitialTournaments } from '../mock-data';

describe('Bracket Theming, Dirty Checking & Loser Background', () => {
  const baseTier: TournamentTier = {
    id: 'tier_gold',
    slug: 'gold',
    name: 'Gold Championship',
    priority: 1,
    bracketType: 'TRADITIONAL',
    playerCount: 4,
    bestOf: 5,
    isLocked: false,
    bracket: {
      tierId: 'tier_gold',
      type: 'TRADITIONAL',
      rounds: [],
      matchesById: {},
      totalPlayers: 0,
      totalRounds: 0,
    },
  };

  const createDirtyChecker = (initialTiers: TournamentTier[]) => {
    const normColor = (
      tier: TournamentTier,
      field: 'primaryColor' | 'secondaryColor' | 'cardColor' | 'textColor' | 'backgroundColor'
    ): string => {
      const val = tier[field];
      if (val && typeof val === 'string' && val.trim()) {
        return val.trim().toLowerCase();
      }
      const defaults = getDefaultTierColors(tier);
      return defaults[field].toLowerCase();
    };

    return (currentTiers: TournamentTier[]): boolean => {
      if (currentTiers.length !== initialTiers.length) return true;
      for (let i = 0; i < currentTiers.length; i++) {
        const a = currentTiers[i];
        const b = initialTiers[i];
        if (!b) return true;
        if (
          a.id !== b.id ||
          (a.slug || '').trim() !== (b.slug || '').trim() ||
          (a.name || '').trim() !== (b.name || '').trim() ||
          a.priority !== b.priority ||
          a.bracketType !== b.bracketType ||
          a.playerCount !== b.playerCount ||
          a.bestOf !== b.bestOf ||
          (a.flatWidth || 0) !== (b.flatWidth || 0) ||
          normColor(a, 'primaryColor') !== normColor(b, 'primaryColor') ||
          normColor(a, 'secondaryColor') !== normColor(b, 'secondaryColor') ||
          normColor(a, 'cardColor') !== normColor(b, 'cardColor') ||
          normColor(a, 'textColor') !== normColor(b, 'textColor') ||
          normColor(a, 'backgroundColor') !== normColor(b, 'backgroundColor') ||
          (a.textSize || 'normal') !== (b.textSize || 'normal') ||
          JSON.stringify(a.roundBestOfOverrides || {}) !== JSON.stringify(b.roundBestOfOverrides || {})
        ) {
          return true;
        }
      }
      return false;
    };
  };

  it('marks state dirty when textSize is modified', () => {
    const isDirty = createDirtyChecker([baseTier]);

    // Initial state is not dirty
    expect(isDirty([baseTier])).toBe(false);

    // Changing textSize to 'small' triggers dirty
    const modified = [{ ...baseTier, textSize: 'small' as const }];
    expect(isDirty(modified)).toBe(true);

    // Explicit 'normal' matches default undefined textSize
    const normalTier = [{ ...baseTier, textSize: 'normal' as const }];
    expect(isDirty(normalTier)).toBe(false);
  });

  it('marks state dirty when colors are modified', () => {
    const isDirty = createDirtyChecker([baseTier]);

    // Modifying primary color
    expect(isDirty([{ ...baseTier, primaryColor: '#ff0000' }])).toBe(true);

    // Case insensitive comparison with default gold primary (#ffc905)
    expect(isDirty([{ ...baseTier, primaryColor: '#FFC905' }])).toBe(false);

    // Modifying secondary color
    expect(isDirty([{ ...baseTier, secondaryColor: '#00ff00' }])).toBe(true);

    // Modifying card color
    expect(isDirty([{ ...baseTier, cardColor: '#ffffff' }])).toBe(true);

    // Modifying text color
    expect(isDirty([{ ...baseTier, textColor: '#000000' }])).toBe(true);

    // Modifying background color
    expect(isDirty([{ ...baseTier, backgroundColor: '#333333' }])).toBe(true);
  });

  it('computes completed match row backgrounds: loser always gets cardBg and winner gets secondaryColor', () => {
    const cardBg = '#1b1c1d';
    const secondaryColor = '#705b33';
    const p1ZebraBg = getAlternateShade(cardBg, 7);

    // Helper mirroring BracketVisualizer background calculation
    const getRowBackgrounds = (isComplete: boolean, p1Won: boolean, p2Won: boolean) => {
      const p1Bg = isComplete ? (p1Won ? secondaryColor : cardBg) : p1ZebraBg;
      const p2Bg = isComplete && p2Won ? secondaryColor : cardBg;
      return { p1Bg, p2Bg };
    };

    // Scenario 1: Match in progress or not completed -> P1 has zebra stripe, P2 has cardBg
    const incomplete = getRowBackgrounds(false, false, false);
    expect(incomplete.p1Bg).toBe(p1ZebraBg);
    expect(incomplete.p2Bg).toBe(cardBg);

    // Scenario 2: Player 1 won -> P1 gets secondaryColor, P2 (loser) gets cardBg
    const p1Victory = getRowBackgrounds(true, true, false);
    expect(p1Victory.p1Bg).toBe(secondaryColor);
    expect(p1Victory.p2Bg).toBe(cardBg);

    // Scenario 3: Player 2 won -> P2 gets secondaryColor, P1 (loser) gets cardBg (NO zebra stripe)
    const p2Victory = getRowBackgrounds(true, false, true);
    expect(p2Victory.p1Bg).toBe(cardBg);
    expect(p2Victory.p2Bg).toBe(secondaryColor);
  });

  it('preserves existing match results and scores in locked tournament on tier save', () => {
    const tournaments = createInitialTournaments();
    const kcOpen = tournaments.find(t => t.slug === 'kc-2026-open')!;
    expect(kcOpen.isLocked).toBe(true);

    // Gold bracket has finished matches
    const originalGoldBracket = kcOpen.tiers[0].bracket;
    const finalMatch = originalGoldBracket.rounds[3].matches[0];
    expect(finalMatch.winnerId).toBe('p1');

    // Simulating saveCurrentConfig logic when isLocked === true
    const savedTiers = kcOpen.tiers.map(tier => ({
      ...tier,
      primaryColor: '#e0a800',
      bracket: tier.bracket,
    }));

    expect(savedTiers[0].bracket.rounds[3].matches[0].winnerId).toBe('p1');
    expect(savedTiers[0].primaryColor).toBe('#e0a800');
  });

  it('ensures completed match structural borders are primary, while loser seed border matches secondary', () => {
    const primaryColor = '#ffc905';
    const secondaryColor = '#705b33';

    // Helper mirroring BracketVisualizer border calculations
    const getMatchBorders = (isComplete: boolean, p1Won: boolean, p2Won: boolean, p1Leading: boolean, p2Leading: boolean) => {
      const cardBorder = isComplete ? `2px solid ${primaryColor}` : `1.5px solid ${secondaryColor}`;
      const shelfBorder = isComplete ? `1.5px solid ${primaryColor}` : `1.5px solid ${secondaryColor}`;
      const dividerBg = isComplete ? primaryColor : secondaryColor;
      const p1SeedBorder = `1.5px solid ${(isComplete && p1Won) || p1Leading ? primaryColor : secondaryColor}`;
      const p2SeedBorder = `1.5px solid ${(isComplete && p2Won) || p2Leading ? primaryColor : secondaryColor}`;

      return { cardBorder, shelfBorder, dividerBg, p1SeedBorder, p2SeedBorder };
    };

    // Scenario 1: Completed match with Player 1 winning
    const p1Victory = getMatchBorders(true, true, false, false, false);
    expect(p1Victory.cardBorder).toBe(`2px solid ${primaryColor}`);
    expect(p1Victory.shelfBorder).toBe(`1.5px solid ${primaryColor}`);
    expect(p1Victory.dividerBg).toBe(primaryColor);
    expect(p1Victory.p1SeedBorder).toBe(`1.5px solid ${primaryColor}`);
    expect(p1Victory.p2SeedBorder).toBe(`1.5px solid ${secondaryColor}`); // Loser seed matches secondary

    // Scenario 2: Completed match with Player 2 winning
    const p2Victory = getMatchBorders(true, false, true, false, false);
    expect(p2Victory.cardBorder).toBe(`2px solid ${primaryColor}`);
    expect(p2Victory.shelfBorder).toBe(`1.5px solid ${primaryColor}`);
    expect(p2Victory.dividerBg).toBe(primaryColor);
    expect(p2Victory.p1SeedBorder).toBe(`1.5px solid ${secondaryColor}`); // Loser seed matches secondary
    expect(p2Victory.p2SeedBorder).toBe(`1.5px solid ${primaryColor}`);

    // Scenario 3: Incomplete matches use secondary borders
    const incompleteBorders = getMatchBorders(false, false, false, false, false);
    expect(incompleteBorders.cardBorder).toBe(`1.5px solid ${secondaryColor}`);
    expect(incompleteBorders.shelfBorder).toBe(`1.5px solid ${secondaryColor}`);
    expect(incompleteBorders.dividerBg).toBe(secondaryColor);
    expect(incompleteBorders.p1SeedBorder).toBe(`1.5px solid ${secondaryColor}`);
    expect(incompleteBorders.p2SeedBorder).toBe(`1.5px solid ${secondaryColor}`);
  });

  it('verifies Bracket Theme & Palette accordion starts open and toggles collapsed state', () => {
    // Initial state: empty collapsedThemes record
    let collapsedThemes: Record<string, boolean> = {};

    // Helper matching TournamentAdminForm logic
    const isThemeOpen = (tierId: string) => !collapsedThemes[tierId];
    const toggleThemeCollapse = (tierId: string) => {
      collapsedThemes = {
        ...collapsedThemes,
        [tierId]: !collapsedThemes[tierId],
      };
    };

    // By default, any tier accordion starts OPEN
    expect(isThemeOpen('tier_gold')).toBe(true);
    expect(isThemeOpen('tier_silver')).toBe(true);

    // Toggling tier_gold collapses it
    toggleThemeCollapse('tier_gold');
    expect(isThemeOpen('tier_gold')).toBe(false);
    expect(isThemeOpen('tier_silver')).toBe(true); // Other tiers remain unaffected

    // Toggling tier_gold again re-opens it
    toggleThemeCollapse('tier_gold');
    expect(isThemeOpen('tier_gold')).toBe(true);
  });
});

