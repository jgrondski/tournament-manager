import { describe, it, expect } from 'vitest';
import { colorWithAlpha } from '../colorUtils';

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
