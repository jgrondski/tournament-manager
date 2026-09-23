import { Tournament, PlayerProfile } from '../tournament/types';
import { OrganizationMetrics, OrgCompetitorRecord } from './types';

export function computeOrganizationMetrics(
  orgId: string,
  tournaments: Tournament[]
): OrganizationMetrics {
  const orgTournaments = tournaments.filter(t => t.organizationId === orgId);

  let totalMatches = 0;
  let totalSubmissions = 0;
  const uniquePlayerIds = new Set<string>();
  const champions: OrganizationMetrics['champions'] = [];
  let completedTournaments = 0;

  orgTournaments.forEach(t => {
    // Unique players
    (t.playersPool || []).forEach(p => uniquePlayerIds.add(p.id));
    Object.keys(t.tournamentPlayers || {}).forEach(pid => uniquePlayerIds.add(pid));

    // Submissions count
    const subsCount = (t.qualifierSubmissions?.length || 0) + (t.qualifiers?.length || 0);
    totalSubmissions += subsCount;

    // Matches count & champions
    const matches = Object.values(t.matchScores || {});
    const completedMatches = matches.filter(m => m.isComplete);
    totalMatches += completedMatches.length;

    let tournamentAllTiersComplete = t.tiers.length > 0;

    t.tiers.forEach(tier => {
      const finalRound = tier.bracket?.rounds?.[tier.bracket.rounds.length - 1];
      const finalMatch = finalRound?.matches?.[0];
      if (finalMatch) {
        const scoreRec = t.matchScores?.[finalMatch.id];
        const winnerId = scoreRec?.winnerPlayerId || finalMatch.winnerId;
        if (winnerId) {
          const player = (t.playersPool || []).find(p => p.id === winnerId);
          const p1Name = finalMatch.player1.player?.name;
          const p2Name = finalMatch.player2.player?.name;
          const matchPlayerName = finalMatch.player1.player?.id === winnerId ? p1Name : finalMatch.player2.player?.id === winnerId ? p2Name : undefined;
          champions.push({
            tournamentId: t.id,
            tournamentName: t.name,
            tierName: tier.name,
            winnerId,
            winnerName: player?.name || matchPlayerName || winnerId,
          });
        } else {
          tournamentAllTiersComplete = false;
        }
      } else {
        tournamentAllTiersComplete = false;
      }
    });

    if (tournamentAllTiersComplete && t.isLocked) {
      completedTournaments += 1;
    }
  });

  return {
    totalTournaments: orgTournaments.length,
    activeTournaments: orgTournaments.filter(t => t.isLocked && !champions.some(c => c.tournamentId === t.id)).length,
    completedTournaments,
    totalCompetitors: uniquePlayerIds.size,
    totalMatches,
    totalSubmissions,
    champions,
  };
}

export function computeOrgCompetitorLeaderboard(
  orgId: string,
  tournaments: Tournament[],
  globalPlayers: PlayerProfile[]
): OrgCompetitorRecord[] {
  const orgTournaments = tournaments.filter(t => t.organizationId === orgId);
  const playerStatsMap = new Map<
    string,
    {
      tournamentsEntered: Set<string>;
      matchWins: number;
      matchLosses: number;
      bestScore: number;
      maxoutCount: number;
      profile?: PlayerProfile;
    }
  >();

  // Helper to ensure player entry in map
  const getEntry = (playerId: string) => {
    let entry = playerStatsMap.get(playerId);
    if (!entry) {
      const profile = globalPlayers.find(p => p.id === playerId);
      entry = {
        tournamentsEntered: new Set<string>(),
        matchWins: 0,
        matchLosses: 0,
        bestScore: 0,
        maxoutCount: 0,
        profile,
      };
      playerStatsMap.set(playerId, entry);
    }
    return entry;
  };

  orgTournaments.forEach(t => {
    // Register players in this tournament
    (t.playersPool || []).forEach(p => {
      const e = getEntry(p.id);
      if (!e.profile) e.profile = p;
      e.tournamentsEntered.add(t.id);
    });

    Object.keys(t.tournamentPlayers || {}).forEach(pid => {
      const e = getEntry(pid);
      e.tournamentsEntered.add(t.id);
    });

    // Submissions
    (t.qualifierSubmissions || []).forEach(sub => {
      const e = getEntry(sub.playerId);
      e.tournamentsEntered.add(t.id);
      if (sub.score > e.bestScore) {
        e.bestScore = sub.score;
      }
      if (sub.score >= 999999) {
        e.maxoutCount += 1;
      }
    });

    // Match Records
    Object.values(t.matchScores || {}).forEach(m => {
      if (m.isComplete) {
        if (m.winnerPlayerId) {
          const winnerEntry = getEntry(m.winnerPlayerId);
          winnerEntry.tournamentsEntered.add(t.id);
          winnerEntry.matchWins += 1;
        }
        if (m.loserPlayerId) {
          const loserEntry = getEntry(m.loserPlayerId);
          loserEntry.tournamentsEntered.add(t.id);
          loserEntry.matchLosses += 1;
        }
      }
    });
  });

  const records: OrgCompetitorRecord[] = [];

  playerStatsMap.forEach((stats, playerId) => {
    const totalMatches = stats.matchWins + stats.matchLosses;
    const winRate = totalMatches > 0 ? Math.round((stats.matchWins / totalMatches) * 100) : 0;
    const name = stats.profile?.name || playerId;

    records.push({
      playerId,
      playerName: name,
      country: stats.profile?.country,
      playstyle: stats.profile?.playstyle,
      tournamentsCount: stats.tournamentsEntered.size,
      matchWins: stats.matchWins,
      matchLosses: stats.matchLosses,
      winRate,
      bestScore: stats.bestScore,
      maxoutCount: stats.maxoutCount,
    });
  });

  // Sort by match wins descending, then best score descending, then tournaments count descending
  return records.sort((a, b) => {
    if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    if (b.maxoutCount !== a.maxoutCount) return b.maxoutCount - a.maxoutCount;
    return b.tournamentsCount - a.tournamentsCount;
  });
}
