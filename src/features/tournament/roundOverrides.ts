import { TournamentTier } from './types';
import {
  generateTraditionalBracket,
  generateFlatBracket,
  generateDoubleEliminationBracket,
} from '../bracket/math';

export interface AvailableRound {
  roundNumber: number;
  roundIdentifier?: string;
  stage?: string;
  name: string;
}

/**
 * Computes available rounds and their canonical human-readable names for a tier
 * dynamically derived from participant count and bracket structure.
 */
export function getAvailableRoundsForTier(tier: TournamentTier): AvailableRound[] {
  try {
    const dummyPlayers = Array.from({ length: Math.max(2, tier.playerCount) }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));

    if (tier.eliminationType === 'DOUBLE') {
      const b = generateDoubleEliminationBracket(dummyPlayers, {
        bestOf: tier.bestOf,
        bracketRouting: tier.bracketRouting,
        flatWidth: tier.flatWidth,
        finalsCutoff: tier.finalsCutoff,
      });
      const rounds: AvailableRound[] = b.rounds.map((r) => ({
        roundNumber: r.roundNumber,
        roundIdentifier: r.roundIdentifier,
        stage: r.stage,
        name: r.name ? `${r.name}` : `Round ${r.roundNumber}`,
      }));

      // Add GF Reset match override option (not applicable to ACCELERATED_HYBRID which has clean single-elim finals)
      if (tier.bracketRouting !== 'ACCELERATED_HYBRID') {
        rounds.push({
          roundNumber: b.totalRounds + 1,
          roundIdentifier: 'GF_RESET',
          stage: 'GRAND_FINALS_RESET',
          name: 'Grand Finals Reset (Match 2)',
        });
      }

      return rounds;
    }

    const b =
      tier.bracketType === 'FLAT'
        ? generateFlatBracket(dummyPlayers, tier.flatWidth || 4)
        : generateTraditionalBracket(dummyPlayers);

    return b.rounds.map((r) => ({
      roundNumber: r.roundNumber,
      roundIdentifier: r.roundIdentifier,
      stage: r.stage,
      name: r.name ? `${r.name} (Round ${r.roundNumber})` : `Round ${r.roundNumber}`,
    }));
  } catch {
    const totalRounds = Math.max(1, Math.ceil(Math.log2(tier.playerCount || 8)));
    return Array.from({ length: totalRounds }, (_, i) => ({
      roundNumber: i + 1,
      name: `Round ${i + 1}`,
    }));
  }
}

/**
 * Prunes any round overrides that are out of bounds (e.g. when player count is reduced).
 */
export function pruneInvalidRoundOverrides(tier: TournamentTier): TournamentTier {
  if (!tier.roundBestOfOverrides || Object.keys(tier.roundBestOfOverrides).length === 0) {
    return tier;
  }
  const rounds = getAvailableRoundsForTier(tier);
  const validKeys = new Set<string>();
  rounds.forEach((r) => {
    validKeys.add(String(r.roundNumber));
    if (r.roundIdentifier) {
      validKeys.add(r.roundIdentifier);
    }
  });

  let changed = false;
  const nextOverrides: Record<string | number, number> = {};
  for (const [key, bo] of Object.entries(tier.roundBestOfOverrides)) {
    if (validKeys.has(key)) {
      // Preserve numeric keys as numbers if they parse cleanly as numbers, else string
      const numKey = parseInt(key, 10);
      if (!isNaN(numKey) && String(numKey) === key) {
        nextOverrides[numKey] = bo;
      } else {
        nextOverrides[key] = bo;
      }
    } else {
      changed = true;
    }
  }
  if (changed) {
    return { ...tier, roundBestOfOverrides: nextOverrides };
  }
  return tier;
}
