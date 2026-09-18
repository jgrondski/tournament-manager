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

/**
 * Returns high-contrast text color ('#000000' or '#ffffff')
 * based on the luminance of the provided background color.
 */
export function getContrastingTextColor(hexColor: string | undefined, fallback: string = '#000000'): string {
  if (!hexColor || !hexColor.startsWith('#')) return fallback;
  let hex = hexColor.slice(1);
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return fallback;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Standard perceptual luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Generates solid background for the tier canvas without gradients.
 */
export function getTierCanvasBackground(
  backgroundColor: string | undefined,
  _primaryColor?: string | undefined,
  fallback: string = '#0c0d12'
): string {
  if (backgroundColor && (backgroundColor.startsWith('#') || backgroundColor.startsWith('rgb'))) {
    return backgroundColor;
  }
  return fallback;
}

/**
 * Generates match card background fill from the dedicated cardColor setting.
 */
export function getTierCardBackground(
  cardColor: string | undefined,
  _primaryColor?: string | undefined,
  fallback: string = '#161922'
): string {
  if (cardColor && (cardColor.startsWith('#') || cardColor.startsWith('rgb'))) {
    return cardColor;
  }
  return fallback;
}
