import React, { useMemo } from 'react';
import { Tournament, PlayerProfile } from '../../tournament/types';
import { LeaderboardRankRow, MAXOUT_THRESHOLD, deriveLeaderboard } from '../scoring';
import { calculateGlobalStandings, getRankOrdinal } from '../../tournament/standings';
import { colorWithAlpha } from '../../bracket/colorUtils';
import {
  X,
  User,
  Trophy,
  Swords,
  Sparkles,
  Flame,
  Clock,
} from 'lucide-react';

interface PlayerDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile | null;
  tournament: Tournament;
  rankRow?: LeaderboardRankRow;
}

export const PlayerDetailDrawer: React.FC<PlayerDetailDrawerProps> = ({
  isOpen,
  onClose,
  player,
  tournament,
  rankRow,
}) => {

  // Derive leaderboard row so we have rank data even if caller didn't pass rankRow
  const leaderboard = useMemo(() => deriveLeaderboard(tournament), [tournament]);
  const effectiveRankRow = useMemo(() => {
    if (!player) return undefined;
    return rankRow || leaderboard.find(r => r.player.id === player.id);
  }, [rankRow, leaderboard, player]);

  // Derive global standings for the player
  const globalStandings = useMemo(() => calculateGlobalStandings(tournament), [tournament]);
  const effectiveStanding = useMemo(() => {
    if (!player) return null;
    return globalStandings.find(s => s.player.id === player.id) || null;
  }, [globalStandings, player]);

  // Dedicated permanent metrics
  const overallQualSeed = useMemo(() => {
    if (!effectiveRankRow) return '—';
    if (effectiveRankRow.isDisqualified) return 'DQ';
    if (effectiveRankRow.attempts.length === 0 && effectiveRankRow.finalScore === 0) {
      const hasSubs = (tournament.qualifierSubmissions || []).some(s => s.playerId === player?.id);
      if (!hasSubs) return '—';
    }
    return typeof effectiveRankRow.rank === 'number' ? `#${effectiveRankRow.rank}` : String(effectiveRankRow.rank);
  }, [effectiveRankRow, tournament.qualifierSubmissions, player?.id]);

  const bracketSeed = useMemo(() => {
    if (!tournament.isLocked || !effectiveRankRow) return '—';
    if (effectiveRankRow.assignedTier && effectiveRankRow.tierSeed !== undefined) {
      return `${effectiveRankRow.assignedTier.name} #${effectiveRankRow.tierSeed}`;
    }
    return '—';
  }, [tournament.isLocked, effectiveRankRow]);

  const finalPlace = useMemo(() => {
    if (!tournament.isLocked) return '—';
    if (effectiveRankRow?.isDisqualified) return 'DQ';

    if (effectiveRankRow?.isDNQ) {
      if (typeof effectiveRankRow.rank === 'number') {
        return `${getRankOrdinal(effectiveRankRow.rank)} (DNQ)`;
      }
      return 'DNQ';
    }

    if (effectiveStanding) {
      if (effectiveStanding.eliminationRound !== 'Bracket Participant') {
        if (typeof effectiveStanding.finalRank === 'number') {
          return getRankOrdinal(effectiveStanding.finalRank);
        }
        return String(effectiveStanding.finalRank);
      }
    }
    return '—';
  }, [tournament.isLocked, effectiveRankRow, effectiveStanding]);

  const assignedTierDisplay = useMemo(() => {
    if (effectiveRankRow?.assignedTier) {
      return tournament.isLocked
        ? effectiveRankRow.assignedTier.name
        : `${effectiveRankRow.assignedTier.name} (Projected)`;
    }
    if (effectiveRankRow?.isDNQ) return 'DNQ';
    return '—';
  }, [effectiveRankRow, tournament.isLocked]);

  // Chronological qualifier submissions (earliest at top, latest on bottom)
  const playerSubmissions = useMemo(() => {
    if (!player) return [];
    return (tournament.qualifierSubmissions || [])
      .filter(s => s.playerId === player.id)
      .sort((a, b) => a.submittedAt - b.submittedAt);
  }, [tournament.qualifierSubmissions, player]);

  if (!isOpen || !player) return null;

  // Tournament match history
  const playerMatches: Array<{
    matchId: string;
    tierName: string;
    tierColor: string;
    roundName: string;
    opponentName: string;
    opponentSeed?: number;
    playerWins: number;
    opponentWins: number;
    isWinner: boolean;
    isComplete: boolean;
    isForfeit?: boolean;
    games: Array<{ gameNumber: number; playerScore: number | null; opponentScore: number | null; won: boolean; isTie: boolean }>;
  }> = [];

  let totalMatchesWon = 0;
  let totalMatchesLost = 0;
  let totalGamesWon = 0;
  let totalGamesLost = 0;
  let totalGamePoints = 0;
  let gamesWithPointsCount = 0;

  for (const tier of tournament.tiers) {
    const tColor = tier.primaryColor || '#f59e0b';
    for (const round of tier.bracket.rounds) {
      for (const match of round.matches) {
        if (match.isBye) continue;

        const isP1 = match.player1.player?.id === player.id;
        const isP2 = match.player2.player?.id === player.id;
        if (!isP1 && !isP2) continue;

        const opponent = isP1 ? match.player2.player : match.player1.player;
        const record = tournament.matchScores[match.id];

        const playerWins = record ? (isP1 ? record.player1Wins : record.player2Wins) : 0;
        const opponentWins = record ? (isP1 ? record.player2Wins : record.player1Wins) : 0;
        const isComplete = Boolean(record?.isComplete);
        const isWinner = record?.winnerPlayerId === player.id;
        const isForfeit = Boolean(record?.forfeitWinnerId) || record?.notes === 'Forfeit win';

        if (isComplete) {
          if (isWinner) totalMatchesWon++;
          else totalMatchesLost++;
        }
        totalGamesWon += playerWins;
        totalGamesLost += opponentWins;

        const matchGames = (record?.games || []).map(g => {
          const pScore = isP1 ? g.player1Points : g.player2Points;
          const oppScore = isP1 ? g.player2Points : g.player1Points;
          const won = g.winnerPlayerId === player.id;
          const isTie = g.winnerPlayerId === 'TIE' || (typeof pScore === 'number' && pScore === oppScore && pScore > 0);
          if (typeof pScore === 'number') {
            totalGamePoints += pScore;
            gamesWithPointsCount++;
          }
          return {
            gameNumber: g.gameNumber,
            playerScore: pScore,
            opponentScore: oppScore,
            won,
            isTie,
          };
        });

        playerMatches.push({
          matchId: match.id,
          tierName: tier.name,
          tierColor: tColor,
          roundName: round.name,
          opponentName: opponent?.name || 'TBD',
          opponentSeed: opponent?.seed,
          playerWins,
          opponentWins,
          isWinner,
          isComplete,
          isForfeit,
          games: matchGames,
        });
      }
    }
  }

  const overallAvgScore = gamesWithPointsCount > 0
    ? Math.round(totalGamePoints / gamesWithPointsCount)
    : 0;

  const tierColor = effectiveRankRow?.assignedTier?.primaryColor || '#f59e0b';

  return (
    <div style={overlayStyle}>
      <div style={drawerStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              {/* Final Place Badge (if determined) */}
              {finalPlace !== '—' && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    background: effectiveStanding?.finalRank === 1 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    color: effectiveStanding?.finalRank === 1 ? 'var(--color-gold-bright)' : 'var(--color-text-primary)',
                    border: effectiveStanding?.finalRank === 1 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--color-border)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  <Trophy size={12} />
                  Final: {finalPlace}
                </span>
              )}

              {/* Bracket Seed Badge (if locked and assigned to a tier) */}
              {bracketSeed !== '—' && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    background: colorWithAlpha(tierColor, 0.2, 'rgba(245, 158, 11, 0.15)'),
                    color: tierColor,
                    border: `1px solid ${colorWithAlpha(tierColor, 0.4, 'transparent')}`,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  <Flame size={12} />
                  Bracket: {bracketSeed}
                </span>
              )}

              {/* Overall Qual Seed Badge (if qualified/ranked) */}
              {overallQualSeed !== '—' && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  Qual: {overallQualSeed}
                </span>
              )}

              {/* Playstyle */}
              {player.playstyle && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    background:
                      player.playstyle === 'Rolling'
                        ? 'rgba(56, 189, 248, 0.15)'
                        : player.playstyle === 'Hypertap'
                        ? 'rgba(244, 63, 94, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                    color:
                      player.playstyle === 'Rolling'
                        ? '#38bdf8'
                        : player.playstyle === 'Hypertap'
                        ? '#fb7185'
                        : '#fbbf24',
                  }}
                >
                  {player.playstyle}
                </span>
              )}

              {/* Country */}
              {player.country && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.06)', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)' }}>
                  {player.country}
                </span>
              )}
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
              {player.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Section 1: Player Profile Details */}
          <div style={cardSectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <User size={16} color="var(--color-gold-bright)" />
              <h3 style={sectionTitleStyle}>Competitor Profile</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              <div style={statBoxStyle}>
                <span style={statLabelStyle}>Personal Best</span>
                <span className="tabular-nums" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-gold-bright)' }}>
                  {player.personalBest ? player.personalBest.toLocaleString() : '—'}
                </span>
              </div>

              <div style={statBoxStyle}>
                <span style={statLabelStyle}>Playstyle</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {player.playstyle || 'Standard'}
                </span>
              </div>

              <div style={statBoxStyle}>
                <span style={statLabelStyle}>Assigned Tier</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: effectiveRankRow?.assignedTier ? tierColor : 'var(--color-text-muted)' }}>
                  {assignedTierDisplay}
                </span>
              </div>

              <div style={statBoxStyle}>
                <span style={statLabelStyle}>Overall Qual Seed</span>
                <span className="tabular-nums" style={{ fontSize: '1.05rem', fontWeight: 700, color: overallQualSeed !== '—' ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                  {overallQualSeed}
                </span>
              </div>

              <div style={statBoxStyle}>
                <span style={statLabelStyle}>Bracket Seed</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: bracketSeed !== '—' ? tierColor : 'var(--color-text-muted)' }}>
                  {bracketSeed}
                </span>
              </div>

              <div style={statBoxStyle}>
                <span style={statLabelStyle}>Final Place</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: finalPlace !== '—' ? (effectiveStanding?.finalRank === 1 ? 'var(--color-gold-bright)' : 'var(--color-text-primary)') : 'var(--color-text-muted)' }}>
                  {finalPlace}
                </span>
              </div>
            </div>

            {player.notes && (
              <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.04)', fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--color-text-primary)' }}>Notes:</strong> {player.notes}
              </div>
            )}
          </div>

          {/* Section 2: Tournament Match Play History */}
          <div style={cardSectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Swords size={16} color="var(--color-gold-bright)" />
                <h3 style={sectionTitleStyle}>Bracket Match Play Record</h3>
              </div>

              {playerMatches.length > 0 && (
                <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.75rem' }} className="tabular-nums">
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Matches: <strong style={{ color: '#ffffff' }}>{totalMatchesWon}–{totalMatchesLost}</strong>
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Games: <strong style={{ color: '#ffffff' }}>{totalGamesWon}–{totalGamesLost}</strong>
                  </span>
                  {overallAvgScore > 0 && (
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      Avg: <strong style={{ color: 'var(--color-gold-bright)' }}>{overallAvgScore.toLocaleString()}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>

            {!tournament.isLocked && playerMatches.length === 0 ? (
              <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                Tournament is currently in <strong>Qualifiers Mode</strong>. Bracket matches and game logs will appear here once brackets are locked into Match Play Mode.
              </div>
            ) : playerMatches.length === 0 ? (
              <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                No bracket matches scheduled or recorded for this competitor yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {playerMatches.map((m, idx) => (
                  <div
                    key={m.matchId || idx}
                    style={{
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border-subtle)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Match Header Bar */}
                    <div
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: 'var(--color-bg-surface-highlight)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid var(--color-border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: m.tierColor }}>
                          {m.tierName}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>•</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {m.roundName}
                        </span>
                      </div>

                      {m.isComplete ? (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.45rem',
                            borderRadius: 'var(--radius-sm)',
                            background: m.isWinner ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                            color: m.isWinner ? '#34d399' : '#fb7185',
                          }}
                        >
                          {m.isWinner ? 'VICTORY' : 'DEFEAT'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                          In Progress
                        </span>
                      )}
                    </div>

                    {/* Match Score & Opponent */}
                    <div style={{ padding: '0.65rem 0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                          vs <strong style={{ color: '#ffffff' }}>{m.opponentName}</strong>
                          {m.opponentSeed && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.3rem' }}>
                              (Seed #{m.opponentSeed})
                            </span>
                          )}
                        </div>

                        <div className="tabular-nums" style={{ fontSize: '1rem', fontWeight: 800 }}>
                          <span style={{ color: m.isWinner ? '#34d399' : 'var(--color-text-primary)' }}>{m.playerWins}</span>
                          <span style={{ color: 'var(--color-text-muted)', margin: '0 0.2rem' }}>–</span>
                          <span style={{ color: !m.isWinner && m.isComplete ? '#fb7185' : 'var(--color-text-secondary)' }}>{m.opponentWins}</span>
                        </div>
                      </div>

                      {/* Game-by-game scores if recorded */}
                      {m.games.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.4rem' }}>
                          {m.games.map(g => (
                            <div
                              key={g.gameNumber}
                              className="tabular-nums"
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.72rem',
                                color: 'var(--color-text-muted)',
                              }}
                            >
                              <span>Game {g.gameNumber}:{g.isTie ? ' (TIE)' : ''}</span>
                              <span>
                                <strong style={{ color: g.isTie ? '#38bdf8' : g.won ? '#34d399' : 'var(--color-text-secondary)' }}>
                                  {g.playerScore !== null ? g.playerScore.toLocaleString() : '—'}
                                </strong>
                                {' vs '}
                                <span style={{ color: g.isTie ? '#38bdf8' : !g.won && g.playerScore !== null ? '#fb7185' : 'var(--color-text-muted)' }}>
                                  {g.opponentScore !== null ? g.opponentScore.toLocaleString() : '—'}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Qual Submissions Audit Log */}
          <div style={cardSectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={16} color="var(--color-gold-bright)" />
                <h3 style={sectionTitleStyle}>Qual Submissions</h3>
              </div>
              <span className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {playerSubmissions.length} {playerSubmissions.length === 1 ? 'submission' : 'submissions'} logged
              </span>
            </div>

            {playerSubmissions.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                No qual submissions logged yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {playerSubmissions.map((sub, idx) => {
                  const isMaxout = sub.score >= MAXOUT_THRESHOLD;
                  const isKicker = tournament.qualFormat === 'HIGH_SCORE' && sub.score === effectiveRankRow?.kickerScore && sub.score < MAXOUT_THRESHOLD;
                  const isBest = tournament.qualFormat === 'HIGH_SCORE' && sub.score === effectiveRankRow?.finalScore;

                  return (
                    <div
                      key={sub.id}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        background: isMaxout
                          ? 'rgba(245, 158, 11, 0.12)'
                          : isKicker
                          ? 'rgba(56, 189, 248, 0.08)'
                          : 'var(--color-bg-surface)',
                        border: isMaxout
                          ? '1px solid rgba(245, 158, 11, 0.35)'
                          : isKicker
                          ? '1px solid rgba(56, 189, 248, 0.25)'
                          : '1px solid var(--color-border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          className="tabular-nums"
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'var(--color-bg-surface-elevated)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {idx + 1}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span className="tabular-nums" style={{ fontWeight: 700, fontSize: '0.95rem', color: isMaxout ? 'var(--color-gold-bright)' : '#ffffff' }}>
                              {sub.score.toLocaleString()}
                            </span>

                            {isMaxout && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'rgba(245, 158, 11, 0.25)',
                                  color: 'var(--color-gold-bright)',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                }}
                              >
                                <Sparkles size={11} /> MAXOUT
                              </span>
                            )}

                            {isKicker && (
                              <span
                                style={{
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'rgba(56, 189, 248, 0.2)',
                                  color: '#38bdf8',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                }}
                              >
                                KICKER
                              </span>
                            )}

                            {isBest && !isMaxout && (
                              <span
                                style={{
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  color: 'var(--color-text-secondary)',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                }}
                              >
                                Best
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                            <Clock size={11} />
                            <span>
                              {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {' • '}
                              {new Date(sub.submittedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Format Result Contribution */}
                      <div style={{ textAlign: 'right' }}>
                        {tournament.qualFormat === 'POINTS' ? (
                          <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-gold-bright)', fontSize: '0.85rem' }}>
                            {/* Points earned */}
                            {(() => {
                              const sorted = [...(tournament.pointsConfig || [])].sort((a, b) => b.minScore - a.minScore);
                              const match = sorted.find(t => sub.score >= t.minScore);
                              return match ? `+${match.points} pts` : '+0 pts';
                            })()}
                          </span>
                        ) : tournament.qualFormat === 'HIGH_SCORE' ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {isMaxout ? 'Maxout' : isKicker ? 'Kicker' : 'Attempt'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            Logged
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }}
          >
            Close
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
  backdropFilter: 'blur(4px)',
  display: 'flex',
  justifyContent: 'flex-end',
  zIndex: 1000,
  animation: 'fadeIn 0.2s ease-out',
};

const drawerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '500px',
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

const cardSectionStyle: React.CSSProperties = {
  background: 'var(--color-bg-surface-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '1rem',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 700,
  color: 'var(--color-text-primary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const statBoxStyle: React.CSSProperties = {
  padding: '0.5rem 0.65rem',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border-subtle)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15rem',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
};

const footerStyle: React.CSSProperties = {
  padding: '1rem 1.25rem',
  borderTop: '1px solid var(--color-border)',
  background: 'var(--color-bg-surface-elevated)',
};
