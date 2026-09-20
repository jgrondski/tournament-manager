import { describe, it, expect } from 'vitest';
import { colorWithAlpha, getAlternateShade, getTextScale, getDefaultTierColors } from '../colorUtils';

describe('colorWithAlpha', () => {
  it('correctly converts 6-digit hex to rgba string with custom alpha', () => {
    expect(colorWithAlpha('#3b82f6', 0.5)).toBe('rgba(59, 130, 246, 0.5)');
    expect(colorWithAlpha('#f59e0b', 0.2)).toBe('rgba(245, 158, 11, 0.2)');
  });

  it('correctly expands 3-digit hex to 6-digit and converts to rgba', () => {
    expect(colorWithAlpha('#fff', 0.1)).toBe('rgba(255, 255, 255, 0.1)');
    expect(colorWithAlpha('#000', 0.8)).toBe('rgba(0, 0, 0, 0.8)');
  });

  it('falls back to default fallback when input is undefined or empty', () => {
    expect(colorWithAlpha(undefined, 0.5)).toBe('rgba(245, 158, 11, 0.2)');
    expect(colorWithAlpha('', 0.5, 'fallback-color')).toBe('fallback-color');
  });

  it('returns raw string if not starting with hex hash', () => {
    expect(colorWithAlpha('rgb(10, 20, 30)', 0.5)).toBe('rgb(10, 20, 30)');
  });
});

describe('getAlternateShade', () => {
  it('shifts dark colors lighter for zebra striping', () => {
    const baseDark = '#0e1420';
    const altDark = getAlternateShade(baseDark, 7);
    expect(altDark).not.toBe(baseDark);
    expect(altDark.startsWith('#')).toBe(true);
    // Should be brighter
    const baseR = parseInt(baseDark.slice(1, 3), 16);
    const altR = parseInt(altDark.slice(1, 3), 16);
    expect(altR).toBeGreaterThan(baseR);
  });

  it('shifts bright colors darker', () => {
    const baseBright = '#ffffff';
    const altBright = getAlternateShade(baseBright, 7);
    expect(altBright).not.toBe(baseBright);
    const altR = parseInt(altBright.slice(1, 3), 16);
    expect(altR).toBeLessThan(255);
  });

  it('handles fallbacks gracefully', () => {
    expect(getAlternateShade(undefined)).toBe('#182232');
    expect(getAlternateShade('invalid')).toBe('#182232');
  });
});

describe('getTextScale', () => {
  it('returns 1.0 for default/undefined/normal', () => {
    expect(getTextScale(undefined)).toBe(1.0);
    expect(getTextScale('normal')).toBe(1.0);
    expect(getTextScale('standard')).toBe(1.0);
  });

  it('returns correct scale factors for presets', () => {
    expect(getTextScale('small')).toBe(0.88);
    expect(getTextScale('compact')).toBe(0.88);
    expect(getTextScale('medium')).toBe(1.1);
    expect(getTextScale('large')).toBe(1.2);
    expect(getTextScale('xlarge')).toBe(1.3);
  });

  it('handles numeric scale values', () => {
    expect(getTextScale(100)).toBe(1.0);
    expect(getTextScale(120)).toBe(1.2);
    expect(getTextScale(1.15)).toBe(1.15);
  });
});

describe('getDefaultTierColors', () => {
  it('returns exact gold defaults for gold tier by id, slug, or priority', () => {
    const byId = getDefaultTierColors({ id: 'gold' });
    const bySlug = getDefaultTierColors({ slug: 'gold' });
    const byPriority = getDefaultTierColors({ priority: 1 });

    expect(byId.primaryColor).toBe('#ffc905');
    expect(byId.secondaryColor).toBe('#705b33');
    expect(byId.cardColor).toBe('#1b1c1d');
    expect(byId.textColor).toBe('#94A3B8');
    expect(byId.backgroundColor).toBe('#020203');

    expect(bySlug).toEqual(byId);
    expect(byPriority).toEqual(byId);
  });

  it('returns exact silver defaults for silver tier by id, slug, or priority', () => {
    const byId = getDefaultTierColors({ id: 'silver' });
    const bySlug = getDefaultTierColors({ slug: 'silver' });
    const byPriority = getDefaultTierColors({ priority: 2 });

    expect(byId.primaryColor).toBe('#CBD5E1');
    expect(byId.secondaryColor).toBe('#3d4652');
    expect(byId.cardColor).toBe('#0E1420');
    expect(byId.textColor).toBe('#4f5c6d');
    expect(byId.backgroundColor).toBe('#0B0E14');

    expect(bySlug).toEqual(byId);
    expect(byPriority).toEqual(byId);
  });

  it('returns exact bronze defaults for bronze tier by id, slug, or priority', () => {
    const byId = getDefaultTierColors({ id: 'bronze' });
    const bySlug = getDefaultTierColors({ slug: 'bronze' });
    const byPriority = getDefaultTierColors({ priority: 3 });

    expect(byId.primaryColor).toBe('#db5f00');
    expect(byId.secondaryColor).toBe('#4e310e');
    expect(byId.cardColor).toBe('#181410');
    expect(byId.textColor).toBe('#5e6f87');
    expect(byId.backgroundColor).toBe('#0B0E14');

    expect(bySlug).toEqual(byId);
    expect(byPriority).toEqual(byId);
  });

  it('returns fallback defaults for unknown tier', () => {
    const generic = getDefaultTierColors({ id: 'custom_tier', slug: 'custom', priority: 99 });
    expect(generic.primaryColor).toBe('#eab308');
    expect(generic.secondaryColor).toBe('#ca8a04');
    expect(generic.cardColor).toBe('#161922');
    expect(generic.textColor).toBe('#94A3B8');
    expect(generic.backgroundColor).toBe('#0B0E14');
  });
});

