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

/**
 * Generates an alternating row background shade (e.g. for zebra striping)
 * from a base hex color by shifting perceptual luminance slightly.
 */
export function getAlternateShade(hexColor: string | undefined, deltaPercent: number = 7): string {
  if (!hexColor || !hexColor.startsWith('#')) return '#182232';
  let hex = hexColor.slice(1);
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return '#182232';
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const shift = luminance < 0.5 ? Math.round(255 * (deltaPercent / 100)) : -Math.round(255 * (deltaPercent / 100));
  r = Math.min(255, Math.max(0, r + shift));
  g = Math.min(255, Math.max(0, g + shift));
  b = Math.min(255, Math.max(0, b + shift));

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Resolves a scale factor for bracket match card text and inner elements.
 * 1.0 represents the default baseline (original compact text size).
 */
export function getTextScale(textSize?: string | number): number {
  if (typeof textSize === 'number') {
    if (textSize > 2) return textSize / 100;
    return Math.max(0.6, Math.min(2.0, textSize));
  }
  switch (textSize) {
    case 'small':
    case 'compact':
      return 0.88;
    case 'medium':
      return 1.1;
    case 'large':
      return 1.2;
    case 'xlarge':
      return 1.3;
    case 'normal':
    case 'standard':
    default:
      return 1.0;
  }
}

