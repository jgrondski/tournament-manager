import { TournamentTier, MatchScoreRecord } from './types';
import { SeededPlayer } from '../bracket/types';

export interface StandingsPlacement {
  rankLabel: string; // "1st Place", "2nd Place", "3rd/4th Place", "5th–8th Place"
  rankNumber: number; // 1, 2, 3, 5, 9...
  player: SeededPlayer;
  status: 'champion' | 'runner_up' | 'semifinalist' | 'quarterfinalist' | 'participant';
}

/**
 * Derives final tournament placements for a tier from completed match records.
 */
export function calculateTierStandings(
  tier: TournamentTier,
  matchScores: Record<string, MatchScoreRecord>
): StandingsPlacement[] {
  const rounds = tier.bracket.rounds;
  if (rounds.length === 0) return [];

  const placements: StandingsPlacement[] = [];
  const placedPlayerIds = new Set<string>();

  // 1. Finals (Round from finals = 0)
  const finalsRound = rounds[rounds.length - 1];
  const finalsMatch = finalsRound?.matches[0];
  if (finalsMatch) {
    const record = matchScores[finalsMatch.id];
    const p1 = finalsMatch.player1.player;
    const p2 = finalsMatch.player2.player;

    const winnerId = record?.winnerPlayerId || finalsMatch.winnerId;

    if (winnerId && (winnerId === p1?.id || winnerId === p2?.id)) {
      const champ = winnerId === p1?.id ? p1 : p2;
      const runnerUp = winnerId === p1?.id ? p2 : p1;

      if (champ && !placedPlayerIds.has(champ.id)) {
        placements.push({
          rankLabel: '1st Place (Champion)',
          rankNumber: 1,
          player: champ,
          status: 'champion',
        });
        placedPlayerIds.add(champ.id);
      }

      if (runnerUp && !placedPlayerIds.has(runnerUp.id)) {
        placements.push({
          rankLabel: '2nd Place (Runner-up)',
          rankNumber: 2,
          player: runnerUp,
          status: 'runner_up',
        });
        placedPlayerIds.add(runnerUp.id);
      }
    }
  }

  // 2. Semifinals (Round from finals = 1) -> 3rd/4th Place
  if (rounds.length >= 2) {
    const semisRound = rounds[rounds.length - 2];
    for (const match of semisRound.matches) {
      const record = matchScores[match.id];
      const loserId = record?.loserPlayerId || match.loserId;
      const p1 = match.player1.player;
      const p2 = match.player2.player;
      const loser = loserId === p1?.id ? p1 : loserId === p2?.id ? p2 : null;

      if (loser && !placedPlayerIds.has(loser.id)) {
        placements.push({
          rankLabel: '3rd/4th Place',
          rankNumber: 3,
          player: loser,
          status: 'semifinalist',
        });
        placedPlayerIds.add(loser.id);
      }
    }
  }

  // 3. Quarterfinals (Round from finals = 2) -> 5th–8th Place
  if (rounds.length >= 3) {
    const quartersRound = rounds[rounds.length - 3];
    for (const match of quartersRound.matches) {
      const record = matchScores[match.id];
      const loserId = record?.loserPlayerId || match.loserId;
      const p1 = match.player1.player;
      const p2 = match.player2.player;
      const loser = loserId === p1?.id ? p1 : loserId === p2?.id ? p2 : null;

      if (loser && !placedPlayerIds.has(loser.id)) {
        placements.push({
          rankLabel: '5th–8th Place',
          rankNumber: 5,
          player: loser,
          status: 'quarterfinalist',
        });
        placedPlayerIds.add(loser.id);
      }
    }
  }

  // 4. Cascading earlier rounds
  for (let rIdx = rounds.length - 4; rIdx >= 0; rIdx--) {
    const round = rounds[rIdx];
    const roundsFromFinals = rounds.length - 1 - rIdx;
    const startRank = Math.pow(2, roundsFromFinals) + 1;
    const endRank = Math.pow(2, roundsFromFinals + 1);
    const label = `${startRank}th–${endRank}th Place`;

    for (const match of round.matches) {
      const record = matchScores[match.id];
      const loserId = record?.loserPlayerId || match.loserId;
      const p1 = match.player1.player;
      const p2 = match.player2.player;
      const loser = loserId === p1?.id ? p1 : loserId === p2?.id ? p2 : null;

      if (loser && !placedPlayerIds.has(loser.id)) {
        placements.push({
          rankLabel: label,
          rankNumber: startRank,
          player: loser,
          status: 'participant',
        });
        placedPlayerIds.add(loser.id);
      }
    }
  }

  return placements;
}
