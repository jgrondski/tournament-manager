import type { IncomingMessage, ServerResponse } from 'http';
import {
  createPlayer,
  createPlayersBatch,
  listPlayers,
  getPlayer,
  updatePlayer,
  deletePlayer,
} from '../api/players';
import {
  listFullTournaments,
  getFullTournament,
  saveFullTournament,
  deleteTournament,
} from '../api/tournaments';
import {
  submitQualifierScore,
  submitQualifiersBatch,
  clearTournamentQualifiers,
} from '../api/qualifiers';
import { clearTournamentMatches } from '../api/brackets';
import {
  listOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  seedDefaultOrganizations,
} from '../api/organizations';
import { runFullSimulation, generateSimulatedQualifiers } from '../features/tournament/simulation';
import { AUTHENTIC_COMPETITOR_NAMES } from '../features/tournament/data/authenticPlayers';
import { generateTraditionalBracket, generateFlatBracket } from '../features/bracket/math';
import type { Tournament, PlayerProfile } from '../features/tournament/types';

async function parseBody(req: IncomingMessage): Promise<unknown> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  if (typeof req.on !== 'function') return {};
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, status: number, message: string) {
  sendJson(res, status, { error: message });
}

export function createApiMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const rawUrl = req.url || '';
    if (!rawUrl.startsWith('/api')) {
      return next();
    }

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const url = new URL(rawUrl, 'http://localhost');
    const pathname = url.pathname;
    const method = req.method || 'GET';

    try {
      const body: any = await parseBody(req);

      // GET /api/health
      if (pathname === '/api/health' && method === 'GET') {
        return sendJson(res, 200, { status: 'ok', timestamp: Date.now() });
      }

      // --- PLAYERS ENDPOINTS ---
      // GET /api/players
      if (pathname === '/api/players' && method === 'GET') {
        const dbPlayers = await listPlayers();
        const profiles: PlayerProfile[] = dbPlayers.map(p => ({
          id: p.id,
          name: p.name,
          country: p.country || undefined,
          avatarType: p.avatarType,
          avatarUrl: p.avatarUrl || undefined,
          avatarThumbnailUrl: p.avatarThumbnailUrl || undefined,
          personalBest: p.personalBest,
          playstyle: (p.playstyle as PlayerProfile['playstyle']) || 'Rolling',
          notes: p.notes || undefined,
          isDisqualified: p.isDisqualified,
        }));
        return sendJson(res, 200, profiles);
      }

      // POST /api/players/batch
      if (pathname === '/api/players/batch' && method === 'POST') {
        const list = Array.isArray(body) ? body : body.players || [];
        const created = await createPlayersBatch(list);
        return sendJson(res, 201, created);
      }

      // POST /api/players
      if (pathname === '/api/players' && method === 'POST') {
        const created = await createPlayer(body);
        return sendJson(res, 201, created);
      }

      // /api/players/:id
      const playerMatch = pathname.match(/^\/api\/players\/([^/]+)$/);
      if (playerMatch) {
        const playerId = playerMatch[1];
        if (method === 'GET') {
          const p = await getPlayer(playerId);
          if (!p) return sendError(res, 404, 'Player not found');
          return sendJson(res, 200, p);
        }
        if (method === 'PUT') {
          const updated = await updatePlayer(playerId, body);
          if (!updated) return sendError(res, 404, 'Player not found');
          return sendJson(res, 200, updated);
        }
        if (method === 'DELETE') {
          const deleted = await deletePlayer(playerId);
          return sendJson(res, 200, { success: deleted });
        }
      }

      // --- ORGANIZATIONS ENDPOINTS ---
      // GET /api/organizations
      if (pathname === '/api/organizations' && method === 'GET') {
        const orgs = await listOrganizations();
        return sendJson(res, 200, orgs);
      }

      // POST /api/organizations
      if (pathname === '/api/organizations' && method === 'POST') {
        const created = await createOrganization(body as any);
        return sendJson(res, 201, created);
      }

      // /api/organizations/:id
      const orgMatch = pathname.match(/^\/api\/organizations\/([^/]+)$/);
      if (orgMatch) {
        const orgId = orgMatch[1];
        if (method === 'GET') {
          const org = await getOrganizationById(orgId);
          if (!org) return sendError(res, 404, 'Organization not found');
          return sendJson(res, 200, org);
        }
        if (method === 'PUT') {
          const updated = await updateOrganization(orgId, body as any);
          if (!updated) return sendError(res, 404, 'Organization not found');
          return sendJson(res, 200, updated);
        }
        if (method === 'DELETE') {
          const result = await deleteOrganization(orgId);
          if (!result.success) {
            return sendError(res, 400, result.error || 'Failed to delete organization');
          }
          return sendJson(res, 200, { success: true });
        }
      }

      // --- TOURNAMENTS ENDPOINTS ---
      // GET /api/tournaments
      if (pathname === '/api/tournaments' && method === 'GET') {
        const fullTourneys = await listFullTournaments();
        return sendJson(res, 200, fullTourneys);
      }

      // POST /api/tournaments
      if (pathname === '/api/tournaments' && method === 'POST') {
        const saved = await saveFullTournament(body);
        return sendJson(res, 201, saved);
      }

      // POST /api/simulate/sample (1-click sample tournament)
      if (pathname === '/api/simulate/sample' && method === 'POST') {
        const sampleTourney = await simulateSampleTournament();
        return sendJson(res, 201, sampleTourney);
      }

      // Match tournament routes: /api/tournaments/:id/...
      const tourneySubMatch = pathname.match(/^\/api\/tournaments\/([^/]+)(?:\/(.*))?$/);
      if (tourneySubMatch) {
        const tourneyId = tourneySubMatch[1];
        const subAction = tourneySubMatch[2] || '';

        // Exact tournament root: /api/tournaments/:id
        if (!subAction) {
          if (method === 'GET') {
            const t = await getFullTournament(tourneyId);
            if (!t) return sendError(res, 404, 'Tournament not found');
            return sendJson(res, 200, t);
          }
          if (method === 'PUT') {
            const updated = await saveFullTournament({ ...body, id: tourneyId });
            return sendJson(res, 200, updated);
          }
          if (method === 'DELETE') {
            const deleted = await deleteTournament(tourneyId);
            return sendJson(res, 200, { success: deleted });
          }
        }

        // Subactions
        // POST /api/tournaments/:id/qualifiers
        if (subAction === 'qualifiers' && method === 'POST') {
          const sub = await submitQualifierScore(tourneyId, body.playerId, body.score);
          return sendJson(res, 201, sub);
        }

        // POST /api/tournaments/:id/qualifiers/batch
        if (subAction === 'qualifiers/batch' && method === 'POST') {
          const subs = await submitQualifiersBatch(tourneyId, body.submissions || body);
          return sendJson(res, 201, subs);
        }

        // DELETE /api/tournaments/:id/qualifiers
        if (subAction === 'qualifiers' && method === 'DELETE') {
          await clearTournamentQualifiers(tourneyId);
          const t = await getFullTournament(tourneyId);
          if (t) {
            t.qualifierSubmissions = [];
            t.qualifiers = [];
            t.manualSeeds = [];
            await saveFullTournament(t);
          }
          return sendJson(res, 200, { success: true });
        }

        // DELETE /api/tournaments/:id/matches
        if (subAction === 'matches' && method === 'DELETE') {
          await clearTournamentMatches(tourneyId);
          const t = await getFullTournament(tourneyId);
          if (t) {
            t.matchScores = {};
            t.isLocked = false;
            t.tiers = t.tiers.map(tier => ({ ...tier, isLocked: false }));
            await saveFullTournament(t);
          }
          return sendJson(res, 200, { success: true });
        }

        // POST /api/tournaments/:id/simulate/seed-quals
        if (subAction === 'simulate/seed-quals' && method === 'POST') {
          const t = await getFullTournament(tourneyId);
          if (!t) return sendError(res, 404, 'Tournament not found');

          const allDbPlayers = await listPlayers();
          const profiles: PlayerProfile[] = allDbPlayers.map(p => ({
            id: p.id,
            name: p.name,
            country: p.country || undefined,
            avatarType: p.avatarType,
            avatarUrl: p.avatarUrl || undefined,
            personalBest: p.personalBest,
            playstyle: (p.playstyle as PlayerProfile['playstyle']) || 'Rolling',
            isDisqualified: p.isDisqualified,
          }));

          const { players: selectedPlayers, submissions } = generateSimulatedQualifiers(t, profiles);
          t.playersPool = selectedPlayers;
          t.qualifierSubmissions = submissions;
          t.matchScores = {};
          t.isLocked = false;
          t.tiers = t.tiers.map(tier => ({ ...tier, isLocked: false }));

          const saved = await saveFullTournament(t);
          return sendJson(res, 200, saved);
        }

        // POST /api/tournaments/:id/simulate/full
        if (subAction === 'simulate/full' && method === 'POST') {
          const t = await getFullTournament(tourneyId);
          if (!t) return sendError(res, 404, 'Tournament not found');

          const allDbPlayers = await listPlayers();
          const profiles: PlayerProfile[] = allDbPlayers.map(p => ({
            id: p.id,
            name: p.name,
            country: p.country || undefined,
            avatarType: p.avatarType,
            avatarUrl: p.avatarUrl || undefined,
            personalBest: p.personalBest,
            playstyle: (p.playstyle as PlayerProfile['playstyle']) || 'Rolling',
            isDisqualified: p.isDisqualified,
          }));

          const simulated = runFullSimulation(t, profiles);
          const saved = await saveFullTournament(simulated);
          return sendJson(res, 200, saved);
        }
      }

      return sendError(res, 404, `Not found: ${method} ${pathname}`);
    } catch (err: unknown) {
      console.error(`[API Error] ${method} ${pathname}:`, err);
      const msg = err instanceof Error ? err.message : 'Internal Server Error';
      return sendError(res, 500, msg);
    }
  };
}

/**
 * Creates and simulates a full sample tournament against PostgreSQL using authentic competitor names.
 */
export async function simulateSampleTournament(): Promise<Tournament> {
  await seedDefaultOrganizations();
  let dbPlayers = await listPlayers();

  // If DB has fewer than 32 players, populate authentic players
  if (dbPlayers.length < 32) {
    const toInsert = AUTHENTIC_COMPETITOR_NAMES.slice(0, 100).map(name => ({
      name,
      country: 'US',
      avatarType: 'flag' as const,
      personalBest: Math.floor(800000 + Math.random() * 600000),
      playstyle: 'Rolling',
      notes: 'Authentic competitor',
    }));
    await createPlayersBatch(toInsert);
    dbPlayers = await listPlayers();
  }

  const globalProfiles: PlayerProfile[] = dbPlayers.map(p => ({
    id: p.id,
    name: p.name,
    country: p.country || undefined,
    avatarType: p.avatarType,
    avatarUrl: p.avatarUrl || undefined,
    personalBest: p.personalBest,
    playstyle: (p.playstyle as PlayerProfile['playstyle']) || 'Rolling',
    isDisqualified: p.isDisqualified,
  }));

  const goldTierId = crypto.randomUUID();
  const silverTierId = crypto.randomUUID();
  const tourneyId = crypto.randomUUID();

  // Initial tournament definition with Gold (16) and Silver (16)
  const baseTourney: Tournament = {
    id: tourneyId,
    organizationId: 'org_ctwc',
    slug: `ctwc-open-${Date.now() % 10000}`,
    name: 'CTWC 2026 World Championship',
    date: '2026-10-18',
    location: 'Portland, Oregon',
    qualFormat: 'HIGH_SCORE',
    isLocked: false,
    seedingMethod: 'QUALIFIERS',
    manualSeeds: [],
    playersPool: [],
    qualifierSubmissions: [],
    tournamentPlayers: {},
    matchScores: {},
    useOrgBranding: true,
    tiers: [
      {
        id: goldTierId,
        slug: 'gold',
        name: 'Gold Championship',
        priority: 1,
        bracketType: 'TRADITIONAL',
        playerCount: 16,
        bestOf: 5,
        primaryColor: '#ffc905',
        secondaryColor: '#705b33',
        cardColor: '#1b1c1d',
        textColor: '#94A3B8',
        backgroundColor: '#020203',
        isLocked: false,
        bracket: generateTraditionalBracket(
          globalProfiles.slice(0, 16).map((p, idx) => ({ id: p.id, name: p.name, seed: idx + 1 })),
          { tierId: goldTierId, bestOf: 5 }
        ),
      },
      {
        id: silverTierId,
        slug: 'silver',
        name: 'Silver Bracket',
        priority: 2,
        bracketType: 'FLAT',
        flatWidth: 2,
        playerCount: 16,
        bestOf: 3,
        primaryColor: '#CBD5E1',
        secondaryColor: '#3d4652',
        cardColor: '#0E1420',
        textColor: '#4f5c6d',
        backgroundColor: '#0B0E14',
        isLocked: false,
        bracket: generateFlatBracket(
          globalProfiles.slice(16, 32).map((p, idx) => ({ id: p.id, name: p.name, seed: idx + 1 })),
          2,
          { tierId: silverTierId, bestOf: 3 }
        ),
      },
    ],
  };

  // Run full simulation
  const simulated = runFullSimulation(baseTourney, globalProfiles);

  // Persist into PostgreSQL
  const saved = await saveFullTournament(simulated);
  return saved;
}
