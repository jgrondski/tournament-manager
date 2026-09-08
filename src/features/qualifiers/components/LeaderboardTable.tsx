import React, { useState } from 'react';
import { Tournament } from '../../tournament/types';
import { deriveLeaderboard, LeaderboardRankRow } from '../scoring';
import { QualifierEntryModal } from './QualifierEntryModal';
import { Search, Trophy, Plus, AlertOctagon, User } from 'lucide-react';

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
            {tournament.qualFormat === 'AVERAGE_OF_X' && ` (Ao${tournament.qualAverageCount || 2})`}
            {' • '}
            {tournament.qualsClosed ? 'Qualifiers Closed' : 'Qualifiers Open (Live Running Standings)'}
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
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
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
              <th style={{ ...thStyle, minWidth: '200px' }}>Competitor</th>
              <th style={{ ...thStyle, width: '130px', textAlign: 'center' }}>Attempts / Format</th>
              <th style={{ ...thStyle, width: '150px', textAlign: 'right' }}>Score / Rating</th>
              <th style={{ ...thStyle, width: '130px', textAlign: 'center' }}>Tier Cutoff &amp; Seed</th>
              <th style={{ ...thStyle, width: '110px', textAlign: 'center' }}>PB (Manual)</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
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
                      style={{
                        background: rowBg,
                        borderBottom: '1px solid var(--color-border-subtle)',
                        transition: 'background 0.1s ease',
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
                          {row.isDisqualified && (
                            <span style={{ color: 'var(--color-red)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem' }}>
                              <AlertOctagon size={12} /> DQ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Attempts / Format Details */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                          {row.formattedDetail}
                        </span>
                        {row.attempts.length > 0 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {row.attempts.map(a => a.toLocaleString()).join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Final Value */}
                      <td className="tabular-nums" style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-gold-bright)' }}>
                        {row.finalScore > 0 ? row.finalScore.toLocaleString() : '—'}
                      </td>

                      {/* Tier Seed / Status */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
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
                      </td>

                      {/* Personal Best (Manual) */}
                      <td className="tabular-nums" style={{ ...tdStyle, textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {row.player.personalBest ? row.player.personalBest.toLocaleString() : '—'}
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
                          colSpan={6}
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

      {/* Submission Modal */}
      {isEntryModalOpen && (
        <QualifierEntryModal
          isOpen={isEntryModalOpen}
          onClose={() => setIsEntryModalOpen(false)}
          tournament={tournament}
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

