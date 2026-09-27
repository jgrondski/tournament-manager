import React from 'react';
import { Check, Trash2 } from 'lucide-react';
import { SeededPlayer } from '../../types';
import { colorWithAlpha, getContrastingTextColor } from '../../colorUtils';

interface GameScoreCardProps {
  game: { p1: string; p2: string; winner: string | null };
  idx: number;
  bestOf: number;
  p1?: SeededPlayer | null;
  p2?: SeededPlayer | null;
  p1Name: string;
  p2Name: string;
  primaryColor: string;
  gameCardBg: string;
  onScoreChange: (gameIndex: number, playerSlot: 1 | 2, value: string) => void;
  onManualWinnerToggle: (gameIndex: number, winnerId: string | null) => void;
  onDeleteTiebreakerGame: (idx: number) => void;
}

export const GameScoreCard: React.FC<GameScoreCardProps> = ({
  game,
  idx,
  bestOf,
  p1,
  p2,
  p1Name,
  p2Name,
  primaryColor,
  gameCardBg,
  onScoreChange,
  onManualWinnerToggle,
  onDeleteTiebreakerGame,
}) => {
  const gameNum = idx + 1;
  const isTiebreakerGame = gameNum > bestOf;
  const num1 = parseInt(game.p1, 10);
  const num2 = parseInt(game.p2, 10);
  const hasScores = !isNaN(num1) && !isNaN(num2);
  const margin = hasScores ? Math.abs(num1 - num2).toLocaleString() : null;

  return (
    <div
      style={{
        padding: '0.85rem 1rem',
        background: gameCardBg,
        borderRadius: 'var(--radius-md)',
        border: isTiebreakerGame
          ? `1px solid ${colorWithAlpha(primaryColor, 0.45)}`
          : '1px solid var(--color-border)',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Game card top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: isTiebreakerGame ? primaryColor : '#ffffff',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Game {gameNum}
          </span>
          {isTiebreakerGame && (
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.08rem 0.4rem',
                borderRadius: 'var(--radius-full)',
                background: colorWithAlpha(primaryColor, 0.15),
                color: primaryColor,
                border: `1px solid ${colorWithAlpha(primaryColor, 0.3)}`,
              }}
            >
              Tiebreaker
            </span>
          )}
          {game.winner === 'TIE' && (
            <span
              style={{
                fontSize: '0.65rem',
                padding: '0.08rem 0.45rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-cyan-bg)',
                color: 'var(--color-cyan)',
                fontWeight: 700,
                border: '1px solid rgba(6, 182, 212, 0.3)',
              }}
            >
              TIE (NO WIN)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {margin && (
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--color-cyan)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                background: 'rgba(6, 182, 212, 0.1)',
                padding: '0.1rem 0.45rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
              }}
            >
              Δ {margin} pts
            </span>
          )}
          {isTiebreakerGame && ((!game.p1 || game.p1 === '0' || isNaN(num1) || num1 === 0) && (!game.p2 || game.p2 === '0' || isNaN(num2) || num2 === 0)) && (
            <button
              type="button"
              onClick={() => onDeleteTiebreakerGame(idx)}
              title="Delete tiebreaker game"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.15rem 0.45rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                fontSize: '0.68rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Trash2 size={11} />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Input Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'center' }}>
        {/* Player 1 Input */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
            <button
              type="button"
              onClick={() => p1 && onManualWinnerToggle(idx, p1.id)}
              title="Set winner"
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: game.winner === p1?.id ? `2px solid ${primaryColor}` : '1px solid var(--color-border)',
                background: game.winner === p1?.id ? primaryColor : 'transparent',
                color: getContrastingTextColor(primaryColor),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              {game.winner === p1?.id && <Check size={13} strokeWidth={3.5} />}
            </button>
            <span
              style={{
                fontSize: '0.75rem',
                color: game.winner === p1?.id ? primaryColor : 'var(--color-text-secondary)',
                fontWeight: game.winner === p1?.id ? 700 : 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {p1Name}
            </span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={game.p1 ? Number(game.p1).toLocaleString() : ''}
            onChange={e => onScoreChange(idx, 1, e.target.value)}
            className="tabular-nums"
            style={{
              width: '100%',
              padding: '0.5rem 0.65rem',
              background: 'rgba(0, 0, 0, 0.45)',
              border: game.winner === p1?.id ? `1px solid ${colorWithAlpha(primaryColor, 0.65)}` : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              textAlign: 'center',
              outline: 'none',
              boxShadow: game.winner === p1?.id ? `0 0 10px ${colorWithAlpha(primaryColor, 0.2)}` : 'none',
            }}
          />
        </div>

        {/* Interactive TIE Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '1.25rem' }}>
          <button
            type="button"
            onClick={() => onManualWinnerToggle(idx, 'TIE')}
            title={game.winner === 'TIE' ? 'Clear tie' : 'Declare Game as Tie (no win awarded)'}
            style={{
              padding: '0.25rem 0.6rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              borderRadius: 'var(--radius-sm)',
              border: game.winner === 'TIE' ? '1px solid var(--color-cyan)' : '1px solid var(--color-border)',
              background: game.winner === 'TIE' ? 'var(--color-cyan-bg)' : 'rgba(255, 255, 255, 0.03)',
              color: game.winner === 'TIE' ? 'var(--color-cyan)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            TIE
          </button>
        </div>

        {/* Player 2 Input */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', marginBottom: '0.3rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                color: game.winner === p2?.id ? primaryColor : 'var(--color-text-secondary)',
                fontWeight: game.winner === p2?.id ? 700 : 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {p2Name}
            </span>
            <button
              type="button"
              onClick={() => p2 && onManualWinnerToggle(idx, p2.id)}
              title="Set winner"
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: game.winner === p2?.id ? `2px solid ${primaryColor}` : '1px solid var(--color-border)',
                background: game.winner === p2?.id ? primaryColor : 'transparent',
                color: getContrastingTextColor(primaryColor),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              {game.winner === p2?.id && <Check size={13} strokeWidth={3.5} />}
            </button>
          </div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={game.p2 ? Number(game.p2).toLocaleString() : ''}
            onChange={e => onScoreChange(idx, 2, e.target.value)}
            className="tabular-nums"
            style={{
              width: '100%',
              padding: '0.5rem 0.65rem',
              background: 'rgba(0, 0, 0, 0.45)',
              border: game.winner === p2?.id ? `1px solid ${colorWithAlpha(primaryColor, 0.65)}` : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              textAlign: 'center',
              outline: 'none',
              boxShadow: game.winner === p2?.id ? `0 0 10px ${colorWithAlpha(primaryColor, 0.2)}` : 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};
