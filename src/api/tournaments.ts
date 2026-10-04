import { tournaments, bracketTiers, organizations } from '../db/schema';
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
  organizationId?: string;
  qualFormat: 'HIGH_SCORE' | 'AVERAGE_OF_X' | 'POINTS';
  qualAverageCount?: number;
  pointsConfig?: Array<{ minScore: number; points: number }>;
  isVerified?: boolean;
  tiers?: TierInput[];
}

export interface TournamentRecord {
  id: string;
  organizationId: string;
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
  const orgId = input.organizationId || 'org_ctwc';
  const [t] = await db
    .insert(tournaments)
    .values({
      name: input.name,
      organizationId: orgId,
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
  const isIdUuid = isUuid(id);
  const condition = isIdUuid
    ? or(eq(tournaments.id, id), eq(tournaments.slug, id))
    : eq(tournaments.slug, id);
  const res = await db.delete(tournaments).where(condition).returning();
  return res.length > 0;
}

export function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

import { players, tournamentPlayers, qualifierSubmissions } from '../db/schema';
import { desc, or } from 'drizzle-orm';
import type {
  Tournament,
  TournamentTier,
  PlayerProfile,
  TournamentPlayer,
  QualifierSubmission,
} from '../features/tournament/types';

export async function getFullTournament(idOrSlug: string): Promise<Tournament | null> {
  const db = getDb();
  const isIdUuid = isUuid(idOrSlug);
  const condition = isIdUuid
    ? or(eq(tournaments.id, idOrSlug), eq(tournaments.slug, idOrSlug))
    : eq(tournaments.slug, idOrSlug);

  const tList = await db.select().from(tournaments).where(condition).limit(1);
  if (tList.length === 0) return null;
  const t = tList[0];

  const tiersList = await db
    .select()
    .from(bracketTiers)
    .where(eq(bracketTiers.tournamentId, t.id))
    .orderBy(bracketTiers.priorityOrder);

  const subsList = await db
    .select()
    .from(qualifierSubmissions)
    .where(eq(qualifierSubmissions.tournamentId, t.id))
    .orderBy(desc(qualifierSubmissions.score));

  const tPlayersList = await db
    .select({
      tp: tournamentPlayers,
      player: players,
    })
    .from(tournamentPlayers)
    .innerJoin(players, eq(tournamentPlayers.playerId, players.id))
    .where(eq(tournamentPlayers.tournamentId, t.id));

  const meta = (t.metadata as Record<string, any>) || {};

  const playersPool: PlayerProfile[] = (tPlayersList as any[]).map((row: any) => ({
    id: row.player.id,
    name: row.player.name,
    country: row.player.country || undefined,
    avatarType: (row.player.avatarType as any) || 'flag',
    avatarUrl: row.player.avatarUrl || undefined,
    avatarThumbnailUrl: row.player.avatarThumbnailUrl || undefined,
    personalBest: row.player.personalBest,
    playstyle: (row.player.playstyle as any) || 'Rolling',
    notes: row.player.notes || undefined,
    isDisqualified: row.player.isDisqualified,
  }));

  const tournamentPlayersMap: Record<string, TournamentPlayer> = {};
  for (const row of tPlayersList as any[]) {
    tournamentPlayersMap[row.player.id] = {
      tournamentId: t.id,
      playerId: row.player.id,
      seed: row.tp.seed || undefined,
      qualsCompleted: row.tp.qualsCompleted,
    };
  }

  const qualifierSubmissionsList: QualifierSubmission[] = (subsList as any[]).map((s: any) => ({
    id: s.id,
    tournamentId: s.tournamentId,
    playerId: s.playerId,
    score: s.score,
    submittedAt: s.createdAt.getTime(),
  }));

  const compositeTiers: TournamentTier[] = (tiersList as any[]).map((tier: any) => {
    const tierMeta = (tier.metadata as Record<string, any>) || {};
    return {
      id: tier.id,
      slug: tier.slug || tier.id,
      name: tier.name,
      priority: tier.priorityOrder,
      bracketType: tier.bracketType as any,
      flatWidth: tier.flatWidth || undefined,
      playerCount: tier.numPlayers,
      primaryColor: tier.primaryColor,
      secondaryColor: tier.secondaryColor,
      cardColor: tierMeta.cardColor,
      textColor: tierMeta.textColor,
      backgroundColor: tierMeta.backgroundColor,
      lowerBracketColor: tierMeta.lowerBracketColor,
      textSize: tierMeta.textSize,
      eliminationType: tierMeta.eliminationType || 'SINGLE',
      bracketRouting: tierMeta.bracketRouting,
      finalsCutoff: tierMeta.finalsCutoff,
      bestOf: tierMeta.bestOf || 3,
      isLocked: Boolean(tierMeta.isLocked || t.qualsClosed),
      roundBestOfOverrides: tierMeta.roundBestOfOverrides || {},
      bracket: tierMeta.bracket,
    };
  });

  const fullTourney: Tournament = {
    id: t.id,
    organizationId: t.organizationId || meta.organizationId || 'org_ctwc',
    slug: t.slug,
    name: t.name,
    date: meta.date || '',
    location: meta.location || '',
    seedingMethod: meta.seedingMethod || 'QUALIFIERS',
    manualSeeds: meta.manualSeeds || [],
    qualFormat: t.qualFormat as any,
    qualAverageCount: t.qualAverageCount || undefined,
    pointsConfig: (t.pointsConfig as any) || undefined,
    isLocked: Boolean(t.qualsClosed || meta.isLocked),
    tiers: compositeTiers,
    matchScores: meta.matchScores || {},
    playersPool,
    qualifierSubmissions: qualifierSubmissionsList,
    tournamentPlayers: tournamentPlayersMap,
    useOrgBranding: meta.useOrgBranding ?? true,
    logoUrl: meta.logoUrl || undefined,
    bannerUrl: meta.bannerUrl || undefined,
    discordWebhookUrl: meta.discordWebhookUrl || undefined,
    themeColors: meta.themeColors || undefined,
  };

  return fullTourney;
}

export async function listFullTournaments(): Promise<Tournament[]> {
  const db = getDb();
  const allT = await db.select().from(tournaments).orderBy(desc(tournaments.createdAt));
  const fullList: Tournament[] = [];
  for (const t of allT) {
    const full = await getFullTournament(t.id);
    if (full) fullList.push(full);
  }
  return fullList;
}

export async function saveFullTournament(tourney: Tournament): Promise<Tournament> {
  const db = getDb();
  const tourneyUuid = isUuid(tourney.id) ? tourney.id : crypto.randomUUID();
  const slug = tourney.slug || `tournament-${Date.now()}`;
  
  let orgId = tourney.organizationId || 'org_ctwc';
  const [matchingOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(or(eq(organizations.id, orgId), eq(organizations.slug, orgId)))
    .limit(1);

  if (matchingOrg) {
    orgId = matchingOrg.id;
  } else {
    const allOrgs = await db.select({ id: organizations.id }).from(organizations).limit(1);
    if (allOrgs.length > 0) {
      orgId = allOrgs[0].id;
    } else {
      orgId = 'org_ctwc';
    }
  }

  const condition = or(eq(tournaments.id, tourneyUuid), eq(tournaments.slug, slug));
  const existing = await db.select().from(tournaments).where(condition).limit(1);

  const metadata = {
    organizationId: orgId,
    date: tourney.date || '',
    location: tourney.location || '',
    seedingMethod: tourney.seedingMethod || 'QUALIFIERS',
    manualSeeds: tourney.manualSeeds || [],
    isLocked: Boolean(tourney.isLocked),
    useOrgBranding: tourney.useOrgBranding ?? true,
    logoUrl: tourney.logoUrl || null,
    bannerUrl: tourney.bannerUrl || null,
    discordWebhookUrl: tourney.discordWebhookUrl || null,
    themeColors: tourney.themeColors || null,
    matchScores: tourney.matchScores || {},
  };

  let savedTourneyId = tourneyUuid;

  if (existing.length > 0) {
    savedTourneyId = existing[0].id;
    await db
      .update(tournaments)
      .set({
        name: tourney.name,
        slug,
        organizationId: orgId,
        qualFormat: tourney.qualFormat,
        qualAverageCount: tourney.qualAverageCount || null,
        pointsConfig: tourney.pointsConfig || null,
        qualsClosed: Boolean(tourney.isLocked),
        metadata,
      })
      .where(eq(tournaments.id, savedTourneyId));
  } else {
    const [inserted] = await db
      .insert(tournaments)
      .values({
        id: tourneyUuid,
        name: tourney.name,
        slug,
        organizationId: orgId,
        qualFormat: tourney.qualFormat,
        qualAverageCount: tourney.qualAverageCount || null,
        pointsConfig: tourney.pointsConfig || null,
        qualsClosed: Boolean(tourney.isLocked),
        isVerified: false,
        metadata,
      })
      .returning();
    savedTourneyId = inserted.id;
  }

  // Sync tiers
  const existingTiers = await db
    .select()
    .from(bracketTiers)
    .where(eq(bracketTiers.tournamentId, savedTourneyId));
  const existingTierIds = new Set((existingTiers as any[]).map((t: any) => t.id));
  const currentTierIds = new Set<string>();

  for (let idx = 0; idx < (tourney.tiers || []).length; idx++) {
    const t = tourney.tiers[idx];
    const tierUuid = isUuid(t.id)
      ? t.id
      : ((existingTiers as any[]).find((et: any) => et.slug === t.slug)?.id || crypto.randomUUID());
    currentTierIds.add(tierUuid);

    const tierMeta = {
      cardColor: t.cardColor,
      textColor: t.textColor,
      backgroundColor: t.backgroundColor,
      lowerBracketColor: t.lowerBracketColor,
      textSize: t.textSize,
      eliminationType: t.eliminationType,
      bracketRouting: t.bracketRouting,
      finalsCutoff: t.finalsCutoff,
      bestOf: t.bestOf,
      isLocked: t.isLocked,
      roundBestOfOverrides: t.roundBestOfOverrides,
      bracket: t.bracket,
    };

    if (existingTierIds.has(tierUuid)) {
      await db
        .update(bracketTiers)
        .set({
          priorityOrder: t.priority ?? idx + 1,
          name: t.name,
          slug: t.slug || t.id,
          bracketType: t.bracketType,
          flatWidth: t.flatWidth || null,
          numPlayers: t.playerCount,
          primaryColor: t.primaryColor || '#ffc905',
          secondaryColor: t.secondaryColor || '#705b33',
          metadata: tierMeta,
        })
        .where(eq(bracketTiers.id, tierUuid));
    } else {
      await db.insert(bracketTiers).values({
        id: tierUuid,
        tournamentId: savedTourneyId,
        priorityOrder: t.priority ?? idx + 1,
        name: t.name,
        slug: t.slug || t.id,
        bracketType: t.bracketType,
        flatWidth: t.flatWidth || null,
        numPlayers: t.playerCount,
        primaryColor: t.primaryColor || '#ffc905',
        secondaryColor: t.secondaryColor || '#705b33',
        metadata: tierMeta,
      });
    }
  }

  // Delete removed tiers
  for (const existingTier of existingTiers) {
    if (!currentTierIds.has(existingTier.id)) {
      await db.delete(bracketTiers).where(eq(bracketTiers.id, existingTier.id));
    }
  }

  // Sync tournament players if present
  if (tourney.playersPool && tourney.playersPool.length > 0) {
    // Delete existing tournament players for this tournament
    await db.delete(tournamentPlayers).where(eq(tournamentPlayers.tournamentId, savedTourneyId));
    // Filter to valid UUID players
    const validPlayers = tourney.playersPool.filter(p => isUuid(p.id));
    if (validPlayers.length > 0) {
      // Chunk insert if large
      const CHUNK = 50;
      for (let i = 0; i < validPlayers.length; i += CHUNK) {
        const chunk = validPlayers.slice(i, i + CHUNK);
        await db.insert(tournamentPlayers).values(
          chunk.map(p => {
            const tp = tourney.tournamentPlayers?.[p.id];
            return {
              tournamentId: savedTourneyId,
              playerId: p.id,
              seed: tp?.seed || null,
              qualsCompleted: tp?.qualsCompleted || false,
            };
          })
        );
      }
    }
  }

  // Sync qualifier submissions if present
  if (tourney.qualifierSubmissions && tourney.qualifierSubmissions.length > 0) {
    await db.delete(qualifierSubmissions).where(eq(qualifierSubmissions.tournamentId, savedTourneyId));
    const validSubs = tourney.qualifierSubmissions.filter(s => isUuid(s.playerId));
    if (validSubs.length > 0) {
      const CHUNK = 50;
      for (let i = 0; i < validSubs.length; i += CHUNK) {
        const chunk = validSubs.slice(i, i + CHUNK);
        await db.insert(qualifierSubmissions).values(
          chunk.map(s => ({
            id: isUuid(s.id) ? s.id : crypto.randomUUID(),
            tournamentId: savedTourneyId,
            playerId: s.playerId,
            score: s.score,
            createdAt: new Date(s.submittedAt || Date.now()),
          }))
        );
      }
    }
  }

  const loaded = await getFullTournament(savedTourneyId);
  return loaded || { ...tourney, id: savedTourneyId };
}

