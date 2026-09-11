import { BracketMatch, BracketStructure, SeededPlayer } from '../types';

/**
 * Pure state reducer to advance a match winner through the bracket graph.
 * Returns a new immutable BracketStructure with updated match state and downstream participant slots.
 */
export function advanceMatchWinner(
  bracket: BracketStructure,
  matchId: string,
  winnerId: string
): BracketStructure {
  const targetMatch = bracket.matchesById[matchId];
  if (!targetMatch) {
    throw new Error(`Match with id "${matchId}" not found in bracket.`);
  }

  // Validate that the declared winner is actually playing in this match
  const p1 = targetMatch.player1.player;
  const p2 = targetMatch.player2.player;

  let winnerPlayer: SeededPlayer | null = null;
  let loserId: string | null = null;

  if (p1 && p1.id === winnerId) {
    winnerPlayer = p1;
    loserId = p2 ? p2.id : null;
  } else if (p2 && p2.id === winnerId) {
    winnerPlayer = p2;
    loserId = p1 ? p1.id : null;
  } else {
    throw new Error(
      `Player with id "${winnerId}" is not a participant in match "${matchId}".`
    );
  }

  // Deep clone matches to preserve pure functional immutability
  const updatedMatchesById: Record<string, BracketMatch> = {};
  for (const [id, m] of Object.entries(bracket.matchesById)) {
    updatedMatchesById[id] = {
      ...m,
      player1: { ...m.player1, player: m.player1.player ? { ...m.player1.player } : null },
      player2: { ...m.player2, player: m.player2.player ? { ...m.player2.player } : null },
    };
  }

  // Update target match
  const updatedMatch = updatedMatchesById[matchId];
  updatedMatch.winnerId = winnerId;
  updatedMatch.loserId = loserId;

  // Propagate winner downstream
  const propagateWinner = (m: BracketMatch, winner: SeededPlayer) => {
    if (!m.nextMatchId || !m.nextMatchSlot) {
      return;
    }

    const nextMatch = updatedMatchesById[m.nextMatchId];
    if (!nextMatch) {
      return;
    }

    if (m.nextMatchSlot === 1) {
      nextMatch.player1 = {
        ...nextMatch.player1,
        player: winner,
        sourceMatchId: m.id,
      };
    } else {
      nextMatch.player2 = {
        ...nextMatch.player2,
        player: winner,
        sourceMatchId: m.id,
      };
    }
  };

  propagateWinner(updatedMatch, winnerPlayer);

  // Rebuild rounds array with new match references
  const updatedRounds = bracket.rounds.map((round) => ({
    ...round,
    matches: round.matches.map((m) => updatedMatchesById[m.id]),
  }));

  return {
    ...bracket,
    rounds: updatedRounds,
    matchesById: updatedMatchesById,
  };
}

/**
 * Pure state reducer to retract a match winner and clear downstream feeder slots.
 * Returns a new immutable BracketStructure with reset match winner state.
 */
export function retractMatchWinner(
  bracket: BracketStructure,
  matchId: string
): BracketStructure {
  const targetMatch = bracket.matchesById[matchId];
  if (!targetMatch) {
    return bracket;
  }

  // Deep clone matches to preserve pure functional immutability
  const updatedMatchesById: Record<string, BracketMatch> = {};
  for (const [id, m] of Object.entries(bracket.matchesById)) {
    updatedMatchesById[id] = {
      ...m,
      player1: { ...m.player1, player: m.player1.player ? { ...m.player1.player } : null },
      player2: { ...m.player2, player: m.player2.player ? { ...m.player2.player } : null },
    };
  }

  // Clear target match winner and loser
  const updatedMatch = updatedMatchesById[matchId];
  updatedMatch.winnerId = null;
  updatedMatch.loserId = null;

  // Clear downstream slot and cascade if downstream match had also declared a winner
  const clearDownstream = (m: BracketMatch) => {
    if (!m.nextMatchId || !m.nextMatchSlot) {
      return;
    }

    const nextMatch = updatedMatchesById[m.nextMatchId];
    if (!nextMatch) {
      return;
    }

    let clearedPlayer = false;
    if (m.nextMatchSlot === 1 && nextMatch.player1.sourceMatchId === m.id) {
      if (nextMatch.player1.player !== null) {
        nextMatch.player1.player = null;
        clearedPlayer = true;
      }
    } else if (m.nextMatchSlot === 2 && nextMatch.player2.sourceMatchId === m.id) {
      if (nextMatch.player2.player !== null) {
        nextMatch.player2.player = null;
        clearedPlayer = true;
      }
    }

    // If downstream match lost a participant and had a winner declared, cascade retraction
    if (clearedPlayer && (nextMatch.winnerId || nextMatch.loserId)) {
      nextMatch.winnerId = null;
      nextMatch.loserId = null;
      clearDownstream(nextMatch);
    }
  };

  clearDownstream(updatedMatch);

  // Rebuild rounds array with new match references
  const updatedRounds = bracket.rounds.map(round => ({
    ...round,
    matches: round.matches.map(m => updatedMatchesById[m.id]),
  }));

  return {
    ...bracket,
    rounds: updatedRounds,
    matchesById: updatedMatchesById,
  };
}

