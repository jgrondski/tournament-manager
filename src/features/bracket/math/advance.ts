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

  // Propagate loser downstream (Double Elimination)
  const loserPlayer = p1 && p1.id === loserId ? p1 : p2 && p2.id === loserId ? p2 : null;
  const propagateLoser = (m: BracketMatch, loser: SeededPlayer | null) => {
    if (!m.loserNextMatchId || !m.loserNextMatchSlot || !loser) {
      return;
    }

    const loserNextMatch = updatedMatchesById[m.loserNextMatchId];
    if (!loserNextMatch) {
      return;
    }

    if (m.loserNextMatchSlot === 1) {
      loserNextMatch.player1 = {
        ...loserNextMatch.player1,
        player: loser,
        sourceMatchId: m.id,
      };
    } else {
      loserNextMatch.player2 = {
        ...loserNextMatch.player2,
        player: loser,
        sourceMatchId: m.id,
      };
    }
  };

  propagateLoser(updatedMatch, loserPlayer);

  // Dynamic Grand Finals Reset handling
  const resetMatchId = `${updatedMatch.tierId ? updatedMatch.tierId + '-' : ''}gf-reset`;
  let grandFinalsResetMatchId: string | undefined = bracket.grandFinalsResetMatchId;

  if (updatedMatch.stage === 'GRAND_FINALS' && updatedMatch.roundIdentifier === 'GF') {
    const wbChamp = updatedMatch.player1.player;
    const lbChamp = updatedMatch.player2.player;

    if (lbChamp && winnerId === lbChamp.id && wbChamp) {
      // Losers Champion won Grand Finals Match 1 -> Instigate Grand Finals Reset Match 2
      const gfResetMatch: BracketMatch = {
        id: resetMatchId,
        tierId: updatedMatch.tierId,
        stage: 'GRAND_FINALS_RESET',
        roundIdentifier: 'GF_RESET',
        roundNumber: updatedMatch.roundNumber,
        matchNumber: (updatedMatch.matchNumber || 0) + 1,
        player1: { player: { ...wbChamp }, sourceMatchId: updatedMatch.id },
        player2: { player: { ...lbChamp }, sourceMatchId: updatedMatch.id },
        winnerId: null,
        loserId: null,
        bestOf: updatedMatch.bestOf,
        isBye: false,
      };

      updatedMatchesById[resetMatchId] = gfResetMatch;
      grandFinalsResetMatchId = resetMatchId;
    } else if (wbChamp && winnerId === wbChamp.id) {
      // Winners Champion won Grand Finals Match 1 -> Tier complete, remove reset match if previously present
      delete updatedMatchesById[resetMatchId];
      grandFinalsResetMatchId = undefined;
    }
  }

  // Rebuild rounds array with new match references
  const updatedRounds = bracket.rounds.map((round) => {
    let matches = round.matches
      .filter((m) => updatedMatchesById[m.id])
      .map((m) => updatedMatchesById[m.id]);

    // If this is the Grand Finals round and a reset match exists, ensure it is included
    if (round.stage === 'GRAND_FINALS' && grandFinalsResetMatchId && updatedMatchesById[grandFinalsResetMatchId]) {
      const resetMatch = updatedMatchesById[grandFinalsResetMatchId];
      if (!matches.some((m) => m.id === grandFinalsResetMatchId)) {
        matches = [...matches, resetMatch];
      }
    }

    return {
      ...round,
      matches,
    };
  });

  return {
    ...bracket,
    grandFinalsResetMatchId,
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
    // 1. Clear winner propagation
    if (m.nextMatchId && m.nextMatchSlot) {
      const nextMatch = updatedMatchesById[m.nextMatchId];
      if (nextMatch) {
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

        if (clearedPlayer && (nextMatch.winnerId || nextMatch.loserId)) {
          nextMatch.winnerId = null;
          nextMatch.loserId = null;
          clearDownstream(nextMatch);
        }
      }
    }

    // 2. Clear loser propagation (Double Elimination)
    if (m.loserNextMatchId && m.loserNextMatchSlot) {
      const loserNextMatch = updatedMatchesById[m.loserNextMatchId];
      if (loserNextMatch) {
        let clearedPlayer = false;
        if (m.loserNextMatchSlot === 1 && loserNextMatch.player1.sourceMatchId === m.id) {
          if (loserNextMatch.player1.player !== null) {
            loserNextMatch.player1.player = null;
            clearedPlayer = true;
          }
        } else if (m.loserNextMatchSlot === 2 && loserNextMatch.player2.sourceMatchId === m.id) {
          if (loserNextMatch.player2.player !== null) {
            loserNextMatch.player2.player = null;
            clearedPlayer = true;
          }
        }

        if (clearedPlayer && (loserNextMatch.winnerId || loserNextMatch.loserId)) {
          loserNextMatch.winnerId = null;
          loserNextMatch.loserId = null;
          clearDownstream(loserNextMatch);
        }
      }
    }
  };

  clearDownstream(updatedMatch);

  // If retracting Grand Finals Match 1, remove any dynamically generated Reset match
  let grandFinalsResetMatchId = bracket.grandFinalsResetMatchId;
  const resetMatchId = `${updatedMatch.tierId ? updatedMatch.tierId + '-' : ''}gf-reset`;
  if (updatedMatch.stage === 'GRAND_FINALS' && updatedMatch.roundIdentifier === 'GF') {
    delete updatedMatchesById[resetMatchId];
    grandFinalsResetMatchId = undefined;
  }

  // Rebuild rounds array with new match references
  const updatedRounds = bracket.rounds.map((round) => ({
    ...round,
    matches: round.matches
      .filter((m) => updatedMatchesById[m.id])
      .map((m) => updatedMatchesById[m.id]),
  }));

  return {
    ...bracket,
    grandFinalsResetMatchId,
    rounds: updatedRounds,
    matchesById: updatedMatchesById,
  };
}

