export type BracketType = 'TRADITIONAL' | 'FLAT';

export interface SeededPlayer {
  id: string;
  name: string;
  seed: number; // 1-indexed seed number
}

export interface MatchParticipant {
  player: SeededPlayer | null;
  sourceMatchId?: string;
  isBye?: boolean;
}

export interface BracketMatch {
  id: string;
  tierId?: string;
  roundNumber: number; // 1-indexed (1, 2, ..., totalRounds)
  matchNumber: number; // 1-indexed within the round
  player1: MatchParticipant;
  player2: MatchParticipant;
  winnerId: string | null;
  loserId: string | null;
  nextMatchId?: string;
  nextMatchSlot?: 1 | 2;
  bestOf: number;
  isBye: boolean;
}

export interface BracketRound {
  roundNumber: number;
  name: string;
  matches: BracketMatch[];
}

export interface BracketStructure {
  tierId?: string;
  type: BracketType;
  totalPlayers: number;
  totalRounds: number;
  flatWidth?: number;
  rounds: BracketRound[];
  matchesById: Record<string, BracketMatch>;
}

export interface GenerateBracketOptions {
  tierId?: string;
  bestOf?: number;
  roundBestOfOverrides?: Record<number, number>;
}

export const isMatchPlayable = (match: BracketMatch): boolean => {
  return match.player1.player !== null && match.player2.player !== null && !match.isBye;
};
