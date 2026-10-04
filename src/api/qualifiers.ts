import { qualifierSubmissions, tournaments } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db';

export interface QualifierSubmissionRecord {
  id: string;
  tournamentId: string;
  playerId: string;
  score: number;
  createdAt: Date;
}

export interface LeaderboardEntry {
  playerId: string;
  rank: number;
  totalScore: number;
  submissionCount: number;
  topScores: number[];
}

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

export async function submitQualifierScore(
  tournamentId: string,
  playerId: string,
  score: number
): Promise<QualifierSubmissionRecord> {
  if (score < 0) throw new Error('Score must be positive');

  const db = getDb();
  let resolvedTourneyId = tournamentId;
  if (!isUuid(tournamentId)) {
    const [tourney] = await db
      .select({ id: tournaments.id, qualsClosed: tournaments.qualsClosed })
      .from(tournaments)
      .where(eq(tournaments.slug, tournamentId))
      .limit(1);
    if (!tourney) throw new Error('Tournament not found');
    if (tourney.qualsClosed) throw new Error('Qualifiers are closed for this tournament');
    resolvedTourneyId = tourney.id;
  } else {
    const t = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
    if (t.length === 0) throw new Error('Tournament not found');
    if (t[0].qualsClosed) throw new Error('Qualifiers are closed for this tournament');
  }

  const [created] = await db
    .insert(qualifierSubmissions)
    .values({
      tournamentId: resolvedTourneyId,
      playerId,
      score,
    })
    .returning();
  return created as QualifierSubmissionRecord;
}

export async function submitQualifiersBatch(
  tournamentId: string,
  submissions: Array<{ playerId: string; score: number }>
): Promise<QualifierSubmissionRecord[]> {
  const db = getDb();
  if (submissions.length === 0) return [];
  let resolvedTourneyId = tournamentId;
  if (!isUuid(tournamentId)) {
    const [tourney] = await db
      .select({ id: tournaments.id, qualsClosed: tournaments.qualsClosed })
      .from(tournaments)
      .where(eq(tournaments.slug, tournamentId))
      .limit(1);
    if (!tourney) throw new Error('Tournament not found');
    if (tourney.qualsClosed) throw new Error('Qualifiers are closed for this tournament');
    resolvedTourneyId = tourney.id;
  } else {
    const t = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
    if (t.length === 0) throw new Error('Tournament not found');
    if (t[0].qualsClosed) throw new Error('Qualifiers are closed for this tournament');
  }

  const inserted = await db
    .insert(qualifierSubmissions)
    .values(submissions.map(s => ({
      tournamentId: resolvedTourneyId,
      playerId: s.playerId,
      score: s.score,
    })))
    .returning();
  return inserted as QualifierSubmissionRecord[];
}

export async function clearTournamentQualifiers(tournamentId: string): Promise<boolean> {
  const db = getDb();
  let resolvedTourneyId = tournamentId;
  if (!isUuid(tournamentId)) {
    const [tourney] = await db
      .select({ id: tournaments.id })
      .from(tournaments)
      .where(eq(tournaments.slug, tournamentId))
      .limit(1);
    if (!tourney) return false;
    resolvedTourneyId = tourney.id;
  }
  const res = await db
    .delete(qualifierSubmissions)
    .where(eq(qualifierSubmissions.tournamentId, resolvedTourneyId))
    .returning();
  return res.length > 0;
}

export async function getQualifierLeaderboard(tournamentId: string): Promise<LeaderboardEntry[]> {
  const db = getDb();
  let resolvedTourneyId = tournamentId;
  let tRow: any = null;
  if (!isUuid(tournamentId)) {
    const [tourney] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.slug, tournamentId))
      .limit(1);
    if (!tourney) return [];
    tRow = tourney;
    resolvedTourneyId = tourney.id;
  } else {
    const t = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
    if (t.length === 0) return [];
    tRow = t[0];
  }
  const tourneyQualFormat = tRow.qualFormat;
  const qualAvgCount = tRow.qualAverageCount || 2;
  const pointsConfig = tRow.pointsConfig || [];

  const allSubmissions = (await db
    .select()
    .from(qualifierSubmissions)
    .where(eq(qualifierSubmissions.tournamentId, resolvedTourneyId))
    .orderBy(desc(qualifierSubmissions.score))) as QualifierSubmissionRecord[];

  // Group by player
  const playerScores = new Map<string, number[]>();
  for (const s of allSubmissions) {
    const list = playerScores.get(s.playerId) || [];
    list.push(s.score);
    playerScores.set(s.playerId, list);
  }

  const entries: Array<Omit<LeaderboardEntry, 'rank'>> = [];

  for (const [playerId, scores] of playerScores.entries()) {
    scores.sort((a, b) => b - a);

    let totalScore = 0;
    if (tourneyQualFormat === 'HIGH_SCORE') {
      totalScore = scores[0] || 0;
    } else if (tourneyQualFormat === 'AVERAGE_OF_X') {
      const topX = scores.slice(0, qualAvgCount);
      const sum = topX.reduce((acc, curr) => acc + curr, 0);
      totalScore = topX.length > 0 ? Math.round(sum / topX.length) : 0;
    } else if (tourneyQualFormat === 'POINTS') {
      for (const sc of scores) {
        let pts = 0;
        for (const cfg of pointsConfig) {
          if (sc >= cfg.minScore) {
            pts = Math.max(pts, cfg.points);
          }
        }
        totalScore += pts;
      }
    }

    entries.push({
      playerId,
      totalScore,
      submissionCount: scores.length,
      topScores: scores,
    });
  }

  entries.sort((a, b) => b.totalScore - a.totalScore);

  return entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}
