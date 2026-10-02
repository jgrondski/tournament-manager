import { tournaments, bracketTiers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';

export interface TierInput {
  name: string;
  bracketType: 'TRADITIONAL' | 'FLAT';
  numPlayers: number;
  priorityOrder: number;
  flatWidth?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface TournamentInput {
  name: string;
  qualFormat: 'HIGH_SCORE' | 'AVERAGE_OF_X' | 'POINTS';
  qualAverageCount?: number;
  pointsConfig?: Array<{ minScore: number; points: number }>;
  isVerified?: boolean;
  tiers?: TierInput[];
}

export interface TournamentRecord {
  id: string;
  name: string;
  qualFormat: 'HIGH_SCORE' | 'AVERAGE_OF_X' | 'POINTS';
  qualAverageCount: number | null;
  pointsConfig: Array<{ minScore: number; points: number }> | null;
  qualsClosed: boolean;
  isVerified: boolean;
  createdAt: Date;
}

export interface TierRecord {
  id: string;
  tournamentId: string;
  priorityOrder: number;
  name: string;
  bracketType: 'TRADITIONAL' | 'FLAT';
  flatWidth: number | null;
  numPlayers: number;
  primaryColor: string;
  secondaryColor: string;
  createdAt: Date;
}

export async function createTournament(input: TournamentInput): Promise<{
  tournament: TournamentRecord;
  tiers: TierRecord[];
}> {
  const db = getDb();
  const [t] = await db
    .insert(tournaments)
    .values({
      name: input.name,
      qualFormat: input.qualFormat,
      qualAverageCount: input.qualAverageCount || null,
      pointsConfig: input.pointsConfig || null,
      isVerified: input.isVerified || false,
    })
    .returning();

  const createdTiers: TierRecord[] = [];
  if (input.tiers && input.tiers.length > 0) {
    for (const tier of input.tiers) {
      const [tr] = await db
        .insert(bracketTiers)
        .values({
          tournamentId: t.id,
          name: tier.name,
          priorityOrder: tier.priorityOrder,
          bracketType: tier.bracketType,
          flatWidth: tier.flatWidth || null,
          numPlayers: tier.numPlayers,
          primaryColor: tier.primaryColor || '#FFD700',
          secondaryColor: tier.secondaryColor || '#000000',
        })
        .returning();
      createdTiers.push(tr as TierRecord);
    }
  }

  return { tournament: t as TournamentRecord, tiers: createdTiers };
}

export async function listTournaments(): Promise<TournamentRecord[]> {
  const db = getDb();
  return (await db.select().from(tournaments)) as TournamentRecord[];
}

export async function getTournament(id: string): Promise<{
  tournament: TournamentRecord;
  tiers: TierRecord[];
} | null> {
  const db = getDb();
  const t = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  if (t.length === 0) return null;
  const tr = await db.select().from(bracketTiers).where(eq(bracketTiers.tournamentId, id));
  return { tournament: t[0] as TournamentRecord, tiers: tr as TierRecord[] };
}

export async function deleteTournament(id: string): Promise<boolean> {
  const db = getDb();
  // Foreign keys with CASCADE delete tiers, tournamentPlayers, qualifierSubmissions, matches, and games
  const res = await db.delete(tournaments).where(eq(tournaments.id, id)).returning();
  return res.length > 0;
}
