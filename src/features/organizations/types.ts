import { QualFormat, PointsThreshold, OrgTierTheme } from '../tournament/types';
import { TierThemeColors } from '../bracket/colorUtils';

export interface OrganizationMetrics {
  totalTournaments: number;
  activeTournaments: number;
  completedTournaments: number;
  totalCompetitors: number;
  totalMatches: number;
  totalSubmissions: number;
  champions: Array<{
    tournamentId: string;
    tournamentName: string;
    tierName: string;
    winnerId: string;
    winnerName: string;
  }>;
}

export interface OrgCompetitorRecord {
  playerId: string;
  playerName: string;
  country?: string;
  playstyle?: string;
  tournamentsCount: number;
  matchWins: number;
  matchLosses: number;
  winRate: number; // percentage 0-100
  bestScore: number;
  maxoutCount: number;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  shortName?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  website?: string;
  brandColor?: string;
  themeColors?: TierThemeColors;
  tierThemes?: OrgTierTheme[];
  branding?: {
    logoUrl?: string;
    bannerUrl?: string;
    themeColors?: TierThemeColors;
    brandColor?: string;
  };
  discordWebhookUrl?: string;
  defaultRules?: {
    qualFormat?: QualFormat;
    qualAverageCount?: number;
    qualWindowMinutes?: number;
    bestOf?: number;
    primaryColor?: string;
    secondaryColor?: string;
    pointsConfig?: PointsThreshold[];
  };
}
