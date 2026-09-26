import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BracketStructure, BracketMatch, isMatchPlayable, SeededPlayer, BracketRound } from '../types';
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
import {
  calculateBracketLayout,
  calculateAcceleratedHybridAccelLayout,
  calculateAcceleratedHybridPreMergeLayout,
  calculateAcceleratedHybridPreMergeUpperLayout,
  calculateAcceleratedHybridLowerBracketLayout,
  calculateAcceleratedHybridPhase2Layout,
  BracketViewMode,
  BracketLayoutMetadata,
} from '../bracketLayout';
import { Trophy } from 'lucide-react';
import { PlayerDetailDrawer } from '../../qualifiers/components/PlayerDetailDrawer';
import { CountryFlag } from '../../players/flagUtils';

export type HybridStageTab = 'qualifiers' | 'championship' | 'combined' | 'accel' | 'premerge';

export interface MicroChipData {
  text: string;
  tooltip: string;
  bg: string;
  color: string;
  border?: string;
  glow?: string;
  sourceMatchId?: string;
  targetMatchId?: string;
}

export const ACCELERATED_HYBRID_POD_PALETTE = {
  AR: {
    border: '#9333EA',
    text: '#C084FC',
    bgTranslucent: 'rgba(147, 51, 234, 0.2)',
    badgeBg: 'rgba(147, 51, 234, 0.25)',
    glow: 'rgba(147, 51, 234, 0.6)',
  },
  UB: {
    border: '#0284C7',
    text: '#38BDF8',
    bgTranslucent: 'rgba(2, 132, 199, 0.2)',
    badgeBg: 'rgba(2, 132, 199, 0.25)',
    glow: 'rgba(2, 132, 199, 0.6)',
  },
  LB: {
    border: '#059669',
    text: '#34D399',
    bgTranslucent: 'rgba(5, 150, 105, 0.2)',
    badgeBg: 'rgba(5, 150, 105, 0.25)',
    glow: 'rgba(5, 150, 105, 0.6)',
  },
} as const;

export function getMatchBranchColor(match: BracketMatch): string | null {
  // Top 16 Championship: Neutral / Default tier theme (remove any pod-specific accent colors)
  if (
    match.phase === 'CHAMPIONSHIP' ||
    match.stage === 'GRAND_FINALS' ||
    match.roundIdentifier?.startsWith('CHAMP')
  ) {
    return null;
  }
  if (match.subTrack === 'ACCELERATED' || match.roundIdentifier === 'AR') {
    return ACCELERATED_HYBRID_POD_PALETTE.AR.border;
  }
  if (match.subTrack === 'PRE_MERGE_UPPER' || match.roundIdentifier?.startsWith('PRE_W')) {
    return ACCELERATED_HYBRID_POD_PALETTE.UB.border;
  }
  if (
    match.subTrack === 'PRE_MERGE_LOWER' ||
    match.subTrack === 'RE_CLIMB' ||
    match.roundIdentifier === 'PRE_L1' ||
    match.roundIdentifier === 'PRE_L2' ||
    match.roundIdentifier === '2C' ||
    match.roundIdentifier === 'PO'
  ) {
    return ACCELERATED_HYBRID_POD_PALETTE.LB.border;
  }
  return null;
}

export const getOriginChip = (
  slotNum: 1 | 2,
  match: BracketMatch,
  bracket: BracketStructure,
  mIdx: number,
  isPhase2OpeningRound: boolean
): MicroChipData | null => {
  const slot = slotNum === 1 ? match.player1 : match.player2;
  const srcMatch = slot?.sourceMatchId ? bracket.matchesById[slot.sourceMatchId] : undefined;
  const srcId = srcMatch?.id || slot?.sourceMatchId;

  const buildChip = (
    branch: 'AR' | 'UB' | 'LB',
    matchNumber: number | string,
    action: string,
    detailRound: string,
    targetId?: string
  ): MicroChipData => {
    const palette = ACCELERATED_HYBRID_POD_PALETTE[branch];
    const resolvedId = targetId || srcId;
    return {
      text: `${branch} ${matchNumber}`,
      tooltip: `${action} of ${detailRound} (Match #${matchNumber})`,
      bg: palette.bgTranslucent,
      color: palette.text,
      border: `1px solid ${palette.border}88`,
      sourceMatchId: resolvedId,
      targetMatchId: resolvedId,
    };
  };

  // Phase 2 opening round (Top 16 Championship)
  if (isPhase2OpeningRound) {
    if (slotNum === 1) {
      const arMatches = Object.values(bracket.matchesById).filter(m => m.roundIdentifier === 'AR');
      const fallbackSrc = arMatches[mIdx];
      const targetId = srcMatch?.id || slot?.sourceMatchId || fallbackSrc?.id;
      const mNum = srcMatch?.matchNumber ?? fallbackSrc?.matchNumber ?? (mIdx + 1);
      return buildChip('AR', mNum, 'Qualifier', 'Accelerated Round', targetId);
    } else {
      const poMatches = Object.values(bracket.matchesById).filter(m => m.roundIdentifier === 'PO');
      const fallbackSrc = poMatches[mIdx];
      const targetId = srcMatch?.id || slot?.sourceMatchId || fallbackSrc?.id;
      const mNum = srcMatch?.matchNumber ?? fallbackSrc?.matchNumber ?? (mIdx + 1);
      return buildChip('LB', mNum, 'Qualifier', 'Lower Bracket Round 4 (Play-Offs)', targetId);
    }
  }

  // Lower Bracket Round 4 (PO):
  // Slot 1: Inter-pod jump from Upper Bracket Round 2 (PRE_W2)
  // Slot 2: Incoming horizontal connector line from 2C -> Hide chip
  if (match.roundIdentifier === 'PO') {
    if (slotNum === 1) {
      const preW2Matches = Object.values(bracket.matchesById).filter(m => m.roundIdentifier === 'PRE_W2');
      const fallbackSrc = preW2Matches[mIdx];
      const targetId = srcMatch?.id || slot?.sourceMatchId || fallbackSrc?.id;
      const mNum = srcMatch?.matchNumber ?? fallbackSrc?.matchNumber ?? (mIdx + 1);
      return buildChip('UB', mNum, 'Winner', 'Upper Bracket Round 2', targetId);
    }
    return null;
  }

  // Lower Bracket Round 3 (2C):
  // Slot 1: Incoming horizontal connector line from PRE_L2 -> Hide chip
  // Slot 2: Inter-pod jump from Accelerated Round losers (AR)
  if (match.roundIdentifier === '2C') {
    if (slotNum === 2) {
      const arMatches = Object.values(bracket.matchesById).filter(m => m.roundIdentifier === 'AR');
      const fallbackSrc = arMatches[mIdx];
      const targetId = srcMatch?.id || slot?.sourceMatchId || fallbackSrc?.id;
      const mNum = srcMatch?.matchNumber ?? fallbackSrc?.matchNumber ?? (mIdx + 1);
      return buildChip('AR', mNum, 'Dropped', 'Accelerated Round', targetId);
    }
    return null;
  }

  // Lower Bracket Round 2 (PRE_L2):
  // Slot 1: Incoming horizontal connector line from PRE_L1 -> Hide chip
  // Slot 2: Inter-pod jump from Upper Bracket Round 1 losers (PRE_W1)
  if (match.roundIdentifier === 'PRE_L2') {
    if (slotNum === 2) {
      const mNum = srcMatch?.matchNumber ?? (mIdx + 1);
      return buildChip('UB', mNum, 'Dropped', 'Upper Bracket Round 1', srcId);
    }
    return null;
  }

  // Lower Bracket Round 1 (PRE_L1):
  // Both slots entered from Upper Bracket Round 1 losers (PRE_W1 - inter-pod jump)
  if (match.roundIdentifier === 'PRE_L1') {
    const mNum = srcMatch?.matchNumber ?? (mIdx + 1);
    return buildChip('UB', mNum, 'Dropped', 'Upper Bracket Round 1', srcId);
  }

  // Upper Bracket Round 2 (PRE_W2):
  // Incoming visual SVG connector line from PRE_W1 -> Hide chip
  if (match.roundIdentifier === 'PRE_W2') {
    return null;
  }

  return null;
};

export const getOutcomeChip = (
  slotWon: boolean,
  match: BracketMatch,
  finalsCutoff: number,
  bracket?: BracketStructure,
  primaryColor = '#ffc905',
  _secondaryColor = '#f59e0b'
): MicroChipData | null => {
  const findDestMatch = (mId: string): BracketMatch | undefined => {
    if (!bracket?.matchesById) return undefined;
    if (match.nextMatchId && bracket.matchesById[match.nextMatchId]) {
      return bracket.matchesById[match.nextMatchId];
    }
    const dest = Object.values(bracket.matchesById).find(
      (m) =>
        (m.phase === 'CHAMPIONSHIP' || m.roundIdentifier?.startsWith('CHAMP')) &&
        (m.player1.sourceMatchId === mId ||
          m.player2.sourceMatchId === mId ||
          m.slotA?.matchId === mId ||
          m.slotB?.matchId === mId)
    );
    if (dest) return dest;

    // Fallback if sourceMatchId wasn't populated on championship matches
    if (match.roundIdentifier === 'AR' || match.roundIdentifier === 'PO') {
      const roundMatches = Object.values(bracket.matchesById).filter(
        (m) => m.roundIdentifier === match.roundIdentifier
      );
      const idx = roundMatches.findIndex((m) => m.id === mId);
      if (idx >= 0) {
        const champR1 = Object.values(bracket.matchesById).filter(
          (m) => m.roundNumber === (bracket.rounds.find((r) => r.phase === 'CHAMPIONSHIP')?.roundNumber || 0)
        );
        if (champR1[idx]) return champR1[idx];
      }
    }
    return undefined;
  };

  const findLbR3Match = (mId: string): BracketMatch | undefined => {
    if (!bracket?.matchesById) return undefined;
    const dest = Object.values(bracket.matchesById).find(
      (m) =>
        m.roundIdentifier === '2C' &&
        (m.player1.sourceMatchId === mId ||
          m.player2.sourceMatchId === mId ||
          m.slotA?.matchId === mId ||
          m.slotB?.matchId === mId)
    );
    if (dest) return dest;
    const arMatches = Object.values(bracket.matchesById).filter((m) => m.roundIdentifier === 'AR');
    const idx = arMatches.findIndex((m) => m.id === mId);
    if (idx >= 0) {
      const scMatches = Object.values(bracket.matchesById).filter((m) => m.roundIdentifier === '2C');
      return scMatches[idx];
    }
    return undefined;
  };

  const findPoMatch = (mId: string): BracketMatch | undefined => {
    if (!bracket?.matchesById) return undefined;
    const dest = Object.values(bracket.matchesById).find(
      (m) =>
        m.roundIdentifier === 'PO' &&
        (m.player1.sourceMatchId === mId ||
          m.player2.sourceMatchId === mId ||
          m.slotA?.matchId === mId ||
          m.slotB?.matchId === mId)
    );
    if (dest) return dest;
    const preW2Matches = Object.values(bracket.matchesById).filter((m) => m.roundIdentifier === 'PRE_W2');
    const idx = preW2Matches.findIndex((m) => m.id === mId);
    if (idx >= 0) {
      const poMatches = Object.values(bracket.matchesById).filter((m) => m.roundIdentifier === 'PO');
      return poMatches[idx];
    }
    return undefined;
  };

  const cutoff = finalsCutoff || 16;
  const tLabel = `T${cutoff}`;

  // Accelerated Round (Pod 1 Terminal Matches):
  if (match.roundIdentifier === 'AR') {
    if (slotWon) {
      const destMatch = findDestMatch(match.id);
      const destNum = destMatch?.matchNumber;
      return {
        text: destNum ? `${tLabel} ${destNum}` : tLabel,
        tooltip: `QUALIFIED to Top ${cutoff} Championship${destNum ? ` (Match #${destNum})` : ''}`,
        bg: `${primaryColor}26`,
        color: primaryColor,
        border: `1.5px solid ${primaryColor}`,
        glow: `0 0 10px ${primaryColor}88`,
        sourceMatchId: destMatch?.id,
        targetMatchId: destMatch?.id,
      };
    } else {
      const destMatch = findLbR3Match(match.id);
      return {
        text: destMatch?.matchNumber ? `LB #${destMatch.matchNumber}` : 'LB R3',
        tooltip: `Drops to Lower Bracket Round 3${destMatch?.matchNumber ? ` (Match #${destMatch.matchNumber})` : ''}`,
        bg: 'rgba(5, 150, 105, 0.2)',
        color: '#34d399',
        border: '1px solid rgba(5, 150, 105, 0.5)',
        sourceMatchId: destMatch?.id,
        targetMatchId: destMatch?.id,
      };
    }
  }

  // Upper Bracket Round 2 (Pod 2 Terminal Matches):
  if (match.roundIdentifier === 'PRE_W2' && slotWon) {
    const destMatch = findPoMatch(match.id);
    return {
      text: destMatch?.matchNumber ? `LB #${destMatch.matchNumber}` : 'LB R4',
      tooltip: `Advances to Lower Bracket Round 4 (Play-Offs${destMatch?.matchNumber ? ` - Match #${destMatch.matchNumber}` : ''})`,
      bg: 'rgba(5, 150, 105, 0.2)',
      color: '#34d399',
      border: '1px solid rgba(5, 150, 105, 0.5)',
      sourceMatchId: destMatch?.id,
      targetMatchId: destMatch?.id,
    };
  }

  // Lower Bracket Round 4 (Pod 3 Terminal Matches):
  if (match.roundIdentifier === 'PO' && slotWon) {
    const destMatch = findDestMatch(match.id);
    const destNum = destMatch?.matchNumber;
    return {
      text: destNum ? `${tLabel} ${destNum}` : tLabel,
      tooltip: `QUALIFIED to Top ${cutoff} Championship${destNum ? ` (Match #${destNum})` : ''}`,
      bg: `${primaryColor}26`,
      color: primaryColor,
      border: `1.5px solid ${primaryColor}`,
      glow: `0 0 10px ${primaryColor}88`,
      sourceMatchId: destMatch?.id,
      targetMatchId: destMatch?.id,
    };
  }

  // Hide "Going To" chips for all intermediate rounds
  return null;
};

export const renderMicroChip = (
  chip: MicroChipData | null,
  onHover?: (sourceMatchId: string | null) => void,
  onClick?: (matchId: string) => void
) => {
  if (!chip) return null;
  const matchId = chip.targetMatchId || chip.sourceMatchId;
  return (
    <span
      className={matchId ? 'bracket-side-chip' : undefined}
      onClick={(e) => {
        if (matchId && onClick) {
          e.stopPropagation();
          onClick(matchId);
        }
      }}
      onMouseEnter={() => {
        if (matchId && onHover) {
          onHover(matchId);
        }
      }}
      onMouseLeave={() => {
        if (matchId && onHover) {
          onHover(null);
        }
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 4px',
        minWidth: '22px',
        height: '17px',
        fontSize: '0.62rem',
        fontWeight: 900,
        fontFamily: 'var(--font-mono, monospace)',
        borderRadius: '3px',
        backgroundColor: chip.bg,
        color: chip.color,
        border: chip.border || 'none',
        boxShadow: chip.glow || 'none',
        lineHeight: 1,
        flexShrink: 0,
        letterSpacing: '-0.02em',
        cursor: matchId ? 'pointer' : 'help',
        userSelect: 'none',
        transition: 'all 0.15s ease',
      }}
      title={chip.tooltip}
    >
      {chip.text}
    </span>
  );
};

export function findPlayerJourney(
  targetPlayerId: string | null | undefined,
  startMatchId: string | null,
  startSlotNum: 1 | 2 | null,
  bracket: BracketStructure,
  scores: Record<string, { winnerPlayerId?: string | null; isComplete?: boolean }>,
  championPlayerId?: string | null
): {
  matchIds: Set<string>;
  slotKeys: Set<string>;
  isChampion: boolean;
} {
  const matchIds = new Set<string>();
  const slotKeys = new Set<string>();

  if (targetPlayerId) {
    // 1. Identify all matches where this player is scheduled or played
    for (const m of Object.values(bracket.matchesById)) {
      if (m.player1?.player?.id === targetPlayerId) {
        matchIds.add(m.id);
        slotKeys.add(`${m.id}-1`);
      }
      if (m.player2?.player?.id === targetPlayerId) {
        matchIds.add(m.id);
        slotKeys.add(`${m.id}-2`);
      }
    }

    // 2. Also trace forward if player won or dropped to a future slot where player object isn't set yet
    let changed = true;
    while (changed) {
      changed = false;
      for (const mId of Array.from(matchIds)) {
        const m = bracket.matchesById[mId];
        if (!m) continue;
        const record = scores[m.id];
        const winnerId = m.winnerId || record?.winnerPlayerId;
        if (winnerId === targetPlayerId) {
          if (m.nextMatchId && bracket.matchesById[m.nextMatchId]) {
            const nextSlot = m.nextMatchSlot || 1;
            if (!matchIds.has(m.nextMatchId) || !slotKeys.has(`${m.nextMatchId}-${nextSlot}`)) {
              matchIds.add(m.nextMatchId);
              slotKeys.add(`${m.nextMatchId}-${nextSlot}`);
              changed = true;
            }
          }
        } else if (winnerId && m.loserNextMatchId && bracket.matchesById[m.loserNextMatchId]) {
          const isLoser =
            (m.player1?.player?.id === targetPlayerId && winnerId !== targetPlayerId) ||
            (m.player2?.player?.id === targetPlayerId && winnerId !== targetPlayerId);
          if (isLoser) {
            const loserSlot = m.loserNextMatchSlot || 2;
            if (!matchIds.has(m.loserNextMatchId) || !slotKeys.has(`${m.loserNextMatchId}-${loserSlot}`)) {
              matchIds.add(m.loserNextMatchId);
              slotKeys.add(`${m.loserNextMatchId}-${loserSlot}`);
              changed = true;
            }
          }
        }
      }
    }

    const isChampion = Boolean(championPlayerId && championPlayerId === targetPlayerId);
    return { matchIds, slotKeys, isChampion };
  }

  // Fallback for unassigned placeholder slots: traverse ancestry backwards and descendants forwards
  if (startMatchId && startSlotNum) {
    slotKeys.add(`${startMatchId}-${startSlotNum}`);
    matchIds.add(startMatchId);

    const queue: Array<{ matchId: string; slotNum: 1 | 2 }> = [{ matchId: startMatchId, slotNum: startSlotNum }];
    const visited = new Set<string>([`${startMatchId}-${startSlotNum}`]);

    while (queue.length > 0) {
      const { matchId, slotNum } = queue.shift()!;
      const curMatch = bracket.matchesById[matchId];
      if (!curMatch) continue;

      const curParticipant = slotNum === 1 ? curMatch.player1 : curMatch.player2;
      const curFeeder = slotNum === 1 ? curMatch.slotA : curMatch.slotB;
      const sourceMatchId = curFeeder?.matchId || curParticipant?.sourceMatchId;

      if (sourceMatchId && bracket.matchesById[sourceMatchId]) {
        const parentMatch = bracket.matchesById[sourceMatchId];
        matchIds.add(parentMatch.id);

        for (const sNum of [1, 2] as const) {
          const key = `${parentMatch.id}-${sNum}`;
          if (!visited.has(key)) {
            visited.add(key);
            slotKeys.add(key);
            queue.push({ matchId: parentMatch.id, slotNum: sNum });
          }
        }
      }
    }
  }

  return { matchIds, slotKeys, isChampion: false };
}

export const findAncestors = (
  startMatchId: string,
  startSlotNum: 1 | 2,
  bracket: BracketStructure,
  scores: Record<string, { winnerPlayerId?: string | null; isComplete?: boolean }>,
  championPlayerId?: string | null
) => {
  const match = bracket.matchesById[startMatchId];
  const participant = startSlotNum === 1 ? match?.player1 : match?.player2;
  return findPlayerJourney(participant?.player?.id, startMatchId, startSlotNum, bracket, scores, championPlayerId);
};

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
  const [hoveredOriginMatchId, setHoveredOriginMatchId] = useState<string | null>(null);
  const [hoveredAncestry, setHoveredAncestry] = useState<{
    matchIds: Set<string>;
    slotKeys: Set<string>;
    isChampion?: boolean;
  } | null>(null);

  const combinedContentRef = useRef<HTMLDivElement>(null);
  const [measuredCombinedDim, setMeasuredCombinedDim] = useState<{ w: number; h: number } | null>(null);

  const handleSlotHover = (matchId: string | null, slotNum: 1 | 2 | null) => {
    if (!matchId || !slotNum || !bracket) {
      setHoveredAncestry(null);
      return;
    }
    const ancestry = findAncestors(matchId, slotNum, bracket, tournament.matchScores, championPlayer?.id);
    setHoveredAncestry(ancestry);
  };

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

  const isAcceleratedHybrid = bracket?.bracketRouting === 'ACCELERATED_HYBRID';

  // Partition rounds into constituent stages for Accelerated Hybrid:
  // 1. Pod Top-Left: Accelerated Round (seeds 1 to finalsCutoff)
  const accelRounds = useMemo(
    () => (rounds || []).filter((r) => r.roundIdentifier === 'AR'),
    [rounds]
  );

  // 2. Pod Top-Right: Pre-Merge Upper Bracket (PRE_W1, PRE_W2)
  const preUpperRounds = useMemo(
    () => (rounds || []).filter((r) => r.roundIdentifier?.startsWith('PRE_W')),
    [rounds]
  );


  // Pod 3 (Consolidated Lower Bracket): PRE_L1, PRE_L2, 2C, PO
  const lowerBracketRounds = useMemo(() => {
    if (!rounds) return [];
    const r1 = rounds.find((r) => r.roundIdentifier === 'PRE_L1');
    const r2 = rounds.find((r) => r.roundIdentifier === 'PRE_L2');
    const r3 = rounds.find((r) => r.roundIdentifier === '2C');
    const r4 = rounds.find((r) => r.roundIdentifier === 'PO');
    return [r1, r2, r3, r4].filter(Boolean) as BracketRound[];
  }, [rounds]);

  // Backward compatibility: combined pre-merge rounds
  const preMergeRounds = useMemo(
    () => (rounds || []).filter((r) => r.phase === 'QUALIFIERS' && r.roundIdentifier !== 'AR'),
    [rounds]
  );

  // Phase 2: Top C Championship Finals (Round of C, QF, SF, Finals)
  const championshipRounds = useMemo(
    () => (rounds || []).filter((r) => r.phase === 'CHAMPIONSHIP'),
    [rounds]
  );

  // Activity checks to pick the most relevant default tab
  const hasChampionshipActivity = useMemo(() => {
    if (!isAcceleratedHybrid || !bracket?.matchesById) return false;
    const champMatches = Object.values(bracket.matchesById).filter(
      (m) => m.phase === 'CHAMPIONSHIP'
    );
    return champMatches.some((m) => {
      const score = tournament.matchScores[m.id];
      return Boolean(
        m.winnerId ||
        score?.isComplete ||
        score?.winnerPlayerId ||
        (score?.player1Wins || 0) > 0 ||
        (score?.player2Wins || 0) > 0
      );
    });
  }, [isAcceleratedHybrid, bracket?.matchesById, tournament.matchScores]);

  const rawParamStage = (searchParams.get('stage') || searchParams.get('phase')) as string | null;
  const mappedParamStage: HybridStageTab | null =
    rawParamStage === 'qualifiers' || rawParamStage === 'championship' || rawParamStage === 'combined' || rawParamStage === 'accel' || rawParamStage === 'premerge'
      ? rawParamStage
      : rawParamStage === 'phase1' || rawParamStage === 'pods' || rawParamStage === 'grid'
      ? 'qualifiers'
      : rawParamStage === 'phase2'
      ? 'championship'
      : rawParamStage === 'stacked'
      ? 'combined'
      : null;

  const [selectedPhaseTab, setSelectedPhaseTab] = useState<HybridStageTab | null>(null);

  const activeHybridTab: HybridStageTab =
    selectedPhaseTab ||
    mappedParamStage ||
    (hasChampionshipActivity ? 'championship' : 'qualifiers');

  const [focusedMatchId, setFocusedMatchId] = useState<string | null>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  const handleChipClick = useCallback(
    (targetMatchId: string) => {
      if (!bracket?.matchesById) return;
      const targetMatch = bracket.matchesById[targetMatchId];
      if (!targetMatch) return;

      const isTargetChampionship =
        targetMatch.phase === 'CHAMPIONSHIP' ||
        targetMatch.roundIdentifier?.startsWith('CHAMP') ||
        championshipRounds.some((r) => r.matches.some((m) => m.id === targetMatchId));

      if (isAcceleratedHybrid && activeHybridTab !== 'combined') {
        if (isTargetChampionship && activeHybridTab !== 'championship') {
          setSelectedPhaseTab('championship');
        } else if (!isTargetChampionship && activeHybridTab !== 'qualifiers') {
          setSelectedPhaseTab('qualifiers');
        }
      }

      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      setFocusedMatchId(targetMatchId);
      focusTimeoutRef.current = setTimeout(() => {
        setFocusedMatchId(null);
      }, 2800);

      const performScroll = () => {
        const matchEl = document.getElementById(`bracket-match-${targetMatchId}`);
        if (matchEl) {
          matchEl.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center',
          });
        }
      };

      performScroll();
      requestAnimationFrame(() => {
        setTimeout(performScroll, 60);
        setTimeout(performScroll, 180);
      });
    },
    [bracket?.matchesById, championshipRounds, isAcceleratedHybrid, activeHybridTab]
  );

  // Compute Layouts
  const standardLayout = useMemo(() => {
    if (isAcceleratedHybrid) return null;
    return calculateBracketLayout(bracket, undefined, effectiveObsView);
  }, [bracket, effectiveObsView, isAcceleratedHybrid]);

  const layoutAccel = useMemo(() => {
    if (!isAcceleratedHybrid) return null;
    return calculateAcceleratedHybridAccelLayout(bracket);
  }, [bracket, isAcceleratedHybrid]);

  const layoutPreMergeUpper = useMemo(() => {
    if (!isAcceleratedHybrid) return null;
    return calculateAcceleratedHybridPreMergeUpperLayout(bracket);
  }, [bracket, isAcceleratedHybrid]);


  const layoutLowerBracket = useMemo(() => {
    if (!isAcceleratedHybrid) return null;
    return calculateAcceleratedHybridLowerBracketLayout(bracket);
  }, [bracket, isAcceleratedHybrid]);

  const layoutPreMerge = useMemo(() => {
    if (!isAcceleratedHybrid) return null;
    return calculateAcceleratedHybridPreMergeLayout(bracket);
  }, [bracket, isAcceleratedHybrid]);

  const layoutChampionship = useMemo(() => {
    if (!isAcceleratedHybrid) return null;
    return calculateAcceleratedHybridPhase2Layout(bracket, undefined, effectiveObsView === 'fit' ? 'fit' : 'standard');
  }, [bracket, isAcceleratedHybrid, effectiveObsView]);

  const layout = useMemo(() => {
    if (!isAcceleratedHybrid) return standardLayout!;
    if (activeHybridTab === 'championship') return layoutChampionship!;
    if (activeHybridTab === 'accel') return layoutAccel!;
    if (activeHybridTab === 'premerge') return layoutPreMerge!;
    return layoutChampionship || layoutPreMerge || layoutAccel!;
  }, [isAcceleratedHybrid, activeHybridTab, standardLayout, layoutAccel, layoutPreMerge, layoutChampionship]);

  // Dynamic measurement of the combined view stage containers
  useEffect(() => {
    if (!combinedContentRef.current || activeHybridTab !== 'combined' || effectiveObsView === 'fit') return;
    const el = combinedContentRef.current;
    const updateDim = () => {
      const scrollH = el.scrollHeight;
      const rectH = el.getBoundingClientRect().height;
      const h = Math.max(scrollH, rectH);
      const scrollW = el.scrollWidth;
      const rectW = el.getBoundingClientRect().width;
      const w = Math.max(scrollW, rectW);
      if (h > 0 && w > 0) {
        setMeasuredCombinedDim((prev) => {
          if (prev && Math.abs(prev.w - w) < 2 && Math.abs(prev.h - h) < 2) return prev;
          return { w, h };
        });
      }
    };
    updateDim();
    const observer = new ResizeObserver(updateDim);
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeHybridTab, effectiveObsView, layoutAccel, layoutPreMergeUpper, layoutLowerBracket, layoutChampionship]);

  // Combined View bounding box: measures all rendered stages (Qualifiers and Championship)
  const combinedBounds = useMemo(() => {
    if (!isAcceleratedHybrid) return null;
    const wAccel = layoutAccel?.totalWidth || 300;
    const hAccel = layoutAccel?.totalHeight || 700;
    const wUpper = layoutPreMergeUpper?.totalWidth || 540;
    const hUpper = layoutPreMergeUpper?.totalHeight || 1200;
    const wLower = layoutLowerBracket?.totalWidth || 1080;
    const hLower = layoutLowerBracket?.totalHeight || 700;
    const wChamp = layoutChampionship?.totalWidth || 1200;
    const hChamp = layoutChampionship?.totalHeight || 700;

    // Top row (Pod 1 & Pod 2) with pod header strip (55px) and padding (32px)
    const topRowW = wAccel + 24 + wUpper + 64;
    const topRowH = Math.max(hAccel, hUpper) + 90;
    // Lower pod (Pod 3) with pod header strip (55px) and padding (32px)
    const lowerH = hLower + 90;
    const qualW = Math.max(topRowW, wLower + 64);
    // Qualifiers height: header (55px) + top row + gap (20px) + lower row
    const qualH = 55 + topRowH + 20 + lowerH;

    // Stage 1 to 2 gap (40px) + divider (45px) + Stage 2 Header (55px)
    const stageDividerH = 40 + 45 + 55;
    const combinedW = Math.max(qualW, wChamp + 64) + 60;
    // Add 100px bottom safety padding as required
    const estimatedCombinedH = qualH + stageDividerH + hChamp + 100;

    const finalCombinedH = (effectiveObsView !== 'fit' && measuredCombinedDim?.h)
      ? Math.max(measuredCombinedDim.h + 100, estimatedCombinedH)
      : estimatedCombinedH;
    const finalCombinedW = (effectiveObsView !== 'fit' && measuredCombinedDim?.w)
      ? Math.max(measuredCombinedDim.w + 40, combinedW)
      : combinedW;

    return {
      qualW,
      qualH,
      wChamp,
      hChamp,
      combinedW: finalCombinedW,
      combinedH: finalCombinedH,
    };
  }, [
    isAcceleratedHybrid,
    effectiveObsView,
    layoutAccel,
    layoutPreMergeUpper,
    layoutLowerBracket,
    layoutChampionship,
    measuredCombinedDim,
  ]);

  // Fit scale calculation for 1080p / responsive OBS window
  const fitScale = useMemo(() => {
    if (effectiveObsView !== 'fit') return 1;
    const availableW = Math.max(240, viewportDim.w - (isObsMode ? 16 : 32));
    const availableH = Math.max(180, viewportDim.h - (isObsMode ? 12 : 24));

    let targetW = layout.totalWidth;
    let targetH = layout.totalHeight;

    if (isAcceleratedHybrid && activeHybridTab === 'combined' && combinedBounds) {
      targetW = combinedBounds.combinedW;
      targetH = combinedBounds.combinedH;
    } else if (isAcceleratedHybrid && activeHybridTab === 'qualifiers' && combinedBounds) {
      targetW = combinedBounds.qualW;
      targetH = combinedBounds.qualH;
    }

    const scaleX = availableW / targetW;
    const scaleY = availableH / targetH;
    return Math.min(scaleX, scaleY, 1.2);
  }, [
    effectiveObsView,
    viewportDim,
    layout.totalWidth,
    layout.totalHeight,
    isObsMode,
    isAcceleratedHybrid,
    activeHybridTab,
    combinedBounds,
  ]);

  // Find final match winner if tournament is concluded
  let championPlayer: SeededPlayer | null = null;
  if (isAcceleratedHybrid) {
    const finalRound = championshipRounds[championshipRounds.length - 1];
    const finalMatch = finalRound?.matches[0];
    const champWinnerId = finalMatch?.winnerId || tournament.matchScores[finalMatch?.id || '']?.winnerPlayerId;
    championPlayer =
      champWinnerId === finalMatch?.player1.player?.id
        ? finalMatch?.player1.player
        : champWinnerId === finalMatch?.player2.player?.id
        ? finalMatch?.player2.player
        : null;
  } else if (tier.eliminationType === 'DOUBLE') {
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

  // Pure user-defined solid colors
  const effectiveCardBg = chromaHex ? (tier.cardColor || '#161922') : cardBg;
  const effectiveCanvasBg = chromaHex ? chromaHex : isObsMode ? 'transparent' : canvasBg;

  // Render a complete geometric canvas for a given layout and round set
  const renderCanvas = (
    targetLayout: BracketLayoutMetadata,
    targetRounds: BracketRound[],
    _isPhase1View = false,
    isPhase2View = false,
    targetChampPlayer: SeededPlayer | null = null
  ) => {
    const champProfile = targetChampPlayer
      ? (tournament.playersPool || []).find((p) => p.id === targetChampPlayer.id)
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
          const badgeAccentColor = isAcceleratedHybrid
            ? sh.title.includes('Accelerated')
              ? ACCELERATED_HYBRID_POD_PALETTE.AR.border
              : sh.title.includes('Upper')
              ? ACCELERATED_HYBRID_POD_PALETTE.UB.border
              : sh.title.includes('Lower') || sh.title.includes('2nd Chance')
              ? ACCELERATED_HYBRID_POD_PALETTE.LB.border
              : podBorderColor
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
                border: `1.5px solid ${secondaryColor}`,
                ...(badgeAccentColor
                  ? {
                      borderLeft: `4px solid ${badgeAccentColor}`,
                      borderRight: `4px solid ${badgeAccentColor}`,
                    }
                  : {}),
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
          const isFinals =
            header.isFinals ||
            header.name.toLowerCase().includes('finals') ||
            header.name.toLowerCase().includes('grand finals');
          const roundObj = targetRounds.find((r) => r.roundNumber === header.roundNumber);
          const firstMatch = roundObj?.matches?.[0];
          const roundAccentColor =
            isAcceleratedHybrid && firstMatch ? getMatchBranchColor(firstMatch) : podBorderColor;
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
                border: isFinals
                  ? `2px solid ${primaryColor}`
                  : `1.5px solid ${secondaryColor}`,
                ...(roundAccentColor
                  ? {
                      borderLeft: `4px solid ${roundAccentColor}`,
                      borderRight: `4px solid ${roundAccentColor}`,
                    }
                  : {}),
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
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${targetLayout.totalWidth}px`,
            height: `${targetLayout.totalHeight}px`,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {[...targetLayout.paths]
            .sort((a, b) => {
              if (!hoveredAncestry) return 0;
              const aIn =
                hoveredAncestry.matchIds.has(a.targetMatchId) &&
                (a.targetSlot
                  ? hoveredAncestry.slotKeys.has(`${a.targetMatchId}-${a.targetSlot}`) &&
                    a.sourceMatchIds.some((sId) => hoveredAncestry.matchIds.has(sId))
                  : a.sourceMatchIds.some((sId) => hoveredAncestry.matchIds.has(sId)));
              const bIn =
                hoveredAncestry.matchIds.has(b.targetMatchId) &&
                (b.targetSlot
                  ? hoveredAncestry.slotKeys.has(`${b.targetMatchId}-${b.targetSlot}`) &&
                    b.sourceMatchIds.some((sId) => hoveredAncestry.matchIds.has(sId))
                  : b.sourceMatchIds.some((sId) => hoveredAncestry.matchIds.has(sId)));
              return (aIn ? 1 : 0) - (bIn ? 1 : 0);
            })
            .map((path) => {
              const targetRecord = tournament.matchScores[path.targetMatchId];
              const targetMatch = bracket.matchesById[path.targetMatchId];
              const isTargetComplete = Boolean(targetMatch?.winnerId || targetRecord?.isComplete);
              const isPathInAncestry = Boolean(
                hoveredAncestry &&
                hoveredAncestry.matchIds.has(path.targetMatchId) &&
                (
                  path.targetSlot
                    ? (
                        hoveredAncestry.slotKeys.has(`${path.targetMatchId}-${path.targetSlot}`) &&
                        path.sourceMatchIds.some((sId) => hoveredAncestry.matchIds.has(sId))
                      )
                    : path.sourceMatchIds.some((sId) => hoveredAncestry.matchIds.has(sId))
                )
              );

              return (
                <path
                  key={path.id}
                  d={path.d}
                  fill="none"
                  stroke={isPathInAncestry ? primaryColor : isTargetComplete ? primaryColor : secondaryColor}
                  strokeWidth={isPathInAncestry ? 4 : isTargetComplete ? 2.5 : 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    filter: isPathInAncestry
                      ? `drop-shadow(0 0 10px ${primaryColor})`
                      : isTargetComplete
                      ? `drop-shadow(0 0 6px ${primaryColor}77)`
                      : 'none',
                    opacity: isPathInAncestry ? 1 : hoveredAncestry ? 0.2 : 1,
                    transition: 'all 0.15s ease',
                  }}
                />
              );
            })}

          {/* Champion horizontal stem connecting Finals to Champion plaque */}
          {targetLayout.championPath && (
            <path
              d={targetLayout.championPath.d}
              fill="none"
              stroke={primaryColor}
              strokeWidth={targetChampPlayer ? (hoveredAncestry?.isChampion ? 4 : 3) : 2}
              strokeLinecap="round"
              strokeDasharray={targetChampPlayer ? 'none' : '4 4'}
              style={{
                filter: targetChampPlayer
                  ? hoveredAncestry?.isChampion
                    ? `drop-shadow(0 0 12px ${primaryColor})`
                    : `drop-shadow(0 0 8px ${primaryColor}99)`
                  : 'none',
                opacity: hoveredAncestry ? (hoveredAncestry.isChampion ? 1 : 0.2) : 1,
                transition: 'all 0.25s ease',
              }}
            />
          )}
        </svg>

        {/* Match Cards */}
        {targetRounds.map((round) =>
          round.matches.map((match, mIdx) => {
            const pos = targetLayout.matchPositions[match.id];
            if (!pos) return null;

            const record = tournament.matchScores[match.id];
            const p1 = match.player1.player;
            const p2 = match.player2.player;
            const p1Profile = p1 ? (tournament.playersPool || []).find((p) => p.id === p1.id) : null;
            const p2Profile = p2 ? (tournament.playersPool || []).find((p) => p.id === p2.id) : null;

            const isPhase2OpeningRound =
              isPhase2View &&
              (round.roundIdentifier === 'CHAMP_R1' || match.roundIdentifier === 'CHAMP_R1');

            const p1SourceNum = match.player1.sourceMatchId
              ? match.player1.sourceMatchId.match(/-m(\d+)$/)?.[1]
              : undefined;
            const accelOriginLabel = `Accel #${p1SourceNum || mIdx + 1}`;

            const p2SourceNum = match.player2.sourceMatchId
              ? match.player2.sourceMatchId.match(/-m(\d+)$/)?.[1]
              : undefined;
            const playOffOriginLabel = `Play-off #${p2SourceNum || mIdx + 1}`;

            const isAdvanceRound =
              match.subTrack === 'ACCELERATED' ||
              match.roundIdentifier === 'AR' ||
              match.roundIdentifier === 'PO';

            const getSlotPlaceholder = (slot: typeof match.player1, fallbackNumber: number) => {
              if (isPhase2OpeningRound) {
                return fallbackNumber === 1
                  ? `Winner of ${accelOriginLabel}`
                  : `Winner of ${playOffOriginLabel}`;
              }
              if (match.roundIdentifier === '2C') {
                return fallbackNumber === 1
                  ? `Winner of Lower R2 M#${mIdx + 1}`
                  : `Loser of Accel M#${p2SourceNum || mIdx + 1}`;
              }
              if (match.roundIdentifier === 'PO') {
                return fallbackNumber === 1
                  ? `Winner of Upper R2 M#${mIdx + 1}`
                  : `Winner of 2nd Chance M#${mIdx + 1}`;
              }
              if (match.roundIdentifier === 'PRE_L1') {
                return `Loser of Upper R1`;
              }
              if (match.roundIdentifier === 'PRE_L2') {
                return fallbackNumber === 1
                  ? `Winner of Lower R1 M#${mIdx + 1}`
                  : `Loser of Upper R2`;
              }
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
            const finalsCutoff = bracket.finalsCutoff || 16;
            const p1OriginChip = isAcceleratedHybrid
              ? getOriginChip(1, match, bracket, mIdx, isPhase2OpeningRound)
              : null;
            const p2OriginChip = isAcceleratedHybrid
              ? getOriginChip(2, match, bracket, mIdx, isPhase2OpeningRound)
              : null;
            const p1OutcomeChip = isComplete ? getOutcomeChip(p1Won, match, finalsCutoff, bracket, primaryColor, secondaryColor) : null;
            const p2OutcomeChip = isComplete ? getOutcomeChip(p2Won, match, finalsCutoff, bracket, primaryColor, secondaryColor) : null;
            const isMatchHovered = hoveredMatchId === match.id;
            const isFocusedMatch = focusedMatchId === match.id;
            const branchAccentColor = isAcceleratedHybrid ? getMatchBranchColor(match) : null;
            const isOriginHovered = hoveredOriginMatchId === match.id;
            const p1Leading = inProgress && p1Wins > p2Wins;
            const p2Leading = inProgress && p2Wins > p1Wins;
            const p1ZebraBg = getAlternateShade(effectiveCardBg, 7);

            const isCardInAncestry = hoveredAncestry?.matchIds.has(match.id);
            const isP1Ancestor = hoveredAncestry?.slotKeys.has(`${match.id}-1`);
            const isP2Ancestor = hoveredAncestry?.slotKeys.has(`${match.id}-2`);

            return (
              <div
                key={match.id}
                id={`bracket-match-${match.id}`}
                style={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${pos.width}px`,
                  height: `${pos.height}px`,
                  overflow: 'visible',
                  zIndex: isFocusedMatch
                    ? 60
                    : isCardInAncestry
                    ? 26
                    : isOriginHovered
                    ? 25
                    : isMatchHovered
                    ? 15
                    : 2,
                  pointerEvents: 'auto',
                  transform: isFocusedMatch ? 'scale(1.08)' : undefined,
                  transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease',
                }}
              >
                {/* Outside Left: Origin Micro-Chips (Where they come from) */}
                {p1OriginChip && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 'calc(100% + 6px)',
                      top: '20px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      zIndex: 30,
                      pointerEvents: 'auto',
                    }}
                  >
                    {renderMicroChip(p1OriginChip, setHoveredOriginMatchId, handleChipClick)}
                  </div>
                )}

                {p2OriginChip && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 'calc(100% + 6px)',
                      top: '49.5px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      zIndex: 30,
                      pointerEvents: 'auto',
                    }}
                  >
                    {renderMicroChip(p2OriginChip, setHoveredOriginMatchId, handleChipClick)}
                  </div>
                )}

                {/* Outside Right: Outcome Micro-Chips (Where they go) */}
                {p1OutcomeChip && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 'calc(100% + 6px)',
                      top: '20px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      zIndex: 30,
                      pointerEvents: 'auto',
                    }}
                  >
                    {renderMicroChip(p1OutcomeChip, undefined, handleChipClick)}
                  </div>
                )}

                {p2OutcomeChip && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 'calc(100% + 6px)',
                      top: '49.5px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      zIndex: 30,
                      pointerEvents: 'auto',
                    }}
                  >
                    {renderMicroChip(p2OutcomeChip, undefined, handleChipClick)}
                  </div>
                )}

                {/* Match Card Body */}
                <div
                  onClick={() => {
                    if (!isObsMode && canManage && isPlayable && tournament.isLocked) {
                      setSelectedMatch({
                        match,
                        roundName: match.stage === 'GRAND_FINALS_RESET' ? 'Grand Finals' : round.name,
                      });
                    }
                  }}
                  onMouseEnter={() => setHoveredMatchId(match.id)}
                  onMouseLeave={() => setHoveredMatchId(null)}
                  style={{
                    width: '100%',
                    height: '100%',
                    background: effectiveCardBg,
                    borderRadius: '5px',
                    border: hoveredAncestry
                      ? isCardInAncestry
                        ? `1.5px solid ${secondaryColor}`
                        : `1.5px solid ${secondaryColor}44`
                      : inProgress || isComplete
                      ? `2px solid ${primaryColor}`
                      : isMatchHovered
                      ? `1.5px solid ${primaryColor}`
                      : `1.5px solid ${secondaryColor}`,
                    ...(branchAccentColor
                      ? {
                          borderLeft: hoveredAncestry && !isCardInAncestry
                            ? `4px solid ${branchAccentColor}44`
                            : `4px solid ${branchAccentColor}`,
                          borderRight: hoveredAncestry && !isCardInAncestry
                            ? `4px solid ${branchAccentColor}44`
                            : `4px solid ${branchAccentColor}`,
                        }
                      : {}),
                    boxShadow: isFocusedMatch
                      ? `0 0 0 3px ${primaryColor}, 0 0 35px ${primaryColor}dd, 0 0 70px ${primaryColor}66`
                      : hoveredAncestry
                      ? 'none'
                      : isOriginHovered
                      ? `0 0 20px ${branchAccentColor || primaryColor}, 0 0 8px rgba(255, 255, 255, 0.6)`
                      : inProgress
                      ? `0 0 16px ${primaryColor}66`
                      : isComplete
                      ? `0 0 16px ${primaryColor}55`
                      : isMatchHovered
                      ? `0 4px 14px ${secondaryColor}40`
                      : '0 2px 6px rgba(0, 0, 0, 0.45)',
                    outline: isFocusedMatch
                      ? `2.5px solid ${primaryColor}`
                      : !hoveredAncestry && isOriginHovered
                      ? `2px solid ${branchAccentColor || primaryColor}`
                      : 'none',
                    outlineOffset: isFocusedMatch ? '2px' : '0px',
                    animation: isFocusedMatch ? 'matchZoomPulse 2.4s ease-in-out' : undefined,
                    cursor: !isObsMode && canManage && isPlayable && tournament.isLocked ? 'pointer' : 'default',
                    opacity: hoveredAncestry
                      ? isCardInAncestry
                        ? 1
                        : 0.35
                      : isPlayable
                      ? 1
                      : 0.72,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Match Header Strip */}
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
                      borderBottom: hoveredAncestry
                        ? isCardInAncestry
                          ? `1.5px solid ${secondaryColor}`
                          : `1.5px solid ${secondaryColor}44`
                        : isComplete
                        ? `1.5px solid ${primaryColor}`
                        : `1.5px solid ${secondaryColor}`,
                      boxSizing: 'border-box',
                      lineHeight: '20px',
                      fontWeight: 500,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>Match #{match.matchNumber}</span>
                      {isAdvanceRound && !isComplete && (
                        <span style={{ color: '#10b981', fontSize: '0.62rem', fontWeight: 800 }}>
                          • Winner Advances
                        </span>
                      )}
                    </div>
                    <span>Bo{matchBestOf}</span>
                  </div>

                  {/* Slot 1: Player 1 */}
                  <div
                    onMouseEnter={() => handleSlotHover(match.id, 1)}
                    onMouseLeave={() => handleSlotHover(null, null)}
                    style={{
                      height: '28px',
                      minHeight: '28px',
                      maxHeight: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 0.55rem',
                      background: isComplete ? (p1Won ? secondaryColor : effectiveCardBg) : p1ZebraBg,
                      boxSizing: 'border-box',
                      position: 'relative',
                      transition: 'all 0.15s ease',
                      ...(isP1Ancestor
                        ? {
                            outline: `4.5px solid ${primaryColor}`,
                            outlineOffset: '-2px',
                            boxShadow: `inset 0 0 12px ${primaryColor}88, 0 0 18px ${primaryColor}cc`,
                            zIndex: 20,
                            borderRadius: '3px',
                          }
                        : {}),
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
                          flex: 1,
                          minWidth: 0,
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

                  {/* Player Divider */}
                  <div
                    style={{
                      height: '1.5px',
                      minHeight: '1.5px',
                      background: hoveredAncestry
                        ? isCardInAncestry
                          ? secondaryColor
                          : `${secondaryColor}44`
                        : isComplete
                        ? primaryColor
                        : secondaryColor,
                      flexShrink: 0,
                    }}
                  />

                  {/* Slot 2: Player 2 */}
                  <div
                    onMouseEnter={() => handleSlotHover(match.id, 2)}
                    onMouseLeave={() => handleSlotHover(null, null)}
                    style={{
                      height: '28px',
                      minHeight: '28px',
                      maxHeight: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 0.55rem',
                      background: isComplete && p2Won ? secondaryColor : effectiveCardBg,
                      boxSizing: 'border-box',
                      position: 'relative',
                      transition: 'all 0.15s ease',
                      ...(isP2Ancestor
                        ? {
                            outline: `4.5px solid ${primaryColor}`,
                            outlineOffset: '-2px',
                            boxShadow: `inset 0 0 12px ${primaryColor}88, 0 0 18px ${primaryColor}cc`,
                            zIndex: 20,
                            borderRadius: '3px',
                          }
                        : {}),
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
                          flex: 1,
                          minWidth: 0,
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
              </div>
            );
          })
        )}

        {/* Champion Showcase Plaque */}
        {targetLayout.championPosition && targetLayout.championPosition.width > 0 && targetChampPlayer !== undefined && (
          <div
            style={{
              position: 'absolute',
              left: `${targetLayout.championPosition.x}px`,
              top: `${targetLayout.championPosition.y}px`,
              width: `${targetLayout.championPosition.width}px`,
              zIndex: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Plaque Box */}
            <div
              onMouseEnter={() => {
                if (targetChampPlayer?.id) {
                  const journey = findPlayerJourney(
                    targetChampPlayer.id,
                    null,
                    null,
                    bracket,
                    tournament.matchScores,
                    championPlayer?.id
                  );
                  setHoveredAncestry(journey);
                }
              }}
              onMouseLeave={() => setHoveredAncestry(null)}
              style={{
                width: '100%',
                height: `${targetLayout.championPosition.height}px`,
                borderRadius: 'var(--radius-sm)',
                background: effectiveCardBg,
                border: `2.5px solid ${primaryColor}`,
                boxShadow: targetChampPlayer
                  ? hoveredAncestry?.isChampion
                    ? `0 0 34px ${primaryColor}, inset 0 0 16px ${primaryColor}44`
                    : `0 0 28px ${primaryColor}88`
                  : `0 0 12px ${primaryColor}33`,
                opacity: hoveredAncestry ? (hoveredAncestry.isChampion ? 1 : 0.35) : 1,
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
                {targetChampPlayer?.seed ? targetChampPlayer.seed : '?'}
              </div>

              {/* Champion Name Box */}
              <div
                onClick={() => {
                  if (targetChampPlayer?.id) {
                    handlePlayerClick(targetChampPlayer.id, targetChampPlayer.name, champProfile?.country);
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
                  cursor: targetChampPlayer?.id ? 'pointer' : 'default',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  background: 'transparent',
                }}
                title={targetChampPlayer?.id ? 'View champion profile' : undefined}
              >
                {champProfile?.country && (
                  <CountryFlag country={champProfile.country} style={{ fontSize: '1.25rem' }} />
                )}
                <span>{targetChampPlayer ? targetChampPlayer.name : 'TBD'}</span>
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
        )}
      </div>
    );
  };

  const renderQualifierPodGrid = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
        {/* Top Row: Pod 1 (Accelerated Round) & Pod 2 (Upper Bracket) */}
        <div
          className="qualifier-top-pods"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
            gap: '1.75rem',
            width: '100%',
            boxSizing: 'border-box',
            alignItems: 'start',
          }}
        >
          {/* Pod 1: Accelerated Round */}
          <div
            style={{
              background: effectiveCardBg,
              border: `1.5px solid ${secondaryColor}`,
              borderLeft: `4px solid ${ACCELERATED_HYBRID_POD_PALETTE.AR.border}`,
              borderRight: `4px solid ${ACCELERATED_HYBRID_POD_PALETTE.AR.border}`,
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '0.75rem 1.25rem',
                background: effectiveCardBg,
                borderBottom: `1.5px solid ${secondaryColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    color: primaryColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Pod 1: Accelerated Round
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '3px',
                    background: ACCELERATED_HYBRID_POD_PALETTE.AR.badgeBg,
                    color: ACCELERATED_HYBRID_POD_PALETTE.AR.text,
                    border: `1px solid ${ACCELERATED_HYBRID_POD_PALETTE.AR.border}88`,
                  }}
                >
                  AR
                </span>
              </div>
            </div>
            <div style={{ padding: '1rem', overflowX: 'auto', overflowY: 'auto' }}>
              {renderCanvas(layoutAccel!, accelRounds, true, false, null)}
            </div>
          </div>

          {/* Pod 2: Upper Bracket */}
          <div
            style={{
              background: effectiveCardBg,
              border: `1.5px solid ${secondaryColor}`,
              borderLeft: `4px solid ${ACCELERATED_HYBRID_POD_PALETTE.UB.border}`,
              borderRight: `4px solid ${ACCELERATED_HYBRID_POD_PALETTE.UB.border}`,
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '0.75rem 1.25rem',
                background: effectiveCardBg,
                borderBottom: `1.5px solid ${secondaryColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    color: primaryColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Pod 2: Upper Bracket
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '3px',
                    background: ACCELERATED_HYBRID_POD_PALETTE.UB.badgeBg,
                    color: ACCELERATED_HYBRID_POD_PALETTE.UB.text,
                    border: `1px solid ${ACCELERATED_HYBRID_POD_PALETTE.UB.border}88`,
                  }}
                >
                  UB
                </span>
              </div>
            </div>
            <div style={{ padding: '1rem', overflowX: 'auto', overflowY: 'auto' }}>
              {renderCanvas(layoutPreMergeUpper!, preUpperRounds, true, false, null)}
            </div>
          </div>
        </div>

        {/* Bottom Row: Pod 3: Lower Bracket */}
        <div
          style={{
            background: effectiveCardBg,
            border: `1.5px solid ${secondaryColor}`,
            borderLeft: `4px solid ${ACCELERATED_HYBRID_POD_PALETTE.LB.border}`,
            borderRight: `4px solid ${ACCELERATED_HYBRID_POD_PALETTE.LB.border}`,
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <div
            style={{
              padding: '0.75rem 1.25rem',
              background: effectiveCardBg,
              borderBottom: `1.5px solid ${secondaryColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  color: primaryColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Pod 3: Lower Bracket
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.45rem',
                  borderRadius: '3px',
                  background: ACCELERATED_HYBRID_POD_PALETTE.LB.badgeBg,
                  color: ACCELERATED_HYBRID_POD_PALETTE.LB.text,
                  border: `1px solid ${ACCELERATED_HYBRID_POD_PALETTE.LB.border}88`,
                }}
              >
                LB
              </span>
            </div>
          </div>
          <div style={{ padding: '1rem', overflowX: 'auto', overflowY: 'auto' }}>
            {renderCanvas(layoutLowerBracket!, lowerBracketRounds, true, false, null)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: isObsMode ? '100vh' : 'calc(100vh - 120px)',
        height: effectiveObsView === 'fit' ? '100%' : 'auto',
        flex: effectiveObsView === 'fit' ? 1 : undefined,
        background: effectiveCanvasBg,
        overflow: effectiveObsView === 'fit' ? 'hidden' : 'visible',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Sticky Stage Navigation Bar for Accelerated Hybrid Tournaments */}
      {isAcceleratedHybrid && !isObsMode && (
        <div
          id="bracket-stage-nav-bar"
          style={{
            position: effectiveObsView === 'fit' ? 'relative' : 'sticky',
            top: effectiveObsView === 'fit' ? 0 : 'var(--bracket-tier-bar-height, 48px)',
            zIndex: 41,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            background: 'rgba(15, 18, 26, 0.88)',
            borderBottom: '1px solid var(--color-border)',
            padding: '0.55rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-text-muted)',
              }}
            >
              Stage:
            </span>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--color-bg-base)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '3px',
                gap: '4px',
              }}
            >
              {/* Tab 1: Early Rounds */}
              <button
                type="button"
                onClick={() => setSelectedPhaseTab('qualifiers')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.78rem',
                  fontWeight: activeHybridTab === 'qualifiers' || activeHybridTab === 'accel' || activeHybridTab === 'premerge' ? 800 : 600,
                  background: activeHybridTab === 'qualifiers' || activeHybridTab === 'accel' || activeHybridTab === 'premerge' ? primaryColor : 'transparent',
                  color: activeHybridTab === 'qualifiers' || activeHybridTab === 'accel' || activeHybridTab === 'premerge' ? getContrastingTextColor(primaryColor) : 'var(--color-text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: activeHybridTab === 'qualifiers' || activeHybridTab === 'accel' || activeHybridTab === 'premerge' ? `0 0 10px ${primaryColor}44` : 'none',
                }}
              >
                <span>Early Rounds</span>
              </button>

              {/* Tab 2: Top 16 */}
              <button
                type="button"
                onClick={() => setSelectedPhaseTab('championship')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.78rem',
                  fontWeight: activeHybridTab === 'championship' ? 800 : 600,
                  background: activeHybridTab === 'championship' ? primaryColor : 'transparent',
                  color: activeHybridTab === 'championship' ? getContrastingTextColor(primaryColor) : 'var(--color-text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: activeHybridTab === 'championship' ? `0 0 10px ${primaryColor}44` : 'none',
                }}
              >
                <span>Top {bracket.finalsCutoff || 16}</span>
              </button>

              {/* Tab 3: Combined View */}
              <button
                type="button"
                onClick={() => setSelectedPhaseTab('combined')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.78rem',
                  fontWeight: activeHybridTab === 'combined' ? 800 : 600,
                  background: activeHybridTab === 'combined' ? primaryColor : 'transparent',
                  color: activeHybridTab === 'combined' ? getContrastingTextColor(primaryColor) : 'var(--color-text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: activeHybridTab === 'combined' ? `0 0 10px ${primaryColor}44` : 'none',
                }}
              >
                <span>Combined View</span>
              </button>
            </div>
          </div>

          {/* Embedded Right-Side Compact Dot Badge Legend */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.74rem',
              flexWrap: 'wrap',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: ACCELERATED_HYBRID_POD_PALETTE.AR.border,
                  boxShadow: `0 0 6px ${ACCELERATED_HYBRID_POD_PALETTE.AR.glow}`,
                }}
              />
              <span style={{ color: ACCELERATED_HYBRID_POD_PALETTE.AR.text, fontWeight: 700 }}>
                Accelerated
              </span>
            </div>
            <span style={{ color: 'var(--color-border)' }}>|</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: ACCELERATED_HYBRID_POD_PALETTE.UB.border,
                  boxShadow: `0 0 6px ${ACCELERATED_HYBRID_POD_PALETTE.UB.glow}`,
                }}
              />
              <span style={{ color: ACCELERATED_HYBRID_POD_PALETTE.UB.text, fontWeight: 700 }}>
                Upper Bracket
              </span>
            </div>
            <span style={{ color: 'var(--color-border)' }}>|</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: ACCELERATED_HYBRID_POD_PALETTE.LB.border,
                  boxShadow: `0 0 6px ${ACCELERATED_HYBRID_POD_PALETTE.LB.glow}`,
                }}
              />
              <span style={{ color: ACCELERATED_HYBRID_POD_PALETTE.LB.text, fontWeight: 700 }}>
                Lower Bracket
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Canvas Presentation */}
      {effectiveObsView === 'fit' ? (
        /* Strategy B: Viewport Auto-Scaled 1080p View */
        <div
          ref={fitContainerRef}
          style={{
            width: isObsMode ? '100vw' : '100%',
            flex: 1,
            minHeight: 0,
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
          {isAcceleratedHybrid && activeHybridTab === 'combined' && combinedBounds ? (
            <div
              style={{
                width: `${Math.ceil(combinedBounds.combinedW * fitScale)}px`,
                height: `${Math.ceil(combinedBounds.combinedH * fitScale)}px`,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <div
                ref={combinedContentRef}
                style={{
                  width: `${combinedBounds.combinedW}px`,
                  minHeight: `${combinedBounds.combinedH}px`,
                  transform: `scale(${fitScale})`,
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2.5rem',
                  alignItems: 'flex-start',
                  paddingBottom: '100px',
                }}
              >
                {/* Stage 1: Early Rounds (3 Pods) */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Early Rounds (3 Pods)
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Accelerated Round • Upper Bracket • Lower Bracket
                    </span>
                  </div>
                  {renderQualifierPodGrid()}
                </div>

                {/* Phase 1 to Phase 2 Divider */}
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
                  <div style={{ height: '2px', flex: 1, background: `linear-gradient(to right, transparent, ${primaryColor}88)` }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 900, color: primaryColor, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Top {bracket.finalsCutoff || 16} Finals ↓
                  </span>
                  <div style={{ height: '2px', flex: 1, background: `linear-gradient(to left, transparent, ${primaryColor}88)` }} />
                </div>

                {/* Stage 2: Top C Championship Finals */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Top {bracket.finalsCutoff || 16} Finals
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Single Elimination Championship Tree to Tournament Champion
                    </span>
                  </div>
                  {renderCanvas(layoutChampionship!, championshipRounds, false, true, championPlayer)}
                </div>
              </div>
            </div>
          ) : isAcceleratedHybrid && activeHybridTab === 'qualifiers' && combinedBounds ? (
            <div
              style={{
                width: `${Math.ceil(combinedBounds.qualW * fitScale)}px`,
                height: `${Math.ceil(combinedBounds.qualH * fitScale)}px`,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: `${combinedBounds.qualW}px`,
                  minHeight: `${combinedBounds.qualH}px`,
                  transform: `scale(${fitScale})`,
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
              >
                {renderQualifierPodGrid()}
              </div>
            </div>
          ) : (
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
                {isAcceleratedHybrid ? (
                  activeHybridTab === 'accel' ? (
                    renderCanvas(layoutAccel!, accelRounds, true, false, null)
                  ) : activeHybridTab === 'premerge' ? (
                    renderCanvas(layoutPreMerge!, preMergeRounds, true, false, null)
                  ) : (
                    renderCanvas(layoutChampionship!, championshipRounds, false, true, championPlayer)
                  )
                ) : (
                  renderCanvas(layout, rounds, false, false, championPlayer)
                )}
              </div>
            </div>
          )}
        </div>
      ) : activeHybridTab === 'combined' && isAcceleratedHybrid ? (
        /* All Stages (Combined): Phase 1 (3 Pods) + Phase 2 (Championship Tree) */
        <div
          ref={combinedContentRef}
          style={{
            width: '100%',
            padding: isObsMode ? '0.5rem' : '1.25rem 1.75rem',
            paddingBottom: '100px',
            overflowX: 'auto',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2.5rem',
            alignItems: 'flex-start',
          }}
        >
          {/* Stage 1: Early Rounds (3 Pods) */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Early Rounds (3 Pods)
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Accelerated Round • Upper Bracket • Lower Bracket
              </span>
            </div>
            {renderQualifierPodGrid()}
          </div>

          {/* Phase 1 to Phase 2 Divider */}
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
            <div style={{ height: '2px', flex: 1, background: `linear-gradient(to right, transparent, ${primaryColor}88)` }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 900, color: primaryColor, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Top {bracket.finalsCutoff || 16} Finals ↓
            </span>
            <div style={{ height: '2px', flex: 1, background: `linear-gradient(to left, transparent, ${primaryColor}88)` }} />
          </div>

          {/* Stage 2: Top C Championship Finals */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Top {bracket.finalsCutoff || 16} Finals
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Single Elimination Championship Tree to Tournament Champion
              </span>
            </div>
            {renderCanvas(layoutChampionship!, championshipRounds, false, true, championPlayer)}
          </div>
        </div>
      ) : (
        /* Standalone View for Selected Stage */
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
          {isAcceleratedHybrid ? (
            activeHybridTab === 'championship' ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                {renderCanvas(layoutChampionship!, championshipRounds, false, true, championPlayer)}
              </div>
            ) : activeHybridTab === 'accel' ? (
              renderCanvas(layoutAccel!, accelRounds, true, false, null)
            ) : activeHybridTab === 'premerge' ? (
              renderCanvas(layoutPreMerge!, preMergeRounds, true, false, null)
            ) : (
              renderQualifierPodGrid()
            )
          ) : (
            renderCanvas(layout, rounds, false, false, championPlayer)
          )}
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
