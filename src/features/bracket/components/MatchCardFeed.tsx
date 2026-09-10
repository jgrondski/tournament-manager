import React, { useState } from 'react';
import { Tournament, TournamentTier } from '../../tournament/types';
import { BracketMatch, isMatchPlayable } from '../types';
import { MatchScoreDrawer } from './MatchScoreDrawer';
import { BracketDraftBanner } from './BracketDraftBanner';
import { colorWithAlpha } from '../colorUtils';
import { Clock, CheckCircle2, ChevronRight, Trophy, Lock } from 'lucide-react';

interface MatchCardFeedProps {
  tournament: Tournament;
  tier: TournamentTier;
}

export const MatchCardFeed: React.FC<MatchCardFeedProps> = ({ tournament, tier }) => {
  const [selectedRoundIdx, setSelectedRoundIdx] = useState<number>(0);
  const [activeMatch, setActiveMatch] = useState<BracketMatch | null>(null);

  const rounds = tier.bracket.rounds;
  const currentRound = rounds[selectedRoundIdx] || rounds[0];
  const primaryColor = tier.primaryColor || '#f59e0b';

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <BracketDraftBanner tournament={tournament} />

      {/* Round Selector Bar */}
      <div style={{ overflowX: 'auto', display: 'flex', gap: '0.5rem', paddingBottom: '0.5rem' }}>
        {rounds.map((round, idx) => (
          <button
            key={round.roundNumber}
            onClick={() => setSelectedRoundIdx(idx)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-full)',
              border: selectedRoundIdx === idx ? `1px solid ${colorWithAlpha(primaryColor, 0.6, 'var(--color-gold)')}` : '1px solid var(--color-border)',
              background: selectedRoundIdx === idx ? colorWithAlpha(primaryColor, 0.15, 'var(--color-gold-bg)') : 'var(--color-bg-surface-elevated)',
              color: selectedRoundIdx === idx ? primaryColor : 'var(--color-text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            {round.name}
          </button>
        ))}
      </div>

      {/* Match Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {currentRound?.matches.map((match) => {
          const record = tournament.matchScores[match.id];
          const p1 = match.player1.player;
          const p2 = match.player2.player;
          const p1Name = p1?.name || (match.player1.sourceMatchId ? `Winner of Match #${tier.bracket.matchesById[match.player1.sourceMatchId]?.matchNumber || '?'}` : 'TBD');
          const p2Name = p2?.name || (match.player2.sourceMatchId ? `Winner of Match #${tier.bracket.matchesById[match.player2.sourceMatchId]?.matchNumber || '?'}` : 'TBD');

          const p1Wins = record?.player1Wins || 0;
          const p2Wins = record?.player2Wins || 0;
          const isPlayable = isMatchPlayable(match);
          const isComplete = Boolean((p1?.id && match.winnerId === p1.id) || (p2?.id && match.winnerId === p2.id) || record?.isComplete);
          const inProgress = !isComplete && (p1Wins > 0 || p2Wins > 0);
          const p1Won = Boolean(p1?.id && (match.winnerId === p1.id || record?.winnerPlayerId === p1.id));
          const p2Won = Boolean(p2?.id && (match.winnerId === p2.id || record?.winnerPlayerId === p2.id));

          return (
            <div
              key={match.id}
              onClick={() => {
                if (isPlayable && tournament.isVerified) setActiveMatch(match);
              }}
              style={{
                background: 'var(--color-bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: inProgress
                  ? `2px solid ${primaryColor}`
                  : isComplete
                  ? '1px solid var(--color-border)'
                  : '1px solid var(--color-border-subtle)',
                boxShadow: inProgress ? `0 0 12px ${colorWithAlpha(primaryColor, 0.3, 'rgba(245, 158, 11, 0.25)')}` : 'var(--shadow-sm)',
                padding: '1rem',
                cursor: isPlayable && tournament.isVerified ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                opacity: isPlayable ? 1 : 0.65,
                transition: 'transform 0.1s ease',
              }}
            >
              {/* Card Top */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    background: colorWithAlpha(primaryColor, 0.15, 'var(--color-gold-bg)'),
                    color: primaryColor,
                    border: `1px solid ${colorWithAlpha(primaryColor, 0.4, 'var(--color-gold)')}`,
                  }}
                >
                  Match #{match.matchNumber}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {!tournament.isVerified ? (
                    <span className="badge badge-muted" title="Scores locked during Qualifiers Mode">
                      <Lock size={12} /> Qualifiers Mode
                    </span>
                  ) : isComplete ? (
                    <span className="badge badge-green">
                      <CheckCircle2 size={12} /> Complete
                    </span>
                  ) : inProgress ? (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        background: colorWithAlpha(primaryColor, 0.15, 'var(--color-gold-bg)'),
                        color: primaryColor,
                        border: `1px solid ${colorWithAlpha(primaryColor, 0.4, 'var(--color-gold)')}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                      className="animate-pulse-border"
                    >
                      <Clock size={12} /> Live (Bo{record?.bestOf || match.bestOf || tier.bestOf})
                    </span>
                  ) : (
                    <span className="badge badge-muted">Ready</span>
                  )}
                  {tournament.isVerified && <ChevronRight size={18} color="var(--color-text-muted)" />}
                </div>
              </div>

              {/* Matchup row */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: p1Won ? colorWithAlpha(primaryColor, 0.18, 'var(--color-gold-bg)') : 'var(--color-bg-surface-elevated)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {p1?.seed && <span style={badgeSeedStyle}>#{p1.seed}</span>}
                    <span style={{ fontWeight: p1Won ? 700 : 500, color: p1Won ? primaryColor : 'var(--color-text-primary)' }}>
                      {p1Name}
                    </span>
                    {p1Won && <Trophy size={14} color={primaryColor} />}
                  </div>
                  <span className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 800, color: p1Won ? primaryColor : 'inherit' }}>
                    {p1Wins}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: p2Won ? colorWithAlpha(primaryColor, 0.18, 'var(--color-gold-bg)') : 'var(--color-bg-surface-elevated)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {p2?.seed && <span style={badgeSeedStyle}>#{p2.seed}</span>}
                    <span style={{ fontWeight: p2Won ? 700 : 500, color: p2Won ? primaryColor : 'var(--color-text-primary)' }}>
                      {p2Name}
                    </span>
                    {p2Won && <Trophy size={14} color={primaryColor} />}
                  </div>
                  <span className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 800, color: p2Won ? primaryColor : 'inherit' }}>
                    {p2Wins}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activeMatch && (
        <MatchScoreDrawer
          isOpen={true}
          onClose={() => setActiveMatch(null)}
          tournamentId={tournament.id}
          tierId={tier.id}
          match={activeMatch}
          matchScoreRecord={tournament.matchScores[activeMatch.id]}
          roundName={currentRound?.name}
        />
      )}
    </div>
  );
};

const badgeSeedStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  padding: '0.1rem 0.35rem',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(255, 255, 255, 0.1)',
  color: 'var(--color-text-muted)',
};
