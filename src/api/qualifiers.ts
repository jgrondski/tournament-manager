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

export async function submitQualifierScore(
  tournamentId: string,
  playerId: string,
  score: number
): Promise<QualifierSubmissionRecord> {
  if (score < 0) throw new Error('Score must be positive');

  const db = getDb();
  const t = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (t.length === 0) throw new Error('Tournament not found');
  if (t[0].qualsClosed) throw new Error('Qualifiers are closed for this tournament');

  const [created] = await db
    .insert(qualifierSubmissions)
    .values({
      tournamentId,
      playerId,
      score,
    })
    .returning();
  return created as QualifierSubmissionRecord;
}

export async function getQualifierLeaderboard(tournamentId: string): Promise<LeaderboardEntry[]> {
  const db = getDb();
  const t = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (t.length === 0) return [];
  const tourneyQualFormat = t[0].qualFormat;
  const qualAvgCount = t[0].qualAverageCount || 2;
  const pointsConfig = t[0].pointsConfig || [];

  const allSubmissions = (await db
    .select()
    .from(qualifierSubmissions)
    .where(eq(qualifierSubmissions.tournamentId, tournamentId))
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
