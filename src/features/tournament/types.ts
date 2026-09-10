import { BracketStructure, BracketType } from '../bracket/types';

export type QualFormat = 'HIGH_SCORE' | 'AVERAGE_OF_X' | 'POINTS';

export interface PointsThreshold {
  minScore: number;
  points: number;
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
  bestOf: number;
  player1Wins: number;
  player2Wins: number;
  games: GameScoreEntry[];
  winnerPlayerId: string | null;
  loserPlayerId: string | null;
  isComplete: boolean;
  notes?: string;
  forfeitWinnerId?: string;
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
  bracket: BracketStructure;
  isLocked: boolean;
}

export interface QualifierSubmission {
  id: string;
  tournamentId: string;
  playerId: string;
  score: number;
  submittedAt: number; // timestamp in ms
}

export interface TournamentPlayer {
  playerId: string;
  tournamentId: string;
  tierId?: string;
  seed?: number;
  qualsCompleted?: boolean;
}

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
  playstyle?: 'DAS' | 'Rolling' | 'Hypertap';
  personalBest?: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  country?: string;
  personalBest: number;
  playstyle: 'DAS' | 'Rolling' | 'Hypertap';
  notes?: string;
  isDisqualified?: boolean;
}

export interface Tournament {
  id: string;
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
}
