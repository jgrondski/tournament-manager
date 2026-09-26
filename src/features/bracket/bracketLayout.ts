import { BracketStructure, BracketMatch, BracketRound } from './types';

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
  baseRowHeight: 112, // 80px card + 32px gap (refined vertical breathing room between matches)
  roundGap: 56, // Compact horizontal spacing for broadcast/OBS
  headerHeight: 66, // 34px badge + 32px gap to ensure distance between round headers and top matches matches inter-match distance
  paddingTop: 8, // Top boundary padding
  paddingLeft: 20,
  paddingRight: 32,
  paddingBottom: 24,
  championWidth: 280,
  championHeight: 76,
};

export type BracketViewMode = 'standard' | 'fit' | 'split';

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
  isFinals?: boolean;
}

export interface ConnectorPath {
  id: string;
  d: string;
  sourceMatchIds: string[];
  targetMatchId: string;
  targetSlot?: 1 | 2;
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
  stageHeaders?: Array<{
    id: string;
    title: string;
    x: number;
    y: number;
    width: number;
  }>;
}

/**
 * Main Layout Calculator supporting standard, fit, and split bilateral modes.
 */
export function calculateBracketLayout(
  bracket: BracketStructure,
  customConfig?: Partial<LayoutConfig>,
  viewMode: BracketViewMode = 'standard'
): BracketLayoutMetadata {
  if (bracket.eliminationType === 'DOUBLE') {
    return calculateDoubleEliminationBracketLayout(bracket, customConfig, viewMode);
  }

  if (viewMode === 'split') {
    return calculateSplitBracketLayout(bracket, customConfig);
  }

  const config: LayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...customConfig };
  if (customConfig?.headerHeight === undefined) {
    const interMatchGap = config.baseRowHeight - config.matchHeight;
    config.headerHeight = 34 + interMatchGap;
  }
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

  // Step 5: Position Finals Header and Compute Champion Plaque Position
  const finalsRound = rounds[rounds.length - 1];
  const finalsMatch = finalsRound?.matches[0];
  const finalsPos = finalsMatch ? matchPositions[finalsMatch.id] : undefined;

  // Position Finals round header about one match height above the finals match
  if (finalsPos && roundHeaders.length > 0) {
    const finalsHeader = roundHeaders[roundHeaders.length - 1];
    if (finalsHeader) {
      finalsHeader.y = Math.max(config.paddingTop, finalsPos.y - config.baseRowHeight);
      finalsHeader.isFinals = true;
    }
  }

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

        paths.push({
          id: `path-${childMatch.id}-p1`,
          d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f1.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 1,
        });

        paths.push({
          id: `path-${childMatch.id}-p2`,
          d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f2.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 2,
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
            targetSlot: 1,
          });
        } else {
          const midX = Math.round(f1OutX + (childInX - f1OutX) / 2);
          const d = `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY} H ${childInX}`;
          paths.push({
            id: `path-${childMatch.id}-single-p1`,
            d,
            sourceMatchIds: [f1.matchId],
            targetMatchId: childMatch.id,
            targetSlot: 1,
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
            targetSlot: 2,
          });
        } else {
          const midX = Math.round(f2OutX + (childInX - f2OutX) / 2);
          const d = `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY} H ${childInX}`;
          paths.push({
            id: `path-${childMatch.id}-single-p2`,
            d,
            sourceMatchIds: [f2.matchId],
            targetMatchId: childMatch.id,
            targetSlot: 2,
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
  if (customConfig?.headerHeight === undefined) {
    const interMatchGap = config.baseRowHeight - config.matchHeight;
    config.headerHeight = 34 + interMatchGap;
  }
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
    for (let mIdx = 0; mIdx < round.matches.length; mIdx++) {
      const m = round.matches[mIdx];
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
          if (mIdx < round.matches.length / 2) {
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

  // Position Left Wing prelims before anchor
  for (let rIdx = leftAnchorIdx - 1; rIdx >= 0; rIdx--) {
    const round = rounds[rIdx];
    const roundX = leftStartX + rIdx * (config.matchWidth + config.roundGap);
    const roundMatches = round.matches.filter(m => leftMatchIds.has(m.id));

    roundMatches.forEach((match, mIdx) => {
      let idealCenterY: number;
      let targetPos: MatchPosition | undefined;

      const downstreamRound = rounds[rIdx + 1];
      if (downstreamRound) {
        for (const dsMatch of downstreamRound.matches) {
          if (dsMatch.player1.sourceMatchId === match.id || dsMatch.player2.sourceMatchId === match.id) {
            targetPos = matchPositions[dsMatch.id];
            break;
          }
        }
      }

      if (targetPos) {
        idealCenterY = targetPos.centerY;
      } else {
        idealCenterY = config.paddingTop + config.headerHeight + mIdx * config.baseRowHeight;
      }

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

  // Position Right Wing prelims before anchor
  for (let rIdx = leftAnchorIdx - 1; rIdx >= 0; rIdx--) {
    const round = rounds[rIdx];
    const colIdx = wingRoundCount - 1 - rIdx;
    const roundX = rightStartX + colIdx * (config.matchWidth + config.roundGap);
    const roundMatches = round.matches.filter(m => rightMatchIds.has(m.id));

    roundMatches.forEach((match, mIdx) => {
      let idealCenterY: number;
      let targetPos: MatchPosition | undefined;

      const downstreamRound = rounds[rIdx + 1];
      if (downstreamRound) {
        for (const dsMatch of downstreamRound.matches) {
          if (dsMatch.player1.sourceMatchId === match.id || dsMatch.player2.sourceMatchId === match.id) {
            targetPos = matchPositions[dsMatch.id];
            break;
          }
        }
      }

      if (targetPos) {
        idealCenterY = targetPos.centerY;
      } else {
        idealCenterY = config.paddingTop + config.headerHeight + mIdx * config.baseRowHeight;
      }

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

  // Position Finals header about one match height above finals match
  const finalsHeader = roundHeaders.find((h) => h.roundNumber === finalsRound.roundNumber);
  if (finalsHeader) {
    finalsHeader.y = Math.max(config.paddingTop, finalsTopY - config.baseRowHeight);
    finalsHeader.isFinals = true;
  }

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
          id: `path-${childMatch.id}-p1`,
          d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f1.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 1,
        });
        paths.push({
          id: `path-${childMatch.id}-p2`,
          d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f2.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 2,
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
            targetSlot: 1,
          });
        } else {
          const midX = Math.round(f1OutX + (childInX - f1OutX) / 2);
          paths.push({
            id: `path-${childMatch.id}-single-p1`,
            d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY} H ${childInX}`,
            sourceMatchIds: [f1.matchId],
            targetMatchId: childMatch.id,
            targetSlot: 1,
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
            targetSlot: 2,
          });
        } else {
          const midX = Math.round(f2OutX + (childInX - f2OutX) / 2);
          paths.push({
            id: `path-${childMatch.id}-single-p2`,
            d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY} H ${childInX}`,
            sourceMatchIds: [f2.matchId],
            targetMatchId: childMatch.id,
            targetSlot: 2,
          });
        }
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
          id: `path-${childMatch.id}-p1`,
          d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f1.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 1,
        });
        paths.push({
          id: `path-${childMatch.id}-p2`,
          d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f2.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 2,
        });
      } else if (f1) {
        const f1OutX = f1.x;
        const f1OutY = f1.centerY;
        if (Math.abs(f1OutY - childInY) < 2) {
          paths.push({
            id: `path-${childMatch.id}-straight-p1`,
            d: `M ${f1OutX} ${f1OutY} H ${childInX}`,
            sourceMatchIds: [f1.matchId],
            targetMatchId: childMatch.id,
            targetSlot: 1,
          });
        } else {
          const midX = Math.round((f1OutX + childInX) / 2);
          paths.push({
            id: `path-${childMatch.id}-single-p1`,
            d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY} H ${childInX}`,
            sourceMatchIds: [f1.matchId],
            targetMatchId: childMatch.id,
            targetSlot: 1,
          });
        }
      } else if (f2) {
        const f2OutX = f2.x;
        const f2OutY = f2.centerY;
        if (Math.abs(f2OutY - childInY) < 2) {
          paths.push({
            id: `path-${childMatch.id}-straight-p2`,
            d: `M ${f2OutX} ${f2OutY} H ${childInX}`,
            sourceMatchIds: [f2.matchId],
            targetMatchId: childMatch.id,
            targetSlot: 2,
          });
        } else {
          const midX = Math.round((f2OutX + childInX) / 2);
          paths.push({
            id: `path-${childMatch.id}-single-p2`,
            d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY} H ${childInX}`,
            sourceMatchIds: [f2.matchId],
            targetMatchId: childMatch.id,
            targetSlot: 2,
          });
        }
      }
    });
  }

  // 3. Connectors into Center Finals:
  // Semi 1 (Left Wing) stems into Finals Left Edge
  if (semi1Pos) {
    const semi1OutX = semi1Pos.x + semi1Pos.width;
    const semi1OutY = semi1Pos.centerY;
    if (Math.abs(semi1OutY - finalsCenterY) < 2) {
      paths.push({
        id: `path-finals-semi1`,
        d: `M ${semi1OutX} ${semi1OutY} H ${centerX}`,
        sourceMatchIds: [semi1Pos.matchId],
        targetMatchId: finalsMatch.id,
      });
    } else {
      const midLeftX = Math.round(semi1OutX + (centerX - semi1OutX) / 2);
      paths.push({
        id: `path-finals-semi1`,
        d: `M ${semi1OutX} ${semi1OutY} H ${midLeftX} V ${finalsCenterY} H ${centerX}`,
        sourceMatchIds: [semi1Pos.matchId],
        targetMatchId: finalsMatch.id,
      });
    }
  }

  // Semi 2 (Right Wing) stems into Finals Right Edge
  if (semi2Pos) {
    const semi2OutX = semi2Pos.x;
    const semi2OutY = semi2Pos.centerY;
    const finalsRightEdge = centerX + config.matchWidth;
    if (Math.abs(semi2OutY - finalsCenterY) < 2) {
      paths.push({
        id: `path-finals-semi2`,
        d: `M ${semi2OutX} ${semi2OutY} H ${finalsRightEdge}`,
        sourceMatchIds: [semi2Pos.matchId],
        targetMatchId: finalsMatch.id,
      });
    } else {
      const midRightX = Math.round(finalsRightEdge + (semi2OutX - finalsRightEdge) / 2);
      paths.push({
        id: `path-finals-semi2`,
        d: `M ${semi2OutX} ${semi2OutY} H ${midRightX} V ${finalsCenterY} H ${finalsRightEdge}`,
        sourceMatchIds: [semi2Pos.matchId],
        targetMatchId: finalsMatch.id,
      });
    }
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
 * Split Wing Double Elimination Layout Engine:
 * - Winners tree positioned on the left wing.
 * - Losers tree positioned on the far right wing (flowing inwards from right to left).
 * - Grand Finals positioned in the center between Winners Finals and Losers Finals.
 * - Reduces vertical height significantly (wide bracket layout).
 */
export function calculateDoubleElimSplitLayout(
  bracket: BracketStructure,
  config: LayoutConfig
): BracketLayoutMetadata {
  const { rounds } = bracket;
  const matchPositions: Record<string, MatchPosition> = {};
  const roundHeaders: RoundHeaderPosition[] = [];
  const stageHeaders: Array<{ id: string; title: string; x: number; y: number; width: number }> = [];
  const paths: ConnectorPath[] = [];

  const winnersRounds = rounds.filter(
    (r) => r.stage === 'WINNERS' || r.roundIdentifier?.startsWith('W')
  );
  const losersRounds = rounds.filter(
    (r) => r.stage === 'LOSERS' || r.roundIdentifier?.startsWith('L')
  );
  const gfRounds = rounds.filter(
    (r) => r.stage === 'GRAND_FINALS' || r.roundIdentifier?.startsWith('GF')
  );

  const colStep = config.matchWidth + config.roundGap;
  const wColCount = winnersRounds.length;
  const lColCount = losersRounds.length;

  const leftStartX = config.paddingLeft;
  const gfX = leftStartX + wColCount * colStep;

  const gfResetMatch =
    Object.values(bracket.matchesById).find(
      (m) => m.stage === 'GRAND_FINALS_RESET' || m.roundIdentifier === 'GF_RESET'
    ) ||
    gfRounds.flatMap((r) => r.matches).find((m) => m.stage === 'GRAND_FINALS_RESET' || m.roundIdentifier === 'GF_RESET');

  const hasGfReset = Boolean(gfResetMatch);
  const gfResetX = hasGfReset ? gfX + colStep : undefined;
  const gfSpanCols = hasGfReset ? 2 : 1;
  const rightStartX = gfX + gfSpanCols * colStep + config.roundGap;

  const stageBadgeHeight = 26;
  const stageBadgeGap = 12;
  const stageBadgeY = config.paddingTop;
  const headerY = stageBadgeY + stageBadgeHeight + stageBadgeGap;
  const matchesStartY = headerY + config.headerHeight;

  // 1. Headers: Left Wing (Winners Bracket)
  if (wColCount > 0) {
    stageHeaders.push({
      id: 'stage-winners',
      title: 'Winners Bracket',
      x: leftStartX,
      y: stageBadgeY,
      width: Math.max(140, wColCount * colStep - config.roundGap),
    });

    winnersRounds.forEach((r, idx) => {
      roundHeaders.push({
        roundNumber: r.roundNumber,
        name: r.name,
        x: leftStartX + idx * colStep,
        y: headerY,
        width: config.matchWidth,
      });
    });
  }

  // 2. Headers: Right Wing (Losers Bracket on the far right)
  if (lColCount > 0) {
    stageHeaders.push({
      id: 'stage-losers',
      title: 'Losers Bracket',
      x: rightStartX,
      y: stageBadgeY,
      width: Math.max(140, lColCount * colStep - config.roundGap),
    });

    losersRounds.forEach((r, idx) => {
      const colIdx = (lColCount - 1) - idx;
      roundHeaders.push({
        roundNumber: r.roundNumber,
        name: r.name,
        x: rightStartX + colIdx * colStep,
        y: headerY,
        width: config.matchWidth,
      });
    });
  }

  // 3. Position Left Wing Matches (Winners Bracket)
  let maxWMatches = 0;
  let wAnchorIdx = 0;
  winnersRounds.forEach((r, idx) => {
    if (r.matches.length > maxWMatches) {
      maxWMatches = r.matches.length;
      wAnchorIdx = idx;
    }
  });

  const wAnchorRound = winnersRounds[wAnchorIdx];
  const wAnchorX = leftStartX + wAnchorIdx * colStep;

  if (wAnchorRound) {
    wAnchorRound.matches.forEach((match, mIdx) => {
      const topY = matchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[match.id] = {
        matchId: match.id,
        x: wAnchorX,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: wAnchorX + config.matchWidth / 2,
      };
    });

    // Advance downstream in Winners (r > wAnchorIdx)
    for (let rIdx = wAnchorIdx + 1; rIdx < winnersRounds.length; rIdx++) {
      const round = winnersRounds[rIdx];
      const roundX = leftStartX + rIdx * colStep;

      round.matches.forEach((match, mIdx) => {
        const f1 = match.player1.sourceMatchId ? matchPositions[match.player1.sourceMatchId] : undefined;
        const f2 = match.player2.sourceMatchId ? matchPositions[match.player2.sourceMatchId] : undefined;

        let idealCenterY: number;
        if (f1 && f2) {
          idealCenterY = (f1.centerY + f2.centerY) / 2;
        } else if (f1) {
          idealCenterY = f1.centerY;
        } else if (f2) {
          idealCenterY = f2.centerY;
        } else {
          idealCenterY = matchesStartY + mIdx * config.baseRowHeight * 2;
        }

        if (mIdx > 0) {
          const prevId = round.matches[mIdx - 1].id;
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

    // Upstream prelims in Winners (r < wAnchorIdx)
    for (let rIdx = wAnchorIdx - 1; rIdx >= 0; rIdx--) {
      const round = winnersRounds[rIdx];
      const roundX = leftStartX + rIdx * colStep;

      round.matches.forEach((match, mIdx) => {
        let idealCenterY: number;
        let targetPos: MatchPosition | undefined;
        let targetSlot = 1;

        if (match.nextMatchId && matchPositions[match.nextMatchId]) {
          targetPos = matchPositions[match.nextMatchId];
          targetSlot = match.nextMatchSlot || 1;
        }

        if (targetPos) {
          idealCenterY = targetSlot === 1 ? targetPos.y + targetPos.height * 0.25 : targetPos.y + targetPos.height * 0.75;
        } else {
          idealCenterY = matchesStartY + mIdx * config.baseRowHeight;
        }

        if (mIdx > 0) {
          const prevId = round.matches[mIdx - 1].id;
          const prevPos = matchPositions[prevId];
          if (prevPos && idealCenterY < prevPos.centerY + config.matchHeight + 10) {
            idealCenterY = prevPos.centerY + config.matchHeight + 10;
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
  }

  // Adjust Winners Finals header Y closer to match
  const wfMatch = winnersRounds[winnersRounds.length - 1]?.matches[0];
  const wfPos = wfMatch ? matchPositions[wfMatch.id] : undefined;
  if (wfPos) {
    const wfHeader = roundHeaders.find(
      (h) => h.roundNumber === winnersRounds[winnersRounds.length - 1]?.roundNumber
    );
    if (wfHeader) {
      wfHeader.y = Math.max(headerY, wfPos.y - config.baseRowHeight);
      wfHeader.isFinals = true;
    }
  }

  // 4. Position Right Wing Matches (Losers Bracket on far right, flowing right-to-left)
  if (lColCount > 0) {
    let maxLMatches = 0;
    let lAnchorIdx = 0;
    losersRounds.forEach((r, idx) => {
      if (r.matches.length > maxLMatches) {
        maxLMatches = r.matches.length;
        lAnchorIdx = idx;
      }
    });

    const lAnchorRound = losersRounds[lAnchorIdx];
    const lAnchorCol = (lColCount - 1) - lAnchorIdx;
    const lAnchorX = rightStartX + lAnchorCol * colStep;

    if (lAnchorRound) {
      lAnchorRound.matches.forEach((match, mIdx) => {
        const topY = matchesStartY + mIdx * config.baseRowHeight;
        const centerY = topY + config.matchHeight / 2;
        matchPositions[match.id] = {
          matchId: match.id,
          x: lAnchorX,
          y: topY,
          width: config.matchWidth,
          height: config.matchHeight,
          centerY,
          centerX: lAnchorX + config.matchWidth / 2,
        };
      });

      // Advance downstream in Losers towards center (r > lAnchorIdx)
      for (let rIdx = lAnchorIdx + 1; rIdx < losersRounds.length; rIdx++) {
        const round = losersRounds[rIdx];
        const colIdx = (lColCount - 1) - rIdx;
        const roundX = rightStartX + colIdx * colStep;

        round.matches.forEach((match, mIdx) => {
          const f1Id = match.player1.sourceMatchId;
          const f2Id = match.player2.sourceMatchId;
          const f1 = f1Id ? matchPositions[f1Id] : undefined;
          const f2 = f2Id ? matchPositions[f2Id] : undefined;
          const f1InLosers = f1 && bracket.matchesById[f1.matchId]?.stage === 'LOSERS';
          const f2InLosers = f2 && bracket.matchesById[f2.matchId]?.stage === 'LOSERS';

          let idealCenterY: number;
          if (f1InLosers && f2InLosers) {
            idealCenterY = (f1.centerY + f2.centerY) / 2;
          } else if (f1InLosers) {
            idealCenterY = f1.centerY;
          } else if (f2InLosers) {
            idealCenterY = f2.centerY;
          } else {
            idealCenterY = matchesStartY + mIdx * config.baseRowHeight * 2;
          }

          if (mIdx > 0) {
            const prevId = round.matches[mIdx - 1].id;
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

      // Upstream in Losers towards far right (r < lAnchorIdx)
      for (let rIdx = lAnchorIdx - 1; rIdx >= 0; rIdx--) {
        const round = losersRounds[rIdx];
        const colIdx = (lColCount - 1) - rIdx;
        const roundX = rightStartX + colIdx * colStep;

        round.matches.forEach((match, mIdx) => {
          let idealCenterY: number;
          let targetPos: MatchPosition | undefined;
          let targetSlot = 1;

          if (match.nextMatchId && matchPositions[match.nextMatchId]) {
            targetPos = matchPositions[match.nextMatchId];
            targetSlot = match.nextMatchSlot || 1;
          }

          if (targetPos) {
            idealCenterY = targetSlot === 1 ? targetPos.y + targetPos.height * 0.25 : targetPos.y + targetPos.height * 0.75;
          } else {
            idealCenterY = matchesStartY + mIdx * config.baseRowHeight;
          }

          if (mIdx > 0) {
            const prevId = round.matches[mIdx - 1].id;
            const prevPos = matchPositions[prevId];
            if (prevPos && idealCenterY < prevPos.centerY + config.matchHeight + 10) {
              idealCenterY = prevPos.centerY + config.matchHeight + 10;
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
    }

    // Adjust Losers Finals header Y closer to match
    const lfMatch = losersRounds[lColCount - 1]?.matches[0];
    const lfPos = lfMatch ? matchPositions[lfMatch.id] : undefined;
    if (lfPos) {
      const lfHeader = roundHeaders.find(
        (h) => h.roundNumber === losersRounds[lColCount - 1]?.roundNumber
      );
      if (lfHeader) {
        lfHeader.y = Math.max(headerY, lfPos.y - config.baseRowHeight);
        lfHeader.isFinals = true;
      }
    }
  }

  // 5. Position Grand Finals (Center)
  const lfMatch = losersRounds.length > 0 ? losersRounds[lColCount - 1]?.matches[0] : undefined;
  const lfPos = lfMatch ? matchPositions[lfMatch.id] : undefined;

  let gfCenterY: number;
  if (wfPos && lfPos) {
    gfCenterY = Math.round((wfPos.centerY + lfPos.centerY) / 2);
  } else if (wfPos) {
    gfCenterY = wfPos.centerY;
  } else if (lfPos) {
    gfCenterY = lfPos.centerY;
  } else {
    gfCenterY = matchesStartY + config.matchHeight / 2;
  }

  const gfMatchTopY = gfCenterY - config.matchHeight / 2;
  const gfRoundHeaderY = Math.max(headerY, gfMatchTopY - config.baseRowHeight);
  const gfStageBadgeY = Math.max(stageBadgeY, gfRoundHeaderY - stageBadgeHeight - 6);

  stageHeaders.push({
    id: 'stage-gf',
    title: hasGfReset ? 'Grand Finals' : 'Finals',
    x: gfX,
    y: gfStageBadgeY,
    width: hasGfReset ? 2 * colStep - config.roundGap : config.matchWidth,
  });

  const gf1Match =
    gfRounds[0]?.matches.find((m) => m.stage === 'GRAND_FINALS' || m.roundIdentifier === 'GF') ||
    gfRounds[0]?.matches[0] ||
    Object.values(bracket.matchesById).find((m) => m.stage === 'GRAND_FINALS' || m.roundIdentifier === 'GF');

  if (gf1Match) {
    roundHeaders.push({
      roundNumber: gfRounds[0]?.roundNumber || 998,
      name: 'Finals',
      x: gfX,
      y: gfRoundHeaderY,
      width: config.matchWidth,
      isFinals: true,
    });

    matchPositions[gf1Match.id] = {
      matchId: gf1Match.id,
      x: gfX,
      y: gfMatchTopY,
      width: config.matchWidth,
      height: config.matchHeight,
      centerY: gfCenterY,
      centerX: gfX + config.matchWidth / 2,
    };
  }

  if (gfResetMatch && gfResetX) {
    roundHeaders.push({
      roundNumber: (gfRounds[0]?.roundNumber || 998) + 50,
      name: 'Grand Finals',
      x: gfResetX,
      y: gfRoundHeaderY,
      width: config.matchWidth,
      isFinals: true,
    });

    matchPositions[gfResetMatch.id] = {
      matchId: gfResetMatch.id,
      x: gfResetX,
      y: gfMatchTopY,
      width: config.matchWidth,
      height: config.matchHeight,
      centerY: gfCenterY,
      centerX: gfResetX + config.matchWidth / 2,
    };
  }

  // Champion Plaque below Grand Finals
  const championBoxX = hasGfReset
    ? gfX + (2 * config.matchWidth + config.roundGap - config.championWidth) / 2
    : gfX + (config.matchWidth - config.championWidth) / 2;

  const championPosition = {
    x: championBoxX,
    y: gfCenterY + config.matchHeight / 2 + 24,
    width: config.championWidth,
    height: config.championHeight,
    centerY: gfCenterY + config.matchHeight / 2 + 24 + config.championHeight / 2,
  };

  // 6. Connectors
  // a) Winners tree (left-to-right)
  for (let rIdx = 0; rIdx < winnersRounds.length; rIdx++) {
    const round = winnersRounds[rIdx];
    round.matches.forEach((childMatch) => {
      const childPos = matchPositions[childMatch.id];
      if (!childPos) return;

      const f1 = childMatch.player1.sourceMatchId ? matchPositions[childMatch.player1.sourceMatchId] : undefined;
      const f2 = childMatch.player2.sourceMatchId ? matchPositions[childMatch.player2.sourceMatchId] : undefined;
      const f1InW = f1 && bracket.matchesById[f1.matchId]?.stage === 'WINNERS';
      const f2InW = f2 && bracket.matchesById[f2.matchId]?.stage === 'WINNERS';

      const childInX = childPos.x;
      const childInY = childPos.centerY;

      if (f1InW && f2InW) {
        const f1OutX = f1.x + f1.width;
        const f1OutY = f1.centerY;
        const f2OutX = f2.x + f2.width;
        const f2OutY = f2.centerY;
        const maxOutX = Math.max(f1OutX, f2OutX);
        const midX = Math.round(maxOutX + (childInX - maxOutX) / 2);
        paths.push({
          id: `path-${childMatch.id}-p1`,
          d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f1.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 1,
        });
        paths.push({
          id: `path-${childMatch.id}-p2`,
          d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f2.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 2,
        });
      } else if (f1InW) {
        const f1OutX = f1.x + f1.width;
        const f1OutY = f1.centerY;
        const midX = Math.round(f1OutX + (childInX - f1OutX) / 2);
        paths.push({
          id: `path-${childMatch.id}-p1`,
          d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f1.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 1,
        });
      } else if (f2InW) {
        const f2OutX = f2.x + f2.width;
        const f2OutY = f2.centerY;
        const midX = Math.round(f2OutX + (childInX - f2OutX) / 2);
        paths.push({
          id: `path-${childMatch.id}-p2`,
          d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f2.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 2,
        });
      }
    });
  }

  // b) Losers tree (right-to-left, enters child on right edge)
  for (let rIdx = 0; rIdx < losersRounds.length; rIdx++) {
    const round = losersRounds[rIdx];
    round.matches.forEach((childMatch) => {
      const childPos = matchPositions[childMatch.id];
      if (!childPos) return;

      const f1 = childMatch.player1.sourceMatchId ? matchPositions[childMatch.player1.sourceMatchId] : undefined;
      const f2 = childMatch.player2.sourceMatchId ? matchPositions[childMatch.player2.sourceMatchId] : undefined;
      const f1InL = f1 && bracket.matchesById[f1.matchId]?.stage === 'LOSERS';
      const f2InL = f2 && bracket.matchesById[f2.matchId]?.stage === 'LOSERS';

      const childInX = childPos.x + childPos.width;
      const childInY = childPos.centerY;

      if (f1InL && f2InL) {
        const f1OutX = f1.x;
        const f1OutY = f1.centerY;
        const f2OutX = f2.x;
        const f2OutY = f2.centerY;
        const minOutX = Math.min(f1OutX, f2OutX);
        const midX = Math.round(minOutX - (minOutX - childInX) / 2);
        paths.push({
          id: `path-${childMatch.id}-p1`,
          d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f1.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 1,
        });
        paths.push({
          id: `path-${childMatch.id}-p2`,
          d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f2.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 2,
        });
      } else if (f1InL) {
        const f1OutX = f1.x;
        const f1OutY = f1.centerY;
        if (Math.abs(f1OutY - childInY) < 2) {
          paths.push({
            id: `path-${childMatch.id}-p1`,
            d: `M ${f1OutX} ${f1OutY} H ${childInX}`,
            sourceMatchIds: [f1.matchId],
            targetMatchId: childMatch.id,
            targetSlot: 1,
          });
        } else {
          const midX = Math.round((f1OutX + childInX) / 2);
          paths.push({
            id: `path-${childMatch.id}-p1`,
            d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY} H ${childInX}`,
            sourceMatchIds: [f1.matchId],
            targetMatchId: childMatch.id,
            targetSlot: 1,
          });
        }
      } else if (f2InL) {
        const f2OutX = f2.x;
        const f2OutY = f2.centerY;
        if (Math.abs(f2OutY - childInY) < 2) {
          paths.push({
            id: `path-${childMatch.id}-p2`,
            d: `M ${f2OutX} ${f2OutY} H ${childInX}`,
            sourceMatchIds: [f2.matchId],
            targetMatchId: childMatch.id,
            targetSlot: 2,
          });
        } else {
          const midX = Math.round((f2OutX + childInX) / 2);
          paths.push({
            id: `path-${childMatch.id}-p2`,
            d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY} H ${childInX}`,
            sourceMatchIds: [f2.matchId],
            targetMatchId: childMatch.id,
            targetSlot: 2,
          });
        }
      }
    });
  }

  // c) Feeders into Grand Finals Match 1
  if (gf1Match) {
    if (wfPos && lfPos) {
      // Winners Finals from left
      const wfOutX = wfPos.x + wfPos.width;
      const wfOutY = wfPos.centerY;
      const midX_W = Math.round(wfOutX + (gfX - wfOutX) / 2);
      paths.push({
        id: `path-${gf1Match.id}-wf`,
        d: `M ${wfOutX} ${wfOutY} H ${midX_W} V ${gfCenterY} H ${gfX}`,
        sourceMatchIds: [wfPos.matchId],
        targetMatchId: gf1Match.id,
        targetSlot: 1,
      });

      // Losers Finals from right
      const lfOutX = lfPos.x;
      const lfOutY = lfPos.centerY;
      const gfInRightX = gfX + config.matchWidth;
      const midX_L = Math.round(gfInRightX + (lfOutX - gfInRightX) / 2);
      paths.push({
        id: `path-${gf1Match.id}-lf`,
        d: `M ${lfOutX} ${lfOutY} H ${midX_L} V ${gfCenterY} H ${gfInRightX}`,
        sourceMatchIds: [lfPos.matchId],
        targetMatchId: gf1Match.id,
        targetSlot: 2,
      });
    } else if (wfPos) {
      const f1OutX = wfPos.x + wfPos.width;
      const f1OutY = wfPos.centerY;
      const midX = Math.round(f1OutX + (gfX - f1OutX) / 2);
      paths.push({
        id: `path-${gf1Match.id}`,
        d: `M ${f1OutX} ${f1OutY} H ${midX} V ${gfCenterY} H ${gfX}`,
        sourceMatchIds: [wfPos.matchId],
        targetMatchId: gf1Match.id,
        targetSlot: 1,
      });
    }
  }

  // d) Connector into Grand Finals Reset (if active)
  if (gfResetMatch && gf1Match) {
    const gf1Pos = matchPositions[gf1Match.id];
    if (gf1Pos) {
      paths.push({
        id: `path-${gfResetMatch.id}`,
        d: `M ${gf1Pos.x + gf1Pos.width} ${gfCenterY} H ${gfResetX}`,
        sourceMatchIds: [gf1Match.id],
        targetMatchId: gfResetMatch.id,
      });
    }
  }

  // e) Stem connector into Champion Plaque
  const lastFinalsMatch = gfResetMatch || gf1Match;
  let championPath: { d: string; finalsMatchId: string } | undefined;
  if (lastFinalsMatch && matchPositions[lastFinalsMatch.id]) {
    const lastPos = matchPositions[lastFinalsMatch.id];
    championPath = {
      d: `M ${lastPos.centerX} ${lastPos.y + lastPos.height} V ${championPosition.y}`,
      finalsMatchId: lastFinalsMatch.id,
    };
  }

  const allCardBottoms = Object.values(matchPositions).map((p) => p.y + p.height);
  allCardBottoms.push(championPosition.y + championPosition.height);
  const totalHeight = Math.max(...allCardBottoms, config.paddingTop + 400) + config.paddingBottom;
  const totalWidth = rightStartX + lColCount * colStep + config.paddingRight;

  return {
    totalWidth,
    totalHeight,
    matchPositions,
    roundHeaders,
    stageHeaders,
    paths,
    championPosition,
    championPath,
    viewMode: 'split',
  };
}

/**
 * Double Elimination Bracket Layout Engine:
 * - Winners tree positioned on top half.
 * - Losers tree positioned directly below on bottom half separated by stageGap.
 * - Grand Finals match (and optional GF Reset match) centered vertically between Winners Finals and Losers Finals on the right.
 * - Champion Plaque positioned to the right of Grand Finals.
 * - Orthogonal SVG connector lines for intra-stage trees and dual feeders into Grand Finals.
 */
export function calculateDoubleEliminationBracketLayout(
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

  if (bracket.bracketRouting === 'ACCELERATED_HYBRID') {
    return calculateAcceleratedHybridBracketLayout(bracket, config, viewMode);
  }

  if (viewMode === 'split') {
    return calculateDoubleElimSplitLayout(bracket, config);
  }

  // Separate rounds by stage
  const winnersRounds = rounds.filter(
    (r) => r.stage === 'WINNERS' || r.roundIdentifier?.startsWith('W')
  );
  const losersRounds = rounds.filter(
    (r) => r.stage === 'LOSERS' || r.roundIdentifier?.startsWith('L')
  );
  const gfRounds = rounds.filter(
    (r) => r.stage === 'GRAND_FINALS' || r.roundIdentifier?.startsWith('GF')
  );

  const colStep = config.matchWidth + config.roundGap;
  const wColCount = winnersRounds.length;
  const lColCount = losersRounds.length;
  const gfColIdx = Math.max(wColCount, lColCount);
  const gfX = config.paddingLeft + gfColIdx * colStep;

  // Check for dynamic GF Reset match (either in rounds or matchesById)
  const gfResetMatch =
    Object.values(bracket.matchesById).find(
      (m) => m.stage === 'GRAND_FINALS_RESET' || m.roundIdentifier === 'GF_RESET'
    ) ||
    gfRounds.flatMap((r) => r.matches).find((m) => m.stage === 'GRAND_FINALS_RESET' || m.roundIdentifier === 'GF_RESET');

  const hasGfReset = Boolean(gfResetMatch);
  const gfResetX = hasGfReset ? gfX + colStep : undefined;
  const championX = hasGfReset ? gfResetX! + colStep : gfX + colStep;

  const stageBadgeHeight = 26;
  const stageBadgeGap = 12;

  // 1. Position Winners Bracket Matches (Top Half)
  const winnersBadgeY = config.paddingTop;
  const winnersHeaderY = winnersBadgeY + stageBadgeHeight + stageBadgeGap;
  const winnersMatchesStartY = winnersHeaderY + config.headerHeight;

  if (wColCount > 0) {
    stageHeaders.push({
      id: 'stage-winners',
      title: 'Winners Bracket',
      x: config.paddingLeft,
      y: winnersBadgeY,
      width: Math.max(140, wColCount * colStep - config.roundGap),
    });

    winnersRounds.forEach((r, idx) => {
      roundHeaders.push({
        roundNumber: r.roundNumber,
        name: r.name,
        x: config.paddingLeft + idx * colStep,
        y: winnersHeaderY,
        width: config.matchWidth,
      });
    });
  }

  // Anchor round for Winners (max matches)
  let maxWMatches = 0;
  let wAnchorIdx = 0;
  winnersRounds.forEach((r, idx) => {
    if (r.matches.length > maxWMatches) {
      maxWMatches = r.matches.length;
      wAnchorIdx = idx;
    }
  });

  const wAnchorRound = winnersRounds[wAnchorIdx];
  const wAnchorX = config.paddingLeft + wAnchorIdx * colStep;

  if (wAnchorRound) {
    wAnchorRound.matches.forEach((match, mIdx) => {
      const topY = winnersMatchesStartY + mIdx * config.baseRowHeight;
      const centerY = topY + config.matchHeight / 2;
      matchPositions[match.id] = {
        matchId: match.id,
        x: wAnchorX,
        y: topY,
        width: config.matchWidth,
        height: config.matchHeight,
        centerY,
        centerX: wAnchorX + config.matchWidth / 2,
      };
    });

    // Advance downstream in Winners (r > wAnchorIdx)
    for (let rIdx = wAnchorIdx + 1; rIdx < winnersRounds.length; rIdx++) {
      const round = winnersRounds[rIdx];
      const roundX = config.paddingLeft + rIdx * colStep;

      round.matches.forEach((match, mIdx) => {
        const f1 = match.player1.sourceMatchId ? matchPositions[match.player1.sourceMatchId] : undefined;
        const f2 = match.player2.sourceMatchId ? matchPositions[match.player2.sourceMatchId] : undefined;

        let idealCenterY: number;
        if (f1 && f2) {
          idealCenterY = (f1.centerY + f2.centerY) / 2;
        } else if (f1) {
          idealCenterY = f1.centerY;
        } else if (f2) {
          idealCenterY = f2.centerY;
        } else {
          idealCenterY = winnersMatchesStartY + mIdx * config.baseRowHeight * 2;
        }

        if (mIdx > 0) {
          const prevId = round.matches[mIdx - 1].id;
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

    // Upstream prelims in Winners (r < wAnchorIdx)
    for (let rIdx = wAnchorIdx - 1; rIdx >= 0; rIdx--) {
      const round = winnersRounds[rIdx];
      const roundX = config.paddingLeft + rIdx * colStep;

      round.matches.forEach((match, mIdx) => {
        let idealCenterY: number;
        let targetPos: MatchPosition | undefined;
        let targetSlot = 1;

        if (match.nextMatchId && matchPositions[match.nextMatchId]) {
          targetPos = matchPositions[match.nextMatchId];
          targetSlot = match.nextMatchSlot || 1;
        }

        if (targetPos) {
          idealCenterY = targetSlot === 1 ? targetPos.y + targetPos.height * 0.25 : targetPos.y + targetPos.height * 0.75;
        } else {
          idealCenterY = winnersMatchesStartY + mIdx * config.baseRowHeight;
        }

        if (mIdx > 0) {
          const prevId = round.matches[mIdx - 1].id;
          const prevPos = matchPositions[prevId];
          if (prevPos && idealCenterY < prevPos.centerY + config.matchHeight + 10) {
            idealCenterY = prevPos.centerY + config.matchHeight + 10;
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
  }

  // Adjust Winners Finals header Y closer to match
  const wfMatch = winnersRounds[winnersRounds.length - 1]?.matches[0];
  const wfPos = wfMatch ? matchPositions[wfMatch.id] : undefined;
  if (wfPos) {
    const wfHeader = roundHeaders.find(
      (h) => h.roundNumber === winnersRounds[winnersRounds.length - 1]?.roundNumber
    );
    if (wfHeader) {
      wfHeader.y = Math.max(winnersHeaderY, wfPos.y - config.baseRowHeight);
      wfHeader.isFinals = true;
    }
  }

  // Calculate bottom of Winners Bracket
  const winnersBottoms = winnersRounds
    .flatMap((r) => r.matches)
    .map((m) => (matchPositions[m.id] ? matchPositions[m.id].y + matchPositions[m.id].height : 0));
  const winnersMaxY = Math.max(...winnersBottoms, winnersMatchesStartY + config.matchHeight);

  // 2. Position Losers Bracket Matches (Bottom Half)
  let losersMaxY = winnersMaxY;

  if (lColCount > 0) {
    const stageGap = 64;
    const losersBadgeY = winnersMaxY + stageGap;
    const losersHeaderY = losersBadgeY + stageBadgeHeight + stageBadgeGap;
    const losersMatchesStartY = losersHeaderY + config.headerHeight;

    stageHeaders.push({
      id: 'stage-losers',
      title: 'Losers Bracket',
      x: config.paddingLeft,
      y: losersBadgeY,
      width: Math.max(140, lColCount * colStep - config.roundGap),
    });

    losersRounds.forEach((r, idx) => {
      roundHeaders.push({
        roundNumber: r.roundNumber,
        name: r.name,
        x: config.paddingLeft + idx * colStep,
        y: losersHeaderY,
        width: config.matchWidth,
      });
    });

    // Anchor round for Losers
    let maxLMatches = 0;
    let lAnchorIdx = 0;
    losersRounds.forEach((r, idx) => {
      if (r.matches.length > maxLMatches) {
        maxLMatches = r.matches.length;
        lAnchorIdx = idx;
      }
    });

    const lAnchorRound = losersRounds[lAnchorIdx];
    const lAnchorX = config.paddingLeft + lAnchorIdx * colStep;

    if (lAnchorRound) {
      lAnchorRound.matches.forEach((match, mIdx) => {
        const topY = losersMatchesStartY + mIdx * config.baseRowHeight;
        const centerY = topY + config.matchHeight / 2;
        matchPositions[match.id] = {
          matchId: match.id,
          x: lAnchorX,
          y: topY,
          width: config.matchWidth,
          height: config.matchHeight,
          centerY,
          centerX: lAnchorX + config.matchWidth / 2,
        };
      });

      // Advance downstream in Losers (r > lAnchorIdx)
      for (let rIdx = lAnchorIdx + 1; rIdx < losersRounds.length; rIdx++) {
        const round = losersRounds[rIdx];
        const roundX = config.paddingLeft + rIdx * colStep;

        round.matches.forEach((match, mIdx) => {
          const f1Id = match.player1.sourceMatchId;
          const f2Id = match.player2.sourceMatchId;
          const f1 = f1Id ? matchPositions[f1Id] : undefined;
          const f2 = f2Id ? matchPositions[f2Id] : undefined;
          const f1InLosers = f1 && bracket.matchesById[f1.matchId]?.stage === 'LOSERS';
          const f2InLosers = f2 && bracket.matchesById[f2.matchId]?.stage === 'LOSERS';

          let idealCenterY: number;
          if (f1InLosers && f2InLosers) {
            idealCenterY = (f1.centerY + f2.centerY) / 2;
          } else if (f1InLosers) {
            idealCenterY = f1.centerY;
          } else if (f2InLosers) {
            idealCenterY = f2.centerY;
          } else {
            idealCenterY = losersMatchesStartY + mIdx * config.baseRowHeight * 2;
          }

          if (mIdx > 0) {
            const prevId = round.matches[mIdx - 1].id;
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

      // Upstream in Losers (r < lAnchorIdx)
      for (let rIdx = lAnchorIdx - 1; rIdx >= 0; rIdx--) {
        const round = losersRounds[rIdx];
        const roundX = config.paddingLeft + rIdx * colStep;

        round.matches.forEach((match, mIdx) => {
          let idealCenterY: number;
          let targetPos: MatchPosition | undefined;
          let targetSlot = 1;

          if (match.nextMatchId && matchPositions[match.nextMatchId]) {
            targetPos = matchPositions[match.nextMatchId];
            targetSlot = match.nextMatchSlot || 1;
          }

          if (targetPos) {
            idealCenterY = targetSlot === 1 ? targetPos.y + targetPos.height * 0.25 : targetPos.y + targetPos.height * 0.75;
          } else {
            idealCenterY = losersMatchesStartY + mIdx * config.baseRowHeight;
          }

          if (mIdx > 0) {
            const prevId = round.matches[mIdx - 1].id;
            const prevPos = matchPositions[prevId];
            if (prevPos && idealCenterY < prevPos.centerY + config.matchHeight + 10) {
              idealCenterY = prevPos.centerY + config.matchHeight + 10;
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
    }

    const losersBottoms = losersRounds
      .flatMap((r) => r.matches)
      .map((m) => (matchPositions[m.id] ? matchPositions[m.id].y + matchPositions[m.id].height : 0));
    losersMaxY = Math.max(...losersBottoms, losersMatchesStartY + config.matchHeight);

    // Adjust Losers Finals header Y closer to match
    const lfMatch = losersRounds[losersRounds.length - 1]?.matches[0];
    const lfPos = lfMatch ? matchPositions[lfMatch.id] : undefined;
    if (lfPos) {
      const lfHeader = roundHeaders.find(
        (h) => h.roundNumber === losersRounds[losersRounds.length - 1]?.roundNumber
      );
      if (lfHeader) {
        lfHeader.y = Math.max(losersHeaderY, lfPos.y - config.baseRowHeight);
        lfHeader.isFinals = true;
      }
    }
  }

  const lfMatch = losersRounds.length > 0 ? losersRounds[losersRounds.length - 1]?.matches[0] : undefined;
  const lfPos = lfMatch ? matchPositions[lfMatch.id] : undefined;

  // 3. Position Grand Finals (Match 1 and optional Match 2 / Reset)
  let gfCenterY: number;
  if (wfPos && lfPos) {
    gfCenterY = Math.round((wfPos.centerY + lfPos.centerY) / 2);
  } else if (wfPos) {
    gfCenterY = wfPos.centerY;
  } else if (lfPos) {
    gfCenterY = lfPos.centerY;
  } else {
    gfCenterY = winnersMatchesStartY + config.matchHeight / 2;
  }

  const gfMatchTopY = gfCenterY - config.matchHeight / 2;
  const gfRoundHeaderY = Math.max(winnersHeaderY, gfMatchTopY - config.baseRowHeight);
  const gfStageBadgeY = Math.max(winnersBadgeY, gfRoundHeaderY - stageBadgeHeight - 6);

  // Finals Stage & Round Header
  stageHeaders.push({
    id: 'stage-gf',
    title: hasGfReset ? 'Grand Finals' : 'Finals',
    x: gfX,
    y: gfStageBadgeY,
    width: hasGfReset ? 2 * colStep - config.roundGap : config.matchWidth,
  });

  const gf1Match =
    gfRounds[0]?.matches.find((m) => m.stage === 'GRAND_FINALS' || m.roundIdentifier === 'GF') ||
    gfRounds[0]?.matches[0] ||
    Object.values(bracket.matchesById).find((m) => m.stage === 'GRAND_FINALS' || m.roundIdentifier === 'GF');

  if (gf1Match) {
    roundHeaders.push({
      roundNumber: gfRounds[0]?.roundNumber || 998,
      name: 'Finals',
      x: gfX,
      y: gfRoundHeaderY,
      width: config.matchWidth,
      isFinals: true,
    });

    matchPositions[gf1Match.id] = {
      matchId: gf1Match.id,
      x: gfX,
      y: gfMatchTopY,
      width: config.matchWidth,
      height: config.matchHeight,
      centerY: gfCenterY,
      centerX: gfX + config.matchWidth / 2,
    };
  }

  if (gfResetMatch && gfResetX) {
    roundHeaders.push({
      roundNumber: (gfRounds[0]?.roundNumber || 998) + 50,
      name: 'Grand Finals',
      x: gfResetX,
      y: gfRoundHeaderY,
      width: config.matchWidth,
      isFinals: true,
    });

    matchPositions[gfResetMatch.id] = {
      matchId: gfResetMatch.id,
      x: gfResetX,
      y: gfMatchTopY,
      width: config.matchWidth,
      height: config.matchHeight,
      centerY: gfCenterY,
      centerX: gfResetX + config.matchWidth / 2,
    };
  }

  // 4. Champion Plaque Position
  const championPosition = {
    x: championX,
    y: gfCenterY - config.championHeight / 2,
    width: config.championWidth,
    height: config.championHeight,
    centerY: gfCenterY,
  };

  // 5. SVG Connector Paths
  // a) Winners tree connectors
  for (let rIdx = 0; rIdx < winnersRounds.length; rIdx++) {
    const round = winnersRounds[rIdx];
    round.matches.forEach((childMatch) => {
      const childPos = matchPositions[childMatch.id];
      if (!childPos) return;

      const f1 = childMatch.player1.sourceMatchId ? matchPositions[childMatch.player1.sourceMatchId] : undefined;
      const f2 = childMatch.player2.sourceMatchId ? matchPositions[childMatch.player2.sourceMatchId] : undefined;
      const f1InW = f1 && bracket.matchesById[f1.matchId]?.stage === 'WINNERS';
      const f2InW = f2 && bracket.matchesById[f2.matchId]?.stage === 'WINNERS';

      const childInX = childPos.x;
      const childInY = childPos.centerY;

      if (f1InW && f2InW) {
        const f1OutX = f1.x + f1.width;
        const f1OutY = f1.centerY;
        const f2OutX = f2.x + f2.width;
        const f2OutY = f2.centerY;
        const maxOutX = Math.max(f1OutX, f2OutX);
        const midX = Math.round(maxOutX + (childInX - maxOutX) / 2);
        paths.push({
          id: `path-${childMatch.id}-p1`,
          d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f1.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 1,
        });
        paths.push({
          id: `path-${childMatch.id}-p2`,
          d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f2.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 2,
        });
      } else if (f1InW) {
        const f1OutX = f1.x + f1.width;
        const f1OutY = f1.centerY;
        const midX = Math.round(f1OutX + (childInX - f1OutX) / 2);
        paths.push({
          id: `path-${childMatch.id}-p1`,
          d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f1.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 1,
        });
      } else if (f2InW) {
        const f2OutX = f2.x + f2.width;
        const f2OutY = f2.centerY;
        const midX = Math.round(f2OutX + (childInX - f2OutX) / 2);
        paths.push({
          id: `path-${childMatch.id}-p2`,
          d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f2.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 2,
        });
      }
    });
  }

  // b) Losers tree connectors
  for (let rIdx = 0; rIdx < losersRounds.length; rIdx++) {
    const round = losersRounds[rIdx];
    round.matches.forEach((childMatch) => {
      const childPos = matchPositions[childMatch.id];
      if (!childPos) return;

      const f1 = childMatch.player1.sourceMatchId ? matchPositions[childMatch.player1.sourceMatchId] : undefined;
      const f2 = childMatch.player2.sourceMatchId ? matchPositions[childMatch.player2.sourceMatchId] : undefined;
      const f1InL = f1 && bracket.matchesById[f1.matchId]?.stage === 'LOSERS';
      const f2InL = f2 && bracket.matchesById[f2.matchId]?.stage === 'LOSERS';

      const childInX = childPos.x;
      const childInY = childPos.centerY;

      if (f1InL && f2InL) {
        const f1OutX = f1.x + f1.width;
        const f1OutY = f1.centerY;
        const f2OutX = f2.x + f2.width;
        const f2OutY = f2.centerY;
        const maxOutX = Math.max(f1OutX, f2OutX);
        const midX = Math.round(maxOutX + (childInX - maxOutX) / 2);
        paths.push({
          id: `path-${childMatch.id}-p1`,
          d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f1.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 1,
        });
        paths.push({
          id: `path-${childMatch.id}-p2`,
          d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY} H ${childInX}`,
          sourceMatchIds: [f2.matchId],
          targetMatchId: childMatch.id,
          targetSlot: 2,
        });
      } else if (f1InL) {
        const f1OutX = f1.x + f1.width;
        const f1OutY = f1.centerY;
        if (Math.abs(f1OutY - childInY) < 2) {
          paths.push({
            id: `path-${childMatch.id}-p1`,
            d: `M ${f1OutX} ${f1OutY} H ${childInX}`,
            sourceMatchIds: [f1.matchId],
            targetMatchId: childMatch.id,
            targetSlot: 1,
          });
        } else {
          const midX = Math.round(f1OutX + (childInX - f1OutX) / 2);
          paths.push({
            id: `path-${childMatch.id}-p1`,
            d: `M ${f1OutX} ${f1OutY} H ${midX} V ${childInY} H ${childInX}`,
            sourceMatchIds: [f1.matchId],
            targetMatchId: childMatch.id,
            targetSlot: 1,
          });
        }
      } else if (f2InL) {
        const f2OutX = f2.x + f2.width;
        const f2OutY = f2.centerY;
        if (Math.abs(f2OutY - childInY) < 2) {
          paths.push({
            id: `path-${childMatch.id}-p2`,
            d: `M ${f2OutX} ${f2OutY} H ${childInX}`,
            sourceMatchIds: [f2.matchId],
            targetMatchId: childMatch.id,
            targetSlot: 2,
          });
        } else {
          const midX = Math.round(f2OutX + (childInX - f2OutX) / 2);
          paths.push({
            id: `path-${childMatch.id}-p2`,
            d: `M ${f2OutX} ${f2OutY} H ${midX} V ${childInY} H ${childInX}`,
            sourceMatchIds: [f2.matchId],
            targetMatchId: childMatch.id,
            targetSlot: 2,
          });
        }
      }
    });
  }

  // c) Feeders into Grand Finals Match 1
  if (gf1Match) {
    if (wfPos && lfPos) {
      const f1OutX = wfPos.x + wfPos.width;
      const f1OutY = wfPos.centerY;
      const f2OutX = lfPos.x + lfPos.width;
      const f2OutY = lfPos.centerY;
      const maxOutX = Math.max(f1OutX, f2OutX);
      const midX = Math.round(maxOutX + (gfX - maxOutX) / 2);

      paths.push({
        id: `path-${gf1Match.id}-p1`,
        d: `M ${f1OutX} ${f1OutY} H ${midX} V ${gfCenterY} H ${gfX}`,
        sourceMatchIds: [wfPos.matchId],
        targetMatchId: gf1Match.id,
        targetSlot: 1,
      });
      paths.push({
        id: `path-${gf1Match.id}-p2`,
        d: `M ${f2OutX} ${f2OutY} H ${midX} V ${gfCenterY} H ${gfX}`,
        sourceMatchIds: [lfPos.matchId],
        targetMatchId: gf1Match.id,
        targetSlot: 2,
      });
    } else if (wfPos) {
      const f1OutX = wfPos.x + wfPos.width;
      const f1OutY = wfPos.centerY;
      paths.push({
        id: `path-${gf1Match.id}-wf`,
        d: `M ${f1OutX} ${f1OutY} H ${gfX}`,
        sourceMatchIds: [wfPos.matchId],
        targetMatchId: gf1Match.id,
        targetSlot: 1,
      });
    }
  }

  // d) Connector into Grand Finals Reset (if active)
  if (gfResetMatch && gf1Match) {
    const gf1Pos = matchPositions[gf1Match.id];
    if (gf1Pos) {
      paths.push({
        id: `path-${gfResetMatch.id}`,
        d: `M ${gf1Pos.x + gf1Pos.width} ${gfCenterY} H ${gfResetX}`,
        sourceMatchIds: [gf1Match.id],
        targetMatchId: gfResetMatch.id,
      });
    }
  }

  // e) Connector into Champion Plaque
  const lastFinalsMatch = gfResetMatch || gf1Match;
  let championPath: { d: string; finalsMatchId: string } | undefined;
  if (lastFinalsMatch && matchPositions[lastFinalsMatch.id]) {
    const lastPos = matchPositions[lastFinalsMatch.id];
    championPath = {
      d: `M ${lastPos.x + lastPos.width} ${gfCenterY} H ${championPosition.x}`,
      finalsMatchId: lastFinalsMatch.id,
    };
  }

  const allCardBottoms = Object.values(matchPositions).map((p) => p.y + p.height);
  allCardBottoms.push(championPosition.y + championPosition.height);
  const totalHeight = Math.max(...allCardBottoms, losersMaxY) + config.paddingBottom;
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
      name: 'Round 1',
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

  const preUpperRounds = rounds.filter((r) => r.roundIdentifier?.startsWith('PRE_W'));
  const colStep = config.matchWidth + config.roundGap;
  const col0X = config.paddingLeft;
  const col1X = config.paddingLeft + colStep;

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
    width: Math.max(config.matchWidth, preUpperRounds.length * colStep - config.roundGap),
  });

  // Col 0: Upper R1
  if (preUpperRounds[0]) {
    const r = preUpperRounds[0];
    roundHeaders.push({
      roundNumber: r.roundNumber,
      name: 'Round 1',
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

  // Col 1: Upper R2
  if (preUpperRounds[1]) {
    const r = preUpperRounds[1];
    roundHeaders.push({
      roundNumber: r.roundNumber,
      name: 'Round 2',
      x: col1X,
      y: headerY,
      width: config.matchWidth,
    });

    r.matches.forEach((m, mIdx) => {
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
  const totalWidth = (preUpperRounds.length > 1 ? col1X : col0X) + config.matchWidth + config.paddingRight;

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
      name: `Round ${rIdx + 1}`,
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

  // Horizontal SVG connectors across Rounds 1 -> 2 -> 3 -> 4
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
        const inY = child.y + child.height * 0.25;
        const midX = Math.round(outX + (inX - outX) / 2);
        paths.push({
          id: `lb-path-${r1Match.id}-${r2Match.id}`,
          d: `M ${outX} ${outY} H ${midX} V ${inY} H ${inX}`,
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
        const inY = child.y + child.height * 0.25;
        const midX = Math.round(outX + (inX - outX) / 2);
        paths.push({
          id: `lb-path-${r2Match.id}-${r3Match.id}`,
          d: `M ${outX} ${outY} H ${midX} V ${inY} H ${inX}`,
          sourceMatchIds: [r2Match.id],
          targetMatchId: r3Match.id,
          targetSlot: 1,
        });
      }
    });
  }

  // 3) R3 -> R4 (Slot 2)
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

  const layout = calculateBracketLayout(
    phase2Bracket,
    { paddingLeft: 64, paddingRight: 64, ...customConfig },
    viewMode
  );
  // Suppress duplicate stage header ("FINALS") that renders directly behind "ROUND OF 16"
  layout.stageHeaders = [];

  return layout;
}
