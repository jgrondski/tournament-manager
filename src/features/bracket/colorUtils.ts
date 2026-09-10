/**
 * Utility to generate RGBA color strings with custom alpha transparency
 * from hex color codes (e.g. #3b82f6 or #f59e0b), with a safe fallback.
 */
export function colorWithAlpha(
  colorStr: string | undefined,
  alpha: number,
  fallback: string = 'rgba(245, 158, 11, 0.2)'
): string {
  if (!colorStr) return fallback;
  if (colorStr.startsWith('#')) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return colorStr;
}
