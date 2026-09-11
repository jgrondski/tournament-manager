import React, { useState } from 'react';
import { Tournament, TournamentTier, PlayerProfile } from '../../tournament/types';
import { BracketMatch, isMatchPlayable } from '../types';
import { MatchScoreDrawer } from './MatchScoreDrawer';
import { BracketDraftBanner } from './BracketDraftBanner';
import { colorWithAlpha } from '../colorUtils';
import { Clock, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { PlayerDetailDrawer } from '../../qualifiers/components/PlayerDetailDrawer';

interface MatchCardFeedProps {
  tournament: Tournament;
  tier: TournamentTier;
}

export const MatchCardFeed: React.FC<MatchCardFeedProps> = ({ tournament, tier }) => {
  const [selectedRoundIdx, setSelectedRoundIdx] = useState<number>(0);
  const [activeMatch, setActiveMatch] = useState<BracketMatch | null>(null);
  const [selectedPlayerForDrawer, setSelectedPlayerForDrawer] = useState<PlayerProfile | null>(null);
  const [isPlayerDrawerOpen, setIsPlayerDrawerOpen] = useState(false);
  const [hoveredPlayerKey, setHoveredPlayerKey] = useState<string | null>(null);
  const [hoveredMatchId, setHoveredMatchId] = useState<string | null>(null);

  const rounds = tier.bracket.rounds;
  const currentRound = rounds[selectedRoundIdx] || rounds[0];
  const primaryColor = tier.primaryColor || '#f59e0b';

  const handlePlayerClick = (pId: string, pName: string) => {
    const profile = (tournament.playersPool || []).find(p => p.id === pId) || {
      id: pId,
      name: pName,
      personalBest: 0,
      playstyle: 'DAS',
    };
    setSelectedPlayerForDrawer(profile);
    setIsPlayerDrawerOpen(true);
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <BracketDraftBanner tournament={tournament} />

      {/* Round Selector Bar */}
      <div style={{ overflowX: 'auto', display: 'flex', gap: '0.5rem', paddingBottom: '0.5rem' }}>
        {rounds.map((round, idx) => (
          <button
            key={round.roundNumber}
            onClick={() => setSelectedRoundIdx(idx)}
            className={`btn ${selectedRoundIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            {round.name}
          </button>
        ))}
      </div>

      {/* Matches Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {currentRound?.matches.map((match) => {
          const record = tournament.matchScores[match.id];
          const p1 = match.player1.player;
          const p2 = match.player2.player;
          const p1Name = p1?.name || (match.player1.sourceMatchId ? `Winner of Match #${tier.bracket.matchesById[match.player1.sourceMatchId]?.matchNumber || '?'}` : 'TBD');
          const p2Name = p2?.name || (match.player2.sourceMatchId ? `Winner of Match #${tier.bracket.matchesById[match.player2.sourceMatchId]?.matchNumber || '?'}` : 'TBD');

          const p1Wins = record?.player1Wins || 0;
          const p2Wins = record?.player2Wins || 0;
          const matchBestOf = record?.bestOf || match.bestOf || tier.bestOf || 5;
          const hasTieGame = Boolean(record?.games?.some(g => g.winnerPlayerId === 'TIE' || (g.player1Points !== null && g.player1Points === g.player2Points && g.player1Points > 0)));
          const hasTiebreaker = Boolean(record?.hasTiebreaker || hasTieGame || (record?.games && record.games.length > matchBestOf));
          const p1ScoreDisplay = hasTiebreaker ? `${p1Wins} (t)` : `${p1Wins}`;
          const p2ScoreDisplay = hasTiebreaker ? `${p2Wins} (t)` : `${p2Wins}`;

          const isPlayable = isMatchPlayable(match);
          const isComplete = Boolean((p1?.id && match.winnerId === p1.id) || (p2?.id && match.winnerId === p2.id) || record?.isComplete);
          const inProgress = !isComplete && (p1Wins > 0 || p2Wins > 0);
          const p1Won = Boolean(p1?.id && (match.winnerId === p1.id || record?.winnerPlayerId === p1.id));
          const p2Won = Boolean(p2?.id && (match.winnerId === p2.id || record?.winnerPlayerId === p2.id));
          const isMatchCardHovered = hoveredMatchId === match.id;

          return (
            <div
              key={match.id}
              onClick={() => {
                if (isPlayable && tournament.isLocked) setActiveMatch(match);
              }}
              onMouseEnter={() => setHoveredMatchId(match.id)}
              onMouseLeave={() => setHoveredMatchId(null)}
              style={{
                background: isMatchCardHovered
                  ? colorWithAlpha(primaryColor, 0.06, 'var(--color-bg-surface-elevated)')
                  : 'var(--color-bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: inProgress
                  ? `2px solid ${primaryColor}`
                  : isMatchCardHovered
                  ? `1px solid ${colorWithAlpha(primaryColor, 0.6, 'var(--color-gold)')}`
                  : isComplete
                  ? '1px solid var(--color-border)'
                  : '1px solid var(--color-border-subtle)',
                boxShadow: inProgress
                  ? `0 0 12px ${colorWithAlpha(primaryColor, 0.3, 'rgba(245, 158, 11, 0.25)')}`
                  : isMatchCardHovered
                  ? 'var(--shadow-md)'
                  : 'var(--shadow-sm)',
                padding: '1rem',
                cursor: isPlayable && tournament.isLocked ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                opacity: isPlayable ? 1 : 0.65,
                transition: 'all 0.15s ease',
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
                  {!tournament.isLocked ? (
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
                      <Clock size={12} /> Live (Bo{matchBestOf})
                    </span>
                  ) : (
                    <span className="badge badge-muted">Ready</span>
                  )}
                  {tournament.isLocked && <ChevronRight size={18} color="var(--color-text-muted)" />}
                </div>
              </div>

              {/* Matchup row */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Player 1 Row */}
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
                  <div
                    onClick={(e) => {
                      if (p1?.id) {
                        e.stopPropagation();
                        handlePlayerClick(p1.id, p1.name);
                      }
                    }}
                    onMouseEnter={() => p1?.id && setHoveredPlayerKey(`p1-${match.id}`)}
                    onMouseLeave={() => setHoveredPlayerKey(null)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.2rem 0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      background: hoveredPlayerKey === `p1-${match.id}` ? 'rgba(251, 191, 36, 0.18)' : 'transparent',
                      boxShadow: hoveredPlayerKey === `p1-${match.id}` ? '0 0 0 1px var(--color-gold)' : 'none',
                      cursor: p1?.id ? 'pointer' : 'inherit',
                      transition: 'all 0.15s ease',
                    }}
                    title={p1?.id ? "View competitor tournament profile" : undefined}
                  >
                    {p1?.seed && <span style={badgeSeedStyle}>#{p1.seed}</span>}
                    <span
                      style={{
                        fontWeight: p1Won ? 700 : 500,
                        color: hoveredPlayerKey === `p1-${match.id}` ? 'var(--color-gold-bright)' : p1Won ? primaryColor : 'var(--color-text-primary)',
                      }}
                    >
                      {p1Name}
                    </span>
                  </div>
                  <span className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 800, color: p1Won ? primaryColor : 'inherit' }}>
                    {p1ScoreDisplay}
                  </span>
                </div>

                {/* Player 2 Row */}
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
                  <div
                    onClick={(e) => {
                      if (p2?.id) {
                        e.stopPropagation();
                        handlePlayerClick(p2.id, p2.name);
                      }
                    }}
                    onMouseEnter={() => p2?.id && setHoveredPlayerKey(`p2-${match.id}`)}
                    onMouseLeave={() => setHoveredPlayerKey(null)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.2rem 0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      background: hoveredPlayerKey === `p2-${match.id}` ? 'rgba(251, 191, 36, 0.18)' : 'transparent',
                      boxShadow: hoveredPlayerKey === `p2-${match.id}` ? '0 0 0 1px var(--color-gold)' : 'none',
                      cursor: p2?.id ? 'pointer' : 'inherit',
                      transition: 'all 0.15s ease',
                    }}
                    title={p2?.id ? "View competitor tournament profile" : undefined}
                  >
                    {p2?.seed && <span style={badgeSeedStyle}>#{p2.seed}</span>}
                    <span
                      style={{
                        fontWeight: p2Won ? 700 : 500,
                        color: hoveredPlayerKey === `p2-${match.id}` ? 'var(--color-gold-bright)' : p2Won ? primaryColor : 'var(--color-text-primary)',
                      }}
                    >
                      {p2Name}
                    </span>
                  </div>
                  <span className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 800, color: p2Won ? primaryColor : 'inherit' }}>
                    {p2ScoreDisplay}
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

      {selectedPlayerForDrawer && (
        <PlayerDetailDrawer
          isOpen={isPlayerDrawerOpen}
          onClose={() => {
            setIsPlayerDrawerOpen(false);
            setSelectedPlayerForDrawer(null);
          }}
          player={selectedPlayerForDrawer}
          tournament={tournament}
        />
      )}
    </div>
  );
};

const badgeSeedStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  padding: '0.15rem 0.4rem',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(255, 255, 255, 0.08)',
  color: 'var(--color-text-muted)',
  fontWeight: 600,
  fontFamily: 'var(--font-mono)',
};
