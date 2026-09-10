import React, { useState } from 'react';
import { Tournament, PlayerProfile } from '../../tournament/types';
import { deriveLeaderboard, LeaderboardRankRow, calculatePoints } from '../scoring';
import { QualifierEntryModal } from './QualifierEntryModal';
import { PlayerDetailDrawer } from './PlayerDetailDrawer';
import { Search, Trophy, Plus, AlertOctagon, User, Sparkles, ChevronRight } from 'lucide-react';

interface LeaderboardTableProps {
  tournament: Tournament;
  canManage?: boolean;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  tournament,
  canManage = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(null);
  const [selectedRankRow, setSelectedRankRow] = useState<LeaderboardRankRow | undefined>(undefined);

  const allRows = deriveLeaderboard(tournament);
  const filteredRows = allRows.filter(r =>
    r.player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate cutoff rank boundaries for dividers
  const sortedTiers = [...tournament.tiers].sort((a, b) => a.priority - b.priority);
  const cutoffRanks = new Map<number, { tierName: string; color: string; count: number }>();
  let runningCutoff = 0;
  sortedTiers.forEach(tier => {
    runningCutoff += tier.playerCount;
    cutoffRanks.set(runningCutoff, {
      tierName: tier.name,
      color: tier.primaryColor || '#f59e0b',
      count: tier.playerCount,
    });
  });

  const format = tournament.qualFormat;
  const targetX = tournament.qualAverageCount || 2;
  const tableColSpan = format === 'HIGH_SCORE' ? 6 : 5;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header with Search & Score Submission Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy color="var(--color-gold-bright)" size={24} />
            Qualifying Leaderboard
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Format: <strong style={{ color: 'var(--color-gold-bright)' }}>{tournament.qualFormat.replace(/_/g, ' ')}</strong>
            {tournament.qualFormat === 'AVERAGE_OF_X' && ` (Ao${targetX})`}
            {' • '}
            {tournament.isLocked ? 'Qualifiers Closed (Match Play in Progress)' : 'Qualifiers Open (Live Running Standings)'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search competitor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-surface)',
                color: 'var(--color-text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {canManage && (
            <button
              onClick={() => setIsEntryModalOpen(true)}
              className="btn btn-primary"
              disabled={tournament.isLocked}
              title={tournament.isLocked ? 'Qualifiers are locked during Match Play Mode' : undefined}
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.85rem',
                opacity: tournament.isLocked ? 0.5 : 1,
                cursor: tournament.isLocked ? 'not-allowed' : 'pointer',
              }}
            >
              <Plus size={16} />
              Submit Score
            </button>
          )}
        </div>
      </div>

      {/* Standings Table */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-surface-highlight)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ ...thStyle, width: '60px', textAlign: 'center' }}>Rank</th>
              <th style={{ ...thStyle, minWidth: '220px' }}>Competitor</th>

              {/* Format-Dense Columns */}
              {format === 'HIGH_SCORE' && (
                <>
                  <th style={{ ...thStyle, width: '180px', textAlign: 'center' }}>Maxouts &amp; Kicker</th>
                  <th style={{ ...thStyle, width: '140px', textAlign: 'right' }}>High Score</th>
                  <th style={{ ...thStyle, width: '110px', textAlign: 'center' }}>Attempts</th>
                </>
              )}

              {format === 'AVERAGE_OF_X' && (
                <>
                  <th style={{ ...thStyle, minWidth: '240px', textAlign: 'center' }}>Target Attempts (Ao{targetX})</th>
                  <th style={{ ...thStyle, width: '160px', textAlign: 'right' }}>Average Score</th>
                </>
              )}

              {format === 'POINTS' && (
                <>
                  <th style={{ ...thStyle, minWidth: '220px', textAlign: 'center' }}>Attempt Points Breakdown</th>
                  <th style={{ ...thStyle, width: '140px', textAlign: 'right' }}>Total Points</th>
                </>
              )}

              <th style={{ ...thStyle, width: '150px', textAlign: 'center' }}>Bracket Seed</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={tableColSpan} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No competitors found matching &quot;{searchTerm}&quot;.
                </td>
              </tr>
            ) : (
              filteredRows.map((row: LeaderboardRankRow, idx) => {
                const isRankNumeric = typeof row.rank === 'number';
                const cutoffInfo = isRankNumeric ? cutoffRanks.get(row.rank as number) : undefined;

                // Subtle tier color row tinting
                let rowBg = idx % 2 === 0 ? 'var(--color-bg-surface)' : 'var(--color-bg-surface-elevated)';
                if (row.assignedTier?.primaryColor) {
                  rowBg = `${row.assignedTier.primaryColor}0d`; // ~5% opacity tint
                } else if (row.isDisqualified) {
                  rowBg = 'rgba(239, 68, 68, 0.05)';
                }

                return (
                  <React.Fragment key={row.player.id}>
                    <tr
                      onClick={() => {
                        setSelectedPlayer(row.player);
                        setSelectedRankRow(row);
                      }}
                      title="Click to view detailed competitor profile, audit log, and match stats"
                      style={{
                        background: rowBg,
                        borderBottom: '1px solid var(--color-border-subtle)',
                        transition: 'all 0.15s ease',
                        cursor: 'pointer',
                      }}
                    >
                      {/* Rank */}
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                        {row.isDisqualified ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--color-red-bg)',
                              color: '#f87171',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                            }}
                          >
                            DQ
                          </span>
                        ) : (
                          <span
                            className="tabular-nums"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background:
                                typeof row.rank === 'number' && row.rank <= 3
                                  ? 'var(--color-gold-bg)'
                                  : 'rgba(255,255,255,0.05)',
                              color:
                                typeof row.rank === 'number' && row.rank <= 3
                                  ? 'var(--color-gold-bright)'
                                  : 'var(--color-text-secondary)',
                              fontSize: '0.8rem',
                            }}
                          >
                            {row.rank}
                          </span>
                        )}
                      </td>

                      {/* Player Info */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <User size={14} color="var(--color-text-muted)" />
                          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {row.player.name}
                          </span>
                          {row.player.playstyle && (
                            <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>
                              {row.player.playstyle}
                            </span>
                          )}
                          {row.player.country && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-sm)' }}>
                              {row.player.country}
                            </span>
                          )}
                          {row.isDisqualified && (
                            <span style={{ color: 'var(--color-red)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem' }}>
                              <AlertOctagon size={12} /> DQ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Format-Dense Column Layout */}
                      {format === 'HIGH_SCORE' && (
                        <>
                          {/* Maxout & Kicker Column */}
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            {row.maxoutCount && row.maxoutCount > 0 ? (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: 'var(--radius-full)',
                                    background: 'rgba(245, 158, 11, 0.22)',
                                    color: 'var(--color-gold-bright)',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    border: '1px solid rgba(245, 158, 11, 0.4)',
                                    boxShadow: '0 0 8px rgba(245, 158, 11, 0.15)',
                                  }}
                                >
                                  <Sparkles size={11} /> {row.maxoutCount}x Max
                                </span>

                                {row.kickerScore && row.kickerScore > 0 ? (
                                  <span className="tabular-nums" style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                    Kicker: <strong style={{ color: 'var(--color-text-secondary)' }}>{row.kickerScore.toLocaleString()}</strong>
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                    No kicker
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                —
                              </span>
                            )}
                          </td>

                          {/* High Score Column */}
                          <td className="tabular-nums" style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: row.finalScore >= 999999 ? 'var(--color-gold-bright)' : '#ffffff' }}>
                            {row.finalScore > 0 ? row.finalScore.toLocaleString() : '—'}
                          </td>

                          {/* Attempts Count Column */}
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <span className="tabular-nums" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                              {row.attempts.length} {row.attempts.length === 1 ? 'att' : 'atts'}
                            </span>
                          </td>
                        </>
                      )}

                      {format === 'AVERAGE_OF_X' && (
                        <>
                          {/* Attempts Breakdown Chips */}
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                              {Array.from({ length: targetX }).map((_, slotIdx) => {
                                const score = row.attempts[slotIdx];
                                const hasScore = typeof score === 'number';
                                return (
                                  <span
                                    key={slotIdx}
                                    className="tabular-nums"
                                    style={{
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      background: hasScore ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                      color: hasScore ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                                      border: hasScore ? '1px solid var(--color-border-subtle)' : '1px dashed var(--color-border-subtle)',
                                    }}
                                  >
                                    {hasScore ? score.toLocaleString() : '—'}
                                  </span>
                                );
                              })}
                            </div>
                          </td>

                          {/* Average Score Column */}
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span className="tabular-nums" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-gold-bright)' }}>
                                {row.finalScore > 0 ? row.finalScore.toLocaleString() : '—'}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: row.attempts.length >= targetX ? '#34d399' : 'var(--color-text-muted)' }}>
                                {row.attempts.length >= targetX ? 'Completed' : `Running (${row.attempts.length}/${targetX})`}
                              </span>
                            </div>
                          </td>
                        </>
                      )}

                      {format === 'POINTS' && (
                        <>
                          {/* Points Breakdown per Attempt */}
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                              {(() => {
                                const submissionsForPlayer = (tournament.qualifierSubmissions || []).filter(s => s.playerId === row.player.id);
                                const ptsResult = calculatePoints(submissionsForPlayer, tournament.pointsConfig || []);
                                if (ptsResult.pointsPerAttempt.length === 0) {
                                  return <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No attempts</span>;
                                }
                                return ptsResult.pointsPerAttempt.map((pts, pIdx) => (
                                  <span
                                    key={pIdx}
                                    className="tabular-nums"
                                    style={{
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      background: pts > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                      color: pts > 0 ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
                                      border: pts > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--color-border-subtle)',
                                    }}
                                  >
                                    +{pts}
                                  </span>
                                ));
                              })()}
                            </div>
                          </td>

                          {/* Total Points Column */}
                          <td className="tabular-nums" style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, fontSize: '0.98rem', color: 'var(--color-gold-bright)' }}>
                            {row.finalScore} pts
                          </td>
                        </>
                      )}

                      {/* Tier Cutoff & Seed Column */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          {row.assignedTier && row.tierSeed !== undefined ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.6rem',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: `${row.assignedTier.primaryColor || '#f59e0b'}26`,
                                color: row.assignedTier.primaryColor || 'var(--color-gold-bright)',
                                border: `1px solid ${row.assignedTier.primaryColor || 'var(--color-gold)'}4d`,
                              }}
                            >
                              {row.assignedTier.name} #{row.tierSeed}
                            </span>
                          ) : row.isDisqualified ? (
                            <span className="badge badge-muted" style={{ color: '#f87171' }}>
                              Disqualified
                            </span>
                          ) : row.isDNQ ? (
                            <span className="badge badge-muted" title="Did Not Qualify for active brackets">
                              DNQ
                            </span>
                          ) : (
                            <span className="badge badge-muted">Pending</span>
                          )}

                          <ChevronRight size={14} color="var(--color-text-muted)" />
                        </div>
                      </td>
                    </tr>

                    {/* Dynamic Tier Cutoff Line Divider */}
                    {cutoffInfo && (
                      <tr
                        style={{
                          background: `${cutoffInfo.color}1a`,
                          borderTop: `2px solid ${cutoffInfo.color}`,
                          borderBottom: `2px solid ${cutoffInfo.color}`,
                        }}
                      >
                        <td
                          colSpan={tableColSpan}
                          style={{
                            padding: '0.45rem 1rem',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: cutoffInfo.color,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          ▲ {cutoffInfo.tierName} Cutoff ({cutoffInfo.count} competitors advance to {cutoffInfo.tierName}) ▲
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Qualifier Score Submission Modal */}
      {isEntryModalOpen && (
        <QualifierEntryModal
          isOpen={isEntryModalOpen}
          onClose={() => setIsEntryModalOpen(false)}
          tournament={tournament}
        />
      )}

      {/* Competitor Detail Drawer */}
      {selectedPlayer && (
        <PlayerDetailDrawer
          isOpen={Boolean(selectedPlayer)}
          onClose={() => {
            setSelectedPlayer(null);
            setSelectedRankRow(undefined);
          }}
          player={selectedPlayer}
          tournament={tournament}
          rankRow={selectedRankRow}
        />
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '0.75rem 0.85rem',
  color: 'var(--color-text-secondary)',
  fontWeight: 600,
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const tdStyle: React.CSSProperties = {
  padding: '0.65rem 0.85rem',
};
