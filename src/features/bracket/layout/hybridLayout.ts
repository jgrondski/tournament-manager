import { BracketStructure, BracketMatch, BracketRound } from '../types';
import {
  LayoutConfig,
  DEFAULT_LAYOUT_CONFIG,
  BracketViewMode,
  MatchPosition,
  RoundHeaderPosition,
  ConnectorPath,
  BracketLayoutMetadata,
} from './types';
import { calculateTraditionalSingleElimLayout } from './singleElimLayout';

/**
 * Dedicated layout engine for Accelerated Hybrid double elimination brackets (CTWC DAS 2026).
 * Renders:
 * - Upper Stage: Accelerated Round (AR), Pre-Merge Upper rounds (PRE_W1..), Play-Offs (PO)
 * - Lower Stage: Pre-Merge Lower rounds (PRE_L1..), 2nd Chance Round (2C)
 * - Championship Tree: Top C Single Elimination rounds (CHAMP_R1..CHAMP_Rk)
 * - Champion Plaque positioned after the final Championship match.
 * - Dynamic SVG orthogonal connector lines connecting all feeders forward without overlaps.
 */
export function calculateAcceleratedHybridBracketLayout(
  bracket: BracketStructure,
  customConfig?: Partial<LayoutConfig>,
  viewMode: BracketViewMode = 'standard'
): BracketLayoutMetadata {
  const config: LayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...customConfig };
  if (customConfig?.headerHeight === undefined) {
    const interMatchGap = config.baseRowHeight - config.matchHeight;
    config.headerHeight = 34 + interMatchGap;
  }

  const { rounds } = bracket;
  const matchPositions: Record<string, MatchPosition> = {};
  const roundHeaders: RoundHeaderPosition[] = [];
  const stageHeaders: Array<{ id: string; title: string; x: number; y: number; width: number }> = [];
  const paths: ConnectorPath[] = [];

  const colStep = config.matchWidth + config.roundGap;
  const stageBadgeHeight = 26;
  const stageBadgeGap = 12;

  // Identify constituent round groups
  const arRound = rounds.find((r) => r.roundIdentifier === 'AR');
  const preUpperRounds = rounds.filter((r) => r.roundIdentifier?.startsWith('PRE_W'));
  const preLowerRounds = rounds.filter((r) => r.roundIdentifier?.startsWith('PRE_L'));
  const secondChanceRound = rounds.find((r) => r.roundIdentifier === '2C');
  const playOffRound = rounds.find((r) => r.roundIdentifier === 'PO');
  const champRounds = rounds.filter(
    (r) => r.stage === 'GRAND_FINALS' || r.roundIdentifier?.startsWith('CHAMP')
  );

  // Dynamically assign horizontal column index to each round
  const roundColMap = new Map<string, number>();

  if (arRound) {
    roundColMap.set(arRound.roundIdentifier!, 0);
  }

  preUpperRounds.forEach((r, idx) => {
    roundColMap.set(r.roundIdentifier!, idx + 1);
  });
  const lastPreUpperCol = preUpperRounds.length > 0 ? preUpperRounds.length : 1;

  preLowerRounds.forEach((r, idx) => {
    roundColMap.set(r.roundIdentifier!, idx + 2);
  });
  const lastPreLowerCol = preLowerRounds.length > 0 ? preLowerRounds.length + 1 : 1;

  if (secondChanceRound) {
    const scCol = Math.max(lastPreLowerCol + 1, 2);
    roundColMap.set('2C', scCol);
  }

  if (playOffRound) {
    const scCol = roundColMap.get('2C') ?? lastPreUpperCol;
    const poCol = Math.max(scCol + 1, lastPreUpperCol + 1);
    roundColMap.set('PO', poCol);
  }

  const champStartCol = (roundColMap.get('PO') ?? (roundColMap.get('2C') ?? lastPreUpperCol)) + 1;
  champRounds.forEach((r, idx) => {
    roundColMap.set(r.roundIdentifier!, champStartCol + idx);
  });

  // Calculate layout dimensions and starting offsets
  const winnersBadgeY = config.paddingTop;
  const winnersHeaderY = winnersBadgeY + stageBadgeHeight + stageBadgeGap;
  const winnersMatchesStartY = winnersHeaderY + config.headerHeight;

  // 1. Position Pre-Merge Upper Rounds
  preUpperRounds.forEach((r, rIdx) => {
    const col = roundColMap.get(r.roundIdentifier!)!;
    const roundX = config.paddingLeft + col * colStep;

    roundHeaders.push({
      roundNumber: r.roundNumber,
      name: r.name,
      x: roundX,
      y: winnersHeaderY,
      width: config.matchWidth,
    });

    if (rIdx === 0) {
      r.matches.forEach((m, mIdx) => {
        const topY = winnersMatchesStartY + mIdx * config.baseRowHeight;
        const centerY = topY + config.matchHeight / 2;
        matchPositions[m.id] = {
          matchId: m.id,
          x: roundX,
          y: topY,
          width: config.matchWidth,
          height: config.matchHeight,
          centerY,
          centerX: roundX + config.matchWidth / 2,
        };
      });
    } else {
      r.matches.forEach((m, mIdx) => {
        const f1 = m.player1.sourceMatchId ? matchPositions[m.player1.sourceMatchId] : undefined;
        const f2 = m.player2.sourceMatchId ? matchPositions[m.player2.sourceMatchId] : undefined;
        const idealCenterY =
          f1 && f2
            ? (f1.centerY + f2.centerY) / 2
            : winnersMatchesStartY + mIdx * config.baseRowHeight * 2 + config.matchHeight / 2;
        const topY = idealCenterY - config.matchHeight / 2;
        matchPositions[m.id] = {
          matchId: m.id,
          x: roundX,
          y: topY,
          width: config.matchWidth,
          height: config.matchHeight,
          centerY: idealCenterY,
          centerX: roundX + config.matchWidth / 2,
        };
      });
    }
  });

  // 2. Position Accelerated Round (AR) at Col 0 (spaced nicely across rows)
  if (arRound) {
    const col = roundColMap.get(arRound.roundIdentifier!) ?? 0;
    const roundX = config.paddingLeft + col * colStep;

    roundHeaders.push({
      roundNumber: arRound.roundNumber,
      name: arRound.name,
      x: roundX,
      y: winnersHeaderY,
      width: config.matchWidth,
    });

    arRound.matches.forEach((m, mIdx) => {
      const topY = winnersMatchesStartY + mIdx * config.baseRowHeight * 2;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: roundX,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: roundX + config.matchWidth / 2,
      };
    });
  }

  // Calculate bottom of Upper section
  const upperBottoms = [
    ...(arRound ? arRound.matches : []),
    ...preUpperRounds.flatMap((r) => r.matches),
  ].map((m) => (matchPositions[m.id] ? matchPositions[m.id].y + matchPositions[m.id].height : 0));

  const winnersMaxY = Math.max(...upperBottoms, winnersMatchesStartY + config.matchHeight * 2);

  // 3. Position Lower Section (Pre-Merge Lower + 2nd Chance Round)
  const stageGap = 64;
  const losersBadgeY = winnersMaxY + stageGap;
  const losersHeaderY = losersBadgeY + stageBadgeHeight + stageBadgeGap;
  const losersMatchesStartY = losersHeaderY + config.headerHeight;

  preLowerRounds.forEach((r) => {
    const col = roundColMap.get(r.roundIdentifier!)!;
    const roundX = config.paddingLeft + col * colStep;

    roundHeaders.push({
      roundNumber: r.roundNumber,
      name: r.name,
      x: roundX,
      y: losersHeaderY,
      width: config.matchWidth,
    });

    r.matches.forEach((m, mIdx) => {
      const topY = losersMatchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: roundX,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: roundX + config.matchWidth / 2,
      };
    });
  });

  if (secondChanceRound) {
    const col = roundColMap.get('2C')!;
    const roundX = config.paddingLeft + col * colStep;

    roundHeaders.push({
      roundNumber: secondChanceRound.roundNumber,
      name: secondChanceRound.name,
      x: roundX,
      y: losersHeaderY,
      width: config.matchWidth,
    });

    secondChanceRound.matches.forEach((m, mIdx) => {
      const topY = losersMatchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: roundX,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: roundX + config.matchWidth / 2,
      };
    });
  }

  // 4. Position Play-Offs (PO) Round
  if (playOffRound) {
    const col = roundColMap.get('PO')!;
    const roundX = config.paddingLeft + col * colStep;

    roundHeaders.push({
      roundNumber: playOffRound.roundNumber,
      name: playOffRound.name,
      x: roundX,
      y: winnersHeaderY,
      width: config.matchWidth,
    });

    playOffRound.matches.forEach((m, mIdx) => {
      const topY = winnersMatchesStartY + mIdx * config.baseRowHeight * 2;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: roundX,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: roundX + config.matchWidth / 2,
      };
    });
  }

  // 5. Position Championship Tree (CHAMP_R1..CHAMP_Rk)
  champRounds.forEach((r, rIdx) => {
    const col = roundColMap.get(r.roundIdentifier!)!;
    const roundX = config.paddingLeft + col * colStep;

    roundHeaders.push({
      roundNumber: r.roundNumber,
      name: r.name,
      x: roundX,
      y: winnersHeaderY,
      width: config.matchWidth,
    });

    if (rIdx === 0) {
      r.matches.forEach((m, mIdx) => {
        const topY = winnersMatchesStartY + mIdx * config.baseRowHeight * 2;
        const centerY = topY + config.matchHeight / 2;
        matchPositions[m.id] = {
          matchId: m.id,
          x: roundX,
          y: topY,
          width: config.matchWidth,
          height: config.matchHeight,
          centerY,
          centerX: roundX + config.matchWidth / 2,
        };
      });
    } else {
      r.matches.forEach((m, mIdx) => {
        const prevRound = champRounds[rIdx - 1];
        const f1 = prevRound?.matches[2 * mIdx] ? matchPositions[prevRound.matches[2 * mIdx].id] : undefined;
        const f2 = prevRound?.matches[2 * mIdx + 1] ? matchPositions[prevRound.matches[2 * mIdx + 1].id] : undefined;
        const idealCenterY =
          f1 && f2
            ? (f1.centerY + f2.centerY) / 2
            : winnersMatchesStartY + mIdx * config.baseRowHeight * 4 + config.matchHeight / 2;
        const topY = idealCenterY - config.matchHeight / 2;
        matchPositions[m.id] = {
          matchId: m.id,
          x: roundX,
          y: topY,
          width: config.matchWidth,
          height: config.matchHeight,
          centerY: idealCenterY,
          centerX: roundX + config.matchWidth / 2,
        };
      });
    }
  });

  // Stage Section Badges
  if (arRound) {
    stageHeaders.push({
      id: 'stage-ar',
      title: 'Accelerated Round',
      x: config.paddingLeft + (roundColMap.get('AR') ?? 0) * colStep,
      y: winnersBadgeY,
      width: config.matchWidth,
    });
  }

  if (preUpperRounds.length > 0) {
    const startCol = roundColMap.get(preUpperRounds[0].roundIdentifier!)!;
    stageHeaders.push({
      id: 'stage-pre-upper',
      title: 'Pre-Merge Upper',
      x: config.paddingLeft + startCol * colStep,
      y: winnersBadgeY,
      width: Math.max(config.matchWidth, preUpperRounds.length * colStep - config.roundGap),
    });
  }

  if (preLowerRounds.length > 0 || secondChanceRound) {
    const lowerCols = [
      ...preLowerRounds.map((r) => roundColMap.get(r.roundIdentifier!)!),
      ...(secondChanceRound ? [roundColMap.get('2C')!] : []),
    ];
    const minCol = Math.min(...lowerCols);
    const maxCol = Math.max(...lowerCols);
    const width = (maxCol - minCol + 1) * colStep - config.roundGap;
    stageHeaders.push({
      id: 'stage-pre-lower',
      title: 'Pre-Merge Lower & 2nd Chance',
      x: config.paddingLeft + minCol * colStep,
      y: losersBadgeY,
      width: Math.max(config.matchWidth, width),
    });
  }

  if (playOffRound) {
    stageHeaders.push({
      id: 'stage-po',
      title: 'Play-Offs',
      x: config.paddingLeft + roundColMap.get('PO')! * colStep,
      y: winnersBadgeY,
      width: config.matchWidth,
    });
  }

  if (champRounds.length > 0) {
    const startCol = roundColMap.get(champRounds[0].roundIdentifier!)!;
    stageHeaders.push({
      id: 'stage-champ',
      title: 'Championship Tree',
      x: config.paddingLeft + startCol * colStep,
      y: winnersBadgeY,
      width: Math.max(config.matchWidth, champRounds.length * colStep - config.roundGap),
    });
  }

  // Champion Plaque Position
  const finalRound = champRounds[champRounds.length - 1];
  const finalMatch = finalRound?.matches[0];
  const finalPos = finalMatch ? matchPositions[finalMatch.id] : undefined;
  const finalCol = finalRound ? roundColMap.get(finalRound.roundIdentifier!)! : champStartCol;
  const champX = config.paddingLeft + (finalCol + 1) * colStep;
  const champCenterY = finalPos ? finalPos.centerY : winnersMatchesStartY + config.matchHeight / 2;

  const championPosition = {
    x: champX,
    y: champCenterY - config.championHeight / 2,
    width: config.championWidth,
    height: config.championHeight,
    centerY: champCenterY,
  };

  let championPath: { d: string; finalsMatchId: string } | undefined;
  if (finalPos) {
    championPath = {
      d: `M ${finalPos.x + finalPos.width} ${champCenterY} H ${championPosition.x}`,
      finalsMatchId: finalPos.matchId,
    };
  }

  // Generate SVG Orthogonal Connector Lines for all matches
  Object.values(bracket.matchesById).forEach((childMatch) => {
    const childPos = matchPositions[childMatch.id];
    if (!childPos) return;

    const childInX = childPos.x;
    const childInY1 = childPos.y + childPos.height * 0.25;
    const childInY2 = childPos.y + childPos.height * 0.75;

    const f1Id = childMatch.player1.sourceMatchId;
    const f2Id = childMatch.player2.sourceMatchId;
    const f1 = f1Id ? matchPositions[f1Id] : undefined;
    const f2 = f2Id ? matchPositions[f2Id] : undefined;

    if (f1) {
      const f1OutX = f1.x + f1.width;
      const f1OutY = f1.centerY;
      const midX = Math.round(f1OutX + (childInX - f1OutX) / 2);
      paths.push({
        id: `path-${childMatch.id}-p1`,
        d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY1} H ${childInX}`,
        sourceMatchIds: [f1.matchId],
        targetMatchId: childMatch.id,
      });
    }

    if (f2) {
      const f2OutX = f2.x + f2.width;
      const f2OutY = f2.centerY;
      const midX = Math.round(f2OutX + (childInX - f2OutX) / 2);
      paths.push({
        id: `path-${childMatch.id}-p2`,
        d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY2} H ${childInX}`,
        sourceMatchIds: [f2.matchId],
        targetMatchId: childMatch.id,
      });
    }
  });

  const allCardBottoms = Object.values(matchPositions).map((p) => p.y + p.height);
  allCardBottoms.push(championPosition.y + championPosition.height);
  const totalHeight =
    Math.max(...allCardBottoms, losersMatchesStartY + config.matchHeight) + config.paddingBottom;
  const totalWidth = championPosition.x + config.championWidth + config.paddingRight;

  return {
    totalWidth,
    totalHeight,
    matchPositions,
    roundHeaders,
    stageHeaders,
    paths,
    championPosition,
    championPath,
    viewMode,
  };
}

/**
 * Calculates layout for Phase 1: Qualification Gauntlet of Accelerated Hybrid tournaments.
 * Rendered as a two-track conveyor layout:
 * - Top Track (Upper Path):
 *     Column 1 (col 0): Accelerated Round (seeds 1 to 16)
 *     Column 2 (col 1): Pre-Merge Upper R1
 *     Column 3 (col 2): Pre-Merge Upper R2
 * - Bottom Track (Lower / Re-Climb Path):
 *     Column 1 (col 0): Pre-Merge Lower R1
 *     Column 2 (col 1): Pre-Merge Lower R2
 *     Column 3 (col 2): 2nd Chance Round (Lower R2 winners + AR losers)
 * - Convergence Column:
 *     Column 4 (col 3): Play-Offs (Pre-Merge Upper R2 winners + 2nd Chance winners)
 *
 * Connectors are strictly bounded within Phase 1 matches.
 */
export function calculateAcceleratedHybridPhase1Layout(
  bracket: BracketStructure,
  customConfig?: Partial<LayoutConfig>
): BracketLayoutMetadata {
  const config: LayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...customConfig };
  if (customConfig?.headerHeight === undefined) {
    const interMatchGap = config.baseRowHeight - config.matchHeight;
    config.headerHeight = 34 + interMatchGap;
  }

  const { rounds } = bracket;
  const matchPositions: Record<string, MatchPosition> = {};
  const roundHeaders: RoundHeaderPosition[] = [];
  const stageHeaders: Array<{ id: string; title: string; x: number; y: number; width: number }> = [];
  const paths: ConnectorPath[] = [];

  const colStep = config.matchWidth + config.roundGap;
  const stageBadgeHeight = 26;
  const stageBadgeGap = 12;

  // Identify constituent round groups
  const arRound = rounds.find((r) => r.roundIdentifier === 'AR');
  const preUpperRounds = rounds.filter((r) => r.roundIdentifier?.startsWith('PRE_W'));
  const preLowerRounds = rounds.filter((r) => r.roundIdentifier?.startsWith('PRE_L'));
  const secondChanceRound = rounds.find((r) => r.roundIdentifier === '2C');
  const playOffRound = rounds.find((r) => r.roundIdentifier === 'PO');

  // Column definitions (0-indexed):
  // Col 0: Accelerated Round (Top) | Pre-Merge Lower R1 (Bottom)
  // Col 1: Pre-Merge Upper R1 (Top) | Pre-Merge Lower R2 (Bottom)
  // Col 2: Pre-Merge Upper R2 (Top) | 2nd Chance Round (Bottom)
  // Col 3: Play-Offs (Convergence)
  const col0X = config.paddingLeft + 0 * colStep;
  const col1X = config.paddingLeft + 1 * colStep;
  const col2X = config.paddingLeft + 2 * colStep;
  const col3X = config.paddingLeft + 3 * colStep;

  // Top Track (Upper Path)
  const upperBadgeY = config.paddingTop;
  const upperHeaderY = upperBadgeY + stageBadgeHeight + stageBadgeGap;
  const upperMatchesStartY = upperHeaderY + config.headerHeight;

  stageHeaders.push({
    id: 'stage-upper-track',
    title: 'Top Track: Upper Path',
    x: col0X,
    y: upperBadgeY,
    width: 3 * colStep - config.roundGap,
  });

  // 1. Pre-Merge Upper R1 (Col 1)
  if (preUpperRounds[0]) {
    const r = preUpperRounds[0];
    roundHeaders.push({
      roundNumber: r.roundNumber,
      name: r.name,
      x: col1X,
      y: upperHeaderY,
      width: config.matchWidth,
    });

    r.matches.forEach((m, mIdx) => {
      const topY = upperMatchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col1X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: col1X + config.matchWidth / 2,
      };
    });
  }

  // 2. Pre-Merge Upper R2 (Col 2)
  if (preUpperRounds[1]) {
    const r = preUpperRounds[1];
    roundHeaders.push({
      roundNumber: r.roundNumber,
      name: r.name,
      x: col2X,
      y: upperHeaderY,
      width: config.matchWidth,
    });

    r.matches.forEach((m, mIdx) => {
      const f1 = m.player1.sourceMatchId ? matchPositions[m.player1.sourceMatchId] : undefined;
      const f2 = m.player2.sourceMatchId ? matchPositions[m.player2.sourceMatchId] : undefined;
      const idealCenterY =
        f1 && f2
          ? (f1.centerY + f2.centerY) / 2
          : upperMatchesStartY + (mIdx * 2 + 0.5) * config.baseRowHeight;
      const topY = idealCenterY - config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col2X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY: idealCenterY,
        centerX: col2X + config.matchWidth / 2,
      };
    });
  }

  // 3. Accelerated Round (Col 0) - vertically centered alongside Pre-Merge Upper R2
  if (arRound) {
    roundHeaders.push({
      roundNumber: arRound.roundNumber,
      name: arRound.name,
      x: col0X,
      y: upperHeaderY,
      width: config.matchWidth,
    });

    arRound.matches.forEach((m, mIdx) => {
      const targetW2 = preUpperRounds[1]?.matches[mIdx];
      const idealCenterY =
        targetW2 && matchPositions[targetW2.id]
          ? matchPositions[targetW2.id].centerY
          : upperMatchesStartY + (mIdx * 2 + 0.5) * config.baseRowHeight;
      const topY = idealCenterY - config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col0X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY: idealCenterY,
        centerX: col0X + config.matchWidth / 2,
      };
    });
  }

  // Calculate bottom of Top Track
  const topTrackMatches = [
    ...(arRound ? arRound.matches : []),
    ...preUpperRounds.flatMap((r) => r.matches),
  ];
  const topTrackBottoms = topTrackMatches.map((m) =>
    matchPositions[m.id] ? matchPositions[m.id].y + matchPositions[m.id].height : 0
  );
  const topTrackMaxY = Math.max(...topTrackBottoms, upperMatchesStartY + config.matchHeight * 2);

  // Bottom Track (Lower / Re-Climb Path)
  const bottomGap = 48;
  const lowerBadgeY = topTrackMaxY + bottomGap;
  const lowerHeaderY = lowerBadgeY + stageBadgeHeight + stageBadgeGap;
  const lowerMatchesStartY = lowerHeaderY + config.headerHeight;

  stageHeaders.push({
    id: 'stage-lower-track',
    title: 'Bottom Track: Lower / Re-Climb Path',
    x: col0X,
    y: lowerBadgeY,
    width: 3 * colStep - config.roundGap,
  });

  // 4. Pre-Merge Lower R1 (Col 0)
  if (preLowerRounds[0]) {
    const r = preLowerRounds[0];
    roundHeaders.push({
      roundNumber: r.roundNumber,
      name: r.name,
      x: col0X,
      y: lowerHeaderY,
      width: config.matchWidth,
    });

    r.matches.forEach((m, mIdx) => {
      const topY = lowerMatchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col0X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: col0X + config.matchWidth / 2,
      };
    });
  }

  // 5. Pre-Merge Lower R2 (Col 1)
  if (preLowerRounds[1]) {
    const r = preLowerRounds[1];
    roundHeaders.push({
      roundNumber: r.roundNumber,
      name: r.name,
      x: col1X,
      y: lowerHeaderY,
      width: config.matchWidth,
    });

    r.matches.forEach((m, mIdx) => {
      const topY = lowerMatchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col1X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: col1X + config.matchWidth / 2,
      };
    });
  }

  // 6. 2nd Chance Round (Col 2)
  if (secondChanceRound) {
    roundHeaders.push({
      roundNumber: secondChanceRound.roundNumber,
      name: secondChanceRound.name,
      x: col2X,
      y: lowerHeaderY,
      width: config.matchWidth,
    });

    secondChanceRound.matches.forEach((m, mIdx) => {
      const topY = lowerMatchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col2X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: col2X + config.matchWidth / 2,
      };
    });
  }

  // 7. Play-Offs (Convergence Column, Col 3)
  if (playOffRound) {
    stageHeaders.push({
      id: 'stage-convergence',
      title: 'Convergence: Play-Offs',
      x: col3X,
      y: upperBadgeY,
      width: config.matchWidth,
    });

    roundHeaders.push({
      roundNumber: playOffRound.roundNumber,
      name: playOffRound.name,
      x: col3X,
      y: upperHeaderY,
      width: config.matchWidth,
    });

    playOffRound.matches.forEach((m, mIdx) => {
      const targetW2 = preUpperRounds[1]?.matches[mIdx];
      const idealCenterY =
        targetW2 && matchPositions[targetW2.id]
          ? matchPositions[targetW2.id].centerY
          : upperMatchesStartY + (mIdx * 2 + 0.5) * config.baseRowHeight;
      const topY = idealCenterY - config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col3X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY: idealCenterY,
        centerX: col3X + config.matchWidth / 2,
      };
    });
  }

  // Connectors strictly within Phase 1
  const phase1Matches = [
    ...(arRound ? arRound.matches : []),
    ...preUpperRounds.flatMap((r) => r.matches),
    ...preLowerRounds.flatMap((r) => r.matches),
    ...(secondChanceRound ? secondChanceRound.matches : []),
    ...(playOffRound ? playOffRound.matches : []),
  ];

  phase1Matches.forEach((childMatch) => {
    const childPos = matchPositions[childMatch.id];
    if (!childPos) return;

    const childInX = childPos.x;
    const childInY1 = childPos.y + childPos.height * 0.25;
    const childInY2 = childPos.y + childPos.height * 0.75;

    const f1Id = childMatch.player1.sourceMatchId;
    const f2Id = childMatch.player2.sourceMatchId;
    const f1 = f1Id ? matchPositions[f1Id] : undefined;
    const f2 = f2Id ? matchPositions[f2Id] : undefined;

    if (f1) {
      const f1OutX = f1.x + f1.width;
      const f1OutY = f1.centerY;
      const midX = Math.round(f1OutX + (childInX - f1OutX) / 2);
      paths.push({
        id: `p1-path-${childMatch.id}-s1`,
        d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY1} H ${childInX}`,
        sourceMatchIds: [f1.matchId],
        targetMatchId: childMatch.id,
      });
    }

    if (f2) {
      const f2OutX = f2.x + f2.width;
      const f2OutY = f2.centerY;
      // If feeder 2 is AR going into 2C, midX routes neatly between Col 0 and Col 1
      const midX =
        childMatch.roundIdentifier === '2C' && f2.centerX < col1X
          ? Math.round(f2OutX + (col1X - f2OutX) / 2)
          : Math.round(f2OutX + (childInX - f2OutX) / 2);
      paths.push({
        id: `p1-path-${childMatch.id}-s2`,
        d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY2} H ${childInX}`,
        sourceMatchIds: [f2.matchId],
        targetMatchId: childMatch.id,
      });
    }
  });

  const allCardBottoms = Object.values(matchPositions).map((p) => p.y + p.height);
  const totalHeight =
    Math.max(...allCardBottoms, lowerMatchesStartY + config.matchHeight) + config.paddingBottom;
  const totalWidth = col3X + config.matchWidth + config.paddingRight;

  return {
    totalWidth,
    totalHeight,
    matchPositions,
    roundHeaders,
    stageHeaders,
    paths,
    championPosition: { x: 0, y: 0, width: 0, height: 0, centerY: 0 },
    championPath: undefined,
    viewMode: 'standard',
  };
}

/**
 * Calculates layout for the Accelerated Round (seeds 1 to C) of Accelerated Hybrid tournaments.
 * Clean, focused presentation of the direct qualification matches.
 */
export function calculateAcceleratedHybridAccelLayout(
  bracket: BracketStructure,
  customConfig?: Partial<LayoutConfig>
): BracketLayoutMetadata {
  const config: LayoutConfig = {
    ...DEFAULT_LAYOUT_CONFIG,
    paddingLeft: 12,
    paddingRight: 12,
    ...customConfig,
  };
  if (customConfig?.headerHeight === undefined) {
    const interMatchGap = config.baseRowHeight - config.matchHeight;
    config.headerHeight = 34 + interMatchGap;
  }

  const { rounds } = bracket;
  const matchPositions: Record<string, MatchPosition> = {};
  const roundHeaders: RoundHeaderPosition[] = [];
  const stageHeaders: Array<{ id: string; title: string; x: number; y: number; width: number }> = [];
  const paths: ConnectorPath[] = [];

  const arRound = rounds.find((r) => r.roundIdentifier === 'AR');
  const col0X = config.paddingLeft;
  const stageBadgeHeight = 26;
  const stageBadgeGap = 12;

  const upperBadgeY = config.paddingTop;
  const upperHeaderY = upperBadgeY + stageBadgeHeight + stageBadgeGap;
  const upperMatchesStartY = upperHeaderY + config.headerHeight;

  stageHeaders.push({
    id: 'stage-accel-round',
    title: 'Accelerated Round',
    x: col0X,
    y: upperBadgeY,
    width: config.matchWidth,
  });

  if (arRound) {
    roundHeaders.push({
      roundNumber: arRound.roundNumber,
      name: arRound.name,
      x: col0X,
      y: upperHeaderY,
      width: config.matchWidth,
    });

    arRound.matches.forEach((m, mIdx) => {
      const topY = upperMatchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col0X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: col0X + config.matchWidth / 2,
      };
    });
  }

  const totalHeight =
    upperMatchesStartY + (arRound?.matches.length || 8) * config.baseRowHeight + config.paddingBottom;
  const totalWidth = col0X + config.matchWidth + config.paddingRight;

  return {
    totalWidth,
    totalHeight,
    matchPositions,
    roundHeaders,
    stageHeaders,
    paths,
    championPosition: { x: 0, y: 0, width: 0, height: 0, centerY: 0 },
    championPath: undefined,
    viewMode: 'standard',
  };
}

/**
 * Calculates layout for Pod 2: Upper Bracket (R1 and R2).
 * Lays out Upper R1 (Col 0) and Upper R2 (Col 1) side-by-side
 * with clean intra-panel SVG tree connectors linking R1 -> R2.
 */
export function calculateAcceleratedHybridPreMergeUpperLayout(
  bracket: BracketStructure,
  customConfig?: Partial<LayoutConfig>
): BracketLayoutMetadata {
  const config: LayoutConfig = {
    ...DEFAULT_LAYOUT_CONFIG,
    paddingLeft: 8,
    paddingRight: 8,
    roundGap: 32,
    ...customConfig,
  };
  if (customConfig?.headerHeight === undefined) {
    const interMatchGap = config.baseRowHeight - config.matchHeight;
    config.headerHeight = 34 + interMatchGap;
  }

  const { rounds } = bracket;
  const matchPositions: Record<string, MatchPosition> = {};
  const roundHeaders: RoundHeaderPosition[] = [];
  const stageHeaders: Array<{ id: string; title: string; x: number; y: number; width: number }> = [];
  const paths: ConnectorPath[] = [];

  const preUpperRounds = rounds.filter((r) => r.roundIdentifier?.startsWith('PRE_W'));
  const r1 = preUpperRounds[0];
  const r2 = preUpperRounds[1];
  const shouldSplit4Cols = Boolean(r1 && r1.matches.length > 8);

  const colStep = config.matchWidth + config.roundGap;
  const col0X = config.paddingLeft;
  const col1X = config.paddingLeft + colStep;

  // 4-column layout: Group 1 (Cols 0 & 1), Group 2 (Cols 2 & 3)
  // Keep a slightly larger but still small gap between Part 1 and Part 2
  const interGroupGap = config.roundGap + 16;
  const col2X = col1X + config.matchWidth + interGroupGap;
  const col3X = col2X + colStep;

  const stageBadgeHeight = 26;
  const stageBadgeGap = 12;
  const badgeY = config.paddingTop;
  const headerY = badgeY + stageBadgeHeight + stageBadgeGap;
  const matchesStartY = headerY + config.headerHeight;

  stageHeaders.push({
    id: 'pod-premerge-upper',
    title: 'Upper Bracket',
    x: col0X,
    y: badgeY,
    width: shouldSplit4Cols
      ? (col3X + config.matchWidth) - col0X
      : Math.max(config.matchWidth, preUpperRounds.length * colStep - config.roundGap),
  });

  if (shouldSplit4Cols) {
    const r1Half = Math.ceil(r1.matches.length / 2);
    const r2Half = r2 ? Math.ceil(r2.matches.length / 2) : 0;

    // Headers for all 4 columns
    roundHeaders.push({
      roundNumber: r1.roundNumber,
      name: `${r1.name} (Part 1)`,
      x: col0X,
      y: headerY,
      width: config.matchWidth,
    });
    if (r2) {
      roundHeaders.push({
        roundNumber: r2.roundNumber,
        name: `${r2.name} (Part 1)`,
        x: col1X,
        y: headerY,
        width: config.matchWidth,
      });
    }
    roundHeaders.push({
      roundNumber: r1.roundNumber,
      name: `${r1.name} (Part 2)`,
      x: col2X,
      y: headerY,
      width: config.matchWidth,
    });
    if (r2) {
      roundHeaders.push({
        roundNumber: r2.roundNumber,
        name: `${r2.name} (Part 2)`,
        x: col3X,
        y: headerY,
        width: config.matchWidth,
      });
    }

    // Col 0: R1 Group 1 (matches 0..r1Half - 1)
    r1.matches.slice(0, r1Half).forEach((m, mIdx) => {
      const topY = matchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col0X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: col0X + config.matchWidth / 2,
      };
    });

    // Col 1: R2 Group 1 (matches 0..r2Half - 1)
    if (r2) {
      r2.matches.slice(0, r2Half).forEach((m, mIdx) => {
        const f1 = m.player1.sourceMatchId ? matchPositions[m.player1.sourceMatchId] : undefined;
        const f2 = m.player2.sourceMatchId ? matchPositions[m.player2.sourceMatchId] : undefined;
        const idealCenterY =
          f1 && f2
            ? (f1.centerY + f2.centerY) / 2
            : matchesStartY + (mIdx * 2 + 0.5) * config.baseRowHeight;
        const topY = idealCenterY - config.matchHeight / 2;
        matchPositions[m.id] = {
          matchId: m.id,
          x: col1X,
          y: topY,
          width: config.matchWidth,
          height: config.matchHeight,
          centerY: idealCenterY,
          centerX: col1X + config.matchWidth / 2,
        };
      });
    }

    // Col 2: R1 Group 2 (matches r1Half..end)
    r1.matches.slice(r1Half).forEach((m, mIdx) => {
      const topY = matchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col2X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: col2X + config.matchWidth / 2,
      };
    });

    // Col 3: R2 Group 2 (matches r2Half..end)
    if (r2) {
      r2.matches.slice(r2Half).forEach((m, mIdx) => {
        const f1 = m.player1.sourceMatchId ? matchPositions[m.player1.sourceMatchId] : undefined;
        const f2 = m.player2.sourceMatchId ? matchPositions[m.player2.sourceMatchId] : undefined;
        const idealCenterY =
          f1 && f2
            ? (f1.centerY + f2.centerY) / 2
            : matchesStartY + (mIdx * 2 + 0.5) * config.baseRowHeight;
        const topY = idealCenterY - config.matchHeight / 2;
        matchPositions[m.id] = {
          matchId: m.id,
          x: col3X,
          y: topY,
          width: config.matchWidth,
          height: config.matchHeight,
          centerY: idealCenterY,
          centerX: col3X + config.matchWidth / 2,
        };
      });
    }
  } else {
    // Standard 2-column layout for smaller brackets
    if (r1) {
      roundHeaders.push({
        roundNumber: r1.roundNumber,
        name: r1.name,
        x: col0X,
        y: headerY,
        width: config.matchWidth,
      });

      r1.matches.forEach((m, mIdx) => {
        const topY = matchesStartY + mIdx * config.baseRowHeight;
        const centerY = topY + config.matchHeight / 2;
        matchPositions[m.id] = {
          matchId: m.id,
          x: col0X,
          y: topY,
          width: config.matchWidth,
          height: config.matchHeight,
          centerY,
          centerX: col0X + config.matchWidth / 2,
        };
      });
    }

    if (r2) {
      roundHeaders.push({
        roundNumber: r2.roundNumber,
        name: r2.name,
        x: col1X,
        y: headerY,
        width: config.matchWidth,
      });

      r2.matches.forEach((m, mIdx) => {
        const f1 = m.player1.sourceMatchId ? matchPositions[m.player1.sourceMatchId] : undefined;
        const f2 = m.player2.sourceMatchId ? matchPositions[m.player2.sourceMatchId] : undefined;
        const idealCenterY =
          f1 && f2
            ? (f1.centerY + f2.centerY) / 2
            : matchesStartY + (mIdx * 2 + 0.5) * config.baseRowHeight;
        const topY = idealCenterY - config.matchHeight / 2;
        matchPositions[m.id] = {
          matchId: m.id,
          x: col1X,
          y: topY,
          width: config.matchWidth,
          height: config.matchHeight,
          centerY: idealCenterY,
          centerX: col1X + config.matchWidth / 2,
        };
      });
    }
  }

  // Intra-panel SVG connectors: R1 -> R2
  const allUpperMatches = preUpperRounds.flatMap((r) => r.matches);
  allUpperMatches.forEach((childMatch) => {
    const childPos = matchPositions[childMatch.id];
    if (!childPos) return;

    const childInX = childPos.x;
    const childInY1 = childPos.y + childPos.height * 0.25;
    const childInY2 = childPos.y + childPos.height * 0.75;

    const f1Id = childMatch.player1.sourceMatchId;
    const f2Id = childMatch.player2.sourceMatchId;
    const f1 = f1Id ? matchPositions[f1Id] : undefined;
    const f2 = f2Id ? matchPositions[f2Id] : undefined;

    if (f1) {
      const f1OutX = f1.x + f1.width;
      const f1OutY = f1.centerY;
      const midX = Math.round(f1OutX + (childInX - f1OutX) / 2);
      paths.push({
        id: `pmu-path-${childMatch.id}-s1`,
        d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY1} H ${childInX}`,
        sourceMatchIds: [f1.matchId],
        targetMatchId: childMatch.id,
      });
    }

    if (f2) {
      const f2OutX = f2.x + f2.width;
      const f2OutY = f2.centerY;
      const midX = Math.round(f2OutX + (childInX - f2OutX) / 2);
      paths.push({
        id: `pmu-path-${childMatch.id}-s2`,
        d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY2} H ${childInX}`,
        sourceMatchIds: [f2.matchId],
        targetMatchId: childMatch.id,
      });
    }
  });

  const allBottoms = Object.values(matchPositions).map((p) => p.y + p.height);
  const totalHeight = Math.max(...allBottoms, matchesStartY + config.matchHeight) + config.paddingBottom;
  const rightmostX = shouldSplit4Cols ? col3X : (preUpperRounds.length > 1 ? col1X : col0X);
  const totalWidth = rightmostX + config.matchWidth + config.paddingRight;

  return {
    totalWidth,
    totalHeight,
    matchPositions,
    roundHeaders,
    stageHeaders,
    paths,
    championPosition: { x: 0, y: 0, width: 0, height: 0, centerY: 0 },
    championPath: undefined,
    viewMode: 'standard',
  };
}

/**
 * Calculates layout for Pod 3: Pre-Merge Lower Bracket (L1 and L2).
 * Lays out Pre-Merge Lower R1 (Col 0) and Pre-Merge Lower R2 (Col 1) side-by-side
 * with clean intra-panel SVG connectors linking Lower R1 -> Lower R2 Slot 1.
 */
export function calculateAcceleratedHybridPreMergeLowerLayout(
  bracket: BracketStructure,
  customConfig?: Partial<LayoutConfig>
): BracketLayoutMetadata {
  const config: LayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...customConfig };
  if (customConfig?.headerHeight === undefined) {
    const interMatchGap = config.baseRowHeight - config.matchHeight;
    config.headerHeight = 34 + interMatchGap;
  }

  const { rounds } = bracket;
  const matchPositions: Record<string, MatchPosition> = {};
  const roundHeaders: RoundHeaderPosition[] = [];
  const stageHeaders: Array<{ id: string; title: string; x: number; y: number; width: number }> = [];
  const paths: ConnectorPath[] = [];

  const preLowerRounds = rounds.filter((r) => r.roundIdentifier?.startsWith('PRE_L'));
  const colStep = config.matchWidth + config.roundGap;
  const col0X = config.paddingLeft;
  const col1X = config.paddingLeft + colStep;

  const stageBadgeHeight = 26;
  const stageBadgeGap = 12;
  const badgeY = config.paddingTop;
  const headerY = badgeY + stageBadgeHeight + stageBadgeGap;
  const matchesStartY = headerY + config.headerHeight;

  stageHeaders.push({
    id: 'pod-premerge-lower',
    title: 'Pre-Merge Lower Bracket',
    x: col0X,
    y: badgeY,
    width: Math.max(config.matchWidth, preLowerRounds.length * colStep - config.roundGap),
  });

  // Col 0: Pre-Merge Lower R1
  if (preLowerRounds[0]) {
    const r = preLowerRounds[0];
    roundHeaders.push({
      roundNumber: r.roundNumber,
      name: r.name,
      x: col0X,
      y: headerY,
      width: config.matchWidth,
    });

    r.matches.forEach((m, mIdx) => {
      const topY = matchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col0X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: col0X + config.matchWidth / 2,
      };
    });
  }

  // Col 1: Pre-Merge Lower R2
  if (preLowerRounds[1]) {
    const r = preLowerRounds[1];
    roundHeaders.push({
      roundNumber: r.roundNumber,
      name: r.name,
      x: col1X,
      y: headerY,
      width: config.matchWidth,
    });

    r.matches.forEach((m, mIdx) => {
      const topY = matchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col1X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: col1X + config.matchWidth / 2,
      };
    });
  }

  // Intra-panel SVG connectors: Lower R1 -> Lower R2 (Slot 1)
  const allLowerMatches = preLowerRounds.flatMap((r) => r.matches);
  allLowerMatches.forEach((childMatch) => {
    const childPos = matchPositions[childMatch.id];
    if (!childPos) return;

    const childInX = childPos.x;
    const childInY1 = childPos.y + childPos.height * 0.25;

    const f1Id = childMatch.player1.sourceMatchId;
    const f1 = f1Id ? matchPositions[f1Id] : undefined;

    if (f1) {
      const f1OutX = f1.x + f1.width;
      const f1OutY = f1.centerY;
      const midX = Math.round(f1OutX + (childInX - f1OutX) / 2);
      paths.push({
        id: `pml-path-${childMatch.id}-s1`,
        d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY1} H ${childInX}`,
        sourceMatchIds: [f1.matchId],
        targetMatchId: childMatch.id,
      });
    }
  });

  const allBottoms = Object.values(matchPositions).map((p) => p.y + p.height);
  const totalHeight = Math.max(...allBottoms, matchesStartY + config.matchHeight) + config.paddingBottom;
  const totalWidth = (preLowerRounds.length > 1 ? col1X : col0X) + config.matchWidth + config.paddingRight;

  return {
    totalWidth,
    totalHeight,
    matchPositions,
    roundHeaders,
    stageHeaders,
    paths,
    championPosition: { x: 0, y: 0, width: 0, height: 0, centerY: 0 },
    championPath: undefined,
    viewMode: 'standard',
  };
}

/**
 * Calculates layout for Pod 4: Re-Climb Stage (2nd Chance & Play-Offs).
 * Lays out 2nd Chance Round (Col 0) and Play-Offs (Col 1) side-by-side
 * with clean intra-panel SVG connectors linking 2nd Chance winners -> Play-Offs Slot 2.
 */
export function calculateAcceleratedHybridReClimbLayout(
  bracket: BracketStructure,
  customConfig?: Partial<LayoutConfig>
): BracketLayoutMetadata {
  const config: LayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...customConfig };
  if (customConfig?.headerHeight === undefined) {
    const interMatchGap = config.baseRowHeight - config.matchHeight;
    config.headerHeight = 34 + interMatchGap;
  }

  const { rounds } = bracket;
  const matchPositions: Record<string, MatchPosition> = {};
  const roundHeaders: RoundHeaderPosition[] = [];
  const stageHeaders: Array<{ id: string; title: string; x: number; y: number; width: number }> = [];
  const paths: ConnectorPath[] = [];

  const secondChanceRound = rounds.find((r) => r.roundIdentifier === '2C');
  const playOffRound = rounds.find((r) => r.roundIdentifier === 'PO');

  const colStep = config.matchWidth + config.roundGap;
  const col0X = config.paddingLeft;
  const col1X = config.paddingLeft + colStep;

  const stageBadgeHeight = 26;
  const stageBadgeGap = 12;
  const badgeY = config.paddingTop;
  const headerY = badgeY + stageBadgeHeight + stageBadgeGap;
  const matchesStartY = headerY + config.headerHeight;

  stageHeaders.push({
    id: 'pod-reclimb-stage',
    title: 'Re-Climb Stage (2nd Chance & Play-Offs)',
    x: col0X,
    y: badgeY,
    width: 2 * colStep - config.roundGap,
  });

  // Col 0: 2nd Chance Round
  if (secondChanceRound) {
    roundHeaders.push({
      roundNumber: secondChanceRound.roundNumber,
      name: secondChanceRound.name,
      x: col0X,
      y: headerY,
      width: config.matchWidth,
    });

    secondChanceRound.matches.forEach((m, mIdx) => {
      const topY = matchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col0X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: col0X + config.matchWidth / 2,
      };
    });
  }

  // Col 1: Play-Offs
  if (playOffRound) {
    roundHeaders.push({
      roundNumber: playOffRound.roundNumber,
      name: playOffRound.name,
      x: col1X,
      y: headerY,
      width: config.matchWidth,
    });

    playOffRound.matches.forEach((m, mIdx) => {
      const topY = matchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col1X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: col1X + config.matchWidth / 2,
      };
    });
  }

  // Intra-panel SVG connectors: 2nd Chance -> Play-Offs (Slot 2)
  if (playOffRound) {
    playOffRound.matches.forEach((childMatch) => {
      const childPos = matchPositions[childMatch.id];
      if (!childPos) return;

      const childInX = childPos.x;
      const childInY2 = childPos.y + childPos.height * 0.75;

      const f2Id = childMatch.player2.sourceMatchId;
      const f2 = f2Id ? matchPositions[f2Id] : undefined;

      if (f2) {
        const f2OutX = f2.x + f2.width;
        const f2OutY = f2.centerY;
        const midX = Math.round(f2OutX + (childInX - f2OutX) / 2);
        paths.push({
          id: `rc-path-${childMatch.id}-s2`,
          d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY2} H ${childInX}`,
          sourceMatchIds: [f2.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 2,
        });
      }
    });
  }

  const allBottoms = Object.values(matchPositions).map((p) => p.y + p.height);
  const totalHeight = Math.max(...allBottoms, matchesStartY + config.matchHeight) + config.paddingBottom;
  const totalWidth = col1X + config.matchWidth + config.paddingRight;

  return {
    totalWidth,
    totalHeight,
    matchPositions,
    roundHeaders,
    stageHeaders,
    paths,
    championPosition: { x: 0, y: 0, width: 0, height: 0, centerY: 0 },
    championPath: undefined,
    viewMode: 'standard',
  };
}

/**
 * Calculates layout for Pod 3: Lower Bracket (Rounds 1, 2, 3, 4).
 * Consolidates Pre-Merge Lower R1, Pre-Merge Lower R2, 2nd Chance, and Play-Offs into a single cohesive panel.
 * Lays out 4 columns of 8 matches with clean horizontal SVG connectors running across Rounds 1 -> 2 -> 3 -> 4.
 */
export function calculateAcceleratedHybridLowerBracketLayout(
  bracket: BracketStructure,
  customConfig?: Partial<LayoutConfig>
): BracketLayoutMetadata {
  const config: LayoutConfig = {
    ...DEFAULT_LAYOUT_CONFIG,
    paddingLeft: 12,
    paddingRight: 12,
    roundGap: 36,
    ...customConfig,
  };
  if (customConfig?.headerHeight === undefined) {
    const interMatchGap = config.baseRowHeight - config.matchHeight;
    config.headerHeight = 34 + interMatchGap;
  }

  const { rounds } = bracket;
  const matchPositions: Record<string, MatchPosition> = {};
  const roundHeaders: RoundHeaderPosition[] = [];
  const stageHeaders: Array<{ id: string; title: string; x: number; y: number; width: number }> = [];
  const paths: ConnectorPath[] = [];

  const preLowerR1 = rounds.find((r) => r.roundIdentifier === 'PRE_L1');
  const preLowerR2 = rounds.find((r) => r.roundIdentifier === 'PRE_L2');
  const secondChanceRound = rounds.find((r) => r.roundIdentifier === '2C');
  const playOffRound = rounds.find((r) => r.roundIdentifier === 'PO');

  const orderedRounds = [preLowerR1, preLowerR2, secondChanceRound, playOffRound].filter(Boolean) as BracketRound[];

  const colStep = config.matchWidth + config.roundGap;
  const stageBadgeHeight = 26;
  const stageBadgeGap = 12;
  const badgeY = config.paddingTop;
  const headerY = badgeY + stageBadgeHeight + stageBadgeGap;
  const matchesStartY = headerY + config.headerHeight;

  stageHeaders.push({
    id: 'pod-lower-bracket',
    title: 'Lower Bracket',
    x: config.paddingLeft,
    y: badgeY,
    width: Math.max(config.matchWidth, orderedRounds.length * colStep - config.roundGap),
  });

  orderedRounds.forEach((round, rIdx) => {
    const colX = config.paddingLeft + rIdx * colStep;
    roundHeaders.push({
      roundNumber: round.roundNumber,
      name: round.name,
      x: colX,
      y: headerY,
      width: config.matchWidth,
    });

    round.matches.forEach((m, mIdx) => {
      const centerY = matchesStartY + mIdx * config.baseRowHeight + config.matchHeight / 2;
      const topY = centerY - config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: colX,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: colX + config.matchWidth / 2,
      };
    });
  });

  // Straight horizontal SVG connectors across Rounds 1 -> 2 -> 3 -> 4
  // 1) R1 -> R2 (Slot 1)
  if (preLowerR1 && preLowerR2) {
    preLowerR1.matches.forEach((r1Match, idx) => {
      const r2Match = preLowerR2.matches[idx];
      if (!r2Match) return;
      const f1 = matchPositions[r1Match.id];
      const child = matchPositions[r2Match.id];
      if (f1 && child) {
        const outX = f1.x + f1.width;
        const outY = f1.centerY;
        const inX = child.x;
        paths.push({
          id: `lb-path-${r1Match.id}-${r2Match.id}`,
          d: `M ${outX} ${outY} H ${inX}`,
          sourceMatchIds: [r1Match.id],
          targetMatchId: r2Match.id,
          targetSlot: 1,
        });
      }
    });
  }

  // 2) R2 -> R3 (Slot 1)
  if (preLowerR2 && secondChanceRound) {
    preLowerR2.matches.forEach((r2Match, idx) => {
      const r3Match = secondChanceRound.matches[idx];
      if (!r3Match) return;
      const f1 = matchPositions[r2Match.id];
      const child = matchPositions[r3Match.id];
      if (f1 && child) {
        const outX = f1.x + f1.width;
        const outY = f1.centerY;
        const inX = child.x;
        paths.push({
          id: `lb-path-${r2Match.id}-${r3Match.id}`,
          d: `M ${outX} ${outY} H ${inX}`,
          sourceMatchIds: [r2Match.id],
          targetMatchId: r3Match.id,
          targetSlot: 1,
        });
      }
    });
  }

  // 3) R3 -> R4 (Slot 2: stair step down from R3 center to R4 Slot 2)
  if (secondChanceRound && playOffRound) {
    secondChanceRound.matches.forEach((r3Match, idx) => {
      const r4Match = playOffRound.matches[idx];
      if (!r4Match) return;
      const f1 = matchPositions[r3Match.id];
      const child = matchPositions[r4Match.id];
      if (f1 && child) {
        const outX = f1.x + f1.width;
        const outY = f1.centerY;
        const inX = child.x;
        const inY = child.y + child.height * 0.75;
        const midX = Math.round(outX + (inX - outX) / 2);
        paths.push({
          id: `lb-path-${r3Match.id}-${r4Match.id}`,
          d: `M ${outX} ${outY} H ${midX} V ${inY} H ${inX}`,
          sourceMatchIds: [r3Match.id],
          targetMatchId: r4Match.id,
          targetSlot: 2,
        });
      }
    });
  }

  const allBottoms = Object.values(matchPositions).map((p) => p.y + p.height);
  const totalHeight = Math.max(...allBottoms, matchesStartY + config.matchHeight) + config.paddingBottom;
  const totalWidth =
    config.paddingLeft + orderedRounds.length * colStep - config.roundGap + config.paddingRight;

  return {
    totalWidth,
    totalHeight,
    matchPositions,
    roundHeaders,
    stageHeaders,
    paths,
    championPosition: { x: 0, y: 0, width: 0, height: 0, centerY: 0 },
    championPath: undefined,
    viewMode: 'standard',
  };
}

/**
 * Calculates layout for the Pre-Merge Stage of Accelerated Hybrid tournaments.
 * Lays out Pre-Merge Upper, Pre-Merge Lower, 2nd Chance Round, and Play-Offs.
 * All connector lines flow strictly left to right without cross-canvas entanglements.
 */
export function calculateAcceleratedHybridPreMergeLayout(
  bracket: BracketStructure,
  customConfig?: Partial<LayoutConfig>
): BracketLayoutMetadata {
  const config: LayoutConfig = {
    ...DEFAULT_LAYOUT_CONFIG,
    paddingLeft: 64,
    paddingRight: 64,
    ...customConfig,
  };
  if (customConfig?.headerHeight === undefined) {
    const interMatchGap = config.baseRowHeight - config.matchHeight;
    config.headerHeight = 34 + interMatchGap;
  }

  const { rounds } = bracket;
  const matchPositions: Record<string, MatchPosition> = {};
  const roundHeaders: RoundHeaderPosition[] = [];
  const stageHeaders: Array<{ id: string; title: string; x: number; y: number; width: number }> = [];
  const paths: ConnectorPath[] = [];

  const colStep = config.matchWidth + config.roundGap;
  const stageBadgeHeight = 26;
  const stageBadgeGap = 12;

  const preUpperRounds = rounds.filter((r) => r.roundIdentifier?.startsWith('PRE_W'));
  const preLowerRounds = rounds.filter((r) => r.roundIdentifier?.startsWith('PRE_L'));
  const secondChanceRound = rounds.find((r) => r.roundIdentifier === '2C');
  const playOffRound = rounds.find((r) => r.roundIdentifier === 'PO');

  // Column definitions (0-indexed):
  // Col 0: Pre-Merge Upper R1 (Top) | Pre-Merge Lower R1 (Bottom)
  // Col 1: Pre-Merge Upper R2 (Top) | Pre-Merge Lower R2 (Bottom)
  // Col 2: 2nd Chance Round (Bottom)
  // Col 3: Play-Offs (Convergence)
  const col0X = config.paddingLeft + 0 * colStep;
  const col1X = config.paddingLeft + 1 * colStep;
  const col2X = config.paddingLeft + 2 * colStep;
  const col3X = config.paddingLeft + 3 * colStep;

  // Top Track (Upper Path)
  const upperBadgeY = config.paddingTop;
  const upperHeaderY = upperBadgeY + stageBadgeHeight + stageBadgeGap;
  const upperMatchesStartY = upperHeaderY + config.headerHeight;

  stageHeaders.push({
    id: 'stage-premerge-upper',
    title: 'Pre-Merge Upper (Double Elimination)',
    x: col0X,
    y: upperBadgeY,
    width: 2 * colStep - config.roundGap,
  });

  // 1. Pre-Merge Upper R1 (Col 0)
  if (preUpperRounds[0]) {
    const r = preUpperRounds[0];
    roundHeaders.push({
      roundNumber: r.roundNumber,
      name: r.name,
      x: col0X,
      y: upperHeaderY,
      width: config.matchWidth,
    });

    r.matches.forEach((m, mIdx) => {
      const topY = upperMatchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col0X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: col0X + config.matchWidth / 2,
      };
    });
  }

  // 2. Pre-Merge Upper R2 (Col 1)
  if (preUpperRounds[1]) {
    const r = preUpperRounds[1];
    roundHeaders.push({
      roundNumber: r.roundNumber,
      name: r.name,
      x: col1X,
      y: upperHeaderY,
      width: config.matchWidth,
    });

    r.matches.forEach((m, mIdx) => {
      const f1 = m.player1.sourceMatchId ? matchPositions[m.player1.sourceMatchId] : undefined;
      const f2 = m.player2.sourceMatchId ? matchPositions[m.player2.sourceMatchId] : undefined;
      const idealCenterY =
        f1 && f2
          ? (f1.centerY + f2.centerY) / 2
          : upperMatchesStartY + (mIdx * 2 + 0.5) * config.baseRowHeight;
      const topY = idealCenterY - config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col1X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY: idealCenterY,
        centerX: col1X + config.matchWidth / 2,
      };
    });
  }

  // Calculate bottom of Top Track
  const topTrackMatches = preUpperRounds.flatMap((r) => r.matches);
  const topTrackBottoms = topTrackMatches.map((m) =>
    matchPositions[m.id] ? matchPositions[m.id].y + matchPositions[m.id].height : 0
  );
  const topTrackMaxY = Math.max(...topTrackBottoms, upperMatchesStartY + config.matchHeight * 2);

  // Bottom Track (Lower / Re-Climb Path)
  const bottomGap = 48;
  const lowerBadgeY = topTrackMaxY + bottomGap;
  const lowerHeaderY = lowerBadgeY + stageBadgeHeight + stageBadgeGap;
  const lowerMatchesStartY = lowerHeaderY + config.headerHeight;

  stageHeaders.push({
    id: 'stage-premerge-lower',
    title: 'Pre-Merge Lower & 2nd Chance',
    x: col0X,
    y: lowerBadgeY,
    width: 3 * colStep - config.roundGap,
  });

  // 3. Pre-Merge Lower R1 (Col 0)
  if (preLowerRounds[0]) {
    const r = preLowerRounds[0];
    roundHeaders.push({
      roundNumber: r.roundNumber,
      name: r.name,
      x: col0X,
      y: lowerHeaderY,
      width: config.matchWidth,
    });

    r.matches.forEach((m, mIdx) => {
      const topY = lowerMatchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col0X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: col0X + config.matchWidth / 2,
      };
    });
  }

  // 4. Pre-Merge Lower R2 (Col 1)
  if (preLowerRounds[1]) {
    const r = preLowerRounds[1];
    roundHeaders.push({
      roundNumber: r.roundNumber,
      name: r.name,
      x: col1X,
      y: lowerHeaderY,
      width: config.matchWidth,
    });

    r.matches.forEach((m, mIdx) => {
      const topY = lowerMatchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col1X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: col1X + config.matchWidth / 2,
      };
    });
  }

  // 5. 2nd Chance Round (Col 2)
  if (secondChanceRound) {
    roundHeaders.push({
      roundNumber: secondChanceRound.roundNumber,
      name: secondChanceRound.name,
      x: col2X,
      y: lowerHeaderY,
      width: config.matchWidth,
    });

    secondChanceRound.matches.forEach((m, mIdx) => {
      const topY = lowerMatchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col2X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: col2X + config.matchWidth / 2,
      };
    });
  }

  // 6. Play-Offs (Convergence Column, Col 3)
  if (playOffRound) {
    stageHeaders.push({
      id: 'stage-po',
      title: 'Play-Offs (Top 16 Advancement)',
      x: col3X,
      y: upperBadgeY,
      width: config.matchWidth,
    });

    roundHeaders.push({
      roundNumber: playOffRound.roundNumber,
      name: playOffRound.name,
      x: col3X,
      y: upperHeaderY,
      width: config.matchWidth,
    });

    playOffRound.matches.forEach((m, mIdx) => {
      const targetW2 = preUpperRounds[1]?.matches[mIdx];
      const idealCenterY =
        targetW2 && matchPositions[targetW2.id]
          ? matchPositions[targetW2.id].centerY
          : upperMatchesStartY + (mIdx * 2 + 0.5) * config.baseRowHeight;
      const topY = idealCenterY - config.matchHeight / 2;
      matchPositions[m.id] = {
        matchId: m.id,
        x: col3X,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY: idealCenterY,
        centerX: col3X + config.matchWidth / 2,
      };
    });
  }

  // Connectors within Pre-Merge
  const preMergeMatches = [
    ...preUpperRounds.flatMap((r) => r.matches),
    ...preLowerRounds.flatMap((r) => r.matches),
    ...(secondChanceRound ? secondChanceRound.matches : []),
    ...(playOffRound ? playOffRound.matches : []),
  ];

  preMergeMatches.forEach((childMatch) => {
    const childPos = matchPositions[childMatch.id];
    if (!childPos) return;

    const childInX = childPos.x;
    const childInY1 = childPos.y + childPos.height * 0.25;
    const childInY2 = childPos.y + childPos.height * 0.75;

    const f1Id = childMatch.player1.sourceMatchId;
    const f2Id = childMatch.player2.sourceMatchId;
    const f1 = f1Id ? matchPositions[f1Id] : undefined;
    const f2 = f2Id ? matchPositions[f2Id] : undefined;

    if (f1) {
      const f1OutX = f1.x + f1.width;
      const f1OutY = f1.centerY;
      const midX = Math.round(f1OutX + (childInX - f1OutX) / 2);
      paths.push({
        id: `pm-path-${childMatch.id}-s1`,
        d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY1} H ${childInX}`,
        sourceMatchIds: [f1.matchId],
        targetMatchId: childMatch.id,
        targetSlot: 1,
      });
    }

    if (f2) {
      const f2OutX = f2.x + f2.width;
      const f2OutY = f2.centerY;
      const midX = Math.round(f2OutX + (childInX - f2OutX) / 2);
      paths.push({
        id: `pm-path-${childMatch.id}-s2`,
        d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY2} H ${childInX}`,
        sourceMatchIds: [f2.matchId],
        targetMatchId: childMatch.id,
        targetSlot: 2,
      });
    }
  });

  const allCardBottoms = Object.values(matchPositions).map((p) => p.y + p.height);
  const totalHeight =
    Math.max(...allCardBottoms, lowerMatchesStartY + config.matchHeight) + config.paddingBottom;
  const totalWidth = col3X + config.matchWidth + config.paddingRight;

  return {
    totalWidth,
    totalHeight,
    matchPositions,
    roundHeaders,
    stageHeaders,
    paths,
    championPosition: { x: 0, y: 0, width: 0, height: 0, centerY: 0 },
    championPath: undefined,
    viewMode: 'standard',
  };
}

/**
 * Calculates layout for Phase 2: Championship Top C Single Elimination Finals.
 * Extracts all rounds and matches tagged with phase === 'CHAMPIONSHIP' and renders
 * using the standard single-elimination bracket layout.
 */
export function calculateAcceleratedHybridPhase2Layout(
  bracket: BracketStructure,
  customConfig?: Partial<LayoutConfig>,
  viewMode: BracketViewMode = 'standard'
): BracketLayoutMetadata {
  const champRounds = bracket.rounds.filter(
    (r) =>
      r.phase === 'CHAMPIONSHIP' ||
      r.stage === 'GRAND_FINALS' ||
      r.roundIdentifier?.startsWith('CHAMP')
  );

  const champMatchesById: Record<string, BracketMatch> = {};
  champRounds.forEach((r) => {
    r.matches.forEach((m) => {
      champMatchesById[m.id] = m;
    });
  });

  const finalsCutoff = bracket.finalsCutoff || 16;
  const phase2Bracket: BracketStructure = {
    ...bracket,
    rounds: champRounds,
    matchesById: champMatchesById,
    totalRounds: champRounds.length,
    totalPlayers: finalsCutoff,
    eliminationType: 'SINGLE',
    bracketRouting: 'TRADITIONAL_TREE',
  };

  const layout = calculateTraditionalSingleElimLayout(
    phase2Bracket,
    { paddingLeft: 64, paddingRight: 64, ...customConfig },
    viewMode
  );
  // Suppress duplicate stage header ("FINALS") that renders directly behind "ROUND OF 16"
  layout.stageHeaders = [];

  return layout;
}
