import { describe, it, expect } from 'vitest';
import { generateTraditionalBracket, generateFlatBracket, generateDoubleEliminationBracket } from '../math';
import { advanceMatchWinner } from '../math/advance';
import {
  calculateBracketLayout,
  calculateAcceleratedHybridPhase1Layout,
  calculateAcceleratedHybridPhase2Layout,
  calculateAcceleratedHybridAccelLayout,
  calculateAcceleratedHybridPreMergeLayout,
  calculateAcceleratedHybridPreMergeUpperLayout,
  calculateAcceleratedHybridPreMergeLowerLayout,
  calculateAcceleratedHybridReClimbLayout,
  calculateAcceleratedHybridLowerBracketLayout,
} from '../bracketLayout';

describe('bracketLayout calculation engine', () => {
  it('correctly calculates vertical midpoint tree alignment for a 16-player traditional bracket', () => {
    const players = Array.from({ length: 16 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

    const bracket = generateTraditionalBracket(players, { tierId: 'gold' });
    const layout = calculateBracketLayout(bracket);

    // 4 rounds: Round 1 (8 matches), Round 2 (4 matches), Round 3 (2 matches), Round 4 (1 match)
    expect(layout.roundHeaders).toHaveLength(4);

    const r1Matches = bracket.rounds[0].matches;
    const r2Matches = bracket.rounds[1].matches;
    const r3Matches = bracket.rounds[2].matches;
    const r4Matches = bracket.rounds[3].matches;

    expect(r1Matches).toHaveLength(8);
    expect(r2Matches).toHaveLength(4);
    expect(r3Matches).toHaveLength(2);
    expect(r4Matches).toHaveLength(1);

    // Round 2 alignment: Each round 2 match must sit at the exact arithmetic midpoint of its feeders
    // Match 9 is between Match 1 and Match 2
    const m1Pos = layout.matchPositions[r1Matches[0].id];
    const m2Pos = layout.matchPositions[r1Matches[1].id];
    const m9Pos = layout.matchPositions[r2Matches[0].id];

    expect(m9Pos.centerY).toBeCloseTo((m1Pos.centerY + m2Pos.centerY) / 2);

    // Match 10 is between Match 3 and Match 4
    const m3Pos = layout.matchPositions[r1Matches[2].id];
    const m4Pos = layout.matchPositions[r1Matches[3].id];
    const m10Pos = layout.matchPositions[r2Matches[1].id];

    expect(m10Pos.centerY).toBeCloseTo((m3Pos.centerY + m4Pos.centerY) / 2);

    // Match 11 is between Match 5 and Match 6
    const m5Pos = layout.matchPositions[r1Matches[4].id];
    const m6Pos = layout.matchPositions[r1Matches[5].id];
    const m11Pos = layout.matchPositions[r2Matches[2].id];

    expect(m11Pos.centerY).toBeCloseTo((m5Pos.centerY + m6Pos.centerY) / 2);

    // Match 12 is between Match 7 and Match 8
    const m7Pos = layout.matchPositions[r1Matches[6].id];
    const m8Pos = layout.matchPositions[r1Matches[7].id];
    const m12Pos = layout.matchPositions[r2Matches[3].id];

    expect(m12Pos.centerY).toBeCloseTo((m7Pos.centerY + m8Pos.centerY) / 2);

    // Verify Semifinals alignment
    const m13Pos = layout.matchPositions[r3Matches[0].id];
    const m14Pos = layout.matchPositions[r3Matches[1].id];

    expect(m13Pos.centerY).toBeCloseTo((m9Pos.centerY + m10Pos.centerY) / 2);
    expect(m14Pos.centerY).toBeCloseTo((m11Pos.centerY + m12Pos.centerY) / 2);

    // Verify Finals alignment
    const finalsPos = layout.matchPositions[r4Matches[0].id];
    expect(finalsPos.centerY).toBeCloseTo((m13Pos.centerY + m14Pos.centerY) / 2);

    // Verify Champion Plaque alignment
    expect(layout.championPosition.centerY).toBeCloseTo(finalsPos.centerY);
    expect(layout.championPosition.x).toBeGreaterThan(finalsPos.x);

    // Verify SVG Connector paths
    expect(layout.paths.length).toBeGreaterThan(0);
    // Path for Match 9 connects Match 1 and Match 2
    const pathM9 = layout.paths.find(p => p.targetMatchId === r2Matches[0].id);
    expect(pathM9).toBeDefined();
    expect(pathM9?.d).toContain('M ');
    expect(pathM9?.d).toContain('H ');
    expect(pathM9?.d).toContain('V ');

    // Champion connector path exists
    expect(layout.championPath).toBeDefined();
    expect(layout.championPath?.finalsMatchId).toBe(r4Matches[0].id);
  });

  it('correctly handles flat bracket layouts with step-in rounds', () => {
    const players = Array.from({ length: 9 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

    const bracket = generateFlatBracket(players, 2, { tierId: 'silver' });
    const layout = calculateBracketLayout(bracket);

    expect(layout.totalWidth).toBeGreaterThan(500);
    expect(layout.totalHeight).toBeGreaterThan(200);
    expect(Object.keys(layout.matchPositions).length).toBe(players.length - 1);
  });

  it('maintains compact vertical height and aligns prelim matches with downstream feeders for brackets with byes', () => {
    // 20 players generate Round 0 (4 prelim matches) feeding into Round 1 (8 matches)
    const players = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

    const bracket = generateTraditionalBracket(players, { tierId: 'gold' });
    const layout = calculateBracketLayout(bracket);

    // Anchor round has 8 matches -> total height should be compact (< 1000px), not 1600px+
    expect(layout.totalHeight).toBeLessThan(1000);

    // Prelim matches in Round 0 should be positioned without massive 400px gaps
    const r0Matches = bracket.rounds[0].matches;
    expect(r0Matches.length).toBeGreaterThan(0);
    const r0Pos = r0Matches.map(m => layout.matchPositions[m.id]);
    
    // Check that every prelim match has a valid Y position
    r0Pos.forEach(p => {
      expect(p).toBeDefined();
      expect(p.y).toBeGreaterThanOrEqual(0);
    });

    // Check that matches never overlap
    for (let i = 1; i < r0Pos.length; i++) {
      expect(r0Pos[i].y).toBeGreaterThanOrEqual(r0Pos[i - 1].y + r0Pos[i - 1].height);
    }
  });

  it('calculates auto-fit layout mode with standard positions', () => {
    const players = Array.from({ length: 16 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

    const bracket = generateTraditionalBracket(players, { tierId: 'gold' });
    const layout = calculateBracketLayout(bracket, undefined, 'fit');

    expect(layout.viewMode).toBe('fit');
    expect(layout.totalWidth).toBeGreaterThan(0);
    expect(layout.totalHeight).toBeGreaterThan(0);
    expect(Object.keys(layout.matchPositions)).toHaveLength(15);
  });

  it('calculates bilateral split layout for deep tournaments', () => {
    const players = Array.from({ length: 16 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

    const bracket = generateTraditionalBracket(players, { tierId: 'gold' });
    const layout = calculateBracketLayout(bracket, undefined, 'split');

    expect(layout.viewMode).toBe('split');
    expect(layout.paths.length).toBeGreaterThan(0);
    // Finals should be horizontally centered between left wing and right wing
    const finalsRound = bracket.rounds[bracket.rounds.length - 1];
    const finalsMatch = finalsRound.matches[0];
    const finalsPos = layout.matchPositions[finalsMatch.id];
    expect(finalsPos).toBeDefined();

    // Round 1 matches in left wing should have smaller X than finals
    const leftWingM1 = layout.matchPositions[bracket.rounds[0].matches[0].id];
    expect(leftWingM1.x).toBeLessThan(finalsPos.x);

    // Round 1 matches in right wing should have larger X than finals
    const lastR1Match = bracket.rounds[0].matches[bracket.rounds[0].matches.length - 1];
    const rightWingM = layout.matchPositions[lastR1Match.id];
    expect(rightWingM.x).toBeGreaterThan(finalsPos.x);
  });

  it('correctly calculates layout coordinates for deep 48-player brackets with byes', () => {
    const players = Array.from({ length: 48 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));
    const bracket = generateTraditionalBracket(players, { tierId: 'gold' });
    const layout = calculateBracketLayout(bracket);

    expect(layout.roundHeaders).toHaveLength(6);
    // Non-finals round headers should start at paddingTop
    layout.roundHeaders.slice(0, -1).forEach(h => {
      expect(h.y).toBe(8);
      expect(h.width).toBe(260);
    });
    // Finals round header is positioned about one match height above the finals match
    const finalsHeader = layout.roundHeaders[layout.roundHeaders.length - 1];
    expect(finalsHeader.name).toBe('Finals');
    expect(finalsHeader.isFinals).toBe(true);
    expect(finalsHeader.y).toBeGreaterThan(200);

    // Matches should all start below the round header (paddingTop + headerHeight = 74)
    Object.values(layout.matchPositions).forEach(pos => {
      expect(pos.y).toBeGreaterThanOrEqual(56);
    });

    expect(layout.totalWidth).toBeGreaterThan(1500);
    expect(layout.totalHeight).toBeGreaterThan(1400);
  });

  it('guarantees the gap from round headers to top matches matches the distance between matches', () => {
    const players = Array.from({ length: 16 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));
    const bracket = generateTraditionalBracket(players, { tierId: 'gold' });
    const layout = calculateBracketLayout(bracket);

    const m1 = layout.matchPositions[bracket.rounds[0].matches[0].id];
    const m2 = layout.matchPositions[bracket.rounds[0].matches[1].id];
    const header = layout.roundHeaders[0];

    const interMatchGap = m2.y - (m1.y + m1.height);
    // 34px is standard header badge capsule height
    const headerToMatchGap = m1.y - (header.y + 34);

    expect(headerToMatchGap).toBe(interMatchGap);
    expect(interMatchGap).toBe(32); // 112 baseRowHeight - 80 matchHeight
  });

  it('generates connector lines for single-feeder matches in Split Wings layout (e.g. 48-player tournament)', () => {
    const players = Array.from({ length: 48 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));
    const bracket = generateTraditionalBracket(players, { tierId: 'gold' });
    const layout = calculateBracketLayout(bracket, undefined, 'split');

    expect(layout.viewMode).toBe('split');

    // In a 48-player bracket, Round 2 (rounds[1]) matches have byes/direct seeds for seeds 1-16
    // and single feeders from Round 1 (rounds[0]) matches.
    const r2Matches = bracket.rounds[1].matches;
    expect(r2Matches).toHaveLength(16);

    // Every single Round 2 match MUST have a connector path in layout.paths
    r2Matches.forEach(match => {
      const path = layout.paths.find(p => p.targetMatchId === match.id);
      expect(path).toBeDefined();
      expect(path?.d).toBeDefined();
      expect(path?.d.length).toBeGreaterThan(0);
    });
  });

  it('correctly calculates Double Elimination layout with Winners on top, Losers on bottom, and GF centered on the right', () => {
    const players = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

    const bracket = generateDoubleEliminationBracket(players, { tierId: 'gold' });
    const layout = calculateBracketLayout(bracket);

    expect(layout.stageHeaders).toBeDefined();
    expect(layout.stageHeaders?.map(s => s.title)).toEqual([
      'Winners Bracket',
      'Losers Bracket',
      'Finals',
    ]);

    // Find matches by stage
    const winnersMatches = bracket.rounds
      .filter(r => r.stage === 'WINNERS')
      .flatMap(r => r.matches);
    const losersMatches = bracket.rounds
      .filter(r => r.stage === 'LOSERS')
      .flatMap(r => r.matches);
    const gfMatch = bracket.rounds
      .find(r => r.stage === 'GRAND_FINALS')
      ?.matches[0];

    expect(winnersMatches.length).toBeGreaterThan(0);
    expect(losersMatches.length).toBeGreaterThan(0);
    expect(gfMatch).toBeDefined();

    // Winners matches are on top, Losers matches are on bottom
    const winnersMaxY = Math.max(...winnersMatches.map(m => layout.matchPositions[m.id].y + layout.matchPositions[m.id].height));
    const losersMinY = Math.min(...losersMatches.map(m => layout.matchPositions[m.id].y));

    expect(losersMinY).toBeGreaterThan(winnersMaxY);

    // Grand Finals match is placed to the right of all stage rounds
    const gfPos = layout.matchPositions[gfMatch!.id];
    winnersMatches.forEach(m => {
      expect(gfPos.x).toBeGreaterThan(layout.matchPositions[m.id].x);
    });
    losersMatches.forEach(m => {
      expect(gfPos.x).toBeGreaterThanOrEqual(layout.matchPositions[m.id].x);
    });

    // Grand Finals match is vertically centered between Winners Finals and Losers Finals
    const wfMatch = bracket.rounds.find(r => r.roundIdentifier === 'W3')?.matches[0];
    const lfMatch = bracket.rounds.find(r => r.roundIdentifier === 'L4')?.matches[0];
    const wfPos = layout.matchPositions[wfMatch!.id];
    const lfPos = layout.matchPositions[lfMatch!.id];

    expect(gfPos.centerY).toBeCloseTo((wfPos.centerY + lfPos.centerY) / 2, 0);

    // Champion plaque is positioned to the right of Grand Finals match
    expect(layout.championPosition.x).toBeGreaterThan(gfPos.x);
    expect(layout.championPosition.centerY).toBeCloseTo(gfPos.centerY);

    // Connector paths exist into Grand Finals
    const gfPaths = layout.paths.filter(p => p.targetMatchId === gfMatch!.id);
    expect(gfPaths.length).toBe(2);
    const gfP1Path = gfPaths.find(p => p.targetSlot === 1);
    const gfP2Path = gfPaths.find(p => p.targetSlot === 2);
    expect(gfP1Path?.sourceMatchIds).toContain(wfMatch!.id);
    expect(gfP2Path?.sourceMatchIds).toContain(lfMatch!.id);

    // Champion connector path exists
    expect(layout.championPath).toBeDefined();
    expect(layout.championPath?.finalsMatchId).toBe(gfMatch!.id);
  });

  it('correctly adapts layout when Grand Finals Reset match is instantiated', () => {
    const players = Array.from({ length: 4 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

    let bracket = generateDoubleEliminationBracket(players, { tierId: 'silver' });

    // Simulate WB Champ (p1) and LB Champ (p2) reaching Grand Finals
    const gf1Match = bracket.rounds.find(r => r.stage === 'GRAND_FINALS')!.matches[0];
    gf1Match.player1.player = players[0]; // Seed 1 (WB Champ)
    gf1Match.player2.player = players[1]; // Seed 2 (LB Champ)

    // Initial layout before reset: GF1 feeds directly to Champion
    const initialLayout = calculateBracketLayout(bracket);
    const initialGfPos = initialLayout.matchPositions[gf1Match.id];
    expect(initialLayout.championPosition.x).toBeGreaterThan(initialGfPos.x);

    // LB Champ (p2) wins GF1 -> triggers dynamic GF Reset match (Match 2)
    bracket = advanceMatchWinner(bracket, gf1Match.id, players[1].id);

    const resetLayout = calculateBracketLayout(bracket);
    const resetMatch = Object.values(bracket.matchesById).find(m => m.roundIdentifier === 'GF_RESET');
    expect(resetMatch).toBeDefined();

    // Reset match is placed between GF1 and Champion Plaque
    const gf1Pos = resetLayout.matchPositions[gf1Match.id];
    const resetPos = resetLayout.matchPositions[resetMatch!.id];
    expect(resetPos).toBeDefined();
    expect(resetPos.x).toBeGreaterThan(gf1Pos.x);
    expect(resetLayout.championPosition.x).toBeGreaterThan(resetPos.x);

    // Both GF1 and GF Reset share the same centerY
    expect(resetPos.centerY).toBeCloseTo(gf1Pos.centerY);
    expect(resetLayout.championPosition.centerY).toBeCloseTo(gf1Pos.centerY);

    // Connector path exists from GF1 to GF Reset
    const gfResetPath = resetLayout.paths.find(p => p.targetMatchId === resetMatch!.id);
    expect(gfResetPath).toBeDefined();
    expect(gfResetPath?.sourceMatchIds).toContain(gf1Match.id);

    // Champion path connects from GF Reset to Champion
    expect(resetLayout.championPath).toBeDefined();
    expect(resetLayout.championPath?.finalsMatchId).toBe(resetMatch!.id);

    // Round headers: Match 1 is "Finals", Reset Match is "Grand Finals"
    const gf1Header = resetLayout.roundHeaders.find(h => h.name === 'Finals');
    const resetHeader = resetLayout.roundHeaders.find(h => h.name === 'Grand Finals');
    expect(gf1Header).toBeDefined();
    expect(gf1Header?.x).toBe(gf1Pos.x);
    expect(resetHeader).toBeDefined();
    expect(resetHeader?.x).toBe(resetPos.x);
    expect(resetHeader?.isFinals).toBe(true);
  });

  it('correctly calculates Accelerated Hybrid layout for 48-player tournament', () => {
    const players = Array.from({ length: 48 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

    const bracket = generateDoubleEliminationBracket(players, {
      tierId: 'gold',
      bracketRouting: 'ACCELERATED_HYBRID',
      finalsCutoff: 16,
    });

    const layout = calculateBracketLayout(bracket);

    // Verify stage headers
    expect(layout.stageHeaders).toBeDefined();
    const stageTitles = layout.stageHeaders?.map(s => s.title);
    expect(stageTitles).toContain('Accelerated Round');
    expect(stageTitles).toContain('Pre-Merge Upper');
    expect(stageTitles).toContain('Pre-Merge Lower & 2nd Chance');
    expect(stageTitles).toContain('Play-Offs');
    expect(stageTitles).toContain('Championship Tree');

    // All 79 matches have valid layout positions
    const matchIds = Object.keys(bracket.matchesById);
    expect(matchIds.length).toBe(79);
    matchIds.forEach(id => {
      const pos = layout.matchPositions[id];
      expect(pos).toBeDefined();
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.width).toBeGreaterThan(0);
      expect(pos.height).toBeGreaterThan(0);
    });

    // Champion plaque is positioned to the right of Championship Finals
    const finalsMatch = bracket.rounds.find(r => r.roundIdentifier === 'CHAMP_R4')!.matches[0];
    const finalsPos = layout.matchPositions[finalsMatch.id];
    expect(layout.championPosition.x).toBeGreaterThan(finalsPos.x);
    expect(layout.championPath).toBeDefined();
    expect(layout.championPath?.finalsMatchId).toBe(finalsMatch.id);

    // Connector paths exist and connect feeders forward (source.x < target.x)
    expect(layout.paths.length).toBeGreaterThan(0);
    layout.paths.forEach(p => {
      const targetPos = layout.matchPositions[p.targetMatchId];
      expect(targetPos).toBeDefined();
      p.sourceMatchIds.forEach(srcId => {
        const srcPos = layout.matchPositions[srcId];
        expect(srcPos).toBeDefined();
        expect(srcPos.x).toBeLessThan(targetPos.x);
      });
    });
  });

  it('positions Grand Finals and finals labels closer to where matches actually occur in standard double elim', () => {
    const players = Array.from({ length: 16 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

    const bracket = generateDoubleEliminationBracket(players, {
      tierId: 'gold',
      bracketRouting: 'TRADITIONAL_TREE',
    });

    const layout = calculateBracketLayout(bracket, {}, 'standard');

    // Find Grand Finals match and header
    const gfRound = bracket.rounds.find((r) => r.stage === 'GRAND_FINALS')!;
    expect(gfRound).toBeDefined();
    const gfMatch = gfRound.matches[0];
    const gfPos = layout.matchPositions[gfMatch.id];
    expect(gfPos).toBeDefined();

    const gfHeader = layout.roundHeaders.find((h) => h.name === 'Finals')!;
    expect(gfHeader).toBeDefined();

    // Finals header should sit about one match height above Finals match (112px = 80px card + 32px gap), NOT at top of canvas
    expect(gfPos.y - gfHeader.y).toBe(112);
    expect(gfHeader.y).toBeGreaterThan(200);
    expect(gfHeader.isFinals).toBe(true);

    // Winners Finals header should sit about one match height above Winners Finals match
    const wfMatch = bracket.rounds.find((r) => r.name === 'Winners Finals')!.matches[0];
    const wfPos = layout.matchPositions[wfMatch.id];
    const wfHeader = layout.roundHeaders.find((h) => h.name === 'Winners Finals')!;
    expect(wfPos.y - wfHeader.y).toBe(112);
    expect(wfHeader.isFinals).toBe(true);

    // Losers Finals header should sit about one match height above Losers Finals match
    const lfMatch = bracket.rounds.find((r) => r.name === "Loser's Finals")!.matches[0];
    const lfPos = layout.matchPositions[lfMatch.id];
    const lfHeader = layout.roundHeaders.find((h) => h.name === "Loser's Finals")!;
    expect(lfPos.y - lfHeader.y).toBe(112);
    expect(lfHeader.isFinals).toBe(true);
  });

  it('calculates split wing layout for traditional double elim placing losers bracket on the far right', () => {
    const players = Array.from({ length: 16 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

    const bracket = generateDoubleEliminationBracket(players, {
      tierId: 'gold',
      bracketRouting: 'TRADITIONAL_TREE',
    });

    const standardLayout = calculateBracketLayout(bracket, {}, 'standard');
    const splitLayout = calculateBracketLayout(bracket, {}, 'split');

    expect(splitLayout.viewMode).toBe('split');

    // In split mode, height is substantially less than in standard stacked mode
    expect(splitLayout.totalHeight).toBeLessThan(standardLayout.totalHeight);
    // In split mode, width is substantially wider than standard mode
    expect(splitLayout.totalWidth).toBeGreaterThan(standardLayout.totalWidth);

    // Grand Finals is located after Winners Bracket
    const gfMatch = bracket.rounds.find((r) => r.stage === 'GRAND_FINALS')!.matches[0];
    const gfPos = splitLayout.matchPositions[gfMatch.id];

    const winnersMatches = bracket.rounds
      .filter((r) => r.stage === 'WINNERS')
      .flatMap((r) => r.matches);
    winnersMatches.forEach((m) => {
      const pos = splitLayout.matchPositions[m.id];
      expect(pos.x).toBeLessThan(gfPos.x);
    });

    // Losers Bracket matches are located on the far right (x > Grand Finals x)
    const losersMatches = bracket.rounds
      .filter((r) => r.stage === 'LOSERS')
      .flatMap((r) => r.matches);
    losersMatches.forEach((m) => {
      const pos = splitLayout.matchPositions[m.id];
      expect(pos.x).toBeGreaterThan(gfPos.x);
    });

    // Stage headers reflect the split structure
    const stageTitles = splitLayout.stageHeaders?.map((s) => s.title);
    expect(stageTitles).toContain('Winners Bracket');
    expect(stageTitles).toContain('Finals');
    expect(stageTitles).toContain('Losers Bracket');

    const winnersStage = splitLayout.stageHeaders?.find((s) => s.title === 'Winners Bracket')!;
    const gfStage = splitLayout.stageHeaders?.find((s) => s.title === 'Finals')!;
    const losersStage = splitLayout.stageHeaders?.find((s) => s.title === 'Losers Bracket')!;
    expect(winnersStage.x).toBeLessThan(gfStage.x);
    expect(gfStage.x).toBeLessThan(losersStage.x);
  });

  it('calculates split wing layout for flat staged double elim placing losers bracket on the far right', () => {
    const players = Array.from({ length: 16 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

    const bracket = generateDoubleEliminationBracket(players, {
      tierId: 'silver',
      bracketRouting: 'FLAT_STAGED',
      flatWidth: 4,
    });

    const splitLayout = calculateBracketLayout(bracket, {}, 'split');
    expect(splitLayout.viewMode).toBe('split');

    const gfMatch = bracket.rounds.find((r) => r.stage === 'GRAND_FINALS')!.matches[0];
    const gfPos = splitLayout.matchPositions[gfMatch.id];

    // Losers Bracket is placed on the far right of Grand Finals
    const losersMatches = bracket.rounds
      .filter((r) => r.stage === 'LOSERS')
      .flatMap((r) => r.matches);
    losersMatches.forEach((m) => {
      const pos = splitLayout.matchPositions[m.id];
      expect(pos.x).toBeGreaterThan(gfPos.x);
    });
  });

  describe('Accelerated Hybrid Staged Visualizations', () => {
    const players48 = Array.from({ length: 48 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

    const hybridBracket = generateDoubleEliminationBracket(players48, {
      tierId: 'gold',
      bracketRouting: 'ACCELERATED_HYBRID',
      finalsCutoff: 16,
    });

    it('calculates Phase 1 Qualification Gauntlet as a two-track conveyor layout with 4 columns', () => {
      const p1Layout = calculateAcceleratedHybridPhase1Layout(hybridBracket);

      // Verify Stage Headers
      const stageTitles = p1Layout.stageHeaders?.map((s) => s.title);
      expect(stageTitles).toContain('Top Track: Upper Path');
      expect(stageTitles).toContain('Bottom Track: Lower / Re-Climb Path');
      expect(stageTitles).toContain('Convergence: Play-Offs');

      // Col 0: AR (Top) & PRE_L1 (Bottom)
      const arMatch = hybridBracket.rounds.find((r) => r.roundIdentifier === 'AR')!.matches[0];
      const preL1Match = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PRE_L1')!.matches[0];
      expect(p1Layout.matchPositions[arMatch.id].x).toBe(p1Layout.matchPositions[preL1Match.id].x);

      // Col 1: PRE_W1 (Top) & PRE_L2 (Bottom)
      const preW1Match = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PRE_W1')!.matches[0];
      const preL2Match = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PRE_L2')!.matches[0];
      expect(p1Layout.matchPositions[preW1Match.id].x).toBe(p1Layout.matchPositions[preL2Match.id].x);
      expect(p1Layout.matchPositions[preW1Match.id].x).toBeGreaterThan(p1Layout.matchPositions[arMatch.id].x);

      // Col 2: PRE_W2 (Top) & 2C (Bottom)
      const preW2Match = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PRE_W2')!.matches[0];
      const scMatch = hybridBracket.rounds.find((r) => r.roundIdentifier === '2C')!.matches[0];
      expect(p1Layout.matchPositions[preW2Match.id].x).toBe(p1Layout.matchPositions[scMatch.id].x);
      expect(p1Layout.matchPositions[preW2Match.id].x).toBeGreaterThan(p1Layout.matchPositions[preW1Match.id].x);

      // Col 3: Play-Offs (Convergence)
      const poMatch = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PO')!.matches[0];
      expect(p1Layout.matchPositions[poMatch.id].x).toBeGreaterThan(p1Layout.matchPositions[preW2Match.id].x);

      // Top track matches are above Bottom track matches
      expect(p1Layout.matchPositions[preL1Match.id].y).toBeGreaterThan(p1Layout.matchPositions[arMatch.id].y);
      expect(p1Layout.matchPositions[preL2Match.id].y).toBeGreaterThan(p1Layout.matchPositions[preW1Match.id].y);
      expect(p1Layout.matchPositions[scMatch.id].y).toBeGreaterThan(p1Layout.matchPositions[preW2Match.id].y);

      // Connector paths strictly connect Phase 1 matches (no paths to CHAMP rounds)
      p1Layout.paths.forEach((p) => {
        const target = hybridBracket.matchesById[p.targetMatchId];
        expect(target).toBeDefined();
        expect(target.phase).toBe('QUALIFIERS');
      });

      // No champion plaque in Phase 1
      expect(p1Layout.championPosition.width).toBe(0);
      expect(p1Layout.championPath).toBeUndefined();
    });

    it('calculates Phase 2 Championship Top 16 single elimination finals cleanly', () => {
      const p2Layout = calculateAcceleratedHybridPhase2Layout(hybridBracket);

      // 4 single-elimination rounds (Round of 16, QF, SF, Finals)
      expect(p2Layout.roundHeaders).toHaveLength(4);
      expect(p2Layout.roundHeaders[0].name).toBe('Round of 16');
      expect(p2Layout.roundHeaders[3].name).toBe('Championship Finals');

      // All matches in Phase 2 have phase === 'CHAMPIONSHIP'
      Object.keys(p2Layout.matchPositions).forEach((mId) => {
        const m = hybridBracket.matchesById[mId];
        expect(m.phase).toBe('CHAMPIONSHIP');
      });

      // Connector paths strictly connect Phase 2 matches
      p2Layout.paths.forEach((p) => {
        const target = hybridBracket.matchesById[p.targetMatchId];
        expect(target).toBeDefined();
        expect(target.phase).toBe('CHAMPIONSHIP');
      });

      // Champion Plaque and path are present for Finals
      expect(p2Layout.championPosition.width).toBeGreaterThan(0);
      expect(p2Layout.championPath).toBeDefined();
      const champFinalsMatch = hybridBracket.rounds.find((r) => r.roundIdentifier === 'CHAMP_R4')!.matches[0];
      expect(p2Layout.championPath?.finalsMatchId).toBe(champFinalsMatch.id);

      // Verify duplicate stage header is suppressed in Championship view
      expect(p2Layout.stageHeaders).toHaveLength(0);
    });

    it('calculates separate Accelerated Round layout with direct qualification matches', () => {
      const accelLayout = calculateAcceleratedHybridAccelLayout(hybridBracket);

      // Verify Stage Header & Round Header
      expect(accelLayout.stageHeaders).toHaveLength(1);
      expect(accelLayout.stageHeaders![0].title).toBe('Accelerated Round');
      expect(accelLayout.roundHeaders).toHaveLength(1);
      expect(accelLayout.roundHeaders[0].name).toBe('Round 1');

      // 8 AR matches (for 16 cutoff)
      const arRound = hybridBracket.rounds.find((r) => r.roundIdentifier === 'AR')!;
      expect(arRound.matches).toHaveLength(8);

      // All AR matches positioned vertically in 1 column
      arRound.matches.forEach((m) => {
        const pos = accelLayout.matchPositions[m.id];
        expect(pos).toBeDefined();
        expect(pos.x).toBe(accelLayout.roundHeaders[0].x);
      });

      // No cross connectors, no champion plaque
      expect(accelLayout.paths).toHaveLength(0);
      expect(accelLayout.championPosition.width).toBe(0);
      expect(accelLayout.championPath).toBeUndefined();
      expect(accelLayout.totalWidth).toBeGreaterThan(0);
      expect(accelLayout.totalHeight).toBeGreaterThan(0);
    });

    it('calculates separate Pre-Merge layout with 4 columns and strict left-to-right connectors', () => {
      const preMergeLayout = calculateAcceleratedHybridPreMergeLayout(hybridBracket);

      // Verify Stage Headers
      const stageTitles = preMergeLayout.stageHeaders?.map((s) => s.title);
      expect(stageTitles).toContain('Pre-Merge Upper (Double Elimination)');
      expect(stageTitles).toContain('Pre-Merge Lower & 2nd Chance');
      expect(stageTitles).toContain('Play-Offs (Top 16 Advancement)');

      // Verify 4 columns:
      // Col 0: PRE_W1 & PRE_L1
      const preW1Match = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PRE_W1')!.matches[0];
      const preL1Match = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PRE_L1')!.matches[0];
      expect(preMergeLayout.matchPositions[preW1Match.id].x).toBe(preMergeLayout.matchPositions[preL1Match.id].x);

      // Col 1: PRE_W2 & PRE_L2
      const preW2Match = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PRE_W2')!.matches[0];
      const preL2Match = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PRE_L2')!.matches[0];
      expect(preMergeLayout.matchPositions[preW2Match.id].x).toBe(preMergeLayout.matchPositions[preL2Match.id].x);
      expect(preMergeLayout.matchPositions[preW2Match.id].x).toBeGreaterThan(preMergeLayout.matchPositions[preW1Match.id].x);

      // Col 2: 2nd Chance Round
      const scMatch = hybridBracket.rounds.find((r) => r.roundIdentifier === '2C')!.matches[0];
      expect(preMergeLayout.matchPositions[scMatch.id].x).toBeGreaterThan(preMergeLayout.matchPositions[preW2Match.id].x);

      // Col 3: Play-Offs
      const poMatch = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PO')!.matches[0];
      expect(preMergeLayout.matchPositions[poMatch.id].x).toBeGreaterThan(preMergeLayout.matchPositions[scMatch.id].x);

      // Accelerated Round matches are NOT in Pre-Merge layout (kept separate)
      const arMatch = hybridBracket.rounds.find((r) => r.roundIdentifier === 'AR')!.matches[0];
      expect(preMergeLayout.matchPositions[arMatch.id]).toBeUndefined();

      // Connector paths strictly connect within Pre-Merge matches
      expect(preMergeLayout.paths.length).toBeGreaterThan(0);
      preMergeLayout.paths.forEach((p) => {
        const target = hybridBracket.matchesById[p.targetMatchId];
        expect(target).toBeDefined();
        expect(target.subTrack).not.toBe('ACCELERATED');
        expect(target.phase).toBe('QUALIFIERS');
      });

      // No champion plaque in Pre-Merge
      expect(preMergeLayout.championPosition.width).toBe(0);
      expect(preMergeLayout.championPath).toBeUndefined();
    });

    it('calculates Pod 2 Upper Bracket layout with 2 columns and intra-panel tree connectors', () => {
      const upperLayout = calculateAcceleratedHybridPreMergeUpperLayout(hybridBracket);

      // Verify Headers
      expect(upperLayout.stageHeaders).toHaveLength(1);
      expect(upperLayout.stageHeaders![0].title).toBe('Upper Bracket');
      expect(upperLayout.roundHeaders).toHaveLength(2);
      expect(upperLayout.roundHeaders[0].name).toBe('Round 1');
      expect(upperLayout.roundHeaders[1].name).toBe('Round 2');

      // Col 0: Upper R1 (16 matches)
      const r1 = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PRE_W1')!;
      expect(r1.matches).toHaveLength(16);
      r1.matches.forEach((m) => {
        const pos = upperLayout.matchPositions[m.id];
        expect(pos).toBeDefined();
        expect(pos.x).toBe(upperLayout.roundHeaders[0].x);
      });

      // Col 1: Upper R2 (8 matches)
      const r2 = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PRE_W2')!;
      expect(r2.matches).toHaveLength(8);
      r2.matches.forEach((m) => {
        const pos = upperLayout.matchPositions[m.id];
        expect(pos).toBeDefined();
        expect(pos.x).toBe(upperLayout.roundHeaders[1].x);
      });

      // Intra-panel SVG connectors strictly connect R1 to R2
      expect(upperLayout.paths.length).toBeGreaterThan(0);
      upperLayout.paths.forEach((p) => {
        const target = hybridBracket.matchesById[p.targetMatchId];
        expect(target).toBeDefined();
        expect(target.subTrack).toBe('PRE_MERGE_UPPER');
      });

      // No champion plaque
      expect(upperLayout.championPosition.width).toBe(0);
      expect(upperLayout.championPath).toBeUndefined();
    });

    it('calculates Pod 3 Pre-Merge Lower layout with 2 columns and intra-panel connectors', () => {
      const lowerLayout = calculateAcceleratedHybridPreMergeLowerLayout(hybridBracket);

      // Verify Headers
      expect(lowerLayout.stageHeaders).toHaveLength(1);
      expect(lowerLayout.stageHeaders![0].title).toBe('Pre-Merge Lower Bracket');
      expect(lowerLayout.roundHeaders).toHaveLength(2);
      expect(lowerLayout.roundHeaders[0].name).toBe('Pre-Merge Lower R1');
      expect(lowerLayout.roundHeaders[1].name).toBe('Pre-Merge Lower R2');

      // Col 0: Lower R1 (8 matches)
      const l1 = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PRE_L1')!;
      expect(l1.matches).toHaveLength(8);
      l1.matches.forEach((m) => {
        const pos = lowerLayout.matchPositions[m.id];
        expect(pos).toBeDefined();
        expect(pos.x).toBe(lowerLayout.roundHeaders[0].x);
      });

      // Col 1: Lower R2 (8 matches)
      const l2 = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PRE_L2')!;
      expect(l2.matches).toHaveLength(8);
      l2.matches.forEach((m) => {
        const pos = lowerLayout.matchPositions[m.id];
        expect(pos).toBeDefined();
        expect(pos.x).toBe(lowerLayout.roundHeaders[1].x);
      });

      // Intra-panel SVG connectors connect L1 to L2 Slot 1
      expect(lowerLayout.paths.length).toBe(8);
      lowerLayout.paths.forEach((p) => {
        const target = hybridBracket.matchesById[p.targetMatchId];
        expect(target).toBeDefined();
        expect(target.subTrack).toBe('PRE_MERGE_LOWER');
      });

      // No champion plaque
      expect(lowerLayout.championPosition.width).toBe(0);
      expect(lowerLayout.championPath).toBeUndefined();
    });

    it('calculates Pod 4 Re-Climb Stage layout with 2 columns (2C and PO) and intra-panel connectors', () => {
      const reClimbLayout = calculateAcceleratedHybridReClimbLayout(hybridBracket);

      // Verify Headers
      expect(reClimbLayout.stageHeaders).toHaveLength(1);
      expect(reClimbLayout.stageHeaders![0].title).toBe('Re-Climb Stage (2nd Chance & Play-Offs)');
      expect(reClimbLayout.roundHeaders).toHaveLength(2);
      expect(reClimbLayout.roundHeaders[0].name).toBe('2nd Chance Round');
      expect(reClimbLayout.roundHeaders[1].name).toBe('Play-Offs');

      // Col 0: 2nd Chance (8 matches)
      const sc = hybridBracket.rounds.find((r) => r.roundIdentifier === '2C')!;
      expect(sc.matches).toHaveLength(8);
      sc.matches.forEach((m) => {
        const pos = reClimbLayout.matchPositions[m.id];
        expect(pos).toBeDefined();
        expect(pos.x).toBe(reClimbLayout.roundHeaders[0].x);
      });

      // Col 1: Play-Offs (8 matches)
      const po = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PO')!;
      expect(po.matches).toHaveLength(8);
      po.matches.forEach((m) => {
        const pos = reClimbLayout.matchPositions[m.id];
        expect(pos).toBeDefined();
        expect(pos.x).toBe(reClimbLayout.roundHeaders[1].x);
      });

      // Intra-panel SVG connectors strictly connect 2C winners to PO Slot 2
      expect(reClimbLayout.paths.length).toBe(8);
      reClimbLayout.paths.forEach((p) => {
        const target = hybridBracket.matchesById[p.targetMatchId];
        expect(target).toBeDefined();
        expect(target.roundIdentifier).toBe('PO');
      });

      // No champion plaque
      expect(reClimbLayout.championPosition.width).toBe(0);
      expect(reClimbLayout.championPath).toBeUndefined();
    });

    it('calculates Pod 3 Lower Bracket layout consolidating R1->R2->R3->R4 with horizontal SVG connectors', () => {
      const lowerLayout = calculateAcceleratedHybridLowerBracketLayout(hybridBracket);

      // Verify Headers
      expect(lowerLayout.stageHeaders).toHaveLength(1);
      expect(lowerLayout.stageHeaders![0].title).toBe('Lower Bracket');
      expect(lowerLayout.roundHeaders).toHaveLength(4);
      expect(lowerLayout.roundHeaders[0].name).toBe('Round 1');
      expect(lowerLayout.roundHeaders[1].name).toBe('Round 2');
      expect(lowerLayout.roundHeaders[2].name).toBe('Round 3');
      expect(lowerLayout.roundHeaders[3].name).toBe('Round 4');

      // Verify all 4 rounds have 8 matches placed in ascending column X coordinates
      const r1Matches = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PRE_L1')!.matches;
      const r2Matches = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PRE_L2')!.matches;
      const r3Matches = hybridBracket.rounds.find((r) => r.roundIdentifier === '2C')!.matches;
      const r4Matches = hybridBracket.rounds.find((r) => r.roundIdentifier === 'PO')!.matches;

      expect(r1Matches).toHaveLength(8);
      expect(r2Matches).toHaveLength(8);
      expect(r3Matches).toHaveLength(8);
      expect(r4Matches).toHaveLength(8);

      // Verify column X separation
      expect(lowerLayout.matchPositions[r2Matches[0].id].x).toBeGreaterThan(lowerLayout.matchPositions[r1Matches[0].id].x);
      expect(lowerLayout.matchPositions[r3Matches[0].id].x).toBeGreaterThan(lowerLayout.matchPositions[r2Matches[0].id].x);
      expect(lowerLayout.matchPositions[r4Matches[0].id].x).toBeGreaterThan(lowerLayout.matchPositions[r3Matches[0].id].x);

      // Verify horizontal SVG connectors across Rounds 1 -> 2 -> 3 -> 4 (8 + 8 + 8 = 24 paths)
      expect(lowerLayout.paths).toHaveLength(24);
      lowerLayout.paths.forEach((p) => {
        expect(p.d).toMatch(/^M \d+ \d+ H \d+ V \d+ H \d+$/);
      });

      // No champion plaque
      expect(lowerLayout.championPosition.width).toBe(0);
      expect(lowerLayout.championPath).toBeUndefined();
    });

    it('positions Championship Finals header about one match height above finals match with isFinals = true', () => {
      const p2Layout = calculateAcceleratedHybridPhase2Layout(hybridBracket);
      const finalsRound = hybridBracket.rounds.find((r) => r.name === 'Championship Finals' || r.roundIdentifier === 'CHAMP_R4')!;
      const finalsMatch = finalsRound.matches[0];
      const finalsPos = p2Layout.matchPositions[finalsMatch.id];
      const finalsHeader = p2Layout.roundHeaders.find((h) => h.name === 'Championship Finals')!;

      expect(finalsHeader).toBeDefined();
      expect(finalsHeader.isFinals).toBe(true);
      expect(finalsPos.y - finalsHeader.y).toBe(112);
    });
  });

  describe('Finals Header Positioning across All Bracket Types', () => {
    it('positions Finals header in single elimination about one match height above finals with isFinals = true', () => {
      const players = Array.from({ length: 16 }, (_, i) => ({
        id: `p${i + 1}`,
        name: `Player ${i + 1}`,
        seed: i + 1,
      }));
      const bracket = generateTraditionalBracket(players, { tierId: 'gold' });
      const layout = calculateBracketLayout(bracket);

      const finalsRound = bracket.rounds[bracket.rounds.length - 1];
      const finalsMatch = finalsRound.matches[0];
      const finalsPos = layout.matchPositions[finalsMatch.id];
      const finalsHeader = layout.roundHeaders[layout.roundHeaders.length - 1];

      expect(finalsHeader.name).toBe('Finals');
      expect(finalsHeader.isFinals).toBe(true);
      expect(finalsPos.y - finalsHeader.y).toBe(112);
      expect(finalsHeader.y).toBeGreaterThan(layout.roundHeaders[0].y);
    });
  });
});

