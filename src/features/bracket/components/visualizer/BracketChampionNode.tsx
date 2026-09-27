import React from 'react';
import { Trophy } from 'lucide-react';
import { SeededPlayer } from '../../types';
import { PlayerProfile } from '../../../tournament/types';
import { getContrastingTextColor } from '../../colorUtils';
import { CountryFlag } from '../../../players/flagUtils';

interface BracketChampionNodeProps {
  championPosition: { x: number; y: number; width: number; height: number };
  targetChampPlayer?: SeededPlayer | null;
  champProfile?: PlayerProfile | null;
  tierName: string;
  effectiveCardBg: string;
  primaryColor: string;
  secondaryColor: string;
  hoveredAncestry?: { isChampion?: boolean } | null;
  onChampHover: (champPlayerId?: string | null) => void;
  onPlayerClick: (pId: string, pName: string, country?: string) => void;
}

export const BracketChampionNode: React.FC<BracketChampionNodeProps> = ({
  championPosition,
  targetChampPlayer,
  champProfile,
  tierName,
  effectiveCardBg,
  primaryColor,
  secondaryColor,
  hoveredAncestry,
  onChampHover,
  onPlayerClick,
}) => {
  if (!championPosition || championPosition.width <= 0 || targetChampPlayer === undefined) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${championPosition.x}px`,
        top: `${championPosition.y}px`,
        width: `${championPosition.width}px`,
        zIndex: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Plaque Box */}
      <div
        onMouseEnter={() => onChampHover(targetChampPlayer?.id)}
        onMouseLeave={() => onChampHover(null)}
        style={{
          width: '100%',
          height: `${championPosition.height}px`,
          borderRadius: 'var(--radius-sm)',
          background: effectiveCardBg,
          border: `2.5px solid ${primaryColor}`,
          boxShadow: targetChampPlayer
            ? hoveredAncestry?.isChampion
              ? `0 0 34px ${primaryColor}, inset 0 0 16px ${primaryColor}44`
              : `0 0 28px ${primaryColor}88`
            : `0 0 12px ${primaryColor}33`,
          opacity: hoveredAncestry ? (hoveredAncestry.isChampion ? 1 : 0.35) : 1,
          display: 'flex',
          alignItems: 'stretch',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Seed Box */}
        <div
          style={{
            width: '46px',
            background: secondaryColor,
            color: getContrastingTextColor(secondaryColor),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '1.3rem',
            fontFamily: 'var(--font-mono)',
            flexShrink: 0,
            borderRight: `2px solid ${primaryColor}`,
          }}
        >
          {targetChampPlayer?.seed ? targetChampPlayer.seed : '?'}
        </div>

        {/* Champion Name Box */}
        <div
          onClick={() => {
            if (targetChampPlayer?.id) {
              onPlayerClick(targetChampPlayer.id, targetChampPlayer.name, champProfile?.country);
            }
          }}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0 0.85rem',
            fontSize: '1.35rem',
            fontWeight: 900,
            letterSpacing: '0.02em',
            color: '#ffffff',
            cursor: targetChampPlayer?.id ? 'pointer' : 'default',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            background: 'transparent',
          }}
          title={targetChampPlayer?.id ? 'View champion profile' : undefined}
        >
          {champProfile?.country && (
            <CountryFlag country={champProfile.country} style={{ fontSize: '1.25rem' }} />
          )}
          <span>{targetChampPlayer ? targetChampPlayer.name : 'TBD'}</span>
        </div>
      </div>

      {/* Champion Subtitle */}
      <div
        style={{
          marginTop: '0.65rem',
          fontSize: '1.05rem',
          fontWeight: 800,
          color: primaryColor,
          letterSpacing: '0.06em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          textTransform: 'capitalize',
        }}
      >
        <Trophy size={18} color={primaryColor} />
        <span>{tierName} Champion</span>
      </div>
    </div>
  );
};
