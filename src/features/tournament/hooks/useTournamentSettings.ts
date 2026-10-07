import { useTournament } from '../store';
import type { Tournament, TournamentTier, SeedingMethod } from '../types';

export interface TournamentSettingsHook {
  tournaments: Tournament[];
  activeTournamentId: string | null;
  activeTournament?: Tournament;
  isLoading: boolean;
  isHydrated: boolean;
  isDbConnected: boolean;
  dbError: string | null;
  apiError?: string | null;
  checkDbHealth: () => Promise<boolean>;
  retryConnection: () => Promise<void>;
  clearApiError?: () => void;
  simulateSampleTournament: () => Promise<Tournament | undefined>;
  setActiveTournamentId: (id: string | null) => void;
  getTournamentBySlug: (slug: string) => Tournament | undefined;
  getTierBySlug: (
    tournamentSlug: string,
    tierSlug: string
  ) => { tournament: Tournament; tier: TournamentTier } | undefined;
  createTournament: (
    data: Omit<
      Tournament,
      'id' | 'matchScores' | 'playersPool' | 'qualifierSubmissions' | 'tournamentPlayers'
    >
  ) => Promise<Tournament>;
  updateTournament: (tournamentId: string, updates: Partial<Tournament>) => Promise<Tournament | null>;
  deleteTournament: (tournamentId: string) => Promise<boolean>;
  saveTiers: (tournamentId: string, tiers: TournamentTier[]) => Promise<Tournament | null>;
  lockTournament: (tournamentId: string) => Promise<Tournament | null>;
  unlockBrackets: (tournamentId: string) => Promise<{ success: boolean; error?: string }>;
  clearAllTournamentData: (tournamentId: string) => Promise<Tournament | null>;
  seedQualifiers: (tournamentId: string) => Promise<Tournament | null>;
  simulateFullTournament: (tournamentId: string) => Promise<Tournament | null>;
  setSeedingMethod: (tournamentId: string, method: SeedingMethod) => void;
  setManualSeeds: (tournamentId: string, playerIds: string[]) => void;
  reorderManualSeed: (tournamentId: string, fromIndex: number, toIndex: number) => void;
  shuffleManualSeeds: (tournamentId: string) => void;
  addManualSeed: (tournamentId: string, playerId: string) => void;
  removeManualSeed: (tournamentId: string, playerId: string) => void;
  batchMoveManualSeeds: (tournamentId: string, playerIds: string[], direction: 'UP' | 'DOWN') => void;
  batchJumpManualSeeds: (tournamentId: string, playerIds: string[], targetSeed: number) => void;
  batchRemoveManualSeeds: (tournamentId: string, playerIds: string[]) => void;
  batchAddManualSeeds: (tournamentId: string, playerIds: string[], position: 'TOP' | 'BOTTOM') => void;
}

export function useTournamentSettings(): TournamentSettingsHook {
  const store = useTournament();
  return {
    tournaments: store.tournaments,
    activeTournamentId: store.activeTournamentId,
    activeTournament: store.activeTournament,
    isLoading: store.isLoading,
    isHydrated: store.isHydrated,
    isDbConnected: store.isDbConnected,
    dbError: store.dbError,
    apiError: store.apiError,
    checkDbHealth: store.checkDbHealth,
    retryConnection: store.retryConnection,
    clearApiError: store.clearApiError,
    simulateSampleTournament: store.simulateSampleTournament,
    setActiveTournamentId: store.setActiveTournamentId,
    getTournamentBySlug: store.getTournamentBySlug,
    getTierBySlug: store.getTierBySlug,
    createTournament: store.createTournament,
    updateTournament: store.updateTournament,
    deleteTournament: store.deleteTournament,
    saveTiers: store.saveTiers,
    lockTournament: store.lockTournament,
    unlockBrackets: store.unlockBrackets,
    clearAllTournamentData: store.clearAllTournamentData,
    seedQualifiers: store.seedQualifiers,
    simulateFullTournament: store.simulateFullTournament,
    setSeedingMethod: store.setSeedingMethod,
    setManualSeeds: store.setManualSeeds,
    reorderManualSeed: store.reorderManualSeed,
    shuffleManualSeeds: store.shuffleManualSeeds,
    addManualSeed: store.addManualSeed,
    removeManualSeed: store.removeManualSeed,
    batchMoveManualSeeds: store.batchMoveManualSeeds,
    batchJumpManualSeeds: store.batchJumpManualSeeds,
    batchRemoveManualSeeds: store.batchRemoveManualSeeds,
    batchAddManualSeeds: store.batchAddManualSeeds,
  };
}
