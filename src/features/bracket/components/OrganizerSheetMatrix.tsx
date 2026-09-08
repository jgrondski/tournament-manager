import React, { useState, useMemo } from 'react';
import { Tournament, TournamentTier, MatchScoreRecord } from '../../tournament/types';
import { BracketMatch, isMatchPlayable } from '../types';
import { MatchScoreDrawer } from './MatchScoreDrawer';
import { BracketDraftBanner } from './BracketDraftBanner';
import { Filter, Check, ChevronDown, Trophy, Clock, CheckCircle2 } from 'lucide-react';

interface OrganizerSheetMatrixProps {
  tournament: Tournament;
  tier: TournamentTier;
}

// Compute status for any match
function getMatchStatus(match: BracketMatch, record?: MatchScoreRecord, defaultBestOf: number = 5) {
  const currentBestOf = record?.bestOf || match.bestOf || defaultBestOf;
  const threshold = Math.ceil(currentBestOf / 2);
  const p1Wins = record?.player1Wins || 0;
  const p2Wins = record?.player2Wins || 0;

  const p1Id = match.player1.player?.id;
  const p2Id = match.player2.player?.id;
  const hasWinner = Boolean((p1Id && match.winnerId === p1Id) || (p2Id && match.winnerId === p2Id) || record?.isComplete);

  if (hasWinner || p1Wins >= threshold || p2Wins >= threshold) {
    return { label: 'Complete', type: 'complete' as const };
  }
  const hasAnyGameScore = record?.games.some(g => g.player1Points !== null || g.player2Points !== null || g.winnerPlayerId !== null);
  if (hasAnyGameScore || p1Wins > 0 || p2Wins > 0) {
    return { label: 'In Progress', type: 'in_progress' as const };
  }
  return { label: 'Not Started', type: 'not_started' as const };
}

export const OrganizerSheetMatrix: React.FC<OrganizerSheetMatrixProps> = ({ tournament, tier }) => {
  const [selectedMatch, setSelectedMatch] = useState<{ match: BracketMatch; roundName: string } | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [hoveredMatchId, setHoveredMatchId] = useState<string | null>(null);

  // Available rounds in this tier
  const allRounds = tier.bracket.rounds;
  const roundNames = useMemo(() => allRounds.map(r => r.name), [allRounds]);

  // Selected round filter: 'ALL' or a Set of round names
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETE' | string[]>('ALL');

  // Filtered rounds and matches
  const filteredRounds = useMemo(() => {
    return allRounds
      .map(round => {
        const matches = round.matches.filter(m => {
          const record = tournament.matchScores[m.id];
          const status = getMatchStatus(m, record);

          if (selectedRoundFilter === 'ALL') return true;
          if (selectedRoundFilter === 'IN_PROGRESS') return status.type === 'in_progress';
          if (selectedRoundFilter === 'COMPLETE') return status.type === 'complete';
          if (Array.isArray(selectedRoundFilter)) {
            return selectedRoundFilter.includes(round.name);
          }
          return true;
        });

        return {
          ...round,
          filteredMatches: matches,
        };
      })
      .filter(round => round.filteredMatches.length > 0);
  }, [allRounds, tournament.matchScores, selectedRoundFilter]);

  // Round telemetry
  const telemetry = useMemo(() => {
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let topScore = 0;
    let topScorer = '';

    for (const round of allRounds) {
      for (const m of round.matches) {
        if (m.isBye) continue;
        total++;
        const rec = tournament.matchScores[m.id];
        const status = getMatchStatus(m, rec);
        if (status.type === 'complete') completed++;
        if (status.type === 'in_progress') inProgress++;

        rec?.games.forEach(g => {
          if (g.player1Points && g.player1Points > topScore) {
            topScore = g.player1Points;
            topScorer = m.player1.player?.name || 'Player 1';
          }
          if (g.player2Points && g.player2Points > topScore) {
            topScore = g.player2Points;
            topScorer = m.player2.player?.name || 'Player 2';
          }
        });
      }
    }

    return { total, completed, inProgress, topScore, topScorer };
  }, [allRounds, tournament.matchScores]);

  const toggleRoundFilter = (roundName: string) => {
    if (Array.isArray(selectedRoundFilter)) {
      if (selectedRoundFilter.includes(roundName)) {
        const next = selectedRoundFilter.filter(r => r !== roundName);
        setSelectedRoundFilter(next.length === 0 ? 'ALL' : next);
      } else {
        setSelectedRoundFilter([...selectedRoundFilter, roundName]);
      }
    } else {
      setSelectedRoundFilter([roundName]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <BracketDraftBanner tournament={tournament} />

      {/* Top Filter & Telemetry Bar */}
      <div style={telemetryBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Multi-Select Round Filter Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            >
              <Filter size={16} />
              <span>
                Round Filter:{' '}
                <strong>
                  {selectedRoundFilter === 'ALL'
                    ? 'All Rounds'
                    : selectedRoundFilter === 'IN_PROGRESS'
                    ? 'In Progress Only'
                    : selectedRoundFilter === 'COMPLETE'
                    ? 'Completed Only'
                    : `${selectedRoundFilter.length} Selected`}
                </strong>
              </span>
              <ChevronDown size={14} />
            </button>

            {isFilterDropdownOpen && (
              <div style={dropdownMenuStyle} onClick={e => e.stopPropagation()}>
                <div style={dropdownSectionHeaderStyle}>Filter Presets</div>
                <button
                  style={dropdownItemStyle}
                  onClick={() => {
                    setSelectedRoundFilter('ALL');
                    setIsFilterDropdownOpen(false);
                  }}
                >
                  <span style={{ width: 16 }}>{selectedRoundFilter === 'ALL' && <Check size={14} />}</span>
                  <span>All Rounds</span>
                </button>
                <button
                  style={dropdownItemStyle}
                  onClick={() => {
                    setSelectedRoundFilter('IN_PROGRESS');
                    setIsFilterDropdownOpen(false);
                  }}
                >
                  <span style={{ width: 16 }}>{selectedRoundFilter === 'IN_PROGRESS' && <Check size={14} />}</span>
                  <span>In Progress Only</span>
                </button>
                <button
                  style={dropdownItemStyle}
                  onClick={() => {
                    setSelectedRoundFilter('COMPLETE');
                    setIsFilterDropdownOpen(false);
                  }}
                >
                  <span style={{ width: 16 }}>{selectedRoundFilter === 'COMPLETE' && <Check size={14} />}</span>
                  <span>Completed Only</span>
                </button>

                <div style={{ ...dropdownSectionHeaderStyle, marginTop: '0.5rem' }}>Individual Rounds</div>
                {roundNames.map(rName => {
                  const isChecked = Array.isArray(selectedRoundFilter) && selectedRoundFilter.includes(rName);
                  return (
                    <button
                      key={rName}
                      style={dropdownItemStyle}
                      onClick={() => toggleRoundFilter(rName)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        style={{ accentColor: 'var(--color-gold)', cursor: 'pointer' }}
                      />
                      <span>{rName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Telemetry Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.85rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-secondary)' }}>
              <CheckCircle2 size={16} color="var(--color-green)" />
              Matches: <strong style={{ color: 'var(--color-text-primary)' }}>{telemetry.completed} / {telemetry.total}</strong>
            </span>
            {telemetry.inProgress > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-gold-bright)' }}>
                <Clock size={16} />
                Live: <strong>{telemetry.inProgress} active</strong>
              </span>
            )}
            {telemetry.topScore > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-cyan)' }}>
                <Trophy size={16} />
                Tier High: <strong className="tabular-nums">{telemetry.topScore.toLocaleString()}</strong> by {telemetry.topScorer}
              </span>
            )}
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          Click any match row to edit scores in the inspector drawer
        </div>
      </div>

      {/* Main Sheet Matrix Table */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-surface)' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={tableHeaderRowStyle}>
              <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>Match #</th>
              <th style={{ ...thStyle, width: '120px' }}>Round</th>
              <th style={{ ...thStyle, width: '75px', textAlign: 'center' }}>Best Of</th>
              <th style={{ ...thStyle, minWidth: '200px' }}>Seed & Player</th>
              <th style={{ ...thStyle, width: '90px', textAlign: 'center' }}>Series</th>
              <th style={{ ...thStyle, width: '105px', textAlign: 'right' }}>Game 1</th>
              <th style={{ ...thStyle, width: '105px', textAlign: 'right' }}>Game 2</th>
              <th style={{ ...thStyle, width: '105px', textAlign: 'right' }}>Game 3</th>
              <th style={{ ...thStyle, width: '105px', textAlign: 'right' }}>Game 4</th>
              <th style={{ ...thStyle, width: '105px', textAlign: 'right' }}>Game 5</th>
              <th style={{ ...thStyle, width: '120px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>

          <tbody>
            {filteredRounds.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                  No matches found matching the current filter.
                </td>
              </tr>
            ) : (
              filteredRounds.map((round) => (
                <React.Fragment key={round.roundNumber}>
                  {/* Sticky Round Divider Banner */}
                  <tr style={roundDividerRowStyle}>
                    <td colSpan={11} style={roundDividerCellStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>
                          <strong>{round.name}</strong> • {round.filteredMatches.length} Matches
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                          {round.filteredMatches.filter(m => getMatchStatus(m, tournament.matchScores[m.id]).type === 'complete').length} / {round.filteredMatches.length} Complete
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* 2-Row Match Blocks */}
                  {round.filteredMatches.map((match, matchIdx) => {
                    const record = tournament.matchScores[match.id];
                    const status = getMatchStatus(match, record);
                    const isHovered = hoveredMatchId === match.id;
                    const isEvenBlock = matchIdx % 2 === 0;

                    const p1 = match.player1.player;
                    const p2 = match.player2.player;
                    const p1Name = p1?.name || (match.player1.sourceMatchId ? `Winner of Match #${tier.bracket.matchesById[match.player1.sourceMatchId]?.matchNumber || '?'}` : 'TBD');
                    const p2Name = p2?.name || (match.player2.sourceMatchId ? `Winner of Match #${tier.bracket.matchesById[match.player2.sourceMatchId]?.matchNumber || '?'}` : 'TBD');

                    const p1Wins = record?.player1Wins || 0;
                    const p2Wins = record?.player2Wins || 0;
                    const matchBestOf = record?.bestOf || match.bestOf || tier.bestOf || 5;

                    const p1IsWinner = Boolean(p1?.id && (match.winnerId === p1.id || (record?.isComplete && record?.winnerPlayerId === p1.id)));
                    const p2IsWinner = Boolean(p2?.id && (match.winnerId === p2.id || (record?.isComplete && record?.winnerPlayerId === p2.id)));
                    const isPlayable = isMatchPlayable(match);

                    // Block background color for alternating match groups
                    const blockBg = isHovered
                      ? 'rgba(245, 158, 11, 0.08)'
                      : isEvenBlock
                      ? 'var(--color-bg-surface)'
                      : 'var(--color-bg-surface-elevated)';

                    const borderTopStyle = '2px solid var(--color-border)';

                    return (
                      <React.Fragment key={match.id}>
                        {/* Row 1: Player 1 */}
                        <tr
                          onClick={() => {
                            if (isPlayable && tournament.isVerified) setSelectedMatch({ match, roundName: round.name });
                          }}
                          onMouseEnter={() => setHoveredMatchId(match.id)}
                          onMouseLeave={() => setHoveredMatchId(null)}
                          style={{
                            background: blockBg,
                            cursor: isPlayable && tournament.isVerified ? 'pointer' : 'default',
                            opacity: isPlayable ? 1 : 0.75,
                            transition: 'background 0.1s ease',
                          }}
                        >
                          {/* Match # (RowSpan 2) */}
                          <td rowSpan={2} style={{ ...tdMergedStyle, borderTop: borderTopStyle, textAlign: 'center', fontWeight: 700 }}>
                            <span className="badge badge-gold" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
                              #{match.matchNumber}
                            </span>
                          </td>

                          {/* Round Name (RowSpan 2) */}
                          <td rowSpan={2} style={{ ...tdMergedStyle, borderTop: borderTopStyle, color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                            {round.name}
                          </td>

                          {/* Best Of (RowSpan 2) */}
                          <td rowSpan={2} style={{ ...tdMergedStyle, borderTop: borderTopStyle, textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            Bo{matchBestOf}
                          </td>

                          {/* Player 1 Seed & Name */}
                          <td style={{ ...tdStyle, borderTop: borderTopStyle }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {p1?.seed && (
                                <span style={seedBadgeStyle}>#{p1.seed}</span>
                              )}
                              <span style={{ fontWeight: p1IsWinner ? 700 : 500, color: p1IsWinner ? 'var(--color-gold-bright)' : 'var(--color-text-primary)' }}>
                                {p1Name}
                              </span>
                              {p1IsWinner && <Trophy size={14} color="#fbbf24" />}
                            </div>
                          </td>

                          {/* Player 1 Series Score */}
                          <td style={{ ...tdStyle, borderTop: borderTopStyle, textAlign: 'center', fontWeight: 700, fontSize: '1rem', color: p1IsWinner ? 'var(--color-gold-bright)' : 'var(--color-text-primary)' }}>
                            <span className="tabular-nums">{p1Wins}</span>
                          </td>

                          {/* Games 1 to 5 for Player 1 */}
                          {[1, 2, 3, 4, 5].map(gNum => {
                            const isBeyondBestOf = gNum > matchBestOf;
                            const game = record?.games.find(g => g.gameNumber === gNum);
                            const p1Pts = game?.player1Points;
                            const p2Pts = game?.player2Points;
                            const p1WonGame = game?.winnerPlayerId === p1?.id || (p1Pts !== null && p2Pts !== null && p1Pts !== undefined && p2Pts !== undefined && p1Pts > p2Pts);

                            return (
                              <td
                                key={gNum}
                                style={{
                                  ...tdStyle,
                                  borderTop: borderTopStyle,
                                  textAlign: 'right',
                                  color: isBeyondBestOf ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                                  opacity: isBeyondBestOf ? 0.3 : 1,
                                }}
                              >
                                {isBeyondBestOf ? (
                                  '—'
                                ) : p1Pts !== null && p1Pts !== undefined ? (
                                  <span
                                    className="tabular-nums"
                                    style={{
                                      padding: '0.15rem 0.4rem',
                                      borderRadius: 'var(--radius-sm)',
                                      background: p1WonGame ? 'var(--color-gold-bg)' : 'transparent',
                                      color: p1WonGame ? 'var(--color-gold-bright)' : 'inherit',
                                      fontWeight: p1WonGame ? 700 : 400,
                                      border: p1WonGame ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
                                      display: 'inline-block',
                                    }}
                                  >
                                    {p1Pts.toLocaleString()}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--color-border)' }}>·</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Status (RowSpan 2) */}
                          <td rowSpan={2} style={{ ...tdMergedStyle, borderTop: borderTopStyle, textAlign: 'center' }}>
                            {status.type === 'complete' && (
                              <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>Complete</span>
                            )}
                            {status.type === 'in_progress' && (
                              <span className="badge badge-gold animate-pulse-border" style={{ fontSize: '0.75rem' }}>Live</span>
                            )}
                            {status.type === 'not_started' && (
                              <span className="badge badge-muted" style={{ fontSize: '0.75rem' }}>Waiting</span>
                            )}
                          </td>
                        </tr>

                        {/* Row 2: Player 2 */}
                        <tr
                          onClick={() => {
                            if (isPlayable && tournament.isVerified) setSelectedMatch({ match, roundName: round.name });
                          }}
                          onMouseEnter={() => setHoveredMatchId(match.id)}
                          onMouseLeave={() => setHoveredMatchId(null)}
                          style={{
                            background: blockBg,
                            cursor: isPlayable && tournament.isVerified ? 'pointer' : 'default',
                            opacity: isPlayable ? 1 : 0.75,
                            transition: 'background 0.1s ease',
                          }}
                        >
                          {/* Player 2 Seed & Name */}
                          <td style={{ ...tdStyle, borderBottom: '1px solid var(--color-border-subtle)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {p2?.seed && (
                                <span style={seedBadgeStyle}>#{p2.seed}</span>
                              )}
                              <span style={{ fontWeight: p2IsWinner ? 700 : 500, color: p2IsWinner ? 'var(--color-gold-bright)' : 'var(--color-text-primary)' }}>
                                {p2Name}
                              </span>
                              {p2IsWinner && <Trophy size={14} color="#fbbf24" />}
                            </div>
                          </td>

                          {/* Player 2 Series Score */}
                          <td style={{ ...tdStyle, borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'center', fontWeight: 700, fontSize: '1rem', color: p2IsWinner ? 'var(--color-gold-bright)' : 'var(--color-text-primary)' }}>
                            <span className="tabular-nums">{p2Wins}</span>
                          </td>

                          {/* Games 1 to 5 for Player 2 */}
                          {[1, 2, 3, 4, 5].map(gNum => {
                            const isBeyondBestOf = gNum > matchBestOf;
                            const game = record?.games.find(g => g.gameNumber === gNum);
                            const p1Pts = game?.player1Points;
                            const p2Pts = game?.player2Points;
                            const p2WonGame = game?.winnerPlayerId === p2?.id || (p1Pts !== null && p2Pts !== null && p1Pts !== undefined && p2Pts !== undefined && p2Pts > p1Pts);

                            return (
                              <td
                                key={gNum}
                                style={{
                                  ...tdStyle,
                                  borderBottom: '1px solid var(--color-border-subtle)',
                                  textAlign: 'right',
                                  color: isBeyondBestOf ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                                  opacity: isBeyondBestOf ? 0.3 : 1,
                                }}
                              >
                                {isBeyondBestOf ? (
                                  '—'
                                ) : p2Pts !== null && p2Pts !== undefined ? (
                                  <span
                                    className="tabular-nums"
                                    style={{
                                      padding: '0.15rem 0.4rem',
                                      borderRadius: 'var(--radius-sm)',
                                      background: p2WonGame ? 'var(--color-gold-bg)' : 'transparent',
                                      color: p2WonGame ? 'var(--color-gold-bright)' : 'inherit',
                                      fontWeight: p2WonGame ? 700 : 400,
                                      border: p2WonGame ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
                                      display: 'inline-block',
                                    }}
                                  >
                                    {p2Pts.toLocaleString()}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--color-border)' }}>·</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-out Scorekeeper Drawer */}
      {selectedMatch && (
        <MatchScoreDrawer
          isOpen={true}
          onClose={() => setSelectedMatch(null)}
          tournamentId={tournament.id}
          tierId={tier.id}
          match={selectedMatch.match}
          matchScoreRecord={tournament.matchScores[selectedMatch.match.id]}
          roundName={selectedMatch.roundName}
        />
      )}
    </div>
  );
};

const telemetryBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.75rem 1rem',
  background: 'var(--color-bg-surface-elevated)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  flexWrap: 'wrap',
  gap: '0.75rem',
};

const dropdownMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  background: 'var(--color-bg-surface-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-lg)',
  zIndex: 100,
  minWidth: '240px',
  padding: '0.5rem',
  maxHeight: '340px',
  overflowY: 'auto',
};

const dropdownSectionHeaderStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  padding: '0.25rem 0.5rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
};

const dropdownItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  width: '100%',
  padding: '0.45rem 0.6rem',
  background: 'transparent',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text-primary)',
  fontSize: '0.85rem',
  cursor: 'pointer',
  textAlign: 'left',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  fontSize: '0.875rem',
};

const tableHeaderRowStyle: React.CSSProperties = {
  background: 'var(--color-bg-surface-highlight)',
  borderBottom: '2px solid var(--color-border)',
};

const thStyle: React.CSSProperties = {
  padding: '0.75rem 0.85rem',
  color: 'var(--color-text-secondary)',
  fontWeight: 600,
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: '2px solid var(--color-border)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.6rem 0.85rem',
  verticalAlign: 'middle',
};

const tdMergedStyle: React.CSSProperties = {
  padding: '0.6rem 0.85rem',
  verticalAlign: 'middle',
  borderRight: '1px solid var(--color-border-subtle)',
};

const roundDividerRowStyle: React.CSSProperties = {
  background: 'var(--color-bg-base)',
};

const roundDividerCellStyle: React.CSSProperties = {
  padding: '0.6rem 1rem',
  fontSize: '0.8rem',
  color: 'var(--color-gold-bright)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderTop: '2px solid var(--color-border)',
  borderBottom: '1px solid var(--color-border)',
};

const seedBadgeStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  padding: '0.1rem 0.35rem',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(255, 255, 255, 0.08)',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-mono)',
};
