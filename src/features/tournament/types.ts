import { BracketStructure, BracketType } from '../bracket/types';
import { TierThemeColors } from '../bracket/colorUtils';

export type QualFormat = 'HIGH_SCORE' | 'AVERAGE_OF_X' | 'POINTS';

export interface PointsThreshold {
  minScore: number;
  points: number;
}

export const DEFAULT_POINTS_THRESHOLDS: PointsThreshold[] = [
  { minScore: 999999, points: 2 },
  { minScore: 1099999, points: 3 },
  { minScore: 1199999, points: 4 },
  { minScore: 1299999, points: 5 },
  { minScore: 1399999, points: 6 },
  { minScore: 1499999, points: 7 },
  { minScore: 1599999, points: 8 },
  { minScore: 1699999, points: 9 },
  { minScore: 1799999, points: 10 },
  { minScore: 1899999, points: 11 },
  { minScore: 1999999, points: 13 },
];

export interface OrgTierTheme {
  id: string;
  name: string;
  themeColors: TierThemeColors;
  textSize?: 'compact' | 'normal' | 'large';
}

export interface Organization {
  id: string;
  slug: string; // unique URL slug, e.g. 'ctwc', 'ctm'
  name: string; // e.g. 'Classic Tetris World Championship'
  shortName?: string; // e.g. 'CTWC', 'CTM'
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  website?: string;
  brandColor?: string; // primary accent color
  themeColors?: TierThemeColors; // 5-color bracket theme palette
  tierThemes?: OrgTierTheme[]; // multi-tier default themes (primary, secondary, etc.)
  branding?: {
    logoUrl?: string;
    bannerUrl?: string;
    themeColors?: TierThemeColors;
    brandColor?: string;
  };
  discordWebhookUrl?: string; // inherited by tournaments if not overridden
  defaultRules?: {
    qualFormat?: QualFormat;
    qualAverageCount?: number;
    qualWindowMinutes?: number;
    bestOf?: number;
    primaryColor?: string;
    secondaryColor?: string;
    pointsConfig?: PointsThreshold[];
  };
  createdAt: number;
}

export interface GameScoreEntry {
  gameNumber: number; // 1, 2, 3, 4, 5...
  player1Points: number | null;
  player2Points: number | null;
  winnerPlayerId: string | null;
}

export interface MatchScoreRecord {
  matchId: string;
  tierId: string;
  organizationId?: string;
  bestOf: number;
  player1Wins: number;
  player2Wins: number;
  games: GameScoreEntry[];
  winnerPlayerId: string | null;
  loserPlayerId: string | null;
  isComplete: boolean;
  notes?: string;
  forfeitWinnerId?: string;
  hasTiebreaker?: boolean;
}

export interface TournamentTier {
  id: string; // e.g. 'gold', 'silver', 'bronze'
  slug: string; // url slug e.g. 'gold'
  name: string; // e.g. 'Gold Bracket'
  priority: number; // 1 for highest/default tier
  bracketType: BracketType;
  flatWidth?: number;
  bestOf: number;
  playerCount: number;
  primaryColor?: string;
  secondaryColor?: string;
  cardColor?: string; // Background for match cards / player names
  textColor?: string; // Standard text and neutral elements color
  backgroundColor?: string; // Overall background for the entire bracket canvas
  textSize?: 'small' | 'normal' | 'medium' | 'large' | 'xlarge' | number; // Bracket text size scaling
  bracket: BracketStructure;
  isLocked: boolean;
  roundBestOfOverrides?: Record<number, number>; // Key: roundNumber (1, 2, ...), Value: bestOf (1..99)
}

export interface QualifierSubmission {
  id: string;
  tournamentId: string;
  organizationId?: string;
  playerId: string;
  score: number;
  submittedAt: number; // timestamp in ms
}

export type QualifierStatus = 'not started' | 'in progress' | 'verified' | 'awaiting verification';

export interface TournamentPlayer {
  playerId: string;
  tournamentId: string;
  organizationId?: string;
  tierId?: string;
  seed?: number;
  qualsCompleted?: boolean;
  isVerified?: boolean;
}

export type Playstyle = 'DAS' | 'Rolling' | 'Hypertap' | 'Hybrid' | 'Roll' | 'Tap';

export interface QualifierScore {
  id: string;
  playerId: string;
  playerName: string;
  seed?: number;
  game1: number;
  game2: number;
  game3?: number;
  totalScore: number;
  verified: boolean;
  assignedTierId?: string;
  playstyle?: Playstyle;
  personalBest?: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  country?: string;
  personalBest: number;
  playstyle: Playstyle;
  notes?: string;
  isDisqualified?: boolean;
}

export interface Tournament {
  id: string;
  organizationId: string; // required association to parent Organization
  slug: string; // e.g. 'kc-2026-open'
  name: string; // e.g. 'KC Regional 2026 Open'
  date: string;
  location: string;
  qualFormat: QualFormat;
  qualAverageCount?: number; // target count X for AVERAGE_OF_X
  pointsConfig?: PointsThreshold[]; // array of { minScore, points } for POINTS
  isLocked: boolean; // false = Qualifiers Mode (Draft Preview), true = Match Play Mode (Locked)
  tiers: TournamentTier[];
  matchScores: Record<string, MatchScoreRecord>; // keyed by matchId
  playersPool: PlayerProfile[];
  qualifierSubmissions: QualifierSubmission[];
  tournamentPlayers: Record<string, TournamentPlayer>; // keyed by playerId
  qualifiers?: QualifierScore[]; // legacy fallback
  useOrgBranding?: boolean; // default true: inherits 5 colors, logo, banner from org
  logoUrl?: string; // tournament-specific logo override
  bannerUrl?: string; // tournament-specific banner override
  discordWebhookUrl?: string; // tournament-specific discord webhook override
  themeColors?: TierThemeColors; // tournament-level 5-color palette override
}

