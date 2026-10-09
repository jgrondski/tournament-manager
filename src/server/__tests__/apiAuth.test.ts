import { describe, it, expect, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { setupTestDb } from '../../db/testDb';
import { setDb } from '../../db';
import { createApiMiddleware } from '../api';
import { createSessionToken, encryptPin } from '../pinCrypto';
import { saveFullTournament } from '../../api/tournaments';
import { seedDefaultOrganizations } from '../../api/organizations';
import { createEmptyTournament, createDefaultTier } from '../../features/tournament/defaults';

function createMockReq(options: {
  url: string;
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}) {
  const bodyStr = options.body !== undefined ? JSON.stringify(options.body) : '';
  const stream = Readable.from(bodyStr ? [bodyStr] : []);
  const req = stream as any;
  req.url = options.url;
  req.method = options.method || 'GET';
  req.headers = options.headers || {};
  return req;
}

function createMockRes() {
  let statusCode = 200;
  let body = '';
  const headers: Record<string, string> = {};
  return {
    setHeader(name: string, val: string) {
      headers[name.toLowerCase()] = val;
    },
    getHeader(name: string) {
      return headers[name.toLowerCase()];
    },
    set statusCode(code: number) {
      statusCode = code;
    },
    get statusCode() {
      return statusCode;
    },
    end(chunk?: string) {
      if (chunk) body += chunk;
    },
    getBody() {
      return body ? JSON.parse(body) : null;
    },
    getStatusCode() {
      return statusCode;
    },
  };
}

describe('API Authorization & Multi-Tier PIN Security Engine', () => {
  let middleware: ReturnType<typeof createApiMiddleware>;

  beforeEach(async () => {
    process.env.SYSTEM_ADMIN_RECOVERY_PIN = '999999';
    process.env.MASTER_ADMIN_RECOVERY_PIN = '999999';
    const { db } = setupTestDb();
    setDb(db);
    await seedDefaultOrganizations();
    middleware = createApiMiddleware();
  });

  describe('1. Authentication via PIN (/api/auth/pin)', () => {
    it('authenticates system recovery PIN and returns SYSTEM_ADMIN session token', async () => {
      const pin = process.env.SYSTEM_ADMIN_RECOVERY_PIN || '999999';
      const req = createMockReq({
        url: '/api/auth/pin',
        method: 'POST',
        body: { pin },
      });
      const res = createMockRes();

      await middleware(req, res as any, () => {});

      expect(res.getStatusCode()).toBe(200);
      const data = res.getBody();
      expect(data.role).toBe('SYSTEM_ADMIN');
      expect(data.token).toBeDefined();
    });

    it('authenticates tournament-specific PIN and returns TOURNAMENT_ADMIN session token', async () => {
      const tourneyId = crypto.randomUUID();
      const tourney = createEmptyTournament({ slug: 'test-tourney', name: 'Test Tournament' });
      tourney.id = tourneyId;
      tourney.slug = 'test-tourney';
      tourney.organizationId = 'org_ctwc';
      tourney.adminPinEncrypted = encryptPin('4567');
      await saveFullTournament(tourney);

      const req = createMockReq({
        url: '/api/auth/pin',
        method: 'POST',
        body: { pin: '4567', tournamentSlugOrId: 'test-tourney' },
      });
      const res = createMockRes();

      await middleware(req, res as any, () => {});

      expect(res.getStatusCode()).toBe(200);
      const data = res.getBody();
      expect(data.role).toBe('TOURNAMENT_ADMIN');
      expect(data.tournamentId).toBe(tourneyId);
      expect(data.token).toBeDefined();
    });

    it('returns 401 Unauthorized for invalid PIN', async () => {
      const req = createMockReq({
        url: '/api/auth/pin',
        method: 'POST',
        body: { pin: 'wrong-pin' },
      });
      const res = createMockRes();

      await middleware(req, res as any, () => {});

      expect(res.getStatusCode()).toBe(401);
      expect(res.getBody().error).toContain('Invalid PIN');
    });

    it('rejects dev fallback 0000 when SYSTEM_ADMIN_RECOVERY_PIN is explicitly set in env', async () => {
      process.env.SYSTEM_ADMIN_RECOVERY_PIN = '!Te67Omentris69420!';
      const req = createMockReq({
        url: '/api/auth/pin',
        method: 'POST',
        body: { pin: '0000' },
      });
      const res = createMockRes();

      await middleware(req, res as any, () => {});

      expect(res.getStatusCode()).toBe(401);
      expect(res.getBody().error).toContain('Invalid PIN');

      // But authenticates the real configured recovery PIN
      const req2 = createMockReq({
        url: '/api/auth/pin',
        method: 'POST',
        body: { pin: '!Te67Omentris69420!' },
      });
      const res2 = createMockRes();

      await middleware(req2, res2 as any, () => {});

      expect(res2.getStatusCode()).toBe(200);
      expect(res2.getBody().role).toBe('SYSTEM_ADMIN');
    });

    it('allows dev fallback 0000 only when no recovery PIN is configured in dev', async () => {
      delete process.env.SYSTEM_ADMIN_RECOVERY_PIN;
      delete process.env.MASTER_ADMIN_RECOVERY_PIN;
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const req = createMockReq({
        url: '/api/auth/pin',
        method: 'POST',
        body: { pin: '0000' },
      });
      const res = createMockRes();

      await middleware(req, res as any, () => {});

      expect(res.getStatusCode()).toBe(200);
      expect(res.getBody().role).toBe('SYSTEM_ADMIN');

      process.env.NODE_ENV = prevEnv;
      process.env.SYSTEM_ADMIN_RECOVERY_PIN = '999999';
    });
  });

  describe('2. Unauthenticated Mutation Protection', () => {
    it('rejects unauthenticated POST /api/players with 401', async () => {
      const req = createMockReq({
        url: '/api/players',
        method: 'POST',
        body: { name: 'Unauthorized Player' },
      });
      const res = createMockRes();

      await middleware(req, res as any, () => {});

      expect(res.getStatusCode()).toBe(401);
      expect(res.getBody().error).toContain('Unauthorized');
    });

    it('rejects unauthenticated POST /api/tournaments with 401', async () => {
      const req = createMockReq({
        url: '/api/tournaments',
        method: 'POST',
        body: { name: 'Unauthorized Tournament' },
      });
      const res = createMockRes();

      await middleware(req, res as any, () => {});

      expect(res.getStatusCode()).toBe(401);
    });

    it('rejects unauthenticated match score updates with 401', async () => {
      const dummyId = crypto.randomUUID();
      const req = createMockReq({
        url: `/api/tournaments/${dummyId}/matches/m-1/score`,
        method: 'PUT',
        body: { tierId: 'tier-1', scoredGames: [] },
      });
      const res = createMockRes();

      await middleware(req, res as any, () => {});

      expect(res.getStatusCode()).toBe(401);
    });
  });

  describe('3. Tournament Admin Scope & Simulation Isolation', () => {
    it('forbids Tournament Admin from triggering System Admin simulation (/api/simulate/sample)', async () => {
      const token = createSessionToken({
        role: 'TOURNAMENT_ADMIN',
        tournamentId: crypto.randomUUID(),
      });
      const req = createMockReq({
        url: '/api/simulate/sample',
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockRes();

      await middleware(req, res as any, () => {});

      expect(res.getStatusCode()).toBe(403);
      expect(res.getBody().error).toContain('Requires System Admin permissions');
    });

    it('forbids Tournament Admin from triggering clear-all data wipe', async () => {
      const tourneyId = crypto.randomUUID();
      const token = createSessionToken({
        role: 'TOURNAMENT_ADMIN',
        tournamentId: tourneyId,
      });
      const req = createMockReq({
        url: `/api/tournaments/${tourneyId}/clear-all`,
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockRes();

      await middleware(req, res as any, () => {});

      expect(res.getStatusCode()).toBe(403);
      expect(res.getBody().error).toContain('Requires System Admin permissions');
    });

    it('forbids Tournament Admin from modifying a different tournament', async () => {
      const myId = crypto.randomUUID();
      const otherId = crypto.randomUUID();
      const token = createSessionToken({
        role: 'TOURNAMENT_ADMIN',
        tournamentId: myId,
      });
      const req = createMockReq({
        url: `/api/tournaments/${otherId}/lock`,
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockRes();

      await middleware(req, res as any, () => {});

      expect(res.getStatusCode()).toBe(403);
      expect(res.getBody().error).toContain('Tournament Admin scope does not match');
    });

    it('allows Tournament Admin to modify their own tournament (lock/unlock)', async () => {
      const tourneyId = crypto.randomUUID();
      const tierId = crypto.randomUUID();
      const tourney = createEmptyTournament({ slug: 'my-tourney', name: 'My Tournament' });
      tourney.id = tourneyId;
      tourney.organizationId = 'org_ctwc';
      tourney.tiers = [createDefaultTier(1, { id: tierId, name: 'Gold' })];
      tourney.isLocked = false;
      await saveFullTournament(tourney);

      const token = createSessionToken({
        role: 'TOURNAMENT_ADMIN',
        tournamentId: tourneyId,
      });
      const req = createMockReq({
        url: `/api/tournaments/${tourneyId}/lock`,
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockRes();

      await middleware(req, res as any, () => {});

      expect(res.getStatusCode()).toBe(200);
      expect(res.getBody().isLocked).toBe(true);
    });
  });

  describe('4. System Admin Privileges & PIN Reveal', () => {
    it('allows System Admin to reveal encrypted tournament PIN', async () => {
      const tourneyId = crypto.randomUUID();
      const tourney = createEmptyTournament({ slug: 'secret-tourney', name: 'Secret Tourney' });
      tourney.id = tourneyId;
      tourney.organizationId = 'org_ctwc';
      tourney.adminPinEncrypted = encryptPin('7492');
      await saveFullTournament(tourney);

      const systemToken = createSessionToken({ role: 'SYSTEM_ADMIN' });
      const req = createMockReq({
        url: `/api/tournaments/${tourneyId}/reveal-pin`,
        method: 'GET',
        headers: { authorization: `Bearer ${systemToken}` },
      });
      const res = createMockRes();

      await middleware(req, res as any, () => {});

      expect(res.getStatusCode()).toBe(200);
      expect(res.getBody().pin).toBe('7492');
    });

    it('forbids Tournament Admin from revealing PIN of any tournament', async () => {
      const tourneyId = crypto.randomUUID();
      const token = createSessionToken({
        role: 'TOURNAMENT_ADMIN',
        tournamentId: tourneyId,
      });
      const req = createMockReq({
        url: `/api/tournaments/${tourneyId}/reveal-pin`,
        method: 'GET',
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockRes();

      await middleware(req, res as any, () => {});

      expect(res.getStatusCode()).toBe(403);
      expect(res.getBody().error).toContain('Requires System Admin permissions');
    });

    it('allows System Admin to clear-all data', async () => {
      const tourneyId = crypto.randomUUID();
      const tourney = createEmptyTournament({ slug: 'wipe-tourney', name: 'Wipe Me' });
      tourney.id = tourneyId;
      tourney.organizationId = 'org_ctwc';
      await saveFullTournament(tourney);

      const systemToken = createSessionToken({ role: 'SYSTEM_ADMIN' });
      const req = createMockReq({
        url: `/api/tournaments/${tourneyId}/clear-all`,
        method: 'POST',
        headers: { authorization: `Bearer ${systemToken}` },
      });
      const res = createMockRes();

      await middleware(req, res as any, () => {});

      expect(res.getStatusCode()).toBe(200);
      expect(res.getBody().playersPool).toEqual([]);
      expect(res.getBody().id).toBe(tourneyId);
    });
    it('allows Tournament Admin to modify their own tournament via slug', async () => {
      const tourneyId = crypto.randomUUID();
      const tourney = createEmptyTournament({ slug: 'omen-open', name: 'Omen Open' });
      tourney.id = tourneyId;
      tourney.slug = 'omen-open';
      tourney.organizationId = 'org_ctwc';
      await saveFullTournament(tourney);

      const token = createSessionToken({
        role: 'TOURNAMENT_ADMIN',
        tournamentId: tourneyId,
        tournamentSlug: 'omen-open',
      });
      // Updating PIN via slug route
      const req = createMockReq({
        url: '/api/tournaments/omen-open/pin',
        method: 'PUT',
        headers: { authorization: `Bearer ${token}` },
        body: { pin: '8844' },
      });
      const res = createMockRes();

      await middleware(req, res as any, () => {});

      expect(res.getStatusCode()).toBe(200);
      expect(res.getBody().success).toBe(true);

      // Verify login with new PIN
      const loginReq = createMockReq({
        url: '/api/auth/pin',
        method: 'POST',
        body: { pin: '8844', tournamentSlugOrId: 'omen-open' },
      });
      const loginRes = createMockRes();
      await middleware(loginReq, loginRes as any, () => {});

      expect(loginRes.getStatusCode()).toBe(200);
      expect(loginRes.getBody().role).toBe('TOURNAMENT_ADMIN');
      expect(loginRes.getBody().tournamentSlug).toBe('omen-open');

      // Verify System Admin can reveal it via slug
      const systemToken = createSessionToken({ role: 'SYSTEM_ADMIN' });
      const revealReq = createMockReq({
        url: '/api/tournaments/omen-open/reveal-pin',
        method: 'GET',
        headers: { authorization: `Bearer ${systemToken}` },
      });
      const revealRes = createMockRes();
      await middleware(revealReq, revealRes as any, () => {});

      expect(revealRes.getStatusCode()).toBe(200);
      expect(revealRes.getBody().pin).toBe('8844');
    });
  });
});
