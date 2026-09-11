import React, { useState } from 'react';
import { BracketStructure, BracketMatch, isMatchPlayable } from '../types';
import { Tournament, TournamentTier, PlayerProfile } from '../../tournament/types';
import { MatchScoreDrawer } from './MatchScoreDrawer';
import { BracketDraftBanner } from './BracketDraftBanner';
import { colorWithAlpha } from '../colorUtils';
import { Trophy } from 'lucide-react';
import { PlayerDetailDrawer } from '../../qualifiers/components/PlayerDetailDrawer';

interface BracketVisualizerProps {
  tournament: Tournament;
  tier: TournamentTier;
  isObsMode?: boolean;
  canManage?: boolean;
}

export const BracketVisualizer: React.FC<BracketVisualizerProps> = ({
  tournament,
  tier,
  isObsMode = false,
  canManage = true,
}) => {
  const [selectedMatch, setSelectedMatch] = useState<{ match: BracketMatch; roundName: string } | null>(null);
  const [selectedPlayerForDrawer, setSelectedPlayerForDrawer] = useState<PlayerProfile | null>(null);
  const [isPlayerDrawerOpen, setIsPlayerDrawerOpen] = useState(false);
  const [hoveredPlayerKey, setHoveredPlayerKey] = useState<string | null>(null);
  const [hoveredMatchId, setHoveredMatchId] = useState<string | null>(null);

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

  const bracket: BracketStructure = tier.bracket;
  const rounds = bracket.rounds;
  const primaryColor = tier.primaryColor || '#f59e0b';
  const secondaryColor = tier.secondaryColor || '#fbbf24';

  // Find final match winner if tournament is concluded
  const finalRound = rounds[rounds.length - 1];
  const finalMatch = finalRound?.matches[0];
  const championWinnerId = finalMatch?.winnerId;
  const championPlayer =
    championWinnerId === finalMatch?.player1.player?.id
      ? finalMatch?.player1.player
      : championWinnerId === finalMatch?.player2.player?.id
      ? finalMatch?.player2.player
      : null;

  return (
    <div
      style={{
        width: '100%',
        minHeight: isObsMode ? '100vh' : 'auto',
        background: isObsMode ? 'transparent' : 'var(--color-bg-base)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {!isObsMode && <BracketDraftBanner tournament={tournament} canManage={canManage} />}

      <div
        style={{
          width: '100%',
          padding: isObsMode ? '1rem' : '1.5rem',
          overflowX: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
      {/* Container for bracket rounds */}
      <div
        style={{
          display: 'flex',
          gap: isObsMode ? '2rem' : '3.5rem',
          alignItems: 'center',
          minWidth: `${rounds.length * 280 + 260}px`,
          padding: '1rem 0',
        }}
      >
        {rounds.map((round) => (
          <div
            key={round.roundNumber}
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '260px',
              flexShrink: 0,
            }}
          >
            {/* Round Name Header */}
            <div
              style={{
                textAlign: 'center',
                padding: '0.5rem',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: primaryColor,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                background: isObsMode ? 'rgba(0,0,0,0.6)' : colorWithAlpha(primaryColor, 0.08, 'var(--color-bg-surface-elevated)'),
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${colorWithAlpha(primaryColor, 0.35, 'var(--color-border)')}`,
              }}
            >
              {round.name}
            </div>

            {/* Matches in Round */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                flex: 1,
                gap: '1.5rem',
              }}
            >
              {round.matches.map((match) => {
                const record = tournament.matchScores[match.id];
                const p1 = match.player1.player;
                const p2 = match.player2.player;
                const p1Name = p1?.name || (match.player1.sourceMatchId ? `Winner of M#${bracket.matchesById[match.player1.sourceMatchId]?.matchNumber || '?'}` : 'TBD');
                const p2Name = p2?.name || (match.player2.sourceMatchId ? `Winner of M#${bracket.matchesById[match.player2.sourceMatchId]?.matchNumber || '?'}` : 'TBD');

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
                const isMatchHovered = hoveredMatchId === match.id;

                return (
                  <div
                    key={match.id}
                    onClick={() => {
                      if (!isObsMode && canManage && isPlayable && tournament.isLocked) {
                        setSelectedMatch({ match, roundName: round.name });
                      }
                    }}
                    onMouseEnter={() => setHoveredMatchId(match.id)}
                    onMouseLeave={() => setHoveredMatchId(null)}
                    style={{
                      background: isObsMode ? 'rgba(15, 23, 42, 0.95)' : 'var(--color-bg-surface)',
                      borderRadius: 'var(--radius-sm)',
                      border: inProgress
                        ? `2px solid ${primaryColor}`
                        : isMatchHovered
                        ? `1px solid ${colorWithAlpha(primaryColor, 0.6, 'var(--color-gold)')}`
                        : isComplete
                        ? '1px solid var(--color-border)'
                        : '1px solid var(--color-border-subtle)',
                      boxShadow: inProgress
                        ? `0 0 12px ${colorWithAlpha(primaryColor, 0.35, 'rgba(245, 158, 11, 0.3)')}`
                        : isMatchHovered
                        ? 'var(--shadow-md)'
                        : 'var(--shadow-sm)',
                      cursor: !isObsMode && canManage && isPlayable && tournament.isLocked ? 'pointer' : 'default',
                      opacity: isPlayable ? 1 : 0.7,
                      overflow: 'hidden',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Match Node Header */}
                    <div
                      style={{
                        padding: '0.2rem 0.5rem',
                        background: 'var(--color-bg-surface-highlight)',
                        fontSize: '0.65rem',
                        color: 'var(--color-text-muted)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>Match #{match.matchNumber}</span>
                      <span>Bo{matchBestOf}</span>
                    </div>

                    {/* Slot 1: Player 1 */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.65rem',
                        borderBottom: '1px solid var(--color-border-subtle)',
                        background: p1Won ? colorWithAlpha(primaryColor, 0.18, 'var(--color-gold-bg)') : 'transparent',
                        opacity: isComplete && !p1Won ? 0.45 : 1,
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          overflow: 'hidden',
                          padding: '0.15rem 0.35rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: hoveredPlayerKey === `p1-${match.id}` ? 'rgba(251, 191, 36, 0.18)' : 'transparent',
                          boxShadow: hoveredPlayerKey === `p1-${match.id}` ? '0 0 0 1px var(--color-gold)' : 'none',
                          cursor: p1?.id ? 'pointer' : 'inherit',
                          transition: 'all 0.15s ease',
                        }}
                        title={p1?.id ? "View competitor tournament profile" : undefined}
                      >
                        {p1?.seed && (
                          <span style={seedMiniStyle}>
                            {p1.seed}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: p1Won ? 700 : 500,
                            color: hoveredPlayerKey === `p1-${match.id}` ? 'var(--color-gold-bright)' : p1Won ? primaryColor : 'var(--color-text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {p1Name}
                        </span>
                      </div>
                      <span
                        className="tabular-nums"
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: p1Won ? primaryColor : 'var(--color-text-secondary)',
                          marginLeft: '0.5rem',
                        }}
                      >
                        {p1ScoreDisplay}
                      </span>
                    </div>

                    {/* Slot 2: Player 2 */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.65rem',
                        background: p2Won ? colorWithAlpha(primaryColor, 0.18, 'var(--color-gold-bg)') : 'transparent',
                        opacity: isComplete && !p2Won ? 0.45 : 1,
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          overflow: 'hidden',
                          padding: '0.15rem 0.35rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: hoveredPlayerKey === `p2-${match.id}` ? 'rgba(251, 191, 36, 0.18)' : 'transparent',
                          boxShadow: hoveredPlayerKey === `p2-${match.id}` ? '0 0 0 1px var(--color-gold)' : 'none',
                          cursor: p2?.id ? 'pointer' : 'inherit',
                          transition: 'all 0.15s ease',
                        }}
                        title={p2?.id ? "View competitor tournament profile" : undefined}
                      >
                        {p2?.seed && (
                          <span style={seedMiniStyle}>
                            {p2.seed}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: p2Won ? 700 : 500,
                            color: hoveredPlayerKey === `p2-${match.id}` ? 'var(--color-gold-bright)' : p2Won ? primaryColor : 'var(--color-text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {p2Name}
                        </span>
                      </div>
                      <span
                        className="tabular-nums"
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: p2Won ? primaryColor : 'var(--color-text-secondary)',
                          marginLeft: '0.5rem',
                        }}
                      >
                        {p2ScoreDisplay}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Champion Showcase Banner */}
        {championPlayer && (
          <div
            style={{
              width: '240px',
              padding: '1.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: `linear-gradient(135deg, ${colorWithAlpha(primaryColor, 0.18, 'rgba(245, 158, 11, 0.15)')} 0%, ${colorWithAlpha(secondaryColor, 0.28, 'rgba(180, 83, 9, 0.25)')} 100%)`,
              border: `2px solid ${primaryColor}`,
              textAlign: 'center',
              boxShadow: `0 0 24px ${colorWithAlpha(primaryColor, 0.35, 'rgba(245, 158, 11, 0.25)')}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Trophy size={36} color={primaryColor} />
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: primaryColor, fontWeight: 700 }}>
              {tier.name} Champion
            </div>
            <div
              onClick={() => {
                if (championPlayer?.id) {
                  handlePlayerClick(championPlayer.id, championPlayer.name);
                }
              }}
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#ffffff',
                cursor: championPlayer?.id ? 'pointer' : 'default',
                padding: '0.2rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                if (championPlayer?.id) e.currentTarget.style.color = 'var(--color-gold-bright)';
              }}
              onMouseLeave={e => {
                if (championPlayer?.id) e.currentTarget.style.color = '#ffffff';
              }}
              title="View champion tournament profile"
            >
              {championPlayer.name}
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: colorWithAlpha(primaryColor, 0.2, 'var(--color-gold-bg)'),
                color: primaryColor,
                border: `1px solid ${colorWithAlpha(primaryColor, 0.5, 'var(--color-gold)')}`,
              }}
            >
              Seed #{championPlayer.seed}
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
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
    </div>
  );
};

const seedMiniStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  padding: '0.1rem 0.3rem',
  borderRadius: '3px',
  background: 'rgba(255, 255, 255, 0.1)',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-mono)',
  fontWeight: 600,
  minWidth: '16px',
  textAlign: 'center',
};
