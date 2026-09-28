import React from 'react';
import { Trophy } from 'lucide-react';
import { colorWithAlpha } from '../../colorUtils';

import { HybridStageTab } from './BracketStageNavBar';

interface BracketBroadcastHeaderProps {
  tournamentName: string;
  tierName: string;
  eliminationType?: 'SINGLE' | 'DOUBLE' | string;
  isAcceleratedHybrid?: boolean;
  activeHybridTab?: HybridStageTab;
  finalsCutoff?: number;
  isObsMode?: boolean;
  chromaHex?: string | null;
  primaryColor: string;
}

export const BracketBroadcastHeader: React.FC<BracketBroadcastHeaderProps> = ({
  tournamentName,
  tierName,
  eliminationType,
  isAcceleratedHybrid = false,
  activeHybridTab,
  finalsCutoff = 16,
  isObsMode = false,
  chromaHex = null,
  primaryColor,
}) => {
  const getStageLabel = () => {
    if (!isAcceleratedHybrid) {
      return eliminationType === 'DOUBLE' ? 'Double Elimination' : 'Single Elimination';
    }
    switch (activeHybridTab) {
      case 'championship':
        return `Accelerated Hybrid • Top ${finalsCutoff} Finals`;
      case 'accel':
        return `Accelerated Hybrid • Pod 1: Accelerated Round (Seeds 1–${finalsCutoff})`;
      case 'upper':
        return `Accelerated Hybrid • Pod 2: Upper Qualifying Bracket`;
      case 'lower':
        return `Accelerated Hybrid • Pod 3: Lower / Play-In Bracket`;
      case 'premerge':
        return `Accelerated Hybrid • Pre-Merge Gauntlet`;
      case 'combined':
        return `Accelerated Hybrid • Full Tournament (All Stages)`;
      case 'qualifiers':
      default:
        return `Accelerated Hybrid • Early Rounds (3 Pods)`;
    }
  };

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
          {getStageLabel()}
        </span>
      </div>
    </div>
  );
};
