import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BracketStructure, BracketMatch, isMatchPlayable, SeededPlayer } from '../types';
import { Tournament, TournamentTier, PlayerProfile } from '../../tournament/types';
import { MatchScoreDrawer } from './MatchScoreDrawer';
import {
  getContrastingTextColor,
  getTierCanvasBackground,
  getTierCardBackground,
  getAlternateShade,
  getTextScale,
  getDefaultTierColors,
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

  const fitContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic measurement for Strategy B (Fit to 1080p / responsive canvas)
  const [viewportDim, setViewportDim] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1920,
    h: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  useEffect(() => {
    if (effectiveObsView !== 'fit') return;
    window.scrollTo(0, 0);

    const updateDimensions = () => {
      if (fitContainerRef.current) {
        const rect = fitContainerRef.current.getBoundingClientRect();
        const availableHeight = Math.round(window.innerHeight - rect.top);
        setViewportDim({
          w: Math.round(rect.width) || window.innerWidth || 1920,
          h: availableHeight > 100 ? availableHeight : (window.innerHeight - 52) || 1080,
        });
      } else {
        setViewportDim({
          w: window.innerWidth || 1920,
          h: window.innerHeight || 1080,
        });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (fitContainerRef.current) {
      resizeObserver.observe(fitContainerRef.current);
    }
    window.addEventListener('resize', updateDimensions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
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
  const tierDefaults = getDefaultTierColors(tier);
  const primaryColor = tier.primaryColor || tierDefaults.primaryColor;
  const secondaryColor = tier.secondaryColor || tierDefaults.secondaryColor;
  const cardColor = tier.cardColor || tierDefaults.cardColor;
  const backgroundColor = tier.backgroundColor || tierDefaults.backgroundColor;
  const textColor = tier.textColor || tierDefaults.textColor;
  const textScale = getTextScale(tier.textSize);

  // Dynamic text scaling derived from smaller baseline:
  const shelfFontSize = `${(0.64 * textScale).toFixed(3)}rem`;
  const seedDim = Math.max(16, Math.round(18 * textScale));
  const seedFontSize = `${(0.68 * textScale).toFixed(3)}rem`;
  const flagFontSize = `${(0.9 * textScale).toFixed(3)}rem`;
  const nameFontSize = `${(0.84 * textScale).toFixed(3)}rem`;
  const scoreFontSize = `${(0.88 * textScale).toFixed(3)}rem`;
  const scoreMinW = Math.max(18, Math.round(20 * textScale));
  const scoreH = Math.max(18, Math.round(20 * textScale));

  // Calculate geometric coordinates and orthogonal SVG connector paths
  const layout = useMemo(() => {
    return calculateBracketLayout(bracket, undefined, effectiveObsView);
  }, [bracket, effectiveObsView]);

  // Fit scale calculation for 1080p / responsive OBS window
  const fitScale = useMemo(() => {
    if (effectiveObsView !== 'fit') return 1;
    const availableW = Math.max(240, viewportDim.w - (isObsMode ? 16 : 32));
    const availableH = Math.max(180, viewportDim.h - (isObsMode ? 12 : 24));
    const scaleX = availableW / layout.totalWidth;
    const scaleY = availableH / layout.totalHeight;
    return Math.min(scaleX, scaleY, 1.2);
  }, [effectiveObsView, viewportDim, layout.totalWidth, layout.totalHeight, isObsMode]);

  // Find final match winner if tournament is concluded
  let championPlayer: SeededPlayer | null = null;
  if (tier.eliminationType === 'DOUBLE' && tier.bracketRouting !== 'ACCELERATED_HYBRID') {
    const gfResetMatch = Object.values(bracket.matchesById).find(
      (m) => m.stage === 'GRAND_FINALS_RESET' || m.roundIdentifier === 'GF_RESET'
    );
    const gf1Match = Object.values(bracket.matchesById).find(
      (m) => m.stage === 'GRAND_FINALS' || m.roundIdentifier === 'GF'
    );

    const activeGfMatch =
      gfResetMatch && (tournament.matchScores[gfResetMatch.id]?.winnerPlayerId || gfResetMatch.winnerId)
        ? gfResetMatch
        : gf1Match;

    if (activeGfMatch) {
      const record = tournament.matchScores[activeGfMatch.id];
      const p1 = activeGfMatch.player1.player;
      const p2 = activeGfMatch.player2.player;
      const winnerId = record?.winnerPlayerId || activeGfMatch.winnerId;

      if (winnerId && (winnerId === p1?.id || winnerId === p2?.id)) {
        if (activeGfMatch === gf1Match && p2?.id && winnerId === p2.id && gfResetMatch) {
          const resetRecord = tournament.matchScores[gfResetMatch.id];
          const resetWinner = resetRecord?.winnerPlayerId || gfResetMatch.winnerId;
          if (resetWinner) {
            championPlayer =
              resetWinner === gfResetMatch.player1.player?.id
                ? gfResetMatch.player1.player
                : gfResetMatch.player2.player;
          }
        } else {
          championPlayer = winnerId === p1?.id ? p1 : p2;
        }
      }
    }
  } else {
    const finalRound = rounds[rounds.length - 1];
    const finalMatch = finalRound?.matches[0];
    const championWinnerId = finalMatch?.winnerId || tournament.matchScores[finalMatch?.id || '']?.winnerPlayerId;
    championPlayer =
      championWinnerId === finalMatch?.player1.player?.id
        ? finalMatch?.player1.player
        : championWinnerId === finalMatch?.player2.player?.id
        ? finalMatch?.player2.player
        : null;
  }

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
      {tier.eliminationType === 'DOUBLE' ? (
        <>
          {/* Double Elimination Stage Section Badges */}
          {layout.stageHeaders?.map((sh) => (
            <div
              key={sh.id}
              style={{
                position: 'absolute',
                left: `${sh.x}px`,
                top: `${sh.y}px`,
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.2rem 0.65rem',
                fontSize: '0.72rem',
                fontWeight: 900,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: primaryColor,
                background: effectiveCardBg,
                border: `1.5px solid ${primaryColor}77`,
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                zIndex: 10,
              }}
            >
              {sh.title}
            </div>
          ))}

          {/* Double Elimination Round Headers */}
          {layout.roundHeaders.map((header) => (
            <div
              key={header.roundNumber}
              style={{
                position: 'absolute',
                left: `${header.x}px`,
                top: `${header.y}px`,
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
                zIndex: 10,
              }}
            >
              {header.name}
            </div>
          ))}
        </>
      ) : (
        /* Sticky Round Headers Bar for Single Elimination */
        <div
          style={{
            position: effectiveObsView === 'fit' ? 'absolute' : 'sticky',
            top: 0,
            left: 0,
            zIndex: 10,
            width: `${layout.totalWidth}px`,
            height: `${Math.max(48, (layout.roundHeaders[0]?.y ?? 8) + 38)}px`,
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
                top: `${header.y}px`,
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
      )}

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
              stroke={isTargetComplete ? primaryColor : secondaryColor}
              strokeWidth={isTargetComplete ? 2.5 : 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: isTargetComplete ? `drop-shadow(0 0 6px ${primaryColor}77)` : 'none',
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

          const getSlotPlaceholder = (slot: typeof match.player1, fallbackNumber: number) => {
            if (!slot.sourceMatchId) return 'TBD';
            const src = bracket.matchesById[slot.sourceMatchId];
            if (!src) return 'TBD';
            const isLoserDrop = match.stage === 'LOSERS' && src.stage === 'WINNERS';
            return `${isLoserDrop ? 'Loser' : 'Winner'} of M#${src.matchNumber || fallbackNumber}`;
          };

          const p1Name = p1?.name || getSlotPlaceholder(match.player1, 1);
          const p2Name = p2?.name || getSlotPlaceholder(match.player2, 2);

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
          const p1Leading = inProgress && p1Wins > p2Wins;
          const p2Leading = inProgress && p2Wins > p1Wins;
          const p1ZebraBg = getAlternateShade(effectiveCardBg, 7);

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
                borderRadius: '5px',
                border: inProgress || isComplete
                  ? `2px solid ${primaryColor}`
                  : isMatchHovered
                  ? `1.5px solid ${primaryColor}`
                  : `1.5px solid ${secondaryColor}`,
                boxShadow: inProgress
                  ? `0 0 16px ${primaryColor}66`
                  : isComplete
                  ? `0 0 16px ${primaryColor}55`
                  : isMatchHovered
                  ? `0 4px 14px ${secondaryColor}40`
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
              {/* Match Header Strip - Solid Themed with Clean Non-Bold Typography */}
              <div
                style={{
                  height: '20px',
                  minHeight: '20px',
                  maxHeight: '20px',
                  padding: '0 0.55rem',
                  background: effectiveCardBg,
                  fontSize: shelfFontSize,
                  color: textColor,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: isComplete
                    ? `1.5px solid ${primaryColor}`
                    : `1.5px solid ${secondaryColor}`,
                  boxSizing: 'border-box',
                  lineHeight: '20px',
                  fontWeight: 500,
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
                  padding: '0 0.55rem',
                  background: isComplete ? (p1Won ? secondaryColor : effectiveCardBg) : p1ZebraBg,
                  opacity: 1,
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
                    gap: '0.4rem',
                    overflow: 'hidden',
                    padding: '0.05rem 0.2rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor:
                      hoveredPlayerKey === `p1-${match.id}` ? `${secondaryColor}22` : 'transparent',
                    cursor: p1?.id ? 'pointer' : 'inherit',
                    transition: 'all 0.15s ease',
                    minWidth: 0,
                  }}
                  title={p1?.id ? 'View competitor tournament profile' : undefined}
                >
                  {p1?.seed && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: `${seedDim}px`,
                        height: `${seedDim}px`,
                        minWidth: `${seedDim}px`,
                        background: effectiveCardBg,
                        border: `1.5px solid ${(isComplete && p1Won) || p1Leading ? primaryColor : secondaryColor}`,
                        color: (isComplete && p1Won) || p1Leading ? primaryColor : textColor,
                        fontWeight: 900,
                        fontSize: seedFontSize,
                        fontFamily: 'var(--font-mono)',
                        borderRadius: '3px',
                        flexShrink: 0,
                        lineHeight: `${seedDim}px`,
                      }}
                    >
                      {p1.seed}
                    </span>
                  )}
                  {p1Profile?.country && (
                    <CountryFlag country={p1Profile.country} style={{ fontSize: flagFontSize, lineHeight: 1, flexShrink: 0 }} />
                  )}
                  <span
                    style={{
                      fontSize: nameFontSize,
                      fontWeight: (isComplete && p1Won) || p1Leading ? 900 : 700,
                      color:
                        hoveredPlayerKey === `p1-${match.id}`
                           ? secondaryColor
                          : (isComplete && p1Won) || p1Leading
                          ? primaryColor
                          : textColor,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.1,
                    }}
                  >
                    {p1Name}
                  </span>
                </div>

                {/* Score Box */}
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: scoreFontSize,
                    fontWeight: 900,
                    minWidth: `${scoreMinW}px`,
                    height: `${scoreH}px`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: !isComplete && !inProgress
                      ? textColor
                      : (isComplete && p1Won) || p1Leading
                      ? getContrastingTextColor(primaryColor)
                      : textColor,
                    background: !isComplete && !inProgress
                      ? effectiveCardBg
                      : (isComplete && p1Won) || p1Leading
                      ? primaryColor
                      : 'transparent',
                    border: !isComplete && !inProgress
                      ? `1.5px solid ${secondaryColor}`
                      : 'none',
                    borderRadius: '3px',
                    marginLeft: '0.35rem',
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  {!isComplete && !inProgress ? '-' : p1ScoreDisplay}
                </span>
              </div>

              {/* Player-to-Player Divider: Primary if finished, Secondary otherwise */}
              <div
                style={{
                  height: '1.5px',
                  minHeight: '1.5px',
                  background: isComplete ? primaryColor : secondaryColor,
                  flexShrink: 0,
                }}
              />

              {/* Slot 2: Player 2 */}
              <div
                style={{
                  height: '28px',
                  minHeight: '28px',
                  maxHeight: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 0.55rem',
                  background: isComplete && p2Won ? secondaryColor : effectiveCardBg,
                  opacity: 1,
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
                    gap: '0.4rem',
                    overflow: 'hidden',
                    padding: '0.05rem 0.2rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor:
                      hoveredPlayerKey === `p2-${match.id}` ? `${secondaryColor}22` : 'transparent',
                    cursor: p2?.id ? 'pointer' : 'inherit',
                    transition: 'all 0.15s ease',
                    minWidth: 0,
                  }}
                  title={p2?.id ? 'View competitor tournament profile' : undefined}
                >
                  {p2?.seed && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: `${seedDim}px`,
                        height: `${seedDim}px`,
                        minWidth: `${seedDim}px`,
                        background: effectiveCardBg,
                        border: `1.5px solid ${(isComplete && p2Won) || p2Leading ? primaryColor : secondaryColor}`,
                        color: (isComplete && p2Won) || p2Leading ? primaryColor : textColor,
                        fontWeight: 900,
                        fontSize: seedFontSize,
                        fontFamily: 'var(--font-mono)',
                        borderRadius: '3px',
                        flexShrink: 0,
                        lineHeight: `${seedDim}px`,
                      }}
                    >
                      {p2.seed}
                    </span>
                  )}
                  {p2Profile?.country && (
                    <CountryFlag country={p2Profile.country} style={{ fontSize: flagFontSize, lineHeight: 1, flexShrink: 0 }} />
                  )}
                  <span
                    style={{
                      fontSize: nameFontSize,
                      fontWeight: (isComplete && p2Won) || p2Leading ? 900 : 700,
                      color:
                        hoveredPlayerKey === `p2-${match.id}`
                          ? secondaryColor
                          : (isComplete && p2Won) || p2Leading
                          ? primaryColor
                          : textColor,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.1,
                    }}
                  >
                    {p2Name}
                  </span>
                </div>

                {/* Score Box */}
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: scoreFontSize,
                    fontWeight: 900,
                    minWidth: `${scoreMinW}px`,
                    height: `${scoreH}px`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: !isComplete && !inProgress
                      ? textColor
                      : (isComplete && p2Won) || p2Leading
                      ? getContrastingTextColor(primaryColor)
                      : textColor,
                    background: !isComplete && !inProgress
                      ? effectiveCardBg
                      : (isComplete && p2Won) || p2Leading
                      ? primaryColor
                      : 'transparent',
                    border: !isComplete && !inProgress
                      ? `1.5px solid ${secondaryColor}`
                      : 'none',
                    borderRadius: '3px',
                    marginLeft: '0.35rem',
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  {!isComplete && !inProgress ? '-' : p2ScoreDisplay}
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
        minHeight: effectiveObsView === 'fit' ? undefined : isObsMode ? '100vh' : 'calc(100vh - 100px)',
        height: effectiveObsView === 'fit' ? '100%' : undefined,
        flex: 1,
        background: effectiveCanvasBg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {effectiveObsView === 'fit' ? (
        /* Strategy B: Viewport Auto-Scaled 1080p View */
        <div
          ref={fitContainerRef}
          style={{
            width: isObsMode ? '100vw' : '100%',
            height: isObsMode ? '100vh' : 'calc(100vh - 52px)',
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: isObsMode ? '4px' : '8px',
            background: effectiveCanvasBg,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: `${Math.ceil(layout.totalWidth * fitScale)}px`,
              height: `${Math.ceil(layout.totalHeight * fitScale)}px`,
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: `${layout.totalWidth}px`,
                height: `${layout.totalHeight}px`,
                transform: `scale(${fitScale})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            >
              {canvasContent}
            </div>
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
