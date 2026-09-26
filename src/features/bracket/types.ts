export type BracketType = 'TRADITIONAL' | 'FLAT';
export type EliminationType = 'SINGLE' | 'DOUBLE';
export type BracketRouting = 'TRADITIONAL_TREE' | 'FLAT_STAGED' | 'ACCELERATED_HYBRID';
export type BracketStage = 'WINNERS' | 'LOSERS' | 'GRAND_FINALS' | 'GRAND_FINALS_RESET';

export interface SeededPlayer {
  id: string;
  name: string;
  seed: number; // 1-indexed seed number
  country?: string;
  playstyle?: string;
}

export interface MatchParticipant {
  player: SeededPlayer | null;
  sourceMatchId?: string;
  isBye?: boolean;
}

export interface MatchSlotFeeder {
  matchId?: string;
  type: 'WINNER' | 'LOSER' | 'DIRECT';
}

export type BracketPhase = 'QUALIFIERS' | 'CHAMPIONSHIP';
export type BracketSubTrack = 'ACCELERATED' | 'PRE_MERGE_UPPER' | 'PRE_MERGE_LOWER' | 'RE_CLIMB';

export interface BracketMatch {
  id: string;
  tierId?: string;
  stage?: BracketStage;
  phase?: BracketPhase;
  subTrack?: BracketSubTrack;
  roundIdentifier?: string; // e.g. 'W1', 'W2', 'L1', 'L2', 'GF', 'GF_RESET'
  roundNumber: number; // 1-indexed (1, 2, ..., totalRounds)
  roundIndex?: number; // 0-indexed DAG round index
  matchNumber: number; // Sequential match number across bracket
  player1: MatchParticipant;
  player2: MatchParticipant;
  slotA?: MatchSlotFeeder;
  slotB?: MatchSlotFeeder;
  winnerId: string | null;
  loserId: string | null;
  nextMatchId?: string;
  nextMatchSlot?: 1 | 2;
  loserNextMatchId?: string;
  loserNextMatchSlot?: 1 | 2;
  bestOf: number;
  isBye: boolean;
}

export interface BracketRound {
  roundNumber: number;
  name: string;
  shortName?: string;
  stage?: BracketStage;
  phase?: BracketPhase;
  roundIdentifier?: string;
  matches: BracketMatch[];
}

export interface BracketStructure {
  tierId?: string;
  type: BracketType;
  eliminationType?: EliminationType;
  bracketRouting?: BracketRouting;
  totalPlayers: number;
  totalRounds: number;
  flatWidth?: number;
  finalsCutoff?: number;
  rounds: BracketRound[];
  matchesById: Record<string, BracketMatch>;
  grandFinalsResetMatchId?: string;
}

export interface GenerateBracketOptions {
  tierId?: string;
  bestOf?: number;
  eliminationType?: EliminationType;
  bracketRouting?: BracketRouting;
  flatWidth?: number;
  finalsCutoff?: number;
  roundBestOfOverrides?: Record<string | number, number>;
}

export const isMatchPlayable = (match: BracketMatch): boolean => {
  return match.player1.player !== null && match.player2.player !== null && !match.isBye;
};
