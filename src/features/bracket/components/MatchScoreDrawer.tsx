import React, { useState, useEffect } from 'react';
import { BracketMatch } from '../types';
import { MatchScoreRecord } from '../../tournament/types';
import { useTournament } from '../../tournament/store';
import { X, Trophy, Check, ShieldAlert, Plus, Trash2, ArrowLeftRight } from 'lucide-react';
import { BestOfSelect } from './BestOfSelect';
import { CountryFlag } from '../../players/flagUtils';
import {
  getDefaultTierColors,
  colorWithAlpha,
  getAlternateShade,
  getContrastingTextColor,
} from '../colorUtils';

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
  const { tournaments, saveMatchScores, updateMatchBestOf, forfeitMatch, swapMatchSlots } = useTournament();

  const [bestOf, setBestOf] = useState<number>(match?.bestOf || 5);
  const [games, setGames] = useState<Array<{ p1: string; p2: string; winner: string | null }>>([]);
  const [hasTiebreaker, setHasTiebreaker] = useState(false);

  // Manual placement override state
  const [showOverridePanel, setShowOverridePanel] = useState(false);
  const [sourceSlot, setSourceSlot] = useState<1 | 2>(1);
  const [targetMatchId, setTargetMatchId] = useState<string>('');
  const [targetSlot, setTargetSlot] = useState<1 | 2>(1);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!match) return;
    const currentBestOf = matchScoreRecord?.bestOf || match.bestOf || 5;
    setBestOf(currentBestOf);

    const recordedCount = matchScoreRecord?.games?.length || 0;
    const totalCount = Math.max(currentBestOf, recordedCount);
    const initialGames = [];
    for (let i = 1; i <= totalCount; i++) {
      const recorded = matchScoreRecord?.games.find(g => g.gameNumber === i);
      initialGames.push({
        p1: recorded?.player1Points !== null && recorded?.player1Points !== undefined ? String(recorded.player1Points) : '',
        p2: recorded?.player2Points !== null && recorded?.player2Points !== undefined ? String(recorded.player2Points) : '',
        winner: recorded?.winnerPlayerId || null,
      });
    }
    setGames(initialGames);
    setHasTiebreaker(Boolean(matchScoreRecord?.hasTiebreaker || recordedCount > currentBestOf));
  }, [match, matchScoreRecord]);

  if (!isOpen || !match) return null;

  // Resolve tournament & tier theme colors
  const currentTournament = tournaments.find(t => t.id === tournamentId);
  const currentTier = currentTournament?.tiers.find(t => t.id === tierId) || currentTournament?.tiers[0];
  const defaults = getDefaultTierColors(currentTier || {});
  const primaryColor = currentTier?.primaryColor || defaults.primaryColor || '#f59e0b';
  const cardColor = currentTier?.cardColor || defaults.cardColor || '#161922';

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

    const val1 = updated[gameIndex].p1.trim();
    const val2 = updated[gameIndex].p2.trim();

    // If either score is cleared or empty, unselect winner automatically
    if (val1 === '' || val2 === '') {
      updated[gameIndex].winner = null;
    } else {
      const num1 = parseInt(val1, 10);
      const num2 = parseInt(val2, 10);

      if (isNaN(num1) || isNaN(num2)) {
        updated[gameIndex].winner = null;
      } else if (num1 === 0 && num2 === 0) {
        // Empty / 0-0 reset: unselect winner automatically
        updated[gameIndex].winner = null;
      } else if (num1 > num2 && p1) {
        updated[gameIndex].winner = p1.id;
      } else if (num2 > num1 && p2) {
        updated[gameIndex].winner = p2.id;
      } else if (num1 === num2) {
        updated[gameIndex].winner = 'TIE';
      }
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
    setGames(updated);
  };

  const handleAddTiebreakerGame = () => {
    setGames(prev => [...prev, { p1: '', p2: '', winner: null }]);
    setHasTiebreaker(true);
  };

  const handleDeleteTiebreakerGame = (idx: number) => {
    setGames(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      const hasRemainingTiebreaker = updated.length > bestOf;
      const hasAnyTiedGame = updated.some(g => g.winner === 'TIE' || (g.p1 !== '' && g.p1 === g.p2 && parseInt(g.p1, 10) > 0));
      if (!hasRemainingTiebreaker && !hasAnyTiedGame) {
        setHasTiebreaker(false);
      }
      return updated;
    });
  };

  const handleSaveAndAdvance = () => {
    const formattedGames = games.map((g, idx) => ({
      gameNumber: idx + 1,
      player1Points: g.p1.trim() !== '' ? parseInt(g.p1, 10) : null,
      player2Points: g.p2.trim() !== '' ? parseInt(g.p2, 10) : null,
      winnerPlayerId: g.winner,
    }));

    const hasTiedGame = formattedGames.some(
      g => g.winnerPlayerId === 'TIE' || (g.player1Points !== null && g.player1Points === g.player2Points && g.player1Points > 0)
    );
    const hasRemainingTiebreaker = games.length > bestOf;
    const shouldRecordTiebreaker = Boolean((hasTiebreaker || hasRemainingTiebreaker || hasTiedGame) && (hasTiedGame || hasRemainingTiebreaker));

    saveMatchScores(
      tournamentId,
      tierId,
      match.id,
      formattedGames,
      shouldRecordTiebreaker
    );
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

  const currentRound = currentTier?.bracket?.rounds.find(r => r.matches.some(m => m.id === match.id));
  const roundMatches = currentRound?.matches.filter(m => m.id !== match.id && !m.isBye) || [];

  const hasRecordedScores = Boolean(
    matchScoreRecord?.isComplete ||
    (matchScoreRecord?.games && matchScoreRecord.games.length > 0) ||
    games.some(g => (g.p1 && g.p1 !== '0') || (g.p2 && g.p2 !== '0') || g.winner !== null)
  );

  const handleApplyOverride = () => {
    setOverrideError(null);
    setOverrideSuccess(null);
    const chosenTargetId = targetMatchId || roundMatches[0]?.id;
    if (!chosenTargetId) {
      setOverrideError('Please select a target match in this round.');
      return;
    }
    const res = swapMatchSlots(tournamentId, tierId, {
      sourceMatchId: match.id,
      sourceSlot,
      targetMatchId: chosenTargetId,
      targetSlot,
    });
    if (res.success) {
      setOverrideSuccess('Match placement overridden successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setOverrideError(res.error || 'Failed to override slot placement.');
    }
  };

  const gameCardBg = getAlternateShade(cardColor, 2);

  return (
    <div style={overlayStyle}>
      <div style={drawerStyle}>
        {/* Header: Focused purely on Match Number, Round Info, Tier Pill, and Close Action */}
        <div
          style={{
            ...headerContainerStyle,
            background: gameCardBg,
            borderBottom: `1px solid ${colorWithAlpha(primaryColor, 0.35, 'var(--color-border)')}`,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
            {/* Prominently displayed Tournament Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Trophy size={13} color="var(--color-gold-bright)" />
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: 'var(--color-gold-bright)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {currentTournament?.name || 'Tournament'}
              </span>
            </div>

            {/* Match Number, Bracket Name Chip, and Round Name on the same row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
              >
                Match #{match.matchNumber}
              </h2>
              {currentTier?.name && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '0.12rem 0.55rem',
                    borderRadius: 'var(--radius-full)',
                    background: colorWithAlpha(primaryColor, 0.22),
                    color: primaryColor,
                    border: `1px solid ${colorWithAlpha(primaryColor, 0.45)}`,
                  }}
                >
                  {currentTier.name}
                </span>
              )}
              <span
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.2,
                }}
              >
                {roundName}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close drawer"
            style={closeBtnStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = primaryColor;
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Player Matchup Scoreboard Banner */}
        <div style={matchupCardStyle}>
          {/* Player 1 Section */}
          <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
              {p1?.seed !== undefined && (
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
                  #{p1.seed}
                </span>
              )}
              {p1?.country && <CountryFlag country={p1.country} />}
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
              {match.player1.isManualOverride && (
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
              onChange={handleBestOfChange}
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
          <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
              {p2?.country && <CountryFlag country={p2.country} />}
              {p2?.seed !== undefined && (
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
                  #{p2.seed}
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
              {match.player2.isManualOverride && (
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

        {/* Manual Placement Override Bar (available if no scores recorded in this match yet) */}
        {!hasRecordedScores && roundMatches.length > 0 && (
          <div style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255, 255, 255, 0.015)' }}>
            <button
              type="button"
              onClick={() => {
                setShowOverridePanel(!showOverridePanel);
                if (!targetMatchId && roundMatches.length > 0) {
                  setTargetMatchId(roundMatches[0].id);
                }
              }}
              style={{
                width: '100%',
                padding: '0.55rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: showOverridePanel ? 'rgba(234, 88, 12, 0.08)' : 'transparent',
                border: 'none',
                color: showOverridePanel ? '#ea580c' : 'var(--color-text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeftRight size={14} color={showOverridePanel ? '#ea580c' : 'currentColor'} />
                <span>Override / Swap Round Placement</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                {showOverridePanel ? 'Hide Controls' : 'Adjust Slot'}
              </span>
            </button>

            {showOverridePanel && (
              <div style={{ padding: '0.85rem 1.5rem 1.25rem', borderTop: '1px dashed var(--color-border-subtle)', background: 'rgba(0, 0, 0, 0.25)' }}>
                <p style={{ margin: '0 0 0.65rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Manually move or swap an advancing player with another slot in <strong>{roundName}</strong>.
                </p>

                {overrideError && (
                  <div style={{ padding: '0.4rem 0.6rem', marginBottom: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.75rem' }}>
                    {overrideError}
                  </div>
                )}
                {overrideSuccess && (
                  <div style={{ padding: '0.4rem 0.6rem', marginBottom: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(34, 197, 94, 0.15)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '0.75rem' }}>
                    {overrideSuccess}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                      From (Match #{match.matchNumber})
                    </label>
                    <select
                      value={sourceSlot}
                      onChange={(e) => setSourceSlot(Number(e.target.value) as 1 | 2)}
                      style={{
                        width: '100%',
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.78rem',
                        background: '#090d16',
                        border: '1px solid var(--color-border)',
                        color: '#ffffff',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <option value={1}>Slot 1: {p1Name}</option>
                      <option value={2}>Slot 2: {p2Name}</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                      To Slot
                    </label>
                    <select
                      value={targetSlot}
                      onChange={(e) => setTargetSlot(Number(e.target.value) as 1 | 2)}
                      style={{
                        width: '100%',
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.78rem',
                        background: '#090d16',
                        border: '1px solid var(--color-border)',
                        color: '#ffffff',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <option value={1}>Target Slot 1</option>
                      <option value={2}>Target Slot 2</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                    Target Match in {roundName}
                  </label>
                  <select
                    value={targetMatchId || (roundMatches[0]?.id ?? '')}
                    onChange={(e) => setTargetMatchId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.5rem',
                      fontSize: '0.78rem',
                      background: '#090d16',
                      border: '1px solid var(--color-border)',
                      color: '#ffffff',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {roundMatches.map((m) => {
                      const mP1 = m.player1.player?.name || (m.player1.sourceMatchId ? 'Feeder' : 'Empty');
                      const mP2 = m.player2.player?.name || (m.player2.sourceMatchId ? 'Feeder' : 'Empty');
                      return (
                        <option key={m.id} value={m.id}>
                          Match #{m.matchNumber}: {mP1} vs {mP2}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleApplyOverride}
                  style={{
                    width: '100%',
                    padding: '0.45rem',
                    borderRadius: 'var(--radius-sm)',
                    background: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <ArrowLeftRight size={14} />
                  <span>Apply Placement Override</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Match Clenched Alert Banner */}
        {matchDecided && (
          <div
            style={{
              margin: '0.85rem 1.5rem 0',
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: colorWithAlpha(primaryColor, 0.12),
              border: `1px solid ${colorWithAlpha(primaryColor, 0.35)}`,
              color: primaryColor,
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <Trophy size={18} color={primaryColor} />
            <span>
              <strong style={{ fontWeight: 800 }}>Match Point Clinched!</strong> Winner:{' '}
              {p1Wins >= winThreshold ? p1Name : p2Name}
            </span>
          </div>
        )}

        {/* Game by Game Breakdown Section */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Games Breakdown (Bo{bestOf}{hasTiebreaker || games.length > bestOf ? ' • Tiebreaker Active' : ''})
            </div>
            {hasTiebreaker && (
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.45rem',
                  borderRadius: 'var(--radius-full)',
                  background: colorWithAlpha(primaryColor, 0.15),
                  color: primaryColor,
                  border: `1px solid ${colorWithAlpha(primaryColor, 0.35)}`,
                }}
              >
                Tiebreaker Game(s) Added
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {games.map((game, idx) => {
              const gameNum = idx + 1;
              const isTiebreakerGame = gameNum > bestOf;
              const num1 = parseInt(game.p1, 10);
              const num2 = parseInt(game.p2, 10);
              const hasScores = !isNaN(num1) && !isNaN(num2);
              const margin = hasScores ? Math.abs(num1 - num2).toLocaleString() : null;

              return (
                <div
                  key={idx}
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
                          onClick={() => handleDeleteTiebreakerGame(idx)}
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
                          onClick={() => p1 && handleManualWinnerToggle(idx, p1.id)}
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
                        onChange={e => handleScoreChange(idx, 1, e.target.value)}
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
                        onClick={() => handleManualWinnerToggle(idx, 'TIE')}
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
                          onClick={() => p2 && handleManualWinnerToggle(idx, p2.id)}
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
                        onChange={e => handleScoreChange(idx, 2, e.target.value)}
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
            })}
          </div>

          {/* Add Tiebreaker Game Button */}
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleAddTiebreakerGame}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                borderColor: colorWithAlpha(primaryColor, 0.4),
                color: primaryColor,
                background: colorWithAlpha(primaryColor, 0.08),
                border: `1px solid ${colorWithAlpha(primaryColor, 0.35)}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Plus size={15} />
              <span>+ Add Tiebreaker Game</span>
            </button>
            {games.some(g => g.winner === 'TIE') && (
              <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                Tied game detected. Use tiebreaker games or match Best-of override if needed to resolve series.
              </span>
            )}
          </div>

          {/* Quick Forfeit Option */}
          <div
            style={{
              marginTop: '1.5rem',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem', color: '#fca5a5', fontSize: '0.8rem', fontWeight: 700 }}>
              <ShieldAlert size={15} />
              <span>Forfeit / Disqualification Overrides</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {p1 && (
                <button
                  type="button"
                  onClick={() => handleForfeit(p1.id)}
                  style={{
                    ...btnSmallStyle,
                    color: '#fca5a5',
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    background: 'rgba(239, 68, 68, 0.08)',
                  }}
                >
                  Award Win to {p1Name}
                </button>
              )}
              {p2 && (
                <button
                  type="button"
                  onClick={() => handleForfeit(p2.id)}
                  style={{
                    ...btnSmallStyle,
                    color: '#fca5a5',
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    background: 'rgba(239, 68, 68, 0.08)',
                  }}
                >
                  Award Win to {p2Name}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={footerStyle}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAndAdvance}
            style={{
              flex: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              background: primaryColor,
              color: getContrastingTextColor(primaryColor),
              border: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: `0 2px 12px ${colorWithAlpha(primaryColor, 0.3)}`,
              transition: 'all 0.15s ease',
            }}
          >
            <Check size={18} />
            <span>{matchDecided ? 'Save & Advance Winner' : 'Save Match Progress'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.7)',
  backdropFilter: 'blur(5px)',
  display: 'flex',
  justifyContent: 'flex-end',
  zIndex: 1000,
  animation: 'fadeIn 0.2s ease-out',
};

const drawerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '500px',
  height: '100%',
  background: '#0d1117',
  borderLeft: '1px solid var(--color-border)',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.6)',
  animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
};

const headerContainerStyle: React.CSSProperties = {
  padding: '1.25rem 1.5rem',
  borderBottom: '1px solid var(--color-border)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  background: 'rgba(255, 255, 255, 0.02)',
  gap: '1rem',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-muted)',
  cursor: 'pointer',
  padding: '0.45rem',
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
  flexShrink: 0,
};

const matchupCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '1.25rem 1.5rem',
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(0, 0, 0, 0.25) 100%)',
  borderBottom: '1px solid var(--color-border)',
  gap: '1rem',
};

const footerStyle: React.CSSProperties = {
  padding: '1rem 1.5rem',
  borderTop: '1px solid var(--color-border)',
  background: 'rgba(255, 255, 255, 0.02)',
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
  transition: 'all 0.15s ease',
};
