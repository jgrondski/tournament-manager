import React, { useState, useEffect } from 'react';
import { BracketMatch } from '../types';
import { MatchScoreRecord } from '../../tournament/types';
import { useTournament } from '../../tournament/store';
import { X, Trophy, Check, ShieldAlert } from 'lucide-react';
import { BestOfSelect } from './BestOfSelect';

interface MatchScoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  tierId: string;
  match: BracketMatch | null;
  matchScoreRecord?: MatchScoreRecord;
  roundName?: string;
}

export const MatchScoreDrawer: React.FC<MatchScoreDrawerProps> = ({
  isOpen,
  onClose,
  tournamentId,
  tierId,
  match,
  matchScoreRecord,
  roundName = 'Round',
}) => {
  const { recordGameScore, updateMatchBestOf, forfeitMatch } = useTournament();

  const [bestOf, setBestOf] = useState<number>(match?.bestOf || 5);
  const [games, setGames] = useState<Array<{ p1: string; p2: string; winner: string | null }>>([]);

  useEffect(() => {
    if (!match) return;
    const currentBestOf = matchScoreRecord?.bestOf || match.bestOf || 5;
    setBestOf(currentBestOf);

    const initialGames = [];
    for (let i = 1; i <= currentBestOf; i++) {
      const recorded = matchScoreRecord?.games.find(g => g.gameNumber === i);
      initialGames.push({
        p1: recorded?.player1Points !== null && recorded?.player1Points !== undefined ? String(recorded.player1Points) : '',
        p2: recorded?.player2Points !== null && recorded?.player2Points !== undefined ? String(recorded.player2Points) : '',
        winner: recorded?.winnerPlayerId || null,
      });
    }
    setGames(initialGames);
  }, [match, matchScoreRecord]);

  if (!isOpen || !match) return null;

  const p1 = match.player1.player;
  const p2 = match.player2.player;
  const p1Name = p1?.name || (match.player1.sourceMatchId ? 'Feeder Winner' : 'TBD');
  const p2Name = p2?.name || (match.player2.sourceMatchId ? 'Feeder Winner' : 'TBD');

  const handleScoreChange = (gameIndex: number, playerSlot: 1 | 2, value: string) => {
    // Only allow digits
    const cleaned = value.replace(/\D/g, '');
    const updated = [...games];
    if (playerSlot === 1) {
      updated[gameIndex].p1 = cleaned;
    } else {
      updated[gameIndex].p2 = cleaned;
    }

    // Auto calculate game winner if both have valid numbers
    const num1 = cleaned && playerSlot === 1 ? parseInt(cleaned, 10) : parseInt(updated[gameIndex].p1, 10);
    const num2 = cleaned && playerSlot === 2 ? parseInt(cleaned, 10) : parseInt(updated[gameIndex].p2, 10);

    if (!isNaN(num1) && !isNaN(num2)) {
      if (num1 > num2 && p1) updated[gameIndex].winner = p1.id;
      else if (num2 > num1 && p2) updated[gameIndex].winner = p2.id;
      else if (num1 === num2) updated[gameIndex].winner = 'TIE';
    }

    setGames(updated);
  };

  const handleManualWinnerToggle = (gameIndex: number, winnerId: string | null) => {
    const updated = [...games];
    updated[gameIndex].winner = updated[gameIndex].winner === winnerId ? null : winnerId;
    setGames(updated);
  };

  const handleBestOfChange = (newBestOf: number) => {
    setBestOf(newBestOf);
    updateMatchBestOf(tournamentId, tierId, match.id, newBestOf);
    const updated = [...games];
    while (updated.length < newBestOf) {
      updated.push({ p1: '', p2: '', winner: null });
    }
    setGames(updated.slice(0, newBestOf));
  };

  const handleSaveAndAdvance = () => {
    games.forEach((g, idx) => {
      const p1Num = g.p1.trim() !== '' ? parseInt(g.p1, 10) : null;
      const p2Num = g.p2.trim() !== '' ? parseInt(g.p2, 10) : null;
      if (p1Num !== null || p2Num !== null || g.winner) {
        recordGameScore(
          tournamentId,
          tierId,
          match.id,
          idx + 1,
          p1Num,
          p2Num,
          g.winner
        );
      }
    });
    onClose();
  };

  const handleForfeit = (winnerPlayerId: string) => {
    if (window.confirm(`Award forfeit win to ${winnerPlayerId === p1?.id ? p1Name : p2Name}?`)) {
      forfeitMatch(tournamentId, tierId, match.id, winnerPlayerId);
      onClose();
    }
  };

  // Calculate series score summary
  let p1Wins = 0;
  let p2Wins = 0;
  games.forEach(g => {
    if (p1 && g.winner === p1.id) p1Wins++;
    else if (p2 && g.winner === p2.id) p2Wins++;
  });
  const winThreshold = Math.ceil(bestOf / 2);
  const matchDecided = p1Wins >= winThreshold || p2Wins >= winThreshold;

  return (
    <div style={overlayStyle}>
      <div style={drawerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-gold">Match #{match.matchNumber}</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{roundName}</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Match Scorekeeper
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '0.5rem',
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Player Matchup Banner */}
        <div style={matchupCardStyle}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Seed #{p1?.seed ?? '—'}
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: p1Wins >= winThreshold ? 'var(--color-gold-bright)' : 'var(--color-text-primary)' }}>
              {p1Name}
            </div>
            <div className="tabular-nums" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-gold-bright)' }}>
              {p1Wins}
            </div>
          </div>

          <div style={{ padding: '0 0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>VS</span>
            <BestOfSelect
              value={bestOf}
              onChange={handleBestOfChange}
              compact={true}
            />
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
              First to {winThreshold}
            </span>
          </div>

          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Seed #{p2?.seed ?? '—'}
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: p2Wins >= winThreshold ? 'var(--color-gold-bright)' : 'var(--color-text-primary)' }}>
              {p2Name}
            </div>
            <div className="tabular-nums" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-gold-bright)' }}>
              {p2Wins}
            </div>
          </div>
        </div>

        {matchDecided && (
          <div style={matchClenchedAlertStyle}>
            <Trophy size={18} color="#fbbf24" />
            <span>
              <strong>Match Point Clinched!</strong> Winner:{' '}
              {p1Wins >= winThreshold ? p1Name : p2Name}
            </span>
          </div>
        )}

        {/* Game by Game Breakdown */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Games 1 through {bestOf}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {games.slice(0, bestOf).map((game, idx) => {
              const num1 = parseInt(game.p1, 10);
              const num2 = parseInt(game.p2, 10);
              const hasScores = !isNaN(num1) && !isNaN(num2);
              const margin = hasScores ? Math.abs(num1 - num2).toLocaleString() : null;

              return (
                <div key={idx} style={gameRowCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        Game {idx + 1}
                      </span>
                      {game.winner === 'TIE' && (
                        <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-cyan-bg)', color: 'var(--color-cyan)', fontWeight: 700, border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                          TIE (NO WIN)
                        </span>
                      )}
                    </div>
                    {margin && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)' }}>
                        Δ {margin} pts
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'center' }}>
                    {/* Player 1 Input */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                        <button
                          onClick={() => p1 && handleManualWinnerToggle(idx, p1.id)}
                          title="Set winner"
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: game.winner === p1?.id ? '2px solid #fbbf24' : '1px solid var(--color-border)',
                            background: game.winner === p1?.id ? '#fbbf24' : 'transparent',
                            color: '#090d16',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          {game.winner === p1?.id && <Check size={12} strokeWidth={4} />}
                        </button>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p1Name}
                        </span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={game.p1 ? Number(game.p1).toLocaleString() : ''}
                        onChange={e => handleScoreChange(idx, 1, e.target.value)}
                        className="tabular-nums"
                        style={scoreInputStyle}
                      />
                    </div>

                    {/* Interactive TIE Button */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '1.1rem' }}>
                      <button
                        type="button"
                        onClick={() => handleManualWinnerToggle(idx, 'TIE')}
                        title={game.winner === 'TIE' ? 'Clear tie' : 'Declare Game as Tie (no win awarded)'}
                        style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-sm)',
                          border: game.winner === 'TIE' ? '1px solid var(--color-cyan)' : '1px solid var(--color-border)',
                          background: game.winner === 'TIE' ? 'var(--color-cyan-bg)' : 'transparent',
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p2Name}
                        </span>
                        <button
                          onClick={() => p2 && handleManualWinnerToggle(idx, p2.id)}
                          title="Set winner"
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: game.winner === p2?.id ? '2px solid #fbbf24' : '1px solid var(--color-border)',
                            background: game.winner === p2?.id ? '#fbbf24' : 'transparent',
                            color: '#090d16',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          {game.winner === p2?.id && <Check size={12} strokeWidth={4} />}
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={game.p2 ? Number(game.p2).toLocaleString() : ''}
                        onChange={e => handleScoreChange(idx, 2, e.target.value)}
                        className="tabular-nums"
                        style={scoreInputStyle}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Forfeit Option */}
          <div style={{ marginTop: '1.5rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#fca5a5', fontSize: '0.8rem', fontWeight: 600 }}>
              <ShieldAlert size={15} />
              <span>Forfeit / Disqualification Overrides</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {p1 && (
                <button
                  type="button"
                  onClick={() => handleForfeit(p1.id)}
                  style={{ ...btnSmallStyle, color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                >
                  Award Win to {p1Name}
                </button>
              )}
              {p2 && (
                <button
                  type="button"
                  onClick={() => handleForfeit(p2.id)}
                  style={{ ...btnSmallStyle, color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                >
                  Award Win to {p2Name}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={footerStyle}>
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAndAdvance}
            className="btn btn-primary"
            style={{ flex: 2 }}
          >
            <Check size={18} />
            {matchDecided ? 'Save & Advance Winner' : 'Save Match Progress'}
          </button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.65)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  justifyContent: 'flex-end',
  zIndex: 1000,
  animation: 'fadeIn 0.2s ease-out',
};

const drawerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '480px',
  height: '100%',
  background: 'var(--color-bg-surface)',
  borderLeft: '1px solid var(--color-border)',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: 'var(--shadow-lg)',
  animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
};

const headerStyle: React.CSSProperties = {
  padding: '1.25rem',
  borderBottom: '1px solid var(--color-border)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  background: 'var(--color-bg-surface-elevated)',
};

const matchupCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '1rem',
  background: 'var(--color-bg-surface-highlight)',
  borderBottom: '1px solid var(--color-border)',
};

const gameRowCardStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  background: 'var(--color-bg-surface-elevated)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border-subtle)',
};

const scoreInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  background: 'var(--color-bg-base)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text-primary)',
  fontSize: '0.95rem',
  fontWeight: 600,
  textAlign: 'center',
};

const matchClenchedAlertStyle: React.CSSProperties = {
  margin: '0.75rem 1.25rem 0',
  padding: '0.6rem 0.85rem',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-gold-bg)',
  border: '1px solid rgba(245, 158, 11, 0.4)',
  color: 'var(--color-gold-bright)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.85rem',
};

const footerStyle: React.CSSProperties = {
  padding: '1rem 1.25rem',
  borderTop: '1px solid var(--color-border)',
  background: 'var(--color-bg-surface-elevated)',
  display: 'flex',
  gap: '0.75rem',
};

const btnSmallStyle: React.CSSProperties = {
  padding: '0.35rem 0.6rem',
  fontSize: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  border: '1px solid',
  cursor: 'pointer',
};
