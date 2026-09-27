import { TournamentTier, MatchScoreRecord } from '../tournament/types';
import { BracketMatch } from './types';

/**
 * Returns clean abbreviated round names (e.g. R16, QF, SF, F, R1, LR2, WR3, GF, GFR).
 */
export function getAbbreviatedRoundName(name: string, roundIdentifier?: string): string {
  const ident = roundIdentifier?.toUpperCase()?.trim();
  if (ident === 'GFR' || ident === 'GF_RESET') return 'GFR';
  if (ident === 'GF') return 'GF';
  if (ident === 'WF') return 'WF';
  if (ident === 'LF') return 'LF';
  if (ident === 'WSF') return 'WSF';
  if (ident === 'LSF') return 'LSF';
  if (ident === 'WQF') return 'WQF';
  if (ident === 'LQF') return 'LQF';
  if (ident === 'AR') return 'AR';
  if (ident === '2C') return '2C';
  if (ident === 'PO') return 'PO';
  if (ident === 'PRE_W1') return 'WR1';
  if (ident === 'PRE_W2') return 'WR2';
  if (ident === 'PRE_L1') return 'LR1';
  if (ident === 'PRE_L2') return 'LR2';
  if (ident === 'CHAMP_R1') return 'R16';
  if (ident === 'CHAMP_R2') return 'QF';
  if (ident === 'CHAMP_R3') return 'SF';
  if (ident === 'CHAMP_R4') return 'F';
  if (ident && /^W\d+$/i.test(ident)) return `WR${ident.slice(1)}`;
  if (ident && /^L\d+$/i.test(ident)) return `LR${ident.slice(1)}`;
  if (ident && /^R\d+$/i.test(ident)) return ident;

  const raw = (name || '').trim();
  const lower = raw.toLowerCase();

  if (lower.includes('grand finals reset') || lower.includes('grand final reset')) return 'GFR';
  if (lower.includes('grand finals') || lower.includes('grand final')) return 'GF';

  if (lower.includes('winners finals') || lower.includes('winner finals')) return 'WF';
  if (lower.includes('winners semifinals') || lower.includes('winner semifinals') || lower.includes('winners semi-finals') || lower.includes('winners semi finals')) return 'WSF';
  if (lower.includes('winners quarterfinals') || lower.includes('winner quarterfinals') || lower.includes('winners quarter-finals') || lower.includes('winners quarter finals')) return 'WQF';

  if (lower.includes('losers finals') || lower.includes('loser finals')) return 'LF';
  if (lower.includes('losers semifinals') || lower.includes('loser semifinals') || lower.includes('losers semi-finals') || lower.includes('losers semi finals')) return 'LSF';
  if (lower.includes('losers quarterfinals') || lower.includes('loser quarterfinals') || lower.includes('losers quarter-finals') || lower.includes('losers quarter finals')) return 'LQF';

  // Matches "Winners Round 1", "Winners Rd 1", "Upper Bracket R1", "Upper Bracket Round 1", etc.
  const wrMatch = lower.match(/(?:winners|upper bracket|upper)\s+(?:round|rd|r)\s*(\d+)/i);
  if (wrMatch) return `WR${wrMatch[1]}`;

  // Matches "Losers Round 1", "Losers Rd 1", "Lower Bracket R1", "Lower Bracket Round 1", etc.
  const lrMatch = lower.match(/(?:losers|lower bracket|lower)\s+(?:round|rd|r)\s*(\d+)/i);
  if (lrMatch) return `LR${lrMatch[1]}`;

  if (lower.includes('accelerated round') || lower === 'accel round' || lower === 'accel' || lower === 'ar') return 'AR';
  if (lower.includes('second chance') || lower.includes('2nd chance') || lower === '2c') return '2C';
  if (lower.includes('play-off') || lower.includes('playoffs') || lower.includes('playoff') || lower === 'po') return 'PO';

  if (lower === 'championship finals' || lower === 'finals' || lower === 'championship final' || lower === 'final') return 'F';
  if (lower === 'championship semifinals' || lower === 'semifinals' || lower === 'semi-finals' || lower === 'semi finals') return 'SF';
  if (lower === 'championship quarterfinals' || lower === 'quarterfinals' || lower === 'quarter-finals' || lower === 'quarter finals') return 'QF';

  const rofMatch = lower.match(/round of\s*(\d+)/i);
  if (rofMatch) {
    const num = parseInt(rofMatch[1], 10);
    if (num === 2) return 'F';
    if (num === 4) return 'SF';
    if (num === 8) return 'QF';
    return `R${num}`;
  }

  const rMatch = lower.match(/round\s*(\d+)/i);
  if (rMatch) return `R${rMatch[1]}`;

  return raw;
}

// Compute status for any match
export function getMatchStatus(match: BracketMatch, record?: MatchScoreRecord, defaultBestOf: number = 5) {
  const currentBestOf = record?.bestOf || match.bestOf || defaultBestOf;
  const threshold = Math.ceil(currentBestOf / 2);
  const p1Wins = record?.player1Wins || 0;
  const p2Wins = record?.player2Wins || 0;

  const p1Id = match.player1.player?.id;
  const p2Id = match.player2.player?.id;
  const hasWinner = Boolean((p1Id && match.winnerId === p1Id) || (p2Id && match.winnerId === p2Id) || record?.isComplete);

  if (hasWinner || p1Wins >= threshold || p2Wins >= threshold) {
    return { label: 'Complete', type: 'complete' as const };
  }
  const hasAnyGameScore = record?.games.some(g => g.player1Points !== null || g.player2Points !== null || g.winnerPlayerId !== null);
  if (hasAnyGameScore || p1Wins > 0 || p2Wins > 0) {
    return { label: 'In Progress', type: 'in_progress' as const };
  }
  return { label: 'Not Started', type: 'not_started' as const };
}

/**
 * Determines the default inherited bestOf for a round based on tier round overrides,
 * match initial bestOf, or tier.bestOf default.
 */
export function getInheritedRoundBestOf(
  round: { roundNumber: number; roundIdentifier?: string; name: string; matches?: BracketMatch[] },
  tier: TournamentTier
): number {
  const overrides = tier.roundBestOfOverrides || {};
  if (round.roundNumber in overrides) {
    return Number(overrides[round.roundNumber]);
  }
  if (round.roundIdentifier && round.roundIdentifier in overrides) {
    return Number(overrides[round.roundIdentifier]);
  }
  if (round.name in overrides) {
    return Number(overrides[round.name]);
  }
  return round.matches?.[0]?.bestOf || tier.bestOf || 5;
}

/**
 * Calculates the number of game columns to render for a round:
 * Defaults to inheritedBestOf. If any match in the round has a match-level override
 * (from matchScores or match.bestOf) that is greater than inheritedBestOf,
 * expands to the largest match override in that round.
 */
export function getEffectiveRoundGameCount(
  round: { roundNumber: number; roundIdentifier?: string; name: string; matches?: BracketMatch[] },
  tier: TournamentTier,
  matchScores: Record<string, MatchScoreRecord | undefined> = {}
): { inheritedBestOf: number; effectiveGameCount: number } {
  const inheritedBestOf = getInheritedRoundBestOf(round, tier);
  let maxMatchBestOf = inheritedBestOf;

  for (const m of round.matches || []) {
    const record = matchScores[m.id];
    const mBestOf = record?.bestOf || m.bestOf || inheritedBestOf;
    if (mBestOf > maxMatchBestOf) {
      maxMatchBestOf = mBestOf;
    }
  }

  const effectiveGameCount = Math.max(inheritedBestOf, maxMatchBestOf);
  return { inheritedBestOf, effectiveGameCount };
}

export type SheetDensitySize = 'xs' | 'sm' | 'md' | 'lg';

export interface SheetSizeTokens {
  colMatch: number;
  colGamesWon: number;
  colGame: number;
  colComplete: number;
  competitorLeftPad: number;
  countrySeedWidth: number;
  thPadding: string;
  tdPadding: string;
  tdMergedPadding: string;
  gameCellPadding: string;
  fontSizeTable: string;
  fontSizeTh: string;
  fontSizeMatchNum: string;
  fontSizeSeed: string;
  fontSizePlayerName: string;
  fontSizeGamesWon: string;
  fontSizeGameScore: string;
  fontSizeStatusBadge: string;
  flagSize: string;
  bannerPadding: string;
  fontSizeRoundTitle: string;
  fontSizeRoundMeta: string;
}

export const SHEET_SIZE_CONFIG: Record<SheetDensitySize, SheetSizeTokens> = {
  xs: {
    colMatch: 56,
    colGamesWon: 86,
    colGame: 84,
    colComplete: 68,
    competitorLeftPad: 58,
    countrySeedWidth: 42,
    thPadding: '0.28rem 0.45rem',
    tdPadding: '0.16rem 0.45rem',
    tdMergedPadding: '0.16rem 0.45rem',
    gameCellPadding: '0.16rem 0.25rem',
    fontSizeTable: '0.74rem',
    fontSizeTh: '0.65rem',
    fontSizeMatchNum: '0.65rem',
    fontSizeSeed: '0.58rem',
    fontSizePlayerName: '0.76rem',
    fontSizeGamesWon: '0.78rem',
    fontSizeGameScore: '0.72rem',
    fontSizeStatusBadge: '0.62rem',
    flagSize: '0.85rem',
    bannerPadding: '0.32rem 0.7rem',
    fontSizeRoundTitle: '0.74rem',
    fontSizeRoundMeta: '0.65rem',
  },
  sm: {
    colMatch: 66,
    colGamesWon: 100,
    colGame: 98,
    colComplete: 76,
    competitorLeftPad: 72,
    countrySeedWidth: 50,
    thPadding: '0.42rem 0.65rem',
    tdPadding: '0.24rem 0.6rem',
    tdMergedPadding: '0.24rem 0.6rem',
    gameCellPadding: '0.24rem 0.35rem',
    fontSizeTable: '0.82rem',
    fontSizeTh: '0.72rem',
    fontSizeMatchNum: '0.72rem',
    fontSizeSeed: '0.65rem',
    fontSizePlayerName: '0.84rem',
    fontSizeGamesWon: '0.88rem',
    fontSizeGameScore: '0.80rem',
    fontSizeStatusBadge: '0.7rem',
    flagSize: '0.95rem',
    bannerPadding: '0.45rem 0.85rem',
    fontSizeRoundTitle: '0.82rem',
    fontSizeRoundMeta: '0.72rem',
  },
  md: {
    colMatch: 76,
    colGamesWon: 114,
    colGame: 112,
    colComplete: 86,
    competitorLeftPad: 82,
    countrySeedWidth: 58,
    thPadding: '0.55rem 0.8rem',
    tdPadding: '0.34rem 0.75rem',
    tdMergedPadding: '0.34rem 0.75rem',
    gameCellPadding: '0.32rem 0.45rem',
    fontSizeTable: '0.92rem',
    fontSizeTh: '0.8rem',
    fontSizeMatchNum: '0.82rem',
    fontSizeSeed: '0.72rem',
    fontSizePlayerName: '0.96rem',
    fontSizeGamesWon: '1.02rem',
    fontSizeGameScore: '0.92rem',
    fontSizeStatusBadge: '0.78rem',
    flagSize: '1.15rem',
    bannerPadding: '0.58rem 1rem',
    fontSizeRoundTitle: '0.94rem',
    fontSizeRoundMeta: '0.8rem',
  },
  lg: {
    colMatch: 86,
    colGamesWon: 130,
    colGame: 126,
    colComplete: 98,
    competitorLeftPad: 96,
    countrySeedWidth: 66,
    thPadding: '0.7rem 0.95rem',
    tdPadding: '0.46rem 0.9rem',
    tdMergedPadding: '0.46rem 0.9rem',
    gameCellPadding: '0.44rem 0.55rem',
    fontSizeTable: '1.04rem',
    fontSizeTh: '0.88rem',
    fontSizeMatchNum: '0.92rem',
    fontSizeSeed: '0.8rem',
    fontSizePlayerName: '1.1rem',
    fontSizeGamesWon: '1.18rem',
    fontSizeGameScore: '1.04rem',
    fontSizeStatusBadge: '0.86rem',
    flagSize: '1.32rem',
    bannerPadding: '0.72rem 1.15rem',
    fontSizeRoundTitle: '1.06rem',
    fontSizeRoundMeta: '0.88rem',
  },
};
