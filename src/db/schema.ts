import { pgTable, uuid, text, integer, boolean, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type {
  TierThemeColors,
  OrgTierTheme,
  OrganizationBranding,
  OrganizationDefaultRules,
  TournamentMetadata,
  TierMetadata,
  MatchMetadata,
} from '../features/tournament/types';

export const players = pgTable(
  'players',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    displayName: text('display_name'),
    nickname: text('nickname'),
    twitchUsername: text('twitch_username'),
    country: text('country'),
    avatarType: text('avatar_type', { enum: ['flag', 'custom'] }).notNull().default('flag'),
    avatarUrl: text('avatar_url'),
    avatarThumbnailUrl: text('avatar_thumbnail_url'),
    personalBest: integer('personal_best').default(0).notNull(),
    playstyle: text('playstyle'),
    notes: text('notes'),
    isDisqualified: boolean('is_disqualified').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('players_name_lower_idx').on(sql`lower(trim(${table.name}))`),
  ]
);

export const organizations = pgTable(
  'organizations',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    shortName: text('short_name'),
    description: text('description'),
    website: text('website'),
    brandColor: text('brand_color'),
    themeColors: jsonb('theme_colors').$type<TierThemeColors>(),
    tierThemes: jsonb('tier_themes').$type<OrgTierTheme[]>(),
    branding: jsonb('branding').$type<OrganizationBranding>(),
    discordWebhookUrl: text('discord_webhook_url'),
    defaultRules: jsonb('default_rules').$type<OrganizationDefaultRules>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('organizations_slug_idx').on(table.slug),
  ]
);

export const tournaments = pgTable('tournaments', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: text('organization_id')
    .references(() => organizations.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().default(''),
  qualFormat: text('qual_format', { enum: ['HIGH_SCORE', 'AVERAGE_OF_X', 'POINTS'] }).notNull(),
  qualAverageCount: integer('qual_average_count'),
  pointsConfig: jsonb('points_config').$type<Array<{ minScore: number; points: number }>>(),
  qualsClosed: boolean('quals_closed').notNull().default(false),
  isVerified: boolean('is_verified').notNull().default(false),
  metadata: jsonb('metadata').$type<TournamentMetadata>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bracketTiers = pgTable('bracket_tiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  priorityOrder: integer('priority_order').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull().default(''),
  bracketType: text('bracket_type', { enum: ['TRADITIONAL', 'FLAT'] }).notNull(),
  flatWidth: integer('flat_width'),
  numPlayers: integer('num_players').notNull(),
  primaryColor: text('primary_color').notNull().default('#FFD700'),
  secondaryColor: text('secondary_color').notNull().default('#000000'),
  metadata: jsonb('metadata').$type<TierMetadata>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tournamentPlayers = pgTable('tournament_players', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  playerId: uuid('player_id').references(() => players.id, { onDelete: 'restrict' }).notNull(),
  tierId: uuid('tier_id').references(() => bracketTiers.id, { onDelete: 'set null' }),
  seed: integer('seed'),
  qualsCompleted: boolean('quals_completed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const qualifierSubmissions = pgTable('qualifier_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  playerId: uuid('player_id').references(() => players.id, { onDelete: 'restrict' }).notNull(),
  score: integer('score').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const matches = pgTable(
  'matches',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    tierId: uuid('tier_id').references(() => bracketTiers.id, { onDelete: 'cascade' }).notNull(),
    roundNumber: integer('round_number').notNull(),
    matchNumber: integer('match_number'),
    stage: text('stage'),
    roundIdentifier: text('round_identifier'),
    player1Id: uuid('player1_id').references(() => players.id, { onDelete: 'set null' }),
    player2Id: uuid('player2_id').references(() => players.id, { onDelete: 'set null' }),
    winnerId: uuid('winner_id').references(() => players.id, { onDelete: 'set null' }),
    loserId: uuid('loser_id').references(() => players.id, { onDelete: 'set null' }),
    bestOf: integer('best_of').notNull().default(3),
    isForfeit: boolean('is_forfeit').notNull().default(false),
    isComplete: boolean('is_complete').notNull().default(false),
    metadata: jsonb('metadata').$type<MatchMetadata>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('matches_player1_idx').on(table.player1Id),
    index('matches_player2_idx').on(table.player2Id),
  ]
);

export const games = pgTable('games', {
  id: uuid('id').defaultRandom().primaryKey(),
  matchId: text('match_id').references(() => matches.id, { onDelete: 'cascade' }).notNull(),
  gameNumber: integer('game_number').notNull(),
  player1Score: integer('player1_score').notNull().default(0),
  player2Score: integer('player2_score').notNull().default(0),
  winnerId: uuid('winner_id').references(() => players.id, { onDelete: 'set null' }),
  loserId: uuid('loser_id').references(() => players.id, { onDelete: 'set null' }),
  isIntentionalTopout: boolean('is_intentional_topout').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

