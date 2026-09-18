import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BracketStructure, BracketMatch, isMatchPlayable } from '../types';
import { Tournament, TournamentTier, PlayerProfile } from '../../tournament/types';
import { MatchScoreDrawer } from './MatchScoreDrawer';
import {
  getContrastingTextColor,
  getTierCanvasBackground,
  getTierCardBackground,
} from '../colorUtils';
import { calculateBracketLayout, BracketViewMode } from '../bracketLayout';
import { Trophy } from 'lucide-react';
import { PlayerDetailDrawer } from '../../qualifiers/components/PlayerDetailDrawer';
import { CountryFlag } from '../../players/flagUtils';

interface BracketVisualizerProps {
  tournament: Tournament;
  tier: TournamentTier;
  isObsMode?: boolean;
  canManage?: boolean;
  obsView?: BracketViewMode;
  chroma?: string | null;
}

export const BracketVisualizer: React.FC<BracketVisualizerProps> = ({
  tournament,
  tier,
  isObsMode = false,
  canManage = true,
  obsView,
  chroma,
}) => {
  const [searchParams] = useSearchParams();
  const effectiveObsView = (obsView || (searchParams.get('view') as BracketViewMode) || (isObsMode ? 'fit' : 'standard')) as BracketViewMode;
  const effectiveChroma = chroma !== undefined ? chroma : searchParams.get('chroma');

  const [selectedMatch, setSelectedMatch] = useState<{ match: BracketMatch; roundName: string } | null>(null);
  const [selectedPlayerForDrawer, setSelectedPlayerForDrawer] = useState<PlayerProfile | null>(null);
  const [isPlayerDrawerOpen, setIsPlayerDrawerOpen] = useState(false);
  const [hoveredPlayerKey, setHoveredPlayerKey] = useState<string | null>(null);
  const [hoveredMatchId, setHoveredMatchId] = useState<string | null>(null);

  // Dynamic window measurement for Strategy B (Fit to 1080p canvas)
  const [viewportDim, setViewportDim] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1920,
    h: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  useEffect(() => {
    if (effectiveObsView !== 'fit') return;
    const updateDimensions = () => {
      setViewportDim({
        w: window.innerWidth || 1920,
        h: window.innerHeight || 1080,
      });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [effectiveObsView]);

  const handlePlayerClick = (pId: string, pName: string, country?: string) => {
    const profile = (tournament.playersPool || []).find((p) => p.id === pId) || {
      id: pId,
      name: pName,
      country,
      personalBest: 0,
      playstyle: 'DAS',
    };
    setSelectedPlayerForDrawer(profile);
    setIsPlayerDrawerOpen(true);
  };

  const bracket: BracketStructure = tier.bracket;
  const rounds = bracket?.rounds || [];
  const primaryColor = tier.primaryColor || '#f59e0b';
  const secondaryColor = tier.secondaryColor || '#fbbf24';
  const cardColor = tier.cardColor || '#161922';
  const backgroundColor = tier.backgroundColor || '#0c0d12';

  // Calculate geometric coordinates and orthogonal SVG connector paths
  const layout = useMemo(() => {
    return calculateBracketLayout(bracket, undefined, effectiveObsView);
  }, [bracket, effectiveObsView]);

  // Fit scale calculation for 1080p / responsive OBS window
  const fitScale = useMemo(() => {
    if (effectiveObsView !== 'fit') return 1;
    const availableW = Math.max(240, viewportDim.w - (isObsMode ? 24 : 48));
    const availableH = Math.max(180, viewportDim.h - (isObsMode ? 24 : 48));
    const scaleX = availableW / layout.totalWidth;
    const scaleY = availableH / layout.totalHeight;
    return Math.min(scaleX, scaleY, 1.2);
  }, [effectiveObsView, viewportDim, layout.totalWidth, layout.totalHeight, isObsMode]);

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

  const championProfile = championPlayer
    ? (tournament.playersPool || []).find((p) => p.id === championPlayer.id)
    : null;

  // Resolve chroma color if requested
  const getChromaColor = (param?: string | null) => {
    if (!param) return null;
    const c = param.toLowerCase().trim();
    if (c === 'green') return '#00ff00';
    if (c === 'magenta') return '#ff00ff';
    if (c === 'blue') return '#0000ff';
    if (c.startsWith('#')) return c;
    return `#${c}`;
  };

  const chromaHex = getChromaColor(effectiveChroma);
  const cardBg = getTierCardBackground(cardColor, primaryColor);
  const canvasBg = getTierCanvasBackground(backgroundColor, primaryColor);

  // Pure user-defined solid colors: no radial gradients, no assumed shades
  const effectiveCardBg = chromaHex ? (tier.cardColor || '#161922') : cardBg;
  const effectiveCanvasBg = chromaHex ? chromaHex : isObsMode ? 'transparent' : canvasBg;

  // Canvas content component
  const canvasContent = (
    <div
      style={{
        position: 'relative',
        width: `${layout.totalWidth}px`,
        height: `${layout.totalHeight}px`,
        minWidth: `${layout.totalWidth}px`,
        minHeight: `${layout.totalHeight}px`,
      }}
    >
      {/* Sticky Round Headers Bar (Pinned to top when scrolling down) */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          width: `${layout.totalWidth}px`,
          height: '42px',
          background: effectiveCanvasBg,
          pointerEvents: 'none',
          marginBottom: '6px',
        }}
      >
        {layout.roundHeaders.map((header) => (
          <div
            key={header.roundNumber}
            style={{
              position: 'absolute',
              left: `${header.x}px`,
              top: '4px',
              width: `${header.width}px`,
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.82rem',
              fontWeight: 800,
              color: primaryColor,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: effectiveCardBg,
              borderRadius: 'var(--radius-sm)',
              border: `1.5px solid ${primaryColor}`,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
              pointerEvents: 'auto',
            }}
          >
            {header.name}
          </div>
        ))}
      </div>

      {/* Layer 1: Dynamic SVG Orthogonal Connector Lines */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${layout.totalWidth}px`,
          height: `${layout.totalHeight}px`,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {layout.paths.map((path) => {
          const targetRecord = tournament.matchScores[path.targetMatchId];
          const targetMatch = bracket.matchesById[path.targetMatchId];
          const isTargetComplete = Boolean(targetMatch?.winnerId || targetRecord?.isComplete);

          return (
            <path
              key={path.id}
              d={path.d}
              fill="none"
              stroke={primaryColor}
              strokeWidth={isTargetComplete ? 2.5 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: isTargetComplete ? `drop-shadow(0 0 5px ${primaryColor}66)` : 'none',
                transition: 'all 0.2s ease',
              }}
            />
          );
        })}

        {/* Champion horizontal stem connecting Finals to Champion plaque */}
        {layout.championPath && (
          <path
            d={layout.championPath.d}
            fill="none"
            stroke={primaryColor}
            strokeWidth={championPlayer ? 3 : 2}
            strokeLinecap="round"
            strokeDasharray={championPlayer ? 'none' : '4 4'}
            style={{
              filter: championPlayer ? `drop-shadow(0 0 8px ${primaryColor}99)` : 'none',
              transition: 'all 0.25s ease',
            }}
          />
        )}
      </svg>

      {/* Layer 2: Match Cards Positioned at Geometric Coordinates */}
      {rounds.map((round) =>
        round.matches.map((match) => {
          const pos = layout.matchPositions[match.id];
          if (!pos) return null;

          const record = tournament.matchScores[match.id];
          const p1 = match.player1.player;
          const p2 = match.player2.player;
          const p1Profile = p1 ? (tournament.playersPool || []).find((p) => p.id === p1.id) : null;
          const p2Profile = p2 ? (tournament.playersPool || []).find((p) => p.id === p2.id) : null;

          const p1Name =
            p1?.name ||
            (match.player1.sourceMatchId
              ? `Winner of M#${bracket.matchesById[match.player1.sourceMatchId]?.matchNumber || '?'}`
              : 'TBD');
          const p2Name =
            p2?.name ||
            (match.player2.sourceMatchId
              ? `Winner of M#${bracket.matchesById[match.player2.sourceMatchId]?.matchNumber || '?'}`
              : 'TBD');

          const p1Wins = record?.player1Wins || 0;
          const p2Wins = record?.player2Wins || 0;
          const matchBestOf = record?.bestOf || match.bestOf || tier.bestOf || 5;
          const hasTieGame = Boolean(
            record?.games?.some(
              (g) =>
                g.winnerPlayerId === 'TIE' ||
                (g.player1Points !== null && g.player1Points === g.player2Points && g.player1Points > 0)
            )
          );
          const hasTiebreaker = Boolean(
            record?.hasTiebreaker || hasTieGame || (record?.games && record.games.length > matchBestOf)
          );
          const p1ScoreDisplay = hasTiebreaker ? `${p1Wins} (t)` : `${p1Wins}`;
          const p2ScoreDisplay = hasTiebreaker ? `${p2Wins} (t)` : `${p2Wins}`;

          const isPlayable = isMatchPlayable(match);
          const isComplete = Boolean(
            (p1?.id && match.winnerId === p1.id) ||
              (p2?.id && match.winnerId === p2.id) ||
              record?.isComplete
          );
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
                position: 'absolute',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: `${pos.width}px`,
                height: `${pos.height}px`,
                background: effectiveCardBg,
                borderRadius: 'var(--radius-sm)',
                border: inProgress || isMatchHovered
                  ? `2px solid ${primaryColor}`
                  : `1.5px solid ${primaryColor}`,
                boxShadow: inProgress
                  ? `0 0 16px ${primaryColor}66`
                  : isMatchHovered
                  ? `0 4px 14px ${primaryColor}40`
                  : '0 2px 6px rgba(0, 0, 0, 0.45)',
                cursor: !isObsMode && canManage && isPlayable && tournament.isLocked ? 'pointer' : 'default',
                opacity: isPlayable ? 1 : 0.72,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                boxSizing: 'border-box',
                zIndex: 2,
                transition: 'all 0.15s ease',
              }}
            >
              {/* Match Header Strip - Solid Themed */}
              <div
                style={{
                  height: '20px',
                  minHeight: '20px',
                  maxHeight: '20px',
                  padding: '0 0.5rem',
                  background: effectiveCardBg,
                  fontSize: '0.64rem',
                  color: primaryColor,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `1px solid ${primaryColor}`,
                  boxSizing: 'border-box',
                  lineHeight: '20px',
                  fontWeight: 800,
                }}
              >
                <span>Match #{match.matchNumber}</span>
                <span>Bo{matchBestOf}</span>
              </div>

              {/* Slot 1: Player 1 */}
              <div
                style={{
                  height: '28px',
                  minHeight: '28px',
                  maxHeight: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 0.5rem',
                  borderBottom: `1px solid ${primaryColor}40`,
                  background: 'transparent',
                  opacity: isComplete && !p1Won ? 0.45 : 1,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  onClick={(e) => {
                    if (p1?.id) {
                      e.stopPropagation();
                      handlePlayerClick(p1.id, p1.name, p1Profile?.country);
                    }
                  }}
                  onMouseEnter={() => p1?.id && setHoveredPlayerKey(`p1-${match.id}`)}
                  onMouseLeave={() => setHoveredPlayerKey(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    overflow: 'hidden',
                    padding: '0.05rem 0.2rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor:
                      hoveredPlayerKey === `p1-${match.id}` ? `${secondaryColor}22` : 'transparent',
                    cursor: p1?.id ? 'pointer' : 'inherit',
                    transition: 'all 0.15s ease',
                  }}
                  title={p1?.id ? 'View competitor tournament profile' : undefined}
                >
                  {p1?.seed && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '18px',
                        height: '18px',
                        padding: '0 0.2rem',
                        background: secondaryColor,
                        color: getContrastingTextColor(secondaryColor),
                        fontWeight: 800,
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)',
                        borderRadius: '2px',
                        flexShrink: 0,
                        lineHeight: '18px',
                      }}
                    >
                      {p1.seed}
                    </span>
                  )}
                  {p1Profile?.country && (
                    <CountryFlag country={p1Profile.country} style={{ fontSize: '0.9rem' }} />
                  )}
                  <span
                    style={{
                      fontSize: '0.84rem',
                      fontWeight: p1Won ? 800 : 600,
                      color:
                        hoveredPlayerKey === `p1-${match.id}`
                          ? secondaryColor
                          : p1Won
                          ? primaryColor
                          : '#ffffff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.1,
                    }}
                  >
                    {p1Name}
                  </span>
                </div>

                <span
                  className="tabular-nums"
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    minWidth: '18px',
                    height: '18px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: p1Won ? getContrastingTextColor(primaryColor) : 'var(--color-text-secondary)',
                    background: p1Won ? primaryColor : 'transparent',
                    padding: '0 0.35rem',
                    borderRadius: '2px',
                    border: `1px solid ${primaryColor}`,
                    marginLeft: '0.35rem',
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  {p1ScoreDisplay}
                </span>
              </div>

              {/* Slot 2: Player 2 */}
              <div
                style={{
                  height: '28px',
                  minHeight: '28px',
                  maxHeight: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 0.5rem',
                  background: 'transparent',
                  opacity: isComplete && !p2Won ? 0.45 : 1,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  onClick={(e) => {
                    if (p2?.id) {
                      e.stopPropagation();
                      handlePlayerClick(p2.id, p2.name, p2Profile?.country);
                    }
                  }}
                  onMouseEnter={() => p2?.id && setHoveredPlayerKey(`p2-${match.id}`)}
                  onMouseLeave={() => setHoveredPlayerKey(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    overflow: 'hidden',
                    padding: '0.05rem 0.2rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor:
                      hoveredPlayerKey === `p2-${match.id}` ? `${secondaryColor}22` : 'transparent',
                    cursor: p2?.id ? 'pointer' : 'inherit',
                    transition: 'all 0.15s ease',
                  }}
                  title={p2?.id ? 'View competitor tournament profile' : undefined}
                >
                  {p2?.seed && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '18px',
                        height: '18px',
                        padding: '0 0.2rem',
                        background: secondaryColor,
                        color: getContrastingTextColor(secondaryColor),
                        fontWeight: 800,
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)',
                        borderRadius: '2px',
                        flexShrink: 0,
                        lineHeight: '18px',
                      }}
                    >
                      {p2.seed}
                    </span>
                  )}
                  {p2Profile?.country && (
                    <CountryFlag country={p2Profile.country} style={{ fontSize: '0.9rem' }} />
                  )}
                  <span
                    style={{
                      fontSize: '0.84rem',
                      fontWeight: p2Won ? 800 : 600,
                      color:
                        hoveredPlayerKey === `p2-${match.id}`
                          ? secondaryColor
                          : p2Won
                          ? primaryColor
                          : '#ffffff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.1,
                    }}
                  >
                    {p2Name}
                  </span>
                </div>

                <span
                  className="tabular-nums"
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    minWidth: '18px',
                    height: '18px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: p2Won ? getContrastingTextColor(primaryColor) : 'var(--color-text-secondary)',
                    background: p2Won ? primaryColor : 'transparent',
                    padding: '0 0.35rem',
                    borderRadius: '2px',
                    border: `1px solid ${primaryColor}`,
                    marginLeft: '0.35rem',
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  {p2ScoreDisplay}
                </span>
              </div>
            </div>
          );
        })
      )}

      {/* Layer 3: Champion Showcase Plaque */}
      <div
        style={{
          position: 'absolute',
          left: `${layout.championPosition.x}px`,
          top: `${layout.championPosition.y}px`,
          width: `${layout.championPosition.width}px`,
          zIndex: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Plaque Box */}
        <div
          style={{
            width: '100%',
            height: `${layout.championPosition.height}px`,
            borderRadius: 'var(--radius-sm)',
            background: effectiveCardBg,
            border: `2.5px solid ${primaryColor}`,
            boxShadow: championPlayer
              ? `0 0 28px ${primaryColor}88`
              : `0 0 12px ${primaryColor}33`,
            display: 'flex',
            alignItems: 'stretch',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
          }}
        >
          {/* Seed Box */}
          <div
            style={{
              width: '46px',
              background: secondaryColor,
              color: getContrastingTextColor(secondaryColor),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.3rem',
              fontFamily: 'var(--font-mono)',
              flexShrink: 0,
              borderRight: `2px solid ${primaryColor}`,
            }}
          >
            {championPlayer?.seed ? championPlayer.seed : '?'}
          </div>

          {/* Champion Name Box */}
          <div
            onClick={() => {
              if (championPlayer?.id) {
                handlePlayerClick(championPlayer.id, championPlayer.name, championProfile?.country);
              }
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0 0.85rem',
              fontSize: '1.35rem',
              fontWeight: 900,
              letterSpacing: '0.02em',
              color: '#ffffff',
              cursor: championPlayer?.id ? 'pointer' : 'default',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              background: 'transparent',
            }}
            title={championPlayer?.id ? 'View champion profile' : undefined}
          >
            {championProfile?.country && (
              <CountryFlag country={championProfile.country} style={{ fontSize: '1.25rem' }} />
            )}
            <span>{championPlayer ? championPlayer.name : 'TBD'}</span>
          </div>
        </div>

        {/* Champion Subtitle */}
        <div
          style={{
            marginTop: '0.65rem',
            fontSize: '1.05rem',
            fontWeight: 800,
            color: primaryColor,
            letterSpacing: '0.06em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            textTransform: 'capitalize',
          }}
        >
          <Trophy size={18} color={primaryColor} />
          <span>{tier.name} Champion</span>
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: '100%',
        minHeight: isObsMode ? '100vh' : 'calc(100vh - 100px)',
        background: effectiveCanvasBg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {effectiveObsView === 'fit' ? (
        /* Strategy B: Viewport Auto-Scaled 1080p View */
        <div
          style={{
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: effectiveCanvasBg,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: `${layout.totalWidth}px`,
              height: `${layout.totalHeight}px`,
              transform: `scale(${fitScale})`,
              transformOrigin: 'center center',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            {canvasContent}
          </div>
        </div>
      ) : (
        /* Standard or Split Scrollable View (Halved top padding) */
        <div
          style={{
            width: '100%',
            padding: isObsMode ? '0.5rem' : '0.75rem 1.5rem',
            overflowX: 'auto',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
        >
          {canvasContent}
        </div>
      )}

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
  );
};
