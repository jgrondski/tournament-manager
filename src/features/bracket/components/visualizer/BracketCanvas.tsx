import React from 'react';
import {
  BracketRound,
  BracketStructure,
  BracketMatch,
  SeededPlayer,
} from '../../types';
import { Tournament, TournamentTier, PlayerProfile } from '../../../tournament/types';
import { BracketLayoutMetadata } from '../../bracketLayout';
import { ACCELERATED_HYBRID_POD_PALETTE, getMatchBranchColor } from '../../routingChips';
import { BracketSvgConnectors } from './BracketSvgConnectors';
import { BracketMatchCard } from './BracketMatchCard';
import { BracketChampionNode } from './BracketChampionNode';

interface BracketCanvasProps {
  targetLayout: BracketLayoutMetadata;
  targetRounds: BracketRound[];
  isPhase1View?: boolean;
  isPhase2View?: boolean;
  targetChampPlayer?: SeededPlayer | null;
  tournament: Tournament;
  bracket: BracketStructure;
  tier: TournamentTier;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  lowerBracketColor?: string;
  effectiveCardBg: string;
  shelfFontSize: string;
  seedDim: number;
  seedFontSize: string;
  flagFontSize: string;
  nameFontSize: string;
  scoreFontSize: string;
  scoreMinW: number;
  scoreH: number;
  isAcceleratedHybrid?: boolean;
  hoveredPlayerKey: string | null;
  setHoveredPlayerKey: (key: string | null) => void;
  hoveredMatchId: string | null;
  setHoveredMatchId: (id: string | null) => void;
  hoveredOriginMatchId: string | null;
  setHoveredOriginMatchId: (id: string | null) => void;
  hoveredAncestry?: {
    matchIds: Set<string>;
    slotKeys: Set<string>;
    isChampion?: boolean;
    targetPlayerId?: string | null;
  } | null;
  focusedMatchId: string | null;
  isObsMode?: boolean;
  canManage?: boolean;
  onSlotHover: (matchId: string | null, slotNum: 1 | 2 | null) => void;
  onChampHover: (champPlayerId?: string | null) => void;
  onPlayerClick: (pId: string, pName: string, country?: string) => void;
  onChipClick: (targetMatchId: string) => void;
  onSelectMatch: (match: BracketMatch, roundName: string) => void;
}

export const BracketCanvas: React.FC<BracketCanvasProps> = ({
  targetLayout,
  targetRounds,
  isPhase2View = false,
  targetChampPlayer = null,
  tournament,
  bracket,
  tier,
  primaryColor,
  secondaryColor,
  textColor,
  lowerBracketColor,
  effectiveCardBg,
  shelfFontSize,
  seedDim,
  seedFontSize,
  flagFontSize,
  nameFontSize,
  scoreFontSize,
  scoreMinW,
  scoreH,
  isAcceleratedHybrid = false,
  hoveredPlayerKey,
  setHoveredPlayerKey,
  hoveredMatchId,
  setHoveredMatchId,
  hoveredOriginMatchId,
  setHoveredOriginMatchId,
  hoveredAncestry,
  focusedMatchId,
  isObsMode = false,
  canManage = true,
  onSlotHover,
  onChampHover,
  onPlayerClick,
  onChipClick,
  onSelectMatch,
}) => {
  const champProfile = targetChampPlayer
    ? (tournament.playersPool || []).find((p: PlayerProfile) => p.id === targetChampPlayer.id)
    : null;

  const podBorderColor = isAcceleratedHybrid
    ? targetLayout.stageHeaders?.[0]?.title === 'Accelerated Round'
      ? ACCELERATED_HYBRID_POD_PALETTE.AR.border
      : targetLayout.stageHeaders?.[0]?.title === 'Upper Bracket'
      ? ACCELERATED_HYBRID_POD_PALETTE.UB.border
      : targetLayout.stageHeaders?.[0]?.title === 'Lower Bracket'
      ? ACCELERATED_HYBRID_POD_PALETTE.LB.border
      : null
    : null;

  return (
    <div
      style={{
        position: 'relative',
        width: `${targetLayout.totalWidth}px`,
        height: `${targetLayout.totalHeight}px`,
        minWidth: `${targetLayout.totalWidth}px`,
        minHeight: `${targetLayout.totalHeight}px`,
      }}
    >
      {/* Stage Section Badges */}
      {targetLayout.stageHeaders?.filter(() => !isPhase2View).map((sh) => {
        const isLosersStageHeader =
          (tier.eliminationType === 'DOUBLE' || bracket?.eliminationType === 'DOUBLE') &&
          !isAcceleratedHybrid &&
          (sh.id?.toLowerCase().includes('loser') ||
            sh.title.toLowerCase().includes('loser') ||
            sh.title.toLowerCase().includes('lower'));
        const badgeAccentColor = isAcceleratedHybrid
          ? sh.title.includes('Accelerated')
            ? ACCELERATED_HYBRID_POD_PALETTE.AR.border
            : sh.title.includes('Upper')
            ? ACCELERATED_HYBRID_POD_PALETTE.UB.border
            : sh.title.includes('Lower') || sh.title.includes('2nd Chance')
            ? (lowerBracketColor || ACCELERATED_HYBRID_POD_PALETTE.LB.border)
            : podBorderColor
          : isLosersStageHeader
          ? lowerBracketColor
          : null;
        return (
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
              borderTop: `1.5px solid ${secondaryColor}`,
              borderBottom: `1.5px solid ${secondaryColor}`,
              borderLeft: badgeAccentColor ? `4px solid ${badgeAccentColor}` : `1.5px solid ${secondaryColor}`,
              borderRight: badgeAccentColor ? `4px solid ${badgeAccentColor}` : `1.5px solid ${secondaryColor}`,
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              zIndex: 10,
            }}
          >
            {sh.title}
          </div>
        );
      })}

      {/* Round Headers */}
      {targetLayout.roundHeaders.map((header) => {
        const nameLower = header.name.trim().toLowerCase();
        const isFinals =
          nameLower === 'finals' ||
          nameLower === 'grand finals' ||
          nameLower === 'grand finals reset';
        const roundObj = targetRounds.find((r) => r.roundNumber === header.roundNumber);
        const firstMatch = roundObj?.matches?.[0];
        const isLosersRound =
          (tier.eliminationType === 'DOUBLE' || bracket?.eliminationType === 'DOUBLE') &&
          !isAcceleratedHybrid &&
          (roundObj?.stage === 'LOSERS' ||
            roundObj?.roundIdentifier?.startsWith('L') ||
            header.name.includes('(L)') ||
            header.name.toLowerCase().includes('loser') ||
            header.name.startsWith('LR'));
        const roundAccentColor = isAcceleratedHybrid
          ? (roundObj?.roundIdentifier === 'PRE_L1' || roundObj?.roundIdentifier === 'PRE_L2' || roundObj?.roundIdentifier === '2C' || roundObj?.roundIdentifier === 'PO'
              ? (lowerBracketColor || ACCELERATED_HYBRID_POD_PALETTE.LB.border)
              : firstMatch ? getMatchBranchColor(firstMatch, lowerBracketColor) : podBorderColor)
          : isLosersRound
          ? lowerBracketColor
          : null;
        return (
          <div
            key={header.roundNumber}
            style={{
              position: 'absolute',
              left: `${header.x}px`,
              top: `${header.y}px`,
              width: `${header.width}px`,
              height: isFinals ? '44px' : '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isFinals ? '1.02rem' : '0.82rem',
              fontWeight: isFinals ? 900 : 800,
              color: primaryColor,
              textTransform: 'uppercase',
              letterSpacing: isFinals ? '0.1em' : '0.08em',
              background: effectiveCardBg,
              borderRadius: 'var(--radius-sm)',
              borderTop: isFinals ? `2px solid ${primaryColor}` : `1.5px solid ${secondaryColor}`,
              borderBottom: isFinals ? `2px solid ${primaryColor}` : `1.5px solid ${secondaryColor}`,
              borderLeft: roundAccentColor ? `4px solid ${roundAccentColor}` : isFinals ? `2px solid ${primaryColor}` : `1.5px solid ${secondaryColor}`,
              borderRight: roundAccentColor ? `4px solid ${roundAccentColor}` : isFinals ? `2px solid ${primaryColor}` : `1.5px solid ${secondaryColor}`,
              boxShadow: isFinals
                ? `0 0 16px ${primaryColor}44, 0 4px 12px rgba(0, 0, 0, 0.45)`
                : '0 2px 8px rgba(0, 0, 0, 0.4)',
              zIndex: 10,
            }}
          >
            {header.name}
          </div>
        );
      })}

      {/* Dynamic SVG Orthogonal Connector Lines */}
      <BracketSvgConnectors
        totalWidth={targetLayout.totalWidth}
        totalHeight={targetLayout.totalHeight}
        paths={targetLayout.paths}
        championPath={targetLayout.championPath}
        tournamentMatchScores={tournament.matchScores}
        matchesById={bracket.matchesById}
        hoveredAncestry={hoveredAncestry}
        targetChampPlayer={targetChampPlayer}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />

      {/* Match Cards */}
      {targetRounds.map((round) =>
        round.matches.map((match: BracketMatch, mIdx: number) => {
          const pos = targetLayout.matchPositions[match.id];
          if (!pos) return null;

          return (
            <BracketMatchCard
              key={match.id}
              match={match}
              round={round}
              mIdx={mIdx}
              pos={pos}
              tournament={tournament}
              bracket={bracket}
              tier={tier}
              isPhase2View={isPhase2View}
              isObsMode={isObsMode}
              canManage={canManage}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              textColor={textColor}
              lowerBracketColor={lowerBracketColor}
              effectiveCardBg={effectiveCardBg}
              shelfFontSize={shelfFontSize}
              seedDim={seedDim}
              seedFontSize={seedFontSize}
              flagFontSize={flagFontSize}
              nameFontSize={nameFontSize}
              scoreFontSize={scoreFontSize}
              scoreMinW={scoreMinW}
              scoreH={scoreH}
              isAcceleratedHybrid={isAcceleratedHybrid}
              hoveredPlayerKey={hoveredPlayerKey}
              setHoveredPlayerKey={setHoveredPlayerKey}
              hoveredMatchId={hoveredMatchId}
              setHoveredMatchId={setHoveredMatchId}
              hoveredOriginMatchId={hoveredOriginMatchId}
              setHoveredOriginMatchId={setHoveredOriginMatchId}
              hoveredAncestry={hoveredAncestry}
              focusedMatchId={focusedMatchId}
              onSlotHover={onSlotHover}
              onPlayerClick={onPlayerClick}
              onChipClick={onChipClick}
              onSelectMatch={onSelectMatch}
            />
          );
        })
      )}

      {/* Champion Showcase Plaque */}
      {targetLayout.championPosition && (
        <BracketChampionNode
          championPosition={targetLayout.championPosition}
          targetChampPlayer={targetChampPlayer}
          champProfile={champProfile}
          tierName={tier.name}
          effectiveCardBg={effectiveCardBg}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          hoveredAncestry={hoveredAncestry}
          onChampHover={onChampHover}
          onPlayerClick={onPlayerClick}
        />
      )}
    </div>
  );
};
