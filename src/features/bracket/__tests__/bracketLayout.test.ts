import { describe, it, expect } from 'vitest';
import { generateTraditionalBracket, generateFlatBracket, generateDoubleEliminationBracket } from '../math';
import { advanceMatchWinner } from '../math/advance';
import { calculateBracketLayout } from '../bracketLayout';

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
    // All round headers should start at paddingTop
    layout.roundHeaders.forEach(h => {
      expect(h.y).toBe(8);
      expect(h.width).toBe(260);
    });

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
      'Grand Finals',
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
    const gfPath = layout.paths.find(p => p.targetMatchId === gfMatch!.id);
    expect(gfPath).toBeDefined();
    expect(gfPath?.sourceMatchIds).toContain(wfMatch!.id);
    expect(gfPath?.sourceMatchIds).toContain(lfMatch!.id);

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

    const gfHeader = layout.roundHeaders.find((h) => h.name === 'Grand Finals')!;
    expect(gfHeader).toBeDefined();

    // Grand Finals header should sit directly above Grand Finals match (within ~50px), NOT at top of canvas (y=70)
    expect(gfPos.y - gfHeader.y).toBeLessThanOrEqual(50);
    expect(gfHeader.y).toBeGreaterThan(200);

    // Winners Finals header should sit directly above Winners Finals match
    const wfMatch = bracket.rounds.find((r) => r.name === 'Winners Finals')!.matches[0];
    const wfPos = layout.matchPositions[wfMatch.id];
    const wfHeader = layout.roundHeaders.find((h) => h.name === 'Winners Finals')!;
    expect(wfPos.y - wfHeader.y).toBeLessThanOrEqual(50);

    // Losers Finals header should sit directly above Losers Finals match
    const lfMatch = bracket.rounds.find((r) => r.name === "Loser's Finals")!.matches[0];
    const lfPos = layout.matchPositions[lfMatch.id];
    const lfHeader = layout.roundHeaders.find((h) => h.name === "Loser's Finals")!;
    expect(lfPos.y - lfHeader.y).toBeLessThanOrEqual(50);
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
    expect(stageTitles).toContain('Grand Finals');
    expect(stageTitles).toContain('Losers Bracket');

    const winnersStage = splitLayout.stageHeaders?.find((s) => s.title === 'Winners Bracket')!;
    const gfStage = splitLayout.stageHeaders?.find((s) => s.title === 'Grand Finals')!;
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
});
