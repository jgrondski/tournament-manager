import React, { useState } from 'react';
import { Tournament } from '../../tournament/types';
import { Search, Trophy, CheckCircle2 } from 'lucide-react';

interface LeaderboardTableProps {
  tournament: Tournament;
  onAddScoreClick?: () => void;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ tournament }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const qualifiers = tournament.qualifiers;
  const filtered = qualifiers.filter(q =>
    q.playerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const goldTier = tournament.tiers.find(t => t.slug === 'gold');
  const silverTier = tournament.tiers.find(t => t.slug === 'silver');
  const goldCutoff = goldTier ? goldTier.playerCount : 12;
  const silverCutoff = silverTier ? goldCutoff + silverTier.playerCount : 28;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header with Search & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy color="var(--color-gold-bright)" size={24} />
            Qualifying Leaderboard
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Live standings determining Gold and Silver tier bracket seeding.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search player..."
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
        </div>
      </div>

      {/* Standings Table */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-surface-highlight)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ ...thStyle, width: '60px', textAlign: 'center' }}>Rank</th>
              <th style={{ ...thStyle, minWidth: '180px' }}>Player</th>
              <th style={{ ...thStyle, width: '120px', textAlign: 'right' }}>Game 1</th>
              <th style={{ ...thStyle, width: '120px', textAlign: 'right' }}>Game 2</th>
              <th style={{ ...thStyle, width: '120px', textAlign: 'right' }}>Game 3</th>
              <th style={{ ...thStyle, width: '140px', textAlign: 'right' }}>Total Qualifying</th>
              <th style={{ ...thStyle, width: '110px', textAlign: 'center' }}>Tier Cutoff</th>
              <th style={{ ...thStyle, width: '90px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry, idx) => {
              const rank = entry.seed || idx + 1;
              const isGold = rank <= goldCutoff;
              const isSilver = rank > goldCutoff && rank <= silverCutoff;
              const isCutoffGoldBoundary = rank === goldCutoff;
              const isCutoffSilverBoundary = rank === silverCutoff;

              return (
                <React.Fragment key={entry.id}>
                  <tr
                    style={{
                      background: idx % 2 === 0 ? 'var(--color-bg-surface)' : 'var(--color-bg-surface-elevated)',
                      borderBottom: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                      <span
                        className="tabular-nums"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: rank <= 3 ? 'var(--color-gold-bg)' : 'rgba(255,255,255,0.05)',
                          color: rank <= 3 ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
                          fontSize: '0.8rem',
                        }}
                      >
                        {rank}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {entry.playerName}
                        </span>
                        {entry.playstyle && (
                          <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>
                            {entry.playstyle}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="tabular-nums" style={{ ...tdStyle, textAlign: 'right' }}>
                      {entry.game1.toLocaleString()}
                    </td>
                    <td className="tabular-nums" style={{ ...tdStyle, textAlign: 'right' }}>
                      {entry.game2.toLocaleString()}
                    </td>
                    <td className="tabular-nums" style={{ ...tdStyle, textAlign: 'right', color: entry.game3 ? 'inherit' : 'var(--color-text-muted)' }}>
                      {entry.game3 ? entry.game3.toLocaleString() : '—'}
                    </td>

                    <td className="tabular-nums" style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--color-gold-bright)' }}>
                      {entry.totalScore.toLocaleString()}
                    </td>

                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {isGold && <span className="badge badge-gold">Gold Seed #{rank}</span>}
                      {isSilver && <span className="badge badge-blue">Silver Seed #{rank - goldCutoff}</span>}
                      {!isGold && !isSilver && <span className="badge badge-muted">Alternate</span>}
                    </td>

                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {entry.verified ? (
                        <span style={{ color: 'var(--color-green)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                          <CheckCircle2 size={14} /> Verified
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Cutoff Marker Row */}
                  {isCutoffGoldBoundary && (
                    <tr style={{ background: 'rgba(245, 158, 11, 0.15)', borderTop: '2px solid var(--color-gold)', borderBottom: '2px solid var(--color-gold)' }}>
                      <td colSpan={8} style={{ padding: '0.5rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gold-bright)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        ▲ Gold Tier Cutoff (Top {goldCutoff} Advance to Gold Bracket) ▲
                      </td>
                    </tr>
                  )}

                  {isCutoffSilverBoundary && (
                    <tr style={{ background: 'rgba(6, 182, 212, 0.15)', borderTop: '2px solid var(--color-cyan)', borderBottom: '2px solid var(--color-cyan)' }}>
                      <td colSpan={8} style={{ padding: '0.5rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        ▲ Silver Tier Cutoff (Next {silverTier?.playerCount || 16} Advance to Silver Bracket) ▲
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
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
