import { TournamentTier } from './types';
import { generateTraditionalBracket, generateFlatBracket } from '../bracket/math';

/**
 * Computes available rounds and their canonical human-readable names for a tier
 * dynamically derived from participant count and bracket structure.
 */
export function getAvailableRoundsForTier(tier: TournamentTier): Array<{ roundNumber: number; name: string }> {
  try {
    const dummyPlayers = Array.from({ length: Math.max(2, tier.playerCount) }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));
    const b =
      tier.bracketType === 'FLAT'
        ? generateFlatBracket(dummyPlayers, tier.flatWidth || 4)
        : generateTraditionalBracket(dummyPlayers);
    return b.rounds.map(r => ({
      roundNumber: r.roundNumber,
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
  const validRoundNumbers = new Set(rounds.map(r => r.roundNumber));
  let changed = false;
  const nextOverrides: Record<number, number> = {};
  for (const [rStr, bo] of Object.entries(tier.roundBestOfOverrides)) {
    const rNum = parseInt(rStr, 10);
    if (validRoundNumbers.has(rNum)) {
      nextOverrides[rNum] = bo;
    } else {
      changed = true;
    }
  }
  if (changed) {
    return { ...tier, roundBestOfOverrides: nextOverrides };
  }
  return tier;
}
