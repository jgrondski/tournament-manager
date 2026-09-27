import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Tournament, TournamentTier, MatchScoreRecord, PlayerProfile } from '../../tournament/types';
import { BracketMatch, isMatchPlayable, canonicalizeBracketRounds } from '../types';
import { MatchScoreDrawer } from './MatchScoreDrawer';
import {
  colorWithAlpha,
  getDefaultTierColors,
  getAlternateShade,
  getContrastingTextColor,
} from '../colorUtils';
import { Filter, Check, ChevronDown, Clock, CheckCircle2, Search, Trophy } from 'lucide-react';
import { PlayerDetailDrawer } from '../../qualifiers/components/PlayerDetailDrawer';
import { CountryFlag } from '../../players/flagUtils';

interface OrganizerSheetMatrixProps {
  tournament: Tournament;
  tier: TournamentTier;
}

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
    colMatch: 44,
    colGamesWon: 86,
    colGame: 72,
    colComplete: 74,
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
    colMatch: 52,
    colGamesWon: 100,
    colGame: 86,
    colComplete: 86,
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
    colMatch: 62,
    colGamesWon: 114,
    colGame: 98,
    colComplete: 98,
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
    colMatch: 72,
    colGamesWon: 130,
    colGame: 112,
    colComplete: 112,
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

export const OrganizerSheetMatrix: React.FC<OrganizerSheetMatrixProps> = ({ tournament, tier }) => {
  const [selectedMatch, setSelectedMatch] = useState<{ match: BracketMatch; roundName: string } | null>(null);
  const [hoveredMatchId, setHoveredMatchId] = useState<string | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [selectedPlayerForDrawer, setSelectedPlayerForDrawer] = useState<PlayerProfile | null>(null);
  const [isPlayerDrawerOpen, setIsPlayerDrawerOpen] = useState(false);
  const [hoveredPlayerKey, setHoveredPlayerKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Page-level Size Density Toggle ('xs' | 'sm' | 'md' | 'lg')
  const [sheetSize, setSheetSize] = useState<SheetDensitySize>(() => {
    try {
      const saved = localStorage.getItem('tm_master_sheet_size');
      if (saved === 'xs' || saved === 'sm' || saved === 'md' || saved === 'lg') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'md';
  });

  const handleSizeChange = (newSize: SheetDensitySize) => {
    setSheetSize(newSize);
    try {
      localStorage.setItem('tm_master_sheet_size', newSize);
    } catch {
      // ignore
    }
  };

  const sizeTokens = SHEET_SIZE_CONFIG[sheetSize];

  // Adjustable Competitor Column Width (Google Sheets style resizable)
  const [competitorColWidth, setCompetitorColWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tm_master_sheet_competitor_col_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 160 && parsed <= 600) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return 250;
  });

  const [isResizingCol, setIsResizingCol] = useState(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartWidthRef = useRef<number>(250);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingCol(true);
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = competitorColWidth;
  };

  const handleResizeTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsResizingCol(true);
      dragStartXRef.current = e.touches[0].clientX;
      dragStartWidthRef.current = competitorColWidth;
    }
  };

  const handleResetColWidth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCompetitorColWidth(250);
    try {
      localStorage.setItem('tm_master_sheet_competitor_col_width', '250');
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isResizingCol) return;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartXRef.current;
      const nextWidth = Math.max(160, Math.min(600, dragStartWidthRef.current + delta));
      setCompetitorColWidth(nextWidth);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const delta = e.touches[0].clientX - dragStartXRef.current;
        const nextWidth = Math.max(160, Math.min(600, dragStartWidthRef.current + delta));
        setCompetitorColWidth(nextWidth);
      }
    };

    const onMouseUp = () => {
      setIsResizingCol(false);
      try {
        localStorage.setItem('tm_master_sheet_competitor_col_width', String(competitorColWidth));
      } catch {
        // ignore
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [isResizingCol, competitorColWidth]);

  // Bracket color themes from tier
  const defaults = getDefaultTierColors(tier);
  const primaryColor = tier.primaryColor || defaults.primaryColor || '#f59e0b';
  const secondaryColor = tier.secondaryColor || defaults.secondaryColor || '#705b33';
  const cardColor = tier.cardColor || defaults.cardColor || '#161922';
  const textColor = tier.textColor || defaults.textColor || '#94A3B8';
  const lowerBracketColor = tier.lowerBracketColor || defaults.lowerBracketColor || '#c2410c';

  const handlePlayerClick = (pId: string, pName: string, country?: string) => {
    const profile = (tournament.playersPool || []).find(p => p.id === pId) || {
      id: pId,
      name: pName,
      country,
      personalBest: 0,
      playstyle: 'DAS',
    };
    setSelectedPlayerForDrawer(profile);
    setIsPlayerDrawerOpen(true);
  };

  // Available rounds in this tier
  const allRounds = useMemo(() => {
    if (tier.bracket?.rounds) {
      canonicalizeBracketRounds(tier.bracket.rounds);
    }
    return tier.bracket?.rounds || [];
  }, [tier.bracket?.rounds]);
  const roundNames = useMemo(() => allRounds.map(r => r.name), [allRounds]);

  const [selectedRoundFilter, setSelectedRoundFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETE' | string[]>('ALL');

  // Filtered rounds and matches with search query support
  const filteredRounds = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return allRounds
      .map(round => {
        const matches = round.matches.filter(m => {
          const record = tournament.matchScores[m.id];
          const status = getMatchStatus(m, record);

          if (selectedRoundFilter === 'IN_PROGRESS' && status.type !== 'in_progress') return false;
          if (selectedRoundFilter === 'COMPLETE' && status.type !== 'complete') return false;
          if (Array.isArray(selectedRoundFilter) && !selectedRoundFilter.includes(round.name)) return false;

          if (query) {
            const p1Name = m.player1.player?.name?.toLowerCase() || '';
            const p2Name = m.player2.player?.name?.toLowerCase() || '';
            const matchNum = String(m.matchNumber);
            if (!p1Name.includes(query) && !p2Name.includes(query) && !matchNum.includes(query)) {
              return false;
            }
          }

          return true;
        });

        return {
          ...round,
          filteredMatches: matches,
        };
      })
      .filter(round => round.filteredMatches.length > 0);
  }, [allRounds, tournament.matchScores, selectedRoundFilter, searchTerm]);

  // Round telemetry
  const telemetry = useMemo(() => {
    let total = 0;
    let completed = 0;
    let inProgress = 0;

    for (const round of allRounds) {
      for (const m of round.matches) {
        if (m.isBye) continue;
        total++;
        const rec = tournament.matchScores[m.id];
        const status = getMatchStatus(m, rec);
        if (status.type === 'complete') completed++;
        if (status.type === 'in_progress') inProgress++;
      }
    }

    return { total, completed, inProgress };
  }, [allRounds, tournament.matchScores]);

  const toggleRoundFilter = (roundName: string) => {
    if (Array.isArray(selectedRoundFilter)) {
      if (selectedRoundFilter.includes(roundName)) {
        const next = selectedRoundFilter.filter(r => r !== roundName);
        setSelectedRoundFilter(next.length === 0 ? 'ALL' : next);
      } else {
        setSelectedRoundFilter([...selectedRoundFilter, roundName]);
      }
    } else {
      setSelectedRoundFilter([roundName]);
    }
  };

  const maxTableWidth = useMemo(() => {
    const { colMatch, colGamesWon, colGame, colComplete } = sizeTokens;
    if (filteredRounds.length === 0) {
      return colMatch + competitorColWidth + colGamesWon + (3 * colGame) + colComplete + 2;
    }
    return Math.max(
      ...filteredRounds.map(r => {
        const { effectiveGameCount } = getEffectiveRoundGameCount(r, tier, tournament.matchScores);
        return colMatch + competitorColWidth + colGamesWon + (effectiveGameCount * colGame) + colComplete + 2;
      })
    );
  }, [filteredRounds, tournament.matchScores, tier, competitorColWidth, sizeTokens]);

  const currentThStyle: React.CSSProperties = {
    ...thStyle,
    padding: sizeTokens.thPadding,
    fontSize: sizeTokens.fontSizeTh,
  };

  const currentTdStyle: React.CSSProperties = {
    ...tdStyle,
    padding: sizeTokens.tdPadding,
  };

  const currentTdMergedStyle: React.CSSProperties = {
    ...tdMergedStyle,
    padding: sizeTokens.tdMergedPadding,
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        width: `${maxTableWidth}px`,
        maxWidth: '100%',
        margin: '0 auto',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      {/* Tournament Name & Bracket Header - Left-aligned with the table */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          marginBottom: '0.4rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--color-gold-bright)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Master Organizer Sheet
          </span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>•</span>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: tier.primaryColor || 'var(--color-gold-bright)',
            }}
          >
            {tier.name}
          </span>
        </div>
        <h1
          style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          <Trophy color="var(--color-gold-bright)" size={28} />
          {tournament.name}
        </h1>
      </div>

      {/* Top Filter & Telemetry Bar */}
      <div
        style={{
          ...telemetryBarStyle,
          background: cardColor,
          borderColor: colorWithAlpha(secondaryColor, 0.45, 'var(--color-border)'),
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Competitor / Match # Quick Search */}
          <div style={{ position: 'relative', width: '175px' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '0.6rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search competitor or #..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.32rem 0.55rem 0.32rem 1.8rem',
                fontSize: '0.78rem',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${colorWithAlpha(secondaryColor, 0.5, 'var(--color-border)')}`,
                background: 'var(--color-bg-base)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {/* Multi-Select Round Filter Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="btn btn-secondary"
              style={{
                padding: '0.32rem 0.75rem',
                fontSize: '0.78rem',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${colorWithAlpha(secondaryColor, 0.5, 'var(--color-border)')}`,
                background: 'var(--color-bg-base)',
                color: 'var(--color-text-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Filter size={13} color={primaryColor} />
              <span>
                Round:{' '}
                <strong style={{ color: primaryColor }}>
                  {selectedRoundFilter === 'ALL'
                    ? 'All'
                    : selectedRoundFilter === 'IN_PROGRESS'
                    ? 'Live Only'
                    : selectedRoundFilter === 'COMPLETE'
                    ? 'Complete Only'
                    : `${selectedRoundFilter.length} Selected`}
                </strong>
              </span>
              <ChevronDown size={13} />
            </button>

            {isFilterDropdownOpen && (
              <div
                style={{
                  ...dropdownMenuStyle,
                  background: getAlternateShade(cardColor, 8),
                  borderColor: colorWithAlpha(secondaryColor, 0.6, 'var(--color-border)'),
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={dropdownSectionHeaderStyle}>Filter Presets</div>
                <button
                  style={dropdownItemStyle}
                  onClick={() => {
                    setSelectedRoundFilter('ALL');
                    setIsFilterDropdownOpen(false);
                  }}
                >
                  <span style={{ width: 16 }}>{selectedRoundFilter === 'ALL' && <Check size={13} color={primaryColor} />}</span>
                  <span>All Rounds</span>
                </button>
                <button
                  style={dropdownItemStyle}
                  onClick={() => {
                    setSelectedRoundFilter('IN_PROGRESS');
                    setIsFilterDropdownOpen(false);
                  }}
                >
                  <span style={{ width: 16 }}>{selectedRoundFilter === 'IN_PROGRESS' && <Check size={13} color={primaryColor} />}</span>
                  <span>In Progress Only</span>
                </button>
                <button
                  style={dropdownItemStyle}
                  onClick={() => {
                    setSelectedRoundFilter('COMPLETE');
                    setIsFilterDropdownOpen(false);
                  }}
                >
                  <span style={{ width: 16 }}>{selectedRoundFilter === 'COMPLETE' && <Check size={13} color={primaryColor} />}</span>
                  <span>Completed Only</span>
                </button>

                <div style={{ ...dropdownSectionHeaderStyle, marginTop: '0.4rem' }}>Individual Rounds</div>
                {roundNames.map(rName => {
                  const isChecked = Array.isArray(selectedRoundFilter) && selectedRoundFilter.includes(rName);
                  return (
                    <button
                      key={rName}
                      style={dropdownItemStyle}
                      onClick={() => toggleRoundFilter(rName)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        style={{ accentColor: primaryColor, cursor: 'pointer' }}
                      />
                      <span>{rName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Telemetry Stats Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.78rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                color: '#4ade80',
              }}
            >
              <CheckCircle2 size={13} />
              <span style={{ color: 'var(--color-text-secondary)' }}>Matches:</span>
              <strong className="tabular-nums" style={{ color: '#ffffff' }}>
                {telemetry.completed} / {telemetry.total}
              </strong>
            </span>

            {telemetry.inProgress > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: 'var(--radius-full)',
                  background: colorWithAlpha(primaryColor, 0.14, 'rgba(245, 158, 11, 0.1)'),
                  border: `1px solid ${colorWithAlpha(primaryColor, 0.35, 'rgba(245, 158, 11, 0.3)')}`,
                  color: primaryColor,
                }}
              >
                <Clock size={13} />
                <span>Live:</span>
                <strong className="tabular-nums">{telemetry.inProgress} active</strong>
              </span>
            )}
          </div>
        </div>

        {/* Size Density Toggle (XS / S / M / L) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Size:
          </span>
          <div
            style={{
              display: 'inline-flex',
              padding: '2px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-base)',
              border: `1px solid ${colorWithAlpha(secondaryColor, 0.5, 'var(--color-border)')}`,
              gap: '2px',
            }}
          >
            {(['xs', 'sm', 'md', 'lg'] as const).map(s => {
              const isCurrent = sheetSize === s;
              const label = s === 'xs' ? 'XS' : s === 'sm' ? 'S' : s === 'md' ? 'M' : 'L';
              const title = s === 'xs' ? 'Extra Small' : s === 'sm' ? 'Small (Default)' : s === 'md' ? 'Medium' : 'Large';
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSizeChange(s)}
                  title={`View size: ${title}`}
                  style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '2px',
                    border: 'none',
                    fontSize: '0.72rem',
                    fontWeight: isCurrent ? 800 : 600,
                    background: isCurrent ? primaryColor : 'transparent',
                    color: isCurrent ? getContrastingTextColor(primaryColor) : 'var(--color-text-secondary)',
                    cursor: isCurrent ? 'default' : 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Sheet Matrix Cards */}
      {filteredRounds.length === 0 ? (
        <div
          style={{
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${colorWithAlpha(secondaryColor, 0.45, 'var(--color-border)')}`,
            background: cardColor,
            boxShadow: 'var(--shadow-md)',
            padding: '2.5rem',
            textAlign: 'center',
            color: textColor || 'var(--color-text-muted)',
            width: '100%',
            maxWidth: `${maxTableWidth}px`,
            boxSizing: 'border-box',
          }}
        >
          {searchTerm
            ? `No matches found matching "${searchTerm}".`
            : 'No matches found matching the current round filter.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', alignItems: 'center' }}>
          {filteredRounds.map((round) => {
            // Loser / Lower bracket round identification
            const isLoserRound =
              round.stage === 'LOSERS' ||
              Boolean(round.name?.toLowerCase().includes('loser'));
            const roundAccentColor = isLoserRound ? lowerBracketColor : primaryColor;
            const completedCount = round.filteredMatches.filter(
              m => getMatchStatus(m, tournament.matchScores[m.id]).type === 'complete'
            ).length;

            const { inheritedBestOf, effectiveGameCount } = getEffectiveRoundGameCount(
              round,
              tier,
              tournament.matchScores
            );
            const gameNumbers = Array.from({ length: effectiveGameCount }, (_, i) => i + 1);

            return (
              <div
                key={round.roundNumber}
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${colorWithAlpha(secondaryColor, 0.45, 'var(--color-border)')}`,
                  background: cardColor,
                  boxShadow: 'var(--shadow-md)',
                  overflow: 'hidden',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }}
              >
                {/* Clean Round Divider Banner with Left-Only Accent Border */}
                <div
                  style={{
                    padding: sizeTokens.bannerPadding,
                    background: 'var(--color-bg-base)',
                    borderBottom: '1px solid var(--color-border)',
                    borderLeft: `4px solid ${roundAccentColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: sizeTokens.fontSizeRoundTitle,
                        color: 'var(--color-text-primary)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {round.name}
                    </span>
                    <span
                      style={{
                        fontSize: sizeTokens.fontSizeRoundMeta,
                        padding: '0.12rem 0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                        fontWeight: 600,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      Best of {inheritedBestOf}
                    </span>
                    <span style={{ fontSize: sizeTokens.fontSizeRoundMeta, color: 'var(--color-text-muted)' }}>
                      • {round.filteredMatches.length} {round.filteredMatches.length === 1 ? 'Match' : 'Matches'}
                    </span>
                  </div>
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: sizeTokens.fontSizeRoundMeta,
                      fontWeight: 600,
                      padding: '0.12rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: 'var(--color-text-secondary)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {completedCount} / {round.filteredMatches.length} Complete
                  </span>
                </div>

                {/* Compact Round Table */}
                <div style={{ width: '100%' }}>
                  <table
                    style={{
                      ...tableStyle,
                      width: '100%',
                      fontSize: sizeTokens.fontSizeTable,
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: getAlternateShade(cardColor, 7),
                          borderBottom: `2px solid ${colorWithAlpha(secondaryColor, 0.6, 'var(--color-border)')}`,
                        }}
                      >
                        <th style={{ ...currentThStyle, width: `${sizeTokens.colMatch}px`, minWidth: `${sizeTokens.colMatch}px`, maxWidth: `${sizeTokens.colMatch}px`, textAlign: 'center', color: textColor }}>Match #</th>
                        <th
                          style={{
                            ...currentThStyle,
                            width: `${competitorColWidth}px`,
                            minWidth: `${competitorColWidth}px`,
                            maxWidth: `${competitorColWidth}px`,
                            textAlign: 'left',
                            paddingLeft: `${sizeTokens.competitorLeftPad}px`,
                            color: textColor,
                            position: 'relative',
                            userSelect: isResizingCol ? 'none' : 'auto',
                          }}
                        >
                          <span>Competitor</span>

                          {/* Google Sheet Style Resizer Handle */}
                          <div
                            onMouseDown={handleResizeMouseDown}
                            onTouchStart={handleResizeTouchStart}
                            onDoubleClick={handleResetColWidth}
                            title="Drag to adjust column width (double-click to reset)"
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: 0,
                              bottom: 0,
                              width: '10px',
                              cursor: 'col-resize',
                              zIndex: 10,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              touchAction: 'none',
                              userSelect: 'none',
                            }}
                          >
                            <div
                              style={{
                                width: isResizingCol ? '3px' : '2px',
                                height: '65%',
                                borderRadius: '1px',
                                background: isResizingCol
                                  ? primaryColor
                                  : colorWithAlpha(secondaryColor, 0.7, 'var(--color-border)'),
                                boxShadow: isResizingCol ? `0 0 6px ${primaryColor}` : 'none',
                                transition: 'all 0.1s ease',
                              }}
                            />
                          </div>
                        </th>
                        <th style={{ ...currentThStyle, width: `${sizeTokens.colGamesWon}px`, minWidth: `${sizeTokens.colGamesWon}px`, maxWidth: `${sizeTokens.colGamesWon}px`, textAlign: 'center', paddingRight: '14px', color: textColor }}>Games Won</th>
                        {gameNumbers.map((gNum) => (
                          <th
                            key={gNum}
                            style={{
                              ...currentThStyle,
                              width: `${sizeTokens.colGame}px`,
                              minWidth: `${sizeTokens.colGame}px`,
                              maxWidth: `${sizeTokens.colGame}px`,
                              textAlign: 'center',
                              color: textColor,
                            }}
                          >
                            Game {gNum}
                          </th>
                        ))}
                        <th style={{ ...currentThStyle, width: `${sizeTokens.colComplete}px`, minWidth: `${sizeTokens.colComplete}px`, maxWidth: `${sizeTokens.colComplete}px`, textAlign: 'center', color: textColor }}>Complete</th>
                      </tr>
                    </thead>

                    <tbody>
                      {round.filteredMatches.map((match, matchIdx) => {
                        const record = tournament.matchScores[match.id];
                        const status = getMatchStatus(match, record);
                        const isHovered = hoveredMatchId === match.id;
                        const isComplete = status.type === 'complete';

                        // Lower bracket match check
                        const isMatchInLosers =
                          isLoserRound ||
                          match.stage === 'LOSERS' ||
                          (match.roundIdentifier?.startsWith('L') && match.roundIdentifier !== 'LF') ||
                          match.roundIdentifier === 'LF' ||
                          match.subTrack === 'PRE_MERGE_LOWER' ||
                          match.subTrack === 'RE_CLIMB' ||
                          match.roundIdentifier === 'PRE_L1' ||
                          match.roundIdentifier === 'PRE_L2' ||
                          match.roundIdentifier === '2C' ||
                          match.roundIdentifier === 'PO';
                        const matchAccentColor = isMatchInLosers ? lowerBracketColor : primaryColor;

                        const p1 = match.player1.player;
                        const p2 = match.player2.player;
                        const p1Name = p1?.name || (match.player1.sourceMatchId ? `Winner of #${tier.bracket.matchesById[match.player1.sourceMatchId]?.matchNumber || '?'}` : 'TBD');
                        const p2Name = p2?.name || (match.player2.sourceMatchId ? `Winner of #${tier.bracket.matchesById[match.player2.sourceMatchId]?.matchNumber || '?'}` : 'TBD');

                        const p1Wins = record?.player1Wins || 0;
                        const p2Wins = record?.player2Wins || 0;
                        const matchBestOf = record?.bestOf || match.bestOf || inheritedBestOf;
                        const hasTieGame = Boolean(record?.games?.some(g => g.winnerPlayerId === 'TIE' || (g.player1Points !== null && g.player1Points === g.player2Points && g.player1Points > 0)));
                        const hasTiebreaker = Boolean(record?.hasTiebreaker || hasTieGame || (record?.games && record.games.length > matchBestOf));
                        const p1ScoreDisplay = hasTiebreaker ? `${p1Wins} (t)` : `${p1Wins}`;
                        const p2ScoreDisplay = hasTiebreaker ? `${p2Wins} (t)` : `${p2Wins}`;

                        const p1IsWinner = Boolean(p1?.id && (match.winnerId === p1.id || (record?.isComplete && record?.winnerPlayerId === p1.id)));
                        const p2IsWinner = Boolean(p2?.id && (match.winnerId === p2.id || (record?.isComplete && record?.winnerPlayerId === p2.id)));
                        const isPlayable = isMatchPlayable(match);

                        // Pure alternating zebra backgrounds without winner row tint
                        const baseCard = cardColor;
                        const altCard = getAlternateShade(baseCard, 5);
                        const matchBaseBg = matchIdx % 2 === 0 ? baseCard : altCard;
                        const matchHoverBg = colorWithAlpha(primaryColor, 0.10, 'rgba(255, 255, 255, 0.07)');
                        const blockBg = isHovered ? matchHoverBg : matchBaseBg;

                        // Block borders & theme-appropriate hover highlight
                        const hoverBorderColor = colorWithAlpha(primaryColor, 0.75, 'var(--color-gold, #f59e0b)');
                        const topRowBorder = `1px solid ${colorWithAlpha(secondaryColor, 0.35, 'rgba(255, 255, 255, 0.08)')}`;
                        const midRowBorder = '1px solid rgba(255, 255, 255, 0.04)';
                        const botRowBorder = `1px solid ${colorWithAlpha(secondaryColor, 0.25, 'rgba(255, 255, 255, 0.06)')}`;

                        const topBorder = topRowBorder;
                        const botBorder = botRowBorder;
                        const midBorder = isHovered ? `1px solid ${colorWithAlpha(primaryColor, 0.15, 'rgba(255, 255, 255, 0.04)')}` : midRowBorder;
                        const leftBorder = '1px solid transparent';
                        const rightBorder = '1px solid rgba(255, 255, 255, 0.05)';

                        const matchNumShadow = isHovered
                          ? `inset 1px 0 0 ${hoverBorderColor}, inset 0 1px 0 ${hoverBorderColor}, inset 0 -1px 0 ${hoverBorderColor}`
                          : 'none';
                        const completeShadow = isHovered
                          ? `inset -1px 0 0 ${hoverBorderColor}, inset 0 1px 0 ${hoverBorderColor}, inset 0 -1px 0 ${hoverBorderColor}`
                          : 'none';
                        const row1Shadow = isHovered ? `inset 0 1px 0 ${hoverBorderColor}` : 'none';
                        const row2Shadow = isHovered ? `inset 0 -1px 0 ${hoverBorderColor}` : 'none';

                        return (
                          <React.Fragment key={match.id}>
                            {/* Row 1: Player 1 */}
                            <tr
                              onClick={() => {
                                if (isPlayable && tournament.isLocked) {
                                  setSelectedMatch({
                                    match,
                                    roundName: match.stage === 'GRAND_FINALS_RESET' ? 'Grand Finals' : round.name,
                                  });
                                }
                              }}
                              onMouseEnter={() => setHoveredMatchId(match.id)}
                              onMouseLeave={() => setHoveredMatchId(null)}
                              style={{
                                background: blockBg,
                                cursor: isPlayable && tournament.isLocked ? 'pointer' : 'default',
                                opacity: isPlayable ? 1 : 0.72,
                                transition: 'background 0.12s ease',
                              }}
                            >
                              {/* Match # (RowSpan 2) */}
                              <td
                                rowSpan={2}
                                style={{
                                  ...currentTdMergedStyle,
                                  borderTop: topBorder,
                                  borderBottom: botBorder,
                                  borderLeft: leftBorder,
                                  boxShadow: matchNumShadow,
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  width: `${sizeTokens.colMatch}px`,
                                  minWidth: `${sizeTokens.colMatch}px`,
                                  maxWidth: `${sizeTokens.colMatch}px`,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: sizeTokens.fontSizeMatchNum,
                                    padding: '0.12rem 0.4rem',
                                    borderRadius: 'var(--radius-sm)',
                                    fontWeight: 700,
                                    fontFamily: 'var(--font-mono)',
                                    background: colorWithAlpha(matchAccentColor, 0.15, 'rgba(255, 255, 255, 0.06)'),
                                    color: matchAccentColor,
                                    border: `1px solid ${colorWithAlpha(matchAccentColor, 0.4, 'rgba(255, 255, 255, 0.12)')}`,
                                    display: 'inline-block',
                                    lineHeight: 1.2,
                                  }}
                                >
                                  #{match.matchNumber}
                                </span>
                              </td>

                              {/* Player 1 Seed & Competitor Info */}
                              <td style={{ ...currentTdStyle, borderTop: topBorder, borderBottom: midBorder, boxShadow: row1Shadow, width: `${competitorColWidth}px`, minWidth: `${competitorColWidth}px`, maxWidth: `${competitorColWidth}px`, textAlign: 'left' }}>
                                <div
                                  onClick={(e) => {
                                    if (p1?.id) {
                                      e.stopPropagation();
                                      handlePlayerClick(p1.id, p1.name, p1.country);
                                    }
                                  }}
                                  onMouseEnter={() => p1?.id && setHoveredPlayerKey(`p1-${match.id}`)}
                                  onMouseLeave={() => setHoveredPlayerKey(null)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: hoveredPlayerKey === `p1-${match.id}` ? colorWithAlpha(primaryColor, 0.15, 'rgba(255, 255, 255, 0.08)') : 'transparent',
                                    boxShadow: hoveredPlayerKey === `p1-${match.id}` ? `0 0 0 1px ${primaryColor}` : 'none',
                                    cursor: p1?.id ? 'pointer' : 'inherit',
                                    transition: 'all 0.12s ease',
                                    maxWidth: '100%',
                                    width: '100%',
                                    boxSizing: 'border-box',
                                  }}
                                  title={p1?.id ? "View competitor tournament profile" : undefined}
                                >
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', width: `${sizeTokens.countrySeedWidth}px`, flexShrink: 0 }}>
                                    {p1?.country && <CountryFlag country={p1.country} style={{ fontSize: sizeTokens.flagSize, lineHeight: 1 }} />}
                                    {p1?.seed && (
                                      <span
                                        style={{
                                          fontSize: sizeTokens.fontSizeSeed,
                                          padding: '0.06rem 0.28rem',
                                          borderRadius: 'var(--radius-sm)',
                                          background: colorWithAlpha(matchAccentColor, 0.12, 'rgba(255, 255, 255, 0.08)'),
                                          color: matchAccentColor,
                                          border: `1px solid ${colorWithAlpha(matchAccentColor, 0.25, 'rgba(255, 255, 255, 0.1)')}`,
                                          fontFamily: 'var(--font-mono)',
                                          fontWeight: 700,
                                          lineHeight: 1.1,
                                        }}
                                      >
                                        #{p1.seed}
                                      </span>
                                    )}
                                  </span>
                                  <span
                                    style={{
                                      fontWeight: isComplete ? (p1IsWinner ? 800 : 400) : (p1IsWinner ? 700 : 500),
                                      fontSize: sizeTokens.fontSizePlayerName,
                                      color: hoveredPlayerKey === `p1-${match.id}`
                                        ? primaryColor
                                        : p1IsWinner
                                        ? primaryColor
                                        : 'var(--color-text-primary)',
                                      opacity: hoveredPlayerKey === `p1-${match.id}` ? 1 : isComplete && p2IsWinner ? 0.45 : 1,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      flex: 1,
                                      minWidth: 0,
                                    }}
                                  >
                                    {p1Name}
                                  </span>
                                  {match.player1.isManualOverride && (
                                    <span
                                      style={{
                                        fontSize: '0.6rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.04em',
                                        padding: '0.05rem 0.28rem',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'rgba(245, 158, 11, 0.18)',
                                        color: '#fbbf24',
                                        border: '1px solid rgba(245, 158, 11, 0.4)',
                                        textTransform: 'uppercase',
                                        lineHeight: 1.1,
                                      }}
                                      title="Position manually placed by tournament organizer"
                                    >
                                      OVERRIDE
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Player 1 Games Won Score */}
                              <td
                                style={{
                                  ...currentTdStyle,
                                  borderTop: topBorder,
                                  borderBottom: midBorder,
                                  boxShadow: row1Shadow,
                                  textAlign: 'center',
                                  paddingRight: '14px',
                                  fontWeight: p1IsWinner ? 800 : 600,
                                  fontSize: sizeTokens.fontSizeGamesWon,
                                  width: `${sizeTokens.colGamesWon}px`,
                                  minWidth: `${sizeTokens.colGamesWon}px`,
                                  maxWidth: `${sizeTokens.colGamesWon}px`,
                                }}
                              >
                                <span
                                  className="tabular-nums"
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.08rem 0.4rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: p1IsWinner
                                      ? colorWithAlpha(primaryColor, 0.22, 'rgba(255, 255, 255, 0.08)')
                                      : 'transparent',
                                    color: p1IsWinner
                                      ? primaryColor
                                      : 'var(--color-text-primary)',
                                    opacity: isComplete && p2IsWinner ? 0.45 : 1,
                                    border: p1IsWinner ? `1px solid ${colorWithAlpha(primaryColor, 0.55, 'transparent')}` : '1px solid transparent',
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {p1ScoreDisplay}
                                </span>
                              </td>

                              {/* Games 1 to effectiveGameCount for Player 1 */}
                              {gameNumbers.map((gNum) => {
                                const isBeyondBestOf = gNum > matchBestOf;
                                const game = record?.games.find((g) => g.gameNumber === gNum);
                                const p1Pts = game?.player1Points;
                                const p2Pts = game?.player2Points;
                                const p1WonGame =
                                  game?.winnerPlayerId === p1?.id ||
                                  (p1Pts !== null && p2Pts !== null && p1Pts !== undefined && p2Pts !== undefined && p1Pts > p2Pts);
                                const isLoserScore = isComplete && p2IsWinner && !p1WonGame;

                                return (
                                  <td
                                    key={gNum}
                                    style={{
                                      ...currentTdStyle,
                                      borderTop: topBorder,
                                      borderBottom: midBorder,
                                      boxShadow: row1Shadow,
                                      textAlign: 'right',
                                      padding: sizeTokens.gameCellPadding,
                                      width: `${sizeTokens.colGame}px`,
                                      minWidth: `${sizeTokens.colGame}px`,
                                      maxWidth: `${sizeTokens.colGame}px`,
                                      color: isBeyondBestOf ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                                    }}
                                  >
                                    {isBeyondBestOf ? (
                                      <span style={{ opacity: 0.25 }}>—</span>
                                    ) : p1Pts !== null && p1Pts !== undefined ? (
                                      <span
                                        className="tabular-nums"
                                        style={{
                                          padding: '0.1rem 0.28rem',
                                          margin: '0 3px',
                                          borderRadius: 'var(--radius-sm)',
                                          background: p1WonGame ? colorWithAlpha(matchAccentColor, 0.16, 'rgba(255, 255, 255, 0.08)') : 'transparent',
                                          color: p1WonGame ? matchAccentColor : 'var(--color-text-primary)',
                                          opacity: isLoserScore ? 0.45 : 1,
                                          fontWeight: p1WonGame ? 700 : 400,
                                          fontSize: sizeTokens.fontSizeGameScore,
                                          fontFamily: 'var(--font-mono)',
                                          border: p1WonGame ? `1px solid ${colorWithAlpha(matchAccentColor, 0.38, 'transparent')}` : '1px solid transparent',
                                          display: 'inline-block',
                                          lineHeight: 1.2,
                                        }}
                                      >
                                        {p1Pts.toLocaleString()}
                                      </span>
                                    ) : (
                                      <span style={{ color: 'rgba(255, 255, 255, 0.15)', fontSize: '0.8rem', marginRight: '6px' }}>·</span>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Complete Status (RowSpan 2) */}
                              <td
                                rowSpan={2}
                                style={{
                                  ...currentTdMergedStyle,
                                  borderTop: topBorder,
                                  borderBottom: botBorder,
                                  borderRight: rightBorder,
                                  boxShadow: completeShadow,
                                  textAlign: 'center',
                                  width: `${sizeTokens.colComplete}px`,
                                  minWidth: `${sizeTokens.colComplete}px`,
                                  maxWidth: `${sizeTokens.colComplete}px`,
                                }}
                              >
                                {status.type === 'complete' && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '50%',
                                      background: 'rgba(34, 197, 94, 0.16)',
                                      border: '1px solid rgba(34, 197, 94, 0.4)',
                                      color: '#4ade80',
                                      margin: '0 auto',
                                    }}
                                    title="Complete"
                                  >
                                    <Check size={12} strokeWidth={3} />
                                  </span>
                                )}
                                {status.type === 'in_progress' && (
                                  <span
                                    style={{
                                      fontSize: sizeTokens.fontSizeStatusBadge,
                                      fontWeight: 700,
                                      padding: '0.12rem 0.45rem',
                                      borderRadius: 'var(--radius-full)',
                                      background: colorWithAlpha(primaryColor, 0.18, 'rgba(245, 158, 11, 0.18)'),
                                      color: primaryColor,
                                      border: `1px solid ${colorWithAlpha(primaryColor, 0.45, 'rgba(245, 158, 11, 0.45)')}`,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      lineHeight: 1.2,
                                    }}
                                    title="In Progress"
                                  >
                                    <span
                                      style={{
                                        width: '5px',
                                        height: '5px',
                                        borderRadius: '50%',
                                        background: primaryColor,
                                        boxShadow: `0 0 5px ${primaryColor}`,
                                      }}
                                    />
                                    Live
                                  </span>
                                )}
                                {status.type === 'not_started' && (
                                  <span
                                    style={{
                                      color: 'var(--color-text-muted)',
                                      fontSize: sizeTokens.fontSizeStatusBadge,
                                      opacity: 0.35,
                                    }}
                                    title="Waiting"
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* Row 2: Player 2 */}
                            <tr
                              onClick={() => {
                                if (isPlayable && tournament.isLocked) {
                                  setSelectedMatch({
                                    match,
                                    roundName: match.stage === 'GRAND_FINALS_RESET' ? 'Grand Finals' : round.name,
                                  });
                                }
                              }}
                              onMouseEnter={() => setHoveredMatchId(match.id)}
                              onMouseLeave={() => setHoveredMatchId(null)}
                              style={{
                                background: blockBg,
                                cursor: isPlayable && tournament.isLocked ? 'pointer' : 'default',
                                opacity: isPlayable ? 1 : 0.72,
                                transition: 'background 0.12s ease',
                              }}
                            >
                              {/* Player 2 Seed & Competitor Info */}
                              <td style={{ ...currentTdStyle, borderBottom: botBorder, boxShadow: row2Shadow, width: `${competitorColWidth}px`, minWidth: `${competitorColWidth}px`, maxWidth: `${competitorColWidth}px`, textAlign: 'left' }}>
                                <div
                                  onClick={(e) => {
                                    if (p2?.id) {
                                      e.stopPropagation();
                                      handlePlayerClick(p2.id, p2.name, p2.country);
                                    }
                                  }}
                                  onMouseEnter={() => p2?.id && setHoveredPlayerKey(`p2-${match.id}`)}
                                  onMouseLeave={() => setHoveredPlayerKey(null)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: hoveredPlayerKey === `p2-${match.id}` ? colorWithAlpha(primaryColor, 0.15, 'rgba(255, 255, 255, 0.08)') : 'transparent',
                                    boxShadow: hoveredPlayerKey === `p2-${match.id}` ? `0 0 0 1px ${primaryColor}` : 'none',
                                    cursor: p2?.id ? 'pointer' : 'inherit',
                                    transition: 'all 0.12s ease',
                                    maxWidth: '100%',
                                    width: '100%',
                                    boxSizing: 'border-box',
                                  }}
                                  title={p2?.id ? "View competitor tournament profile" : undefined}
                                >
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', width: `${sizeTokens.countrySeedWidth}px`, flexShrink: 0 }}>
                                    {p2?.country && <CountryFlag country={p2.country} style={{ fontSize: sizeTokens.flagSize, lineHeight: 1 }} />}
                                    {p2?.seed && (
                                      <span
                                        style={{
                                          fontSize: sizeTokens.fontSizeSeed,
                                          padding: '0.06rem 0.28rem',
                                          borderRadius: 'var(--radius-sm)',
                                          background: colorWithAlpha(matchAccentColor, 0.12, 'rgba(255, 255, 255, 0.08)'),
                                          color: matchAccentColor,
                                          border: `1px solid ${colorWithAlpha(matchAccentColor, 0.25, 'rgba(255, 255, 255, 0.1)')}`,
                                          fontFamily: 'var(--font-mono)',
                                          fontWeight: 700,
                                          lineHeight: 1.1,
                                        }}
                                      >
                                        #{p2.seed}
                                      </span>
                                    )}
                                  </span>
                                  <span
                                    style={{
                                      fontWeight: isComplete ? (p2IsWinner ? 800 : 400) : (p2IsWinner ? 700 : 500),
                                      fontSize: sizeTokens.fontSizePlayerName,
                                      color: hoveredPlayerKey === `p2-${match.id}`
                                        ? primaryColor
                                        : p2IsWinner
                                        ? primaryColor
                                        : 'var(--color-text-primary)',
                                      opacity: hoveredPlayerKey === `p2-${match.id}` ? 1 : isComplete && p1IsWinner ? 0.45 : 1,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      flex: 1,
                                      minWidth: 0,
                                    }}
                                  >
                                    {p2Name}
                                  </span>
                                  {match.player2.isManualOverride && (
                                    <span
                                      style={{
                                        fontSize: '0.6rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.04em',
                                        padding: '0.05rem 0.28rem',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'rgba(245, 158, 11, 0.18)',
                                        color: '#fbbf24',
                                        border: '1px solid rgba(245, 158, 11, 0.4)',
                                        textTransform: 'uppercase',
                                        lineHeight: 1.1,
                                      }}
                                      title="Position manually placed by tournament organizer"
                                    >
                                      OVERRIDE
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Player 2 Games Won Score */}
                              <td
                                style={{
                                  ...currentTdStyle,
                                  borderBottom: botBorder,
                                  boxShadow: row2Shadow,
                                  textAlign: 'center',
                                  paddingRight: '14px',
                                  fontWeight: p2IsWinner ? 800 : 600,
                                  fontSize: sizeTokens.fontSizeGamesWon,
                                  width: `${sizeTokens.colGamesWon}px`,
                                  minWidth: `${sizeTokens.colGamesWon}px`,
                                  maxWidth: `${sizeTokens.colGamesWon}px`,
                                }}
                              >
                                <span
                                  className="tabular-nums"
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.08rem 0.4rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: p2IsWinner
                                      ? colorWithAlpha(primaryColor, 0.22, 'rgba(255, 255, 255, 0.08)')
                                      : 'transparent',
                                    color: p2IsWinner
                                      ? primaryColor
                                      : 'var(--color-text-primary)',
                                    opacity: isComplete && p1IsWinner ? 0.45 : 1,
                                    border: p2IsWinner ? `1px solid ${colorWithAlpha(primaryColor, 0.55, 'transparent')}` : '1px solid transparent',
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {p2ScoreDisplay}
                                </span>
                              </td>

                              {/* Games 1 to effectiveGameCount for Player 2 */}
                              {gameNumbers.map((gNum) => {
                                const isBeyondBestOf = gNum > matchBestOf;
                                const game = record?.games.find((g) => g.gameNumber === gNum);
                                const p1Pts = game?.player1Points;
                                const p2Pts = game?.player2Points;
                                const p2WonGame =
                                  game?.winnerPlayerId === p2?.id ||
                                  (p1Pts !== null && p2Pts !== null && p1Pts !== undefined && p2Pts !== undefined && p2Pts > p1Pts);
                                const isLoserScore = isComplete && p1IsWinner && !p2WonGame;

                                return (
                                  <td
                                    key={gNum}
                                    style={{
                                      ...currentTdStyle,
                                      borderBottom: botBorder,
                                      boxShadow: row2Shadow,
                                      textAlign: 'right',
                                      padding: sizeTokens.gameCellPadding,
                                      width: `${sizeTokens.colGame}px`,
                                      minWidth: `${sizeTokens.colGame}px`,
                                      maxWidth: `${sizeTokens.colGame}px`,
                                      color: isBeyondBestOf ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                                    }}
                                  >
                                    {isBeyondBestOf ? (
                                      <span style={{ opacity: 0.25 }}>—</span>
                                    ) : p2Pts !== null && p2Pts !== undefined ? (
                                      <span
                                        className="tabular-nums"
                                        style={{
                                          padding: '0.1rem 0.28rem',
                                          margin: '0 3px',
                                          borderRadius: 'var(--radius-sm)',
                                          background: p2WonGame ? colorWithAlpha(matchAccentColor, 0.16, 'rgba(255, 255, 255, 0.08)') : 'transparent',
                                          color: p2WonGame ? matchAccentColor : 'var(--color-text-primary)',
                                          opacity: isLoserScore ? 0.45 : 1,
                                          fontWeight: p2WonGame ? 700 : 400,
                                          fontSize: sizeTokens.fontSizeGameScore,
                                          fontFamily: 'var(--font-mono)',
                                          border: p2WonGame ? `1px solid ${colorWithAlpha(matchAccentColor, 0.38, 'transparent')}` : '1px solid transparent',
                                          display: 'inline-block',
                                          lineHeight: 1.2,
                                        }}
                                      >
                                        {p2Pts.toLocaleString()}
                                      </span>
                                    ) : (
                                      <span style={{ color: 'rgba(255, 255, 255, 0.15)', fontSize: '0.8rem', marginRight: '6px' }}>·</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-out Scorekeeper Drawer */}
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

const telemetryBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.55rem 0.85rem',
  background: 'var(--color-bg-surface-elevated)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  flexWrap: 'wrap',
  gap: '0.65rem',
};

const dropdownMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 5px)',
  left: 0,
  background: 'var(--color-bg-surface-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-lg)',
  zIndex: 100,
  minWidth: '220px',
  padding: '0.4rem',
  maxHeight: '320px',
  overflowY: 'auto',
};

const dropdownSectionHeaderStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  padding: '0.2rem 0.45rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
};

const dropdownItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.45rem',
  width: '100%',
  padding: '0.35rem 0.5rem',
  background: 'transparent',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text-primary)',
  fontSize: '0.8rem',
  cursor: 'pointer',
  textAlign: 'left',
};

const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  fontSize: '0.82rem',
  tableLayout: 'fixed',
};

const thStyle: React.CSSProperties = {
  padding: '0.42rem 0.65rem',
  color: 'var(--color-text-secondary)',
  fontWeight: 700,
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.24rem 0.6rem',
  verticalAlign: 'middle',
  transition: 'background 0.12s ease, box-shadow 0.12s ease',
};

const tdMergedStyle: React.CSSProperties = {
  padding: '0.24rem 0.6rem',
  verticalAlign: 'middle',
  borderRight: '1px solid rgba(255, 255, 255, 0.05)',
  transition: 'background 0.12s ease, box-shadow 0.12s ease',
};
