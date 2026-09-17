import { BracketStructure } from './types';

export interface LayoutConfig {
  matchWidth: number;
  matchHeight: number;
  baseRowHeight: number; // matchHeight + compact gap for anchor round
  roundGap: number; // Horizontal gap between round columns
  headerHeight: number;
  paddingTop: number;
  paddingLeft: number;
  paddingRight: number;
  paddingBottom: number;
  championWidth: number;
  championHeight: number;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  matchWidth: 260,
  matchHeight: 80, // Fits header strip + 2 player rows perfectly without vertical clipping
  baseRowHeight: 98, // 80px card + 18px compact gap
  roundGap: 56, // Compact horizontal spacing for broadcast/OBS
  headerHeight: 64, // 26px vertical breathing room between 38px header badge and top matches
  paddingTop: 16,
  paddingLeft: 20,
  paddingRight: 32,
  paddingBottom: 24,
  championWidth: 280,
  championHeight: 76,
};

export const DENSE_LAYOUT_CONFIG: LayoutConfig = {
  matchWidth: 220,
  matchHeight: 48, // Compact 48px card
  baseRowHeight: 58, // 48px card + 10px gap
  roundGap: 40,
  headerHeight: 48,
  paddingTop: 12,
  paddingLeft: 16,
  paddingRight: 24,
  paddingBottom: 16,
  championWidth: 220,
  championHeight: 54,
};

export type BracketViewMode = 'standard' | 'fit' | 'split' | 'focus' | 'dense';

export interface MatchPosition {
  matchId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerY: number;
  centerX: number;
  isCompactFeeder?: boolean;
}

export interface RoundHeaderPosition {
  roundNumber: number;
  name: string;
  x: number;
  y: number;
  width: number;
}

export interface ConnectorPath {
  id: string;
  d: string;
  sourceMatchIds: string[];
  targetMatchId: string;
}

export interface BracketLayoutMetadata {
  totalWidth: number;
  totalHeight: number;
  matchPositions: Record<string, MatchPosition>;
  roundHeaders: RoundHeaderPosition[];
  paths: ConnectorPath[];
  championPosition: {
    x: number;
    y: number;
    width: number;
    height: number;
    centerY: number;
  };
  championPath?: {
    d: string;
    finalsMatchId: string;
  };
  viewMode?: BracketViewMode;
}

/**
 * Main Layout Calculator supporting standard, dense, split, and focus modes.
 */
export function calculateBracketLayout(
  bracket: BracketStructure,
  customConfig?: Partial<LayoutConfig>,
  viewMode: BracketViewMode = 'standard'
): BracketLayoutMetadata {
  if (viewMode === 'split') {
    return calculateSplitBracketLayout(bracket, customConfig);
  }
  if (viewMode === 'focus') {
    return calculateFocusBracketLayout(bracket, customConfig);
  }

  const baseConfig = viewMode === 'dense' ? DENSE_LAYOUT_CONFIG : DEFAULT_LAYOUT_CONFIG;
  const config: LayoutConfig = { ...baseConfig, ...customConfig };
  const { rounds } = bracket;

  const matchPositions: Record<string, MatchPosition> = {};
  const roundHeaders: RoundHeaderPosition[] = [];
  const paths: ConnectorPath[] = [];

  if (!rounds || rounds.length === 0) {
    return {
      totalWidth: 800,
      totalHeight: 600,
      matchPositions,
      roundHeaders,
      paths,
      championPosition: { x: 0, y: 0, width: config.championWidth, height: config.championHeight, centerY: 0 },
      viewMode,
    };
  }

  // Step 1: Compute X coordinates and headers for each round
  rounds.forEach((round, rIdx) => {
    const roundX = config.paddingLeft + rIdx * (config.matchWidth + config.roundGap);
    roundHeaders.push({
      roundNumber: round.roundNumber,
      name: round.name,
      x: roundX,
      y: config.paddingTop,
      width: config.matchWidth,
    });
  });

  // Step 2: Find the Anchor Round (round with maximum matches)
  let maxMatches = 0;
  let anchorRoundIdx = 0;

  rounds.forEach((r, idx) => {
    if (r.matches.length > maxMatches) {
      maxMatches = r.matches.length;
      anchorRoundIdx = idx;
    }
  });

  const anchorRound = rounds[anchorRoundIdx];
  const anchorX = config.paddingLeft + anchorRoundIdx * (config.matchWidth + config.roundGap);

  // Position Anchor Round matches compactly with baseRowHeight
  anchorRound.matches.forEach((match, mIdx) => {
    const topY = config.paddingTop + config.headerHeight + mIdx * config.baseRowHeight;
    const centerY = topY + config.matchHeight / 2;

    matchPositions[match.id] = {
      matchId: match.id,
      x: anchorX,
      y: topY,
      width: config.matchWidth,
      height: config.matchHeight,
      centerY,
      centerX: anchorX + config.matchWidth / 2,
    };
  });

  // Step 3: Position rounds to the RIGHT of the anchor round
  for (let rIdx = anchorRoundIdx + 1; rIdx < rounds.length; rIdx++) {
    const round = rounds[rIdx];
    const roundX = config.paddingLeft + rIdx * (config.matchWidth + config.roundGap);

    round.matches.forEach((match, mIdx) => {
      const p1FeederId = match.player1.sourceMatchId;
      const p2FeederId = match.player2.sourceMatchId;
      const f1 = p1FeederId ? matchPositions[p1FeederId] : undefined;
      const f2 = p2FeederId ? matchPositions[p2FeederId] : undefined;

      let idealCenterY: number;

      if (f1 && f2) {
        idealCenterY = (f1.centerY + f2.centerY) / 2;
      } else if (f1) {
        idealCenterY = f1.centerY;
      } else if (f2) {
        idealCenterY = f2.centerY;
      } else {
        const prevRound = rounds[rIdx - 1];
        const prevMatches = prevRound?.matches || [];
        const approxFeederIdx1 = Math.min(mIdx * 2, prevMatches.length - 1);
        const approxFeederIdx2 = Math.min(mIdx * 2 + 1, prevMatches.length - 1);
        const p1Pos = prevMatches[approxFeederIdx1] ? matchPositions[prevMatches[approxFeederIdx1].id] : undefined;
        const p2Pos = prevMatches[approxFeederIdx2] ? matchPositions[prevMatches[approxFeederIdx2].id] : undefined;
        if (p1Pos && p2Pos) {
          idealCenterY = (p1Pos.centerY + p2Pos.centerY) / 2;
        } else if (p1Pos) {
          idealCenterY = p1Pos.centerY;
        } else {
          idealCenterY = config.paddingTop + config.headerHeight + mIdx * config.baseRowHeight * 2;
        }
      }

      if (mIdx > 0) {
        const prevMatchId = round.matches[mIdx - 1].id;
        const prevPos = matchPositions[prevMatchId];
        if (prevPos) {
          const minCenterY = prevPos.centerY + config.matchHeight + 12;
          if (idealCenterY < minCenterY) {
            idealCenterY = minCenterY;
          }
        }
      }

      const topY = idealCenterY - config.matchHeight / 2;

      matchPositions[match.id] = {
        matchId: match.id,
        x: roundX,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY: idealCenterY,
        centerX: roundX + config.matchWidth / 2,
      };
    });
  }

  // Step 4: Position rounds to the LEFT of the anchor round (prelims)
  for (let rIdx = anchorRoundIdx - 1; rIdx >= 0; rIdx--) {
    const round = rounds[rIdx];
    const roundX = config.paddingLeft + rIdx * (config.matchWidth + config.roundGap);

    round.matches.forEach((match, mIdx) => {
      let idealCenterY: number;

      let targetPos: MatchPosition | undefined;
      let targetSlot = 1;

      if (match.nextMatchId && matchPositions[match.nextMatchId]) {
        targetPos = matchPositions[match.nextMatchId];
        targetSlot = match.nextMatchSlot || 1;
      } else {
        const downstreamRound = rounds[rIdx + 1];
        if (downstreamRound) {
          for (const dsMatch of downstreamRound.matches) {
            if (dsMatch.player1.sourceMatchId === match.id) {
              targetPos = matchPositions[dsMatch.id];
              targetSlot = 1;
              break;
            }
            if (dsMatch.player2.sourceMatchId === match.id) {
              targetPos = matchPositions[dsMatch.id];
              targetSlot = 2;
              break;
            }
          }
        }
      }

      if (targetPos) {
        if (targetSlot === 1) {
          idealCenterY = targetPos.y + targetPos.height * 0.25;
        } else {
          idealCenterY = targetPos.y + targetPos.height * 0.75;
        }
      } else {
        idealCenterY = config.paddingTop + config.headerHeight + mIdx * config.baseRowHeight;
      }

      if (mIdx > 0) {
        const prevMatchId = round.matches[mIdx - 1].id;
        const prevPos = matchPositions[prevMatchId];
        if (prevPos) {
          const minCenterY = prevPos.centerY + config.matchHeight + 10;
          if (idealCenterY < minCenterY) {
            idealCenterY = minCenterY;
          }
        }
      }

      const topY = idealCenterY - config.matchHeight / 2;

      matchPositions[match.id] = {
        matchId: match.id,
        x: roundX,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY: idealCenterY,
        centerX: roundX + config.matchWidth / 2,
      };
    });
  }

  // Step 5: Compute Champion Plaque Position
  const finalsRound = rounds[rounds.length - 1];
  const finalsMatch = finalsRound?.matches[0];
  const finalsPos = finalsMatch ? matchPositions[finalsMatch.id] : undefined;

  const lastRoundX = config.paddingLeft + (rounds.length - 1) * (config.matchWidth + config.roundGap);
  const championX = lastRoundX + config.matchWidth + config.roundGap;

  let allYs = Object.values(matchPositions).map(p => p.centerY);
  if (allYs.length === 0) allYs = [config.paddingTop + config.headerHeight];
  const minY = Math.min(...allYs);
  const maxY = Math.max(...allYs);
  const fallbackCenterY = (minY + maxY) / 2;
  const championCenterY = finalsPos ? finalsPos.centerY : fallbackCenterY;
  const championTopY = championCenterY - config.championHeight / 2;

  const championPosition = {
    x: championX,
    y: championTopY,
    width: config.championWidth,
    height: config.championHeight,
    centerY: championCenterY,
  };

  // Step 6: Generate SVG Connector Paths
  for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
    const round = rounds[rIdx];
    round.matches.forEach((childMatch) => {
      const childPos = matchPositions[childMatch.id];
      if (!childPos) return;

      const p1FeederId = childMatch.player1.sourceMatchId;
      const p2FeederId = childMatch.player2.sourceMatchId;
      const f1 = p1FeederId ? matchPositions[p1FeederId] : undefined;
      const f2 = p2FeederId ? matchPositions[p2FeederId] : undefined;

      const childInX = childPos.x;
      const childInY = childPos.centerY;

      if (f1 && f2) {
        const f1OutX = f1.x + f1.width;
        const f1OutY = f1.centerY;
        const f2OutX = f2.x + f2.width;
        const f2OutY = f2.centerY;
        const maxOutX = Math.max(f1OutX, f2OutX);
        const midX = Math.round(maxOutX + (childInX - maxOutX) / 2);

        const d = [
          `M ${f1OutX} ${f1OutY} H ${midX}`,
          `V ${f2OutY} H ${f2OutX}`,
          `M ${midX} ${childInY} H ${childInX}`,
        ].join(' ');

        paths.push({
          id: `path-${childMatch.id}`,
          d,
          sourceMatchIds: [f1.matchId, f2.matchId],
          targetMatchId: childMatch.id,
        });
      } else if (f1) {
        const f1OutX = f1.x + f1.width;
        const f1OutY = f1.centerY;

        if (Math.abs(f1OutY - childInY) < 2) {
          paths.push({
            id: `path-${childMatch.id}-straight-p1`,
            d: `M ${f1OutX} ${f1OutY} H ${childInX}`,
            sourceMatchIds: [f1.matchId],
            targetMatchId: childMatch.id,
          });
        } else {
          const midX = Math.round(f1OutX + (childInX - f1OutX) / 2);
          const d = `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY} H ${childInX}`;
          paths.push({
            id: `path-${childMatch.id}-single-p1`,
            d,
            sourceMatchIds: [f1.matchId],
            targetMatchId: childMatch.id,
          });
        }
      } else if (f2) {
        const f2OutX = f2.x + f2.width;
        const f2OutY = f2.centerY;

        if (Math.abs(f2OutY - childInY) < 2) {
          paths.push({
            id: `path-${childMatch.id}-straight-p2`,
            d: `M ${f2OutX} ${f2OutY} H ${childInX}`,
            sourceMatchIds: [f2.matchId],
            targetMatchId: childMatch.id,
          });
        } else {
          const midX = Math.round(f2OutX + (childInX - f2OutX) / 2);
          const d = `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY} H ${childInX}`;
          paths.push({
            id: `path-${childMatch.id}-single-p2`,
            d,
            sourceMatchIds: [f2.matchId],
            targetMatchId: childMatch.id,
          });
        }
      }
    });
  }

  // Champion connector stem
  let championPath: { d: string; finalsMatchId: string } | undefined;
  if (finalsPos) {
    const finalsOutX = finalsPos.x + finalsPos.width;
    const finalsOutY = finalsPos.centerY;
    const champInX = championPosition.x;
    championPath = {
      d: `M ${finalsOutX} ${finalsOutY} H ${champInX}`,
      finalsMatchId: finalsMatch.id,
    };
  }

  const allCardBottoms = Object.values(matchPositions).map(p => p.y + p.height);
  allCardBottoms.push(championPosition.y + championPosition.height);
  const maxBottom = Math.max(...allCardBottoms, config.paddingTop + config.headerHeight + 200);

  const totalHeight = maxBottom + config.paddingBottom;
  const totalWidth = championX + config.championWidth + config.paddingRight;

  return {
    totalWidth,
    totalHeight,
    matchPositions,
    roundHeaders,
    paths,
    championPosition,
    championPath,
    viewMode,
  };
}

/**
 * Strategy A: Bilateral Split-Bracket (East vs. West wings meeting at Center Finals)
 * Halves vertical height for deep tournaments (16, 32, 64 players).
 */
export function calculateSplitBracketLayout(
  bracket: BracketStructure,
  customConfig?: Partial<LayoutConfig>
): BracketLayoutMetadata {
  const { rounds } = bracket;
  if (!rounds || rounds.length < 3) {
    return calculateBracketLayout(bracket, customConfig, 'standard');
  }

  const config: LayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...customConfig };
  const matchPositions: Record<string, MatchPosition> = {};
  const roundHeaders: RoundHeaderPosition[] = [];
  const paths: ConnectorPath[] = [];

  const finalsRound = rounds[rounds.length - 1];
  const semiRound = rounds[rounds.length - 2];
  const finalsMatch = finalsRound.matches[0];
  const semi1 = semiRound.matches[0];
  const semi2 = semiRound.matches[1];

  if (!finalsMatch || !semi1 || !semi2) {
    return calculateBracketLayout(bracket, customConfig, 'standard');
  }

  // Trace left wing match IDs (ancestors of semi1) and right wing match IDs (ancestors of semi2)
  const leftMatchIds = new Set<string>([semi1.id]);
  const rightMatchIds = new Set<string>([semi2.id]);

  for (let rIdx = rounds.length - 3; rIdx >= 0; rIdx--) {
    const round = rounds[rIdx];
    for (const m of round.matches) {
      if (m.nextMatchId && leftMatchIds.has(m.nextMatchId)) {
        leftMatchIds.add(m.id);
      } else if (m.nextMatchId && rightMatchIds.has(m.nextMatchId)) {
        rightMatchIds.add(m.id);
      } else {
        const dsRound = rounds[rIdx + 1];
        let placed = false;
        if (dsRound) {
          for (const dsMatch of dsRound.matches) {
            if (dsMatch.player1.sourceMatchId === m.id || dsMatch.player2.sourceMatchId === m.id) {
              if (leftMatchIds.has(dsMatch.id)) {
                leftMatchIds.add(m.id);
                placed = true;
                break;
              } else if (rightMatchIds.has(dsMatch.id)) {
                rightMatchIds.add(m.id);
                placed = true;
                break;
              }
            }
          }
        }
        if (!placed) {
          if (m.matchNumber <= round.matches.length / 2) {
            leftMatchIds.add(m.id);
          } else {
            rightMatchIds.add(m.id);
          }
        }
      }
    }
  }

  const wingRoundCount = rounds.length - 1; // Number of rounds per wing
  const leftStartX = config.paddingLeft;
  const centerX = leftStartX + wingRoundCount * (config.matchWidth + config.roundGap);
  const rightStartX = centerX + config.matchWidth + config.roundGap;

  // Round Headers: Left Wing
  for (let rIdx = 0; rIdx < wingRoundCount; rIdx++) {
    const round = rounds[rIdx];
    const x = leftStartX + rIdx * (config.matchWidth + config.roundGap);
    roundHeaders.push({
      roundNumber: round.roundNumber,
      name: round.name,
      x,
      y: config.paddingTop,
      width: config.matchWidth,
    });
  }

  // Center Finals Header
  roundHeaders.push({
    roundNumber: finalsRound.roundNumber,
    name: finalsRound.name,
    x: centerX,
    y: config.paddingTop,
    width: config.matchWidth,
  });

  // Right Wing Headers (mirrored inwards towards center)
  for (let rIdx = 0; rIdx < wingRoundCount; rIdx++) {
    const round = rounds[rIdx];
    const colIdx = wingRoundCount - 1 - rIdx;
    const x = rightStartX + colIdx * (config.matchWidth + config.roundGap);
    roundHeaders.push({
      roundNumber: round.roundNumber + 200,
      name: round.name,
      x,
      y: config.paddingTop,
      width: config.matchWidth,
    });
  }

  // Find Anchor Round for Left Wing (max matches on left)
  let maxLeft = 0;
  let leftAnchorIdx = 0;
  for (let rIdx = 0; rIdx < wingRoundCount; rIdx++) {
    const count = rounds[rIdx].matches.filter(m => leftMatchIds.has(m.id)).length;
    if (count > maxLeft) {
      maxLeft = count;
      leftAnchorIdx = rIdx;
    }
  }

  // Position Left Wing Anchor
  const leftAnchorMatches = rounds[leftAnchorIdx].matches.filter(m => leftMatchIds.has(m.id));
  const leftAnchorX = leftStartX + leftAnchorIdx * (config.matchWidth + config.roundGap);

  leftAnchorMatches.forEach((match, mIdx) => {
    const topY = config.paddingTop + config.headerHeight + mIdx * config.baseRowHeight;
    const centerY = topY + config.matchHeight / 2;
    matchPositions[match.id] = {
      matchId: match.id,
      x: leftAnchorX,
      y: topY,
      width: config.matchWidth,
      height: config.matchHeight,
      centerY,
      centerX: leftAnchorX + config.matchWidth / 2,
    };
  });

  // Advance Left Wing forwards
  for (let rIdx = leftAnchorIdx + 1; rIdx < wingRoundCount; rIdx++) {
    const round = rounds[rIdx];
    const roundX = leftStartX + rIdx * (config.matchWidth + config.roundGap);
    const roundMatches = round.matches.filter(m => leftMatchIds.has(m.id));

    roundMatches.forEach((match, mIdx) => {
      const f1 = match.player1.sourceMatchId ? matchPositions[match.player1.sourceMatchId] : undefined;
      const f2 = match.player2.sourceMatchId ? matchPositions[match.player2.sourceMatchId] : undefined;
      let idealCenterY: number;
      if (f1 && f2) idealCenterY = (f1.centerY + f2.centerY) / 2;
      else if (f1) idealCenterY = f1.centerY;
      else if (f2) idealCenterY = f2.centerY;
      else idealCenterY = config.paddingTop + config.headerHeight + mIdx * config.baseRowHeight * 2;

      if (mIdx > 0) {
        const prevId = roundMatches[mIdx - 1].id;
        const prevPos = matchPositions[prevId];
        if (prevPos && idealCenterY < prevPos.centerY + config.matchHeight + 12) {
          idealCenterY = prevPos.centerY + config.matchHeight + 12;
        }
      }

      const topY = idealCenterY - config.matchHeight / 2;
      matchPositions[match.id] = {
        matchId: match.id,
        x: roundX,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY: idealCenterY,
        centerX: roundX + config.matchWidth / 2,
      };
    });
  }

  // Position Right Wing Anchor
  const rightAnchorMatches = rounds[leftAnchorIdx].matches.filter(m => rightMatchIds.has(m.id));
  const rightAnchorCol = wingRoundCount - 1 - leftAnchorIdx;
  const rightAnchorX = rightStartX + rightAnchorCol * (config.matchWidth + config.roundGap);

  rightAnchorMatches.forEach((match, mIdx) => {
    const topY = config.paddingTop + config.headerHeight + mIdx * config.baseRowHeight;
    const centerY = topY + config.matchHeight / 2;
    matchPositions[match.id] = {
      matchId: match.id,
      x: rightAnchorX,
      y: topY,
      width: config.matchWidth,
      height: config.matchHeight,
      centerY,
      centerX: rightAnchorX + config.matchWidth / 2,
    };
  });

  // Advance Right Wing forwards (towards center)
  for (let rIdx = leftAnchorIdx + 1; rIdx < wingRoundCount; rIdx++) {
    const round = rounds[rIdx];
    const colIdx = wingRoundCount - 1 - rIdx;
    const roundX = rightStartX + colIdx * (config.matchWidth + config.roundGap);
    const roundMatches = round.matches.filter(m => rightMatchIds.has(m.id));

    roundMatches.forEach((match, mIdx) => {
      const f1 = match.player1.sourceMatchId ? matchPositions[match.player1.sourceMatchId] : undefined;
      const f2 = match.player2.sourceMatchId ? matchPositions[match.player2.sourceMatchId] : undefined;
      let idealCenterY: number;
      if (f1 && f2) idealCenterY = (f1.centerY + f2.centerY) / 2;
      else if (f1) idealCenterY = f1.centerY;
      else if (f2) idealCenterY = f2.centerY;
      else idealCenterY = config.paddingTop + config.headerHeight + mIdx * config.baseRowHeight * 2;

      if (mIdx > 0) {
        const prevId = roundMatches[mIdx - 1].id;
        const prevPos = matchPositions[prevId];
        if (prevPos && idealCenterY < prevPos.centerY + config.matchHeight + 12) {
          idealCenterY = prevPos.centerY + config.matchHeight + 12;
        }
      }

      const topY = idealCenterY - config.matchHeight / 2;
      matchPositions[match.id] = {
        matchId: match.id,
        x: roundX,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY: idealCenterY,
        centerX: roundX + config.matchWidth / 2,
      };
    });
  }

  // Position Center Finals Match
  const semi1Pos = matchPositions[semi1.id];
  const semi2Pos = matchPositions[semi2.id];
  const finalsCenterY = (semi1Pos && semi2Pos) ? (semi1Pos.centerY + semi2Pos.centerY) / 2 : (config.paddingTop + config.headerHeight + 120);
  const finalsTopY = finalsCenterY - config.matchHeight / 2;

  matchPositions[finalsMatch.id] = {
    matchId: finalsMatch.id,
    x: centerX,
    y: finalsTopY,
    width: config.matchWidth,
    height: config.matchHeight,
    centerY: finalsCenterY,
    centerX: centerX + config.matchWidth / 2,
  };

  // Position Champion Plaque directly below Finals match
  const championPosition = {
    x: centerX + (config.matchWidth - config.championWidth) / 2,
    y: finalsTopY + config.matchHeight + 24,
    width: config.championWidth,
    height: config.championHeight,
    centerY: finalsTopY + config.matchHeight + 24 + config.championHeight / 2,
  };

  // Generate Connector Paths
  // 1. Left Wing Connectors (Feeder Right -> Child Left)
  for (let rIdx = 0; rIdx < wingRoundCount; rIdx++) {
    const round = rounds[rIdx];
    round.matches.filter(m => leftMatchIds.has(m.id)).forEach((childMatch) => {
      const childPos = matchPositions[childMatch.id];
      if (!childPos) return;

      const f1 = childMatch.player1.sourceMatchId ? matchPositions[childMatch.player1.sourceMatchId] : undefined;
      const f2 = childMatch.player2.sourceMatchId ? matchPositions[childMatch.player2.sourceMatchId] : undefined;
      const childInX = childPos.x;
      const childInY = childPos.centerY;

      if (f1 && f2) {
        const f1OutX = f1.x + f1.width;
        const f1OutY = f1.centerY;
        const f2OutX = f2.x + f2.width;
        const f2OutY = f2.centerY;
        const midX = Math.round(Math.max(f1OutX, f2OutX) + (childInX - Math.max(f1OutX, f2OutX)) / 2);
        paths.push({
          id: `path-${childMatch.id}`,
          d: `M ${f1OutX} ${f1OutY} H ${midX} V ${f2OutY} H ${f2OutX} M ${midX} ${childInY} H ${childInX}`,
          sourceMatchIds: [f1.matchId, f2.matchId],
          targetMatchId: childMatch.id,
        });
      }
    });
  }

  // 2. Right Wing Connectors (Feeder Left -> Child Right)
  for (let rIdx = 0; rIdx < wingRoundCount; rIdx++) {
    const round = rounds[rIdx];
    round.matches.filter(m => rightMatchIds.has(m.id)).forEach((childMatch) => {
      const childPos = matchPositions[childMatch.id];
      if (!childPos) return;

      const f1 = childMatch.player1.sourceMatchId ? matchPositions[childMatch.player1.sourceMatchId] : undefined;
      const f2 = childMatch.player2.sourceMatchId ? matchPositions[childMatch.player2.sourceMatchId] : undefined;
      const childInX = childPos.x + childPos.width; // Enters on right edge
      const childInY = childPos.centerY;

      if (f1 && f2) {
        const f1OutX = f1.x; // Exits left edge
        const f1OutY = f1.centerY;
        const f2OutX = f2.x; // Exits left edge
        const f2OutY = f2.centerY;
        const minOutX = Math.min(f1OutX, f2OutX);
        const midX = Math.round(minOutX - (minOutX - childInX) / 2);
        paths.push({
          id: `path-${childMatch.id}`,
          d: `M ${f1OutX} ${f1OutY} H ${midX} V ${f2OutY} H ${f2OutX} M ${midX} ${childInY} H ${childInX}`,
          sourceMatchIds: [f1.matchId, f2.matchId],
          targetMatchId: childMatch.id,
        });
      }
    });
  }

  // 3. Connectors into Center Finals:
  // Semi 1 (Left Wing) stems into Finals Left Edge
  if (semi1Pos) {
    paths.push({
      id: `path-finals-semi1`,
      d: `M ${semi1Pos.x + semi1Pos.width} ${semi1Pos.centerY} H ${centerX}`,
      sourceMatchIds: [semi1Pos.matchId],
      targetMatchId: finalsMatch.id,
    });
  }

  // Semi 2 (Right Wing) stems into Finals Right Edge
  if (semi2Pos) {
    paths.push({
      id: `path-finals-semi2`,
      d: `M ${semi2Pos.x} ${semi2Pos.centerY} H ${centerX + config.matchWidth}`,
      sourceMatchIds: [semi2Pos.matchId],
      targetMatchId: finalsMatch.id,
    });
  }

  // Champion Path: Finals bottom center stem to Champion plaque top
  const championPath = {
    d: `M ${centerX + config.matchWidth / 2} ${finalsTopY + config.matchHeight} V ${championPosition.y}`,
    finalsMatchId: finalsMatch.id,
  };

  const allCardBottoms = Object.values(matchPositions).map(p => p.y + p.height);
  allCardBottoms.push(championPosition.y + championPosition.height);
  const maxBottom = Math.max(...allCardBottoms, config.paddingTop + config.headerHeight + 200);

  const totalHeight = maxBottom + config.paddingBottom;
  const totalWidth = rightStartX + wingRoundCount * (config.matchWidth + config.roundGap) + config.paddingRight;

  return {
    totalWidth,
    totalHeight,
    matchPositions,
    roundHeaders,
    paths,
    championPosition,
    championPath,
    viewMode: 'split',
  };
}

/**
 * Strategy C: Stage-Gated Focus Windowing (Top 8 / Active Stage Focus)
 * Collapses early rounds into compact feeder badges while highlighting active rounds.
 */
export function calculateFocusBracketLayout(
  bracket: BracketStructure,
  customConfig?: Partial<LayoutConfig>
): BracketLayoutMetadata {
  const { rounds } = bracket;
  if (!rounds || rounds.length < 3) {
    return calculateBracketLayout(bracket, customConfig, 'standard');
  }

  // If >= 4 rounds, collapse early rounds (before the final 3 rounds)
  const focusThresholdRound = Math.max(1, rounds.length - 3);
  const baseConfig: LayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...customConfig };

  const matchPositions: Record<string, MatchPosition> = {};
  const roundHeaders: RoundHeaderPosition[] = [];
  const paths: ConnectorPath[] = [];

  // Compute X coordinates: early rounds use narrower column width (170px)
  let currentX = baseConfig.paddingLeft;
  const roundXPositions: number[] = [];
  const roundWidths: number[] = [];

  rounds.forEach((round, rIdx) => {
    const isEarlyFeeder = rIdx < focusThresholdRound;
    const colWidth = isEarlyFeeder ? 180 : baseConfig.matchWidth;
    roundXPositions.push(currentX);
    roundWidths.push(colWidth);

    roundHeaders.push({
      roundNumber: round.roundNumber,
      name: isEarlyFeeder ? `${round.name} (Prelims)` : round.name,
      x: currentX,
      y: baseConfig.paddingTop,
      width: colWidth,
    });

    currentX += colWidth + baseConfig.roundGap;
  });

  // Anchor round: the first focus round (e.g. Quarterfinals)
  const anchorRoundIdx = focusThresholdRound;
  const anchorRound = rounds[anchorRoundIdx];
  const anchorX = roundXPositions[anchorRoundIdx];

  anchorRound.matches.forEach((match, mIdx) => {
    const topY = baseConfig.paddingTop + baseConfig.headerHeight + mIdx * baseConfig.baseRowHeight;
    const centerY = topY + baseConfig.matchHeight / 2;

    matchPositions[match.id] = {
      matchId: match.id,
      x: anchorX,
      y: topY,
      width: baseConfig.matchWidth,
      height: baseConfig.matchHeight,
      centerY,
      centerX: anchorX + baseConfig.matchWidth / 2,
      isCompactFeeder: false,
    };
  });

  // Advance forwards towards Finals
  for (let rIdx = anchorRoundIdx + 1; rIdx < rounds.length; rIdx++) {
    const round = rounds[rIdx];
    const roundX = roundXPositions[rIdx];

    round.matches.forEach((match, mIdx) => {
      const f1 = match.player1.sourceMatchId ? matchPositions[match.player1.sourceMatchId] : undefined;
      const f2 = match.player2.sourceMatchId ? matchPositions[match.player2.sourceMatchId] : undefined;
      let idealCenterY: number;
      if (f1 && f2) idealCenterY = (f1.centerY + f2.centerY) / 2;
      else if (f1) idealCenterY = f1.centerY;
      else if (f2) idealCenterY = f2.centerY;
      else idealCenterY = baseConfig.paddingTop + baseConfig.headerHeight + mIdx * baseConfig.baseRowHeight * 2;

      if (mIdx > 0) {
        const prevPos = matchPositions[round.matches[mIdx - 1].id];
        if (prevPos && idealCenterY < prevPos.centerY + baseConfig.matchHeight + 12) {
          idealCenterY = prevPos.centerY + baseConfig.matchHeight + 12;
        }
      }

      const topY = idealCenterY - baseConfig.matchHeight / 2;
      matchPositions[match.id] = {
        matchId: match.id,
        x: roundX,
        y: topY,
        width: baseConfig.matchWidth,
        height: baseConfig.matchHeight,
        centerY: idealCenterY,
        centerX: roundX + baseConfig.matchWidth / 2,
        isCompactFeeder: false,
      };
    });
  }

  // Work backwards into early feeder rounds (compact feeder cards)
  for (let rIdx = anchorRoundIdx - 1; rIdx >= 0; rIdx--) {
    const round = rounds[rIdx];
    const roundX = roundXPositions[rIdx];
    const cardWidth = roundWidths[rIdx];
    const cardHeight = 44; // Compact feeder height

    round.matches.forEach((match, mIdx) => {
      let idealCenterY: number;
      const downstreamRound = rounds[rIdx + 1];
      let targetPos: MatchPosition | undefined;
      let targetSlot = 1;

      if (downstreamRound) {
        for (const dsMatch of downstreamRound.matches) {
          if (dsMatch.player1.sourceMatchId === match.id) {
            targetPos = matchPositions[dsMatch.id];
            targetSlot = 1;
            break;
          }
          if (dsMatch.player2.sourceMatchId === match.id) {
            targetPos = matchPositions[dsMatch.id];
            targetSlot = 2;
            break;
          }
        }
      }

      if (targetPos) {
        idealCenterY = targetSlot === 1
          ? targetPos.y + targetPos.height * 0.25
          : targetPos.y + targetPos.height * 0.75;
      } else {
        idealCenterY = baseConfig.paddingTop + baseConfig.headerHeight + mIdx * 52;
      }

      if (mIdx > 0) {
        const prevPos = matchPositions[round.matches[mIdx - 1].id];
        if (prevPos && idealCenterY < prevPos.centerY + cardHeight + 8) {
          idealCenterY = prevPos.centerY + cardHeight + 8;
        }
      }

      const topY = idealCenterY - cardHeight / 2;
      matchPositions[match.id] = {
        matchId: match.id,
        x: roundX,
        y: topY,
        width: cardWidth,
        height: cardHeight,
        centerY: idealCenterY,
        centerX: roundX + cardWidth / 2,
        isCompactFeeder: true,
      };
    });
  }

  // Finals and Champion
  const finalsRound = rounds[rounds.length - 1];
  const finalsMatch = finalsRound?.matches[0];
  const finalsPos = finalsMatch ? matchPositions[finalsMatch.id] : undefined;
  const lastRoundX = roundXPositions[rounds.length - 1];
  const championX = lastRoundX + baseConfig.matchWidth + baseConfig.roundGap;

  let allYs = Object.values(matchPositions).map(p => p.centerY);
  if (allYs.length === 0) allYs = [baseConfig.paddingTop + baseConfig.headerHeight];
  const championCenterY = finalsPos ? finalsPos.centerY : (Math.min(...allYs) + Math.max(...allYs)) / 2;
  const championTopY = championCenterY - baseConfig.championHeight / 2;

  const championPosition = {
    x: championX,
    y: championTopY,
    width: baseConfig.championWidth,
    height: baseConfig.championHeight,
    centerY: championCenterY,
  };

  // Connectors
  for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
    const round = rounds[rIdx];
    round.matches.forEach((childMatch) => {
      const childPos = matchPositions[childMatch.id];
      if (!childPos) return;

      const f1 = childMatch.player1.sourceMatchId ? matchPositions[childMatch.player1.sourceMatchId] : undefined;
      const f2 = childMatch.player2.sourceMatchId ? matchPositions[childMatch.player2.sourceMatchId] : undefined;
      const childInX = childPos.x;
      const childInY = childPos.centerY;

      if (f1 && f2) {
        const f1OutX = f1.x + f1.width;
        const f1OutY = f1.centerY;
        const f2OutX = f2.x + f2.width;
        const f2OutY = f2.centerY;
        const maxOutX = Math.max(f1OutX, f2OutX);
        const midX = Math.round(maxOutX + (childInX - maxOutX) / 2);

        paths.push({
          id: `path-${childMatch.id}`,
          d: `M ${f1OutX} ${f1OutY} H ${midX} V ${f2OutY} H ${f2OutX} M ${midX} ${childInY} H ${childInX}`,
          sourceMatchIds: [f1.matchId, f2.matchId],
          targetMatchId: childMatch.id,
        });
      } else if (f1) {
        paths.push({
          id: `path-${childMatch.id}-single`,
          d: `M ${f1.x + f1.width} ${f1.centerY} H ${childInX}`,
          sourceMatchIds: [f1.matchId],
          targetMatchId: childMatch.id,
        });
      }
    });
  }

  let championPath: { d: string; finalsMatchId: string } | undefined;
  if (finalsPos) {
    championPath = {
      d: `M ${finalsPos.x + finalsPos.width} ${finalsPos.centerY} H ${championPosition.x}`,
      finalsMatchId: finalsMatch.id,
    };
  }

  const allCardBottoms = Object.values(matchPositions).map(p => p.y + p.height);
  allCardBottoms.push(championPosition.y + championPosition.height);
  const maxBottom = Math.max(...allCardBottoms, baseConfig.paddingTop + baseConfig.headerHeight + 200);

  return {
    totalWidth: championX + baseConfig.championWidth + baseConfig.paddingRight,
    totalHeight: maxBottom + baseConfig.paddingBottom,
    matchPositions,
    roundHeaders,
    paths,
    championPosition,
    championPath,
    viewMode: 'focus',
  };
}
