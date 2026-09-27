import React from 'react';
import { Trophy } from 'lucide-react';
import { colorWithAlpha } from '../../colorUtils';

interface BracketBroadcastHeaderProps {
  tournamentName: string;
  tierName: string;
  eliminationType?: 'SINGLE' | 'DOUBLE' | string;
  isAcceleratedHybrid?: boolean;
  isObsMode?: boolean;
  chromaHex?: string | null;
  primaryColor: string;
}

export const BracketBroadcastHeader: React.FC<BracketBroadcastHeaderProps> = ({
  tournamentName,
  tierName,
  eliminationType,
  isAcceleratedHybrid = false,
  isObsMode = false,
  chromaHex = null,
  primaryColor,
}) => {
  return (
    <div
      id="bracket-broadcast-header"
      style={{
        width: '100%',
        padding: isObsMode ? '0.65rem 1.25rem' : '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        zIndex: 35,
        borderBottom: isObsMode && chromaHex ? 'none' : `1px solid ${colorWithAlpha(primaryColor, 0.25, 'var(--color-border)')}`,
        background: isObsMode && chromaHex ? 'transparent' : 'rgba(15, 18, 26, 0.82)',
        backdropFilter: isObsMode && chromaHex ? 'none' : 'blur(10px)',
        WebkitBackdropFilter: isObsMode && chromaHex ? 'none' : 'blur(10px)',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trophy size={isObsMode ? 18 : 20} color="var(--color-gold-bright)" />
          <span
            style={{
              fontSize: isObsMode ? '1.3rem' : '1.45rem',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            {tournamentName}
          </span>
        </div>

        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '0.18rem 0.65rem',
            borderRadius: 'var(--radius-full)',
            background: colorWithAlpha(primaryColor, 0.22),
            color: primaryColor,
            border: `1px solid ${colorWithAlpha(primaryColor, 0.5)}`,
          }}
        >
          {tierName}
        </span>

        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
          }}
        >
          {isAcceleratedHybrid
            ? 'Accelerated Hybrid'
            : eliminationType === 'DOUBLE'
            ? 'Double Elimination'
            : 'Single Elimination'}
        </span>
      </div>
    </div>
  );
};
