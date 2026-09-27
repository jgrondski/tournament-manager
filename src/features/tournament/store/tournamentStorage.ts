import { Tournament, PlayerProfile } from '../types';
import { canonicalizeBracketRounds } from '../../bracket/types';
import { ensureSequentialMatchNumbers } from '../../bracket/math';
import { generateDraftBracketsForTournament } from '../../qualifiers/scoring';

export const STORAGE_KEY = 'tournament_manager_tournaments_v4';
export const LEGACY_STORAGE_KEY = 'tournament_manager_tournaments_v3';
export const GLOBAL_PLAYERS_STORAGE_KEY = 'classic_tetris_global_players';
export const LAST_ACTIVE_TOURNAMENT_KEY = 'tm_last_active_tournament_id';

/**
 * Loads and auto-heals tournaments from browser LocalStorage.
 */
export function loadStoredTournaments(): Tournament[] {
  try {
    let saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      saved = localStorage.getItem(LEGACY_STORAGE_KEY);
    }
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t: Tournament & { isVerified?: boolean; qualsClosed?: boolean }) => {
          const isLocked = Boolean(t.isLocked ?? t.isVerified);
          const { isVerified: _iv, qualsClosed: _qc, ...rest } = t;
          const tourney: Tournament = {
            ...rest,
            organizationId: rest.organizationId || 'org_ctwc',
            isLocked,
          };

          // Auto-heal any FLAT_STAGED tiers generated with the obsolete WR2 seed formula
          const hasCorruptedFlatStagedTier = tourney.tiers.some((tier) => {
            if (tier.eliminationType === 'DOUBLE' && tier.bracketRouting === 'FLAT_STAGED') {
              const totalP = tier.playerCount || tier.bracket?.totalPlayers || 0;
              const fw = tier.flatWidth || 4;
              const w2m1 = tier.bracket?.matchesById?.[`${tier.id ? `${tier.id}-` : ''}w2-m1`];
              if (w2m1?.player1?.player?.seed && totalP >= 2 * fw) {
                return w2m1.player1.player.seed > totalP - 2 * fw;
              }
            }
            return false;
          });

          if (hasCorruptedFlatStagedTier) {
            try {
              tourney.tiers = generateDraftBracketsForTournament(tourney);
            } catch {
              // ignore
            }
          }

          // Auto-heal round names to canonical source of truth and sequential match numbers
          tourney.tiers.forEach((tier) => {
            if (tier.bracket?.rounds) {
              canonicalizeBracketRounds(tier.bracket.rounds);
              const matchNums = tier.bracket.rounds.flatMap((r) => r.matches.map((m) => m.matchNumber));
              const uniqueNums = new Set(matchNums);
              const hasDuplicatesOrZero = uniqueNums.size !== matchNums.length || uniqueNums.has(0);
              if (hasDuplicatesOrZero) {
                ensureSequentialMatchNumbers(tier.bracket);
              }
            }
          });

          return tourney;
        });
      }
    }
  } catch {
    // ignore parse errors and fallback
  }
  return [];
}

export function loadStoredGlobalPlayers(): PlayerProfile[] {
  try {
    const saved = localStorage.getItem(GLOBAL_PLAYERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore parse errors and fallback
  }
  return [];
}

export function loadStoredActiveTournamentId(): string | null {
  try {
    return localStorage.getItem(LAST_ACTIVE_TOURNAMENT_KEY);
  } catch {
    return null;
  }
}

export function saveStoredTournaments(tournaments: Tournament[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
  } catch {
    // storage quota or private mode fallback
  }
}

export function saveStoredGlobalPlayers(players: PlayerProfile[]): void {
  try {
    localStorage.setItem(GLOBAL_PLAYERS_STORAGE_KEY, JSON.stringify(players));
  } catch {
    // storage quota or private mode fallback
  }
}

export function saveStoredActiveTournamentId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(LAST_ACTIVE_TOURNAMENT_KEY, id);
    } else {
      localStorage.removeItem(LAST_ACTIVE_TOURNAMENT_KEY);
    }
  } catch {
    // ignore
  }
}
