import React, { useState } from 'react';
import { Tournament } from '../types';
import { calculateTierStandings, StandingsPlacement } from '../standings';
import { colorWithAlpha } from '../../bracket/colorUtils';
import { Trophy, Medal, Award, User, Layers } from 'lucide-react';

interface FinalStandingsTableProps {
  tournament: Tournament;
  initialTierId?: string;
}

export const FinalStandingsTable: React.FC<FinalStandingsTableProps> = ({
  tournament,
  initialTierId,
}) => {
  const tiers = tournament.tiers;
  const [selectedTierId, setSelectedTierId] = useState<string>(
    initialTierId || tiers[0]?.id || ''
  );

  const activeTier = tiers.find(t => t.id === selectedTierId) || tiers[0];
  const standings: StandingsPlacement[] = activeTier
    ? calculateTierStandings(activeTier, tournament.matchScores)
    : [];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Trophy color="var(--color-gold-bright)" size={26} />
            Final Tournament Standings
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Automated placement rollup derived directly from completed bracket matches.
          </p>
        </div>

        {/* Tier Selector Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--color-bg-surface)', padding: '0.25rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
          {tiers.map(t => {
            const isSelected = t.id === activeTier?.id;
            const tColor = t.primaryColor || '#f59e0b';
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTierId(t.id)}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected ? `1px solid ${colorWithAlpha(tColor, 0.6, 'var(--color-gold)')}` : `1px solid ${colorWithAlpha(tColor, 0.2, 'transparent')}`,
                  background: isSelected ? colorWithAlpha(tColor, 0.18, 'var(--color-gold-bg)') : colorWithAlpha(tColor, 0.04, 'transparent'),
                  color: isSelected ? tColor : 'var(--color-text-secondary)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? `0 0 10px ${colorWithAlpha(tColor, 0.25, 'rgba(245, 158, 11, 0.2)')}` : 'none',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: tColor,
                    boxShadow: isSelected ? `0 0 6px ${tColor}` : 'none',
                    opacity: isSelected ? 1 : 0.7,
                  }}
                />
                <span>{t.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Standings Table or Empty State */}
      {standings.length === 0 ? (
        <div
          style={{
            background: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: '3rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'var(--color-bg-surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
            }}
          >
            <Layers size={28} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Standings Awaiting Match Results
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: '420px', lineHeight: 1.5 }}>
            Final placements will automatically populate here as games conclude in the {activeTier?.name}.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-surface-highlight)', borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ ...thStyle, width: '90px', textAlign: 'center' }}>Placement</th>
                <th style={{ ...thStyle, minWidth: '220px' }}>Competitor</th>
                <th style={{ ...thStyle, width: '120px', textAlign: 'center' }}>Bracket Seed</th>
                <th style={{ ...thStyle, width: '160px', textAlign: 'center' }}>Stage Reached</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((item, idx) => {
                const isChamp = item.status === 'champion';
                const isRunnerUp = item.status === 'runner_up';
                const isSemi = item.status === 'semifinalist';

                return (
                  <tr
                    key={item.player.id}
                    style={{
                      background: isChamp
                        ? 'rgba(245, 158, 11, 0.12)'
                        : isRunnerUp
                        ? 'rgba(6, 182, 212, 0.08)'
                        : idx % 2 === 0
                        ? 'var(--color-bg-surface)'
                        : 'var(--color-bg-surface-elevated)',
                      borderBottom: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    {/* Placement Icon & Number */}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {isChamp ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-gold-bright)', fontWeight: 800 }}>
                          <Trophy size={18} />
                          <span>1st</span>
                        </div>
                      ) : isRunnerUp ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#38bdf8', fontWeight: 700 }}>
                          <Medal size={18} />
                          <span>2nd</span>
                        </div>
                      ) : isSemi ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#f59e0b', fontWeight: 600 }}>
                          <Award size={16} />
                          <span>3rd/4th</span>
                        </div>
                      ) : (
                        <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                          {item.rankLabel.split(' ')[0]}
                        </span>
                      )}
                    </td>

                    {/* Competitor */}
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={15} color="var(--color-text-muted)" />
                        <span
                          style={{
                            fontWeight: isChamp ? 800 : isRunnerUp ? 700 : 600,
                            color: isChamp ? 'var(--color-gold-bright)' : '#ffffff',
                            fontSize: isChamp ? '1rem' : '0.9rem',
                          }}
                        >
                          {item.player.name}
                        </span>
                      </div>
                    </td>

                    {/* Bracket Seed */}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span
                        className="tabular-nums"
                        style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'var(--color-text-secondary)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        Seed #{item.player.seed}
                      </span>
                    </td>

                    {/* Stage Reached */}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {isChamp && (
                        <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
                          🏆 Champion
                        </span>
                      )}
                      {isRunnerUp && (
                        <span className="badge badge-blue" style={{ fontSize: '0.75rem' }}>
                          🥈 Runner-up
                        </span>
                      )}
                      {isSemi && (
                        <span className="badge badge-muted" style={{ fontSize: '0.75rem' }}>
                          Semifinals
                        </span>
                      )}
                      {!isChamp && !isRunnerUp && !isSemi && (
                        <span className="badge badge-muted" style={{ fontSize: '0.75rem' }}>
                          {item.rankLabel}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  color: 'var(--color-text-secondary)',
  fontWeight: 600,
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
};
