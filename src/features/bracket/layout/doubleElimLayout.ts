import { BracketStructure } from '../types';
import {
  LayoutConfig,
  DEFAULT_LAYOUT_CONFIG,
  BracketViewMode,
  MatchPosition,
  RoundHeaderPosition,
  ConnectorPath,
  BracketLayoutMetadata,
} from './types';
import { calculateAcceleratedHybridBracketLayout } from './hybridLayout';

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

    // Line up Losers Finals header with the rest of the Loser's headers
    const lfHeader = roundHeaders.find(
      (h) => h.roundNumber === losersRounds[lColCount - 1]?.roundNumber
    );
    if (lfHeader) {
      lfHeader.y = headerY;
      lfHeader.isFinals = true;
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

    // Line up Losers Finals header with the rest of the Loser's headers
    const lfHeader = roundHeaders.find(
      (h) => h.roundNumber === losersRounds[losersRounds.length - 1]?.roundNumber
    );
    if (lfHeader) {
      lfHeader.y = losersHeaderY;
      lfHeader.isFinals = true;
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