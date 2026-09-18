import React from 'react';
import { Playstyle } from '../../tournament/types';

interface PlaystyleChipProps {
  style?: string | Playstyle;
  size?: 'sm' | 'md';
  className?: string;
}

export function getPlaystyleTheme(style?: string | Playstyle) {
  const norm = (style || '').trim().toLowerCase();

  if (norm === 'roll' || norm === 'rolling') {
    return {
      label: 'Roll',
      color: '#ffffff',
      background: '#a855f7',
      borderColor: '#c084fc',
    };
  }

  if (norm === 'das') {
    return {
      label: 'DAS',
      color: '#fde047',
      background: '#dc2626',
      borderColor: '#ef4444',
    };
  }

  if (norm === 'hybrid') {
    return {
      label: 'Hybrid',
      color: '#e9d5ff',
      background: '#4c1d95',
      borderColor: '#6b21a8',
    };
  }

  if (norm === 'tap' || norm === 'hypertap') {
    return {
      label: 'Tap',
      color: '#bae6fd',
      background: '#0c4a6e',
      borderColor: '#0284c7',
    };
  }

  // Fallback
  return {
    label: style || 'Unknown',
    color: '#e2e8f0',
    background: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  };
}

export const PlaystyleChip: React.FC<PlaystyleChipProps> = ({
  style,
  size = 'sm',
  className,
}) => {
  if (!style) return null;
  const theme = getPlaystyleTheme(style);

  const isSmall = size === 'sm';

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isSmall ? '0.12rem 0.45rem' : '0.2rem 0.65rem',
        fontSize: isSmall ? '0.68rem' : '0.78rem',
        fontWeight: 700,
        borderRadius: 'var(--radius-sm, 4px)',
        color: theme.color,
        backgroundColor: theme.background,
        border: `1px solid ${theme.borderColor}`,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
        lineHeight: 1.1,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
      title={`Playstyle: ${theme.label}`}
    >
      {theme.label}
    </span>
  );
};
