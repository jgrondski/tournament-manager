import React from 'react';
import { SeededPlayer } from '../../types';
import { PlayerAvatar } from '../../../players/components/PlayerAvatar';
import { BestOfSelect } from '../BestOfSelect';
import { colorWithAlpha } from '../../colorUtils';

interface MatchupBannerProps {
  p1?: SeededPlayer | null;
  p2?: SeededPlayer | null;
  p1Seed?: number;
  p2Seed?: number;
  p1Name: string;
  p2Name: string;
  p1Wins: number;
  p2Wins: number;
  winThreshold: number;
  bestOf: number;
  isP1Override?: boolean;
  isP2Override?: boolean;
  primaryColor: string;
  onBestOfChange: (newBestOf: number) => void;
}

export const MatchupBanner: React.FC<MatchupBannerProps> = ({
  p1,
  p2,
  p1Seed,
  p2Seed,
  p1Name,
  p2Name,
  p1Wins,
  p2Wins,
  winThreshold,
  bestOf,
  isP1Override,
  isP2Override,
  primaryColor,
  onBestOfChange,
}) => {
  return (
    <div
      style={{
        ...matchupCardStyle,
        background: `linear-gradient(180deg, ${colorWithAlpha(primaryColor, 0.10)} 0%, rgba(0, 0, 0, 0.35) 100%)`,
        borderBottom: `1px solid ${colorWithAlpha(primaryColor, 0.25, 'var(--color-border)')}`,
      }}
    >
      {/* Player 1 Section */}
      <div
        style={{
          flex: 1,
          textAlign: 'center',
          minWidth: 0,
          padding: '0.75rem 0.5rem',
          borderRadius: 'var(--radius-md)',
          background: p1Wins >= winThreshold
            ? colorWithAlpha(primaryColor, 0.12)
            : 'rgba(255, 255, 255, 0.02)',
          border: p1Wins >= winThreshold
            ? `2px solid ${primaryColor}`
            : `1px solid ${colorWithAlpha(primaryColor, 0.2, 'rgba(255, 255, 255, 0.06)')}`,
          boxShadow: p1Wins >= winThreshold
            ? `0 0 16px ${colorWithAlpha(primaryColor, 0.3)}`
            : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        {/* Competitor Glowing Avatar Ring */}
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${colorWithAlpha(primaryColor, 0.25)} 0%, rgba(0, 0, 0, 0.5) 100%)`,
            border: `2px solid ${p1Wins >= winThreshold ? primaryColor : colorWithAlpha(primaryColor, 0.4)}`,
            boxShadow: p1Wins >= winThreshold ? `0 0 14px ${colorWithAlpha(primaryColor, 0.45)}` : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.45rem auto',
            fontSize: '1.05rem',
            transition: 'all 0.2s ease',
          }}
        >
          {p1?.country || (p1 as any)?.avatarUrl ? (
            <PlayerAvatar player={p1 as any} country={p1?.country} />
          ) : (
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: primaryColor }}>
              {p1Name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
          {p1Seed !== undefined && (
            <span
              style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                padding: '0.1rem 0.4rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
              }}
            >
              #{p1Seed}
            </span>
          )}
        </div>

        <div
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: p1Wins >= winThreshold ? primaryColor : '#ffffff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
          title={p1Name}
        >
          <span>{p1Name}</span>
          {isP1Override && (
            <span
              style={{
                fontSize: '0.62rem',
                padding: '0.1rem 0.35rem',
                background: 'rgba(234, 88, 12, 0.2)',
                color: '#ea580c',
                border: '1px solid rgba(234, 88, 12, 0.4)',
                borderRadius: '3px',
                fontWeight: 700,
              }}
            >
              OVERRIDE
            </span>
          )}
        </div>

        <div
          className="tabular-nums"
          style={{
            fontSize: '2.5rem',
            fontWeight: 900,
            lineHeight: 1.1,
            marginTop: '0.25rem',
            color: p1Wins >= winThreshold ? primaryColor : p1Wins > 0 ? '#ffffff' : 'var(--color-text-muted)',
            textShadow: p1Wins >= winThreshold ? `0 0 16px ${colorWithAlpha(primaryColor, 0.4)}` : 'none',
          }}
        >
          {p1Wins}
        </div>
      </div>

      {/* Center VS & Format Column */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0 0.5rem',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.1em',
            color: 'var(--color-text-muted)',
            marginBottom: '0.4rem',
          }}
        >
          VS
        </span>
        <BestOfSelect
          value={bestOf}
          onChange={onBestOfChange}
          compact={true}
        />
        <span
          style={{
            fontSize: '0.65rem',
            color: 'var(--color-text-muted)',
            marginTop: '0.4rem',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
          }}
        >
          First to {winThreshold}
        </span>
      </div>

      {/* Player 2 Section */}
      <div
        style={{
          flex: 1,
          textAlign: 'center',
          minWidth: 0,
          padding: '0.75rem 0.5rem',
          borderRadius: 'var(--radius-md)',
          background: p2Wins >= winThreshold
            ? colorWithAlpha(primaryColor, 0.12)
            : 'rgba(255, 255, 255, 0.02)',
          border: p2Wins >= winThreshold
            ? `2px solid ${primaryColor}`
            : `1px solid ${colorWithAlpha(primaryColor, 0.2, 'rgba(255, 255, 255, 0.06)')}`,
          boxShadow: p2Wins >= winThreshold
            ? `0 0 16px ${colorWithAlpha(primaryColor, 0.3)}`
            : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        {/* Competitor Glowing Avatar Ring */}
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${colorWithAlpha(primaryColor, 0.25)} 0%, rgba(0, 0, 0, 0.5) 100%)`,
            border: `2px solid ${p2Wins >= winThreshold ? primaryColor : colorWithAlpha(primaryColor, 0.4)}`,
            boxShadow: p2Wins >= winThreshold ? `0 0 14px ${colorWithAlpha(primaryColor, 0.45)}` : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.45rem auto',
            fontSize: '1.05rem',
            transition: 'all 0.2s ease',
          }}
        >
          {p2?.country || (p2 as any)?.avatarUrl ? (
            <PlayerAvatar player={p2 as any} country={p2?.country} />
          ) : (
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: primaryColor }}>
              {p2Name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
          {p2Seed !== undefined && (
            <span
              style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                padding: '0.1rem 0.4rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
              }}
            >
              #{p2Seed}
            </span>
          )}
        </div>

        <div
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: p2Wins >= winThreshold ? primaryColor : '#ffffff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
          title={p2Name}
        >
          <span>{p2Name}</span>
          {isP2Override && (
            <span
              style={{
                fontSize: '0.62rem',
                padding: '0.1rem 0.35rem',
                background: 'rgba(234, 88, 12, 0.2)',
                color: '#ea580c',
                border: '1px solid rgba(234, 88, 12, 0.4)',
                borderRadius: '3px',
                fontWeight: 700,
              }}
            >
              OVERRIDE
            </span>
          )}
        </div>

        <div
          className="tabular-nums"
          style={{
            fontSize: '2.5rem',
            fontWeight: 900,
            lineHeight: 1.1,
            marginTop: '0.25rem',
            color: p2Wins >= winThreshold ? primaryColor : p2Wins > 0 ? '#ffffff' : 'var(--color-text-muted)',
            textShadow: p2Wins >= winThreshold ? `0 0 16px ${colorWithAlpha(primaryColor, 0.4)}` : 'none',
          }}
        >
          {p2Wins}
        </div>
      </div>
    </div>
  );
};

const matchupCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '1.25rem 1.5rem',
  gap: '1rem',
};
