import { BracketStructure, BracketType } from '../bracket/types';

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
  bracket: BracketStructure;
  isLocked: boolean;
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
}

export interface Tournament {
  id: string;
  slug: string; // e.g. 'kc-2026-open'
  name: string; // e.g. 'KC Regional 2026 Open'
  date: string;
  location: string;
  tiers: TournamentTier[];
  matchScores: Record<string, MatchScoreRecord>; // keyed by matchId
  qualifiers: QualifierScore[];
}
