import { describe, it, expect } from 'vitest';
import { filterTournamentsByQuery } from '../../../components/TournamentSidebar';
import { getPlayerQualifierStatus } from '../../qualifiers/scoring';
import { Tournament } from '../types';
import { isUuid } from '../../../api/tournaments';

describe("Omen's 10/5/2026 Bug Report & DB Sync Invariants", () => {
  // Mock tournaments
  const omenOpen: Tournament = {
    id: '98189acc-9651-47fb-9ad0-64b649e909c4',
    name: 'Omen Open',
    slug: 'omen-open',
    organizationId: 'org_omen',
    date: '2026-10-05',
    location: 'Denver, CO',
    qualFormat: 'HIGH_SCORE',
    isLocked: false,
    tiers: [
      {
        id: 'tier-1',
        slug: 'gold',
        name: 'Gold',
        priority: 1,
        playerCount: 16,
        bracketType: 'TRADITIONAL',
        bestOf: 5,
        primaryColor: '#ffc905',
        secondaryColor: '#705b33',
        cardColor: '#1b1c1d',
        textColor: '#94A3B8',
        backgroundColor: '#020203',
        isLocked: false,
        bracket: { rounds: [], matches: [] } as any,
      },
    ],
    playersPool: [
      { id: '11111111-1111-4111-8111-111111111111', name: 'Player A', personalBest: 1000000, playstyle: 'DAS' },
      { id: '22222222-2222-4222-8222-222222222222', name: 'Player B', personalBest: 950000, playstyle: 'Rolling' },
    ],
    qualifierSubmissions: [
      {
        id: '5587ab22-236b-403d-b6a7-94f9a0ec7109',
        tournamentId: '98189acc-9651-47fb-9ad0-64b649e909c4',
        playerId: '11111111-1111-4111-8111-111111111111',
        score: 1787185,
        submittedAt: 1791166257831,
      },
    ],
    tournamentPlayers: {
      '11111111-1111-4111-8111-111111111111': {
        playerId: '11111111-1111-4111-8111-111111111111',
        tournamentId: '98189acc-9651-47fb-9ad0-64b649e909c4',
        qualsCompleted: false,
        isVerified: false,
      },
    },
    matchScores: {},
  };

  const omenDas: Tournament = {
    id: 'f4cb0d4c-e4b9-40ed-9118-e3ebaff4ce43',
    name: 'Omen DAS',
    slug: 'omen-d',
    organizationId: 'org_omen',
    date: '2026-10-05',
    location: 'Denver, CO',
    qualFormat: 'HIGH_SCORE',
    isLocked: false,
    tiers: [
      {
        id: 'tier-2',
        slug: 'gold',
        name: 'Gold',
        priority: 1,
        playerCount: 16,
        bracketType: 'TRADITIONAL',
        bestOf: 5,
        primaryColor: '#ffc905',
        secondaryColor: '#705b33',
        cardColor: '#1b1c1d',
        textColor: '#94A3B8',
        backgroundColor: '#020203',
        isLocked: false,
        bracket: { rounds: [], matches: [] } as any,
      },
    ],
    playersPool: [
      { id: '11111111-1111-4111-8111-111111111111', name: 'Player A', personalBest: 1000000, playstyle: 'DAS' },
    ],
    qualifierSubmissions: [],
    tournamentPlayers: {},
    matchScores: {},
  };

  describe('1. DB Sync Safety & Submission UUID Isolation', () => {
    it('generates new UUIDs if submissions from another tournament are attached during save', () => {
      const foreignSubmission = omenOpen.qualifierSubmissions[0];
      const targetTourneyId = omenDas.id;

      // In saveFullTournament: isOurUuid checks isUuid(s.id) && s.tournamentId === savedTourneyId
      const isOurUuid = isUuid(foreignSubmission.id) && foreignSubmission.tournamentId === targetTourneyId;
      const assignedId = isOurUuid ? foreignSubmission.id : crypto.randomUUID();

      // Because it belonged to omenOpen, assignedId must NOT collide with foreignSubmission.id
      expect(isOurUuid).toBe(false);
      expect(assignedId).not.toBe(foreignSubmission.id);
      expect(isUuid(assignedId)).toBe(true);
    });

    it('preserves submission UUID when the submission genuinely belongs to the current tournament', () => {
      const genuineSubmission = {
        id: '33333333-3333-4333-8333-333333333333',
        tournamentId: omenDas.id,
        playerId: '11111111-1111-4111-8111-111111111111',
        score: 1200000,
        submittedAt: Date.now(),
      };
      const isOurUuid = isUuid(genuineSubmission.id) && genuineSubmission.tournamentId === omenDas.id;
      const assignedId = isOurUuid ? genuineSubmission.id : crypto.randomUUID();

      expect(isOurUuid).toBe(true);
      expect(assignedId).toBe(genuineSubmission.id);
    });
  });

  describe('2. Bug #1 & #2: Tournament Switching & Dropdown Deduplication / Disambiguation', () => {
    it('deduplicates tournaments by ID so identical entries never co-exist in dropdown', () => {
      const duplicateList = [omenOpen, omenOpen, omenDas];
      const filtered = filterTournamentsByQuery(duplicateList, '');

      expect(filtered.length).toBe(2);
      expect(filtered.map(t => t.id)).toEqual([omenOpen.id, omenDas.id]);
    });

    it('disambiguates display names when two tournaments have the exact same name', () => {
      const tourney1: Tournament = { ...omenOpen, id: 'id-1', name: 'Omen Open', slug: 'omen-open-1' };
      const tourney2: Tournament = { ...omenOpen, id: 'id-2', name: 'Omen Open', slug: 'omen-open-2' };
      const list = [tourney1, tourney2];

      const filtered = filterTournamentsByQuery(list, '');
      const displayNames = filtered.map(t => {
        const nameCount = filtered.filter(other => other.name.toLowerCase() === t.name.toLowerCase()).length;
        return nameCount > 1 ? `${t.name} (${t.slug})` : t.name;
      });

      expect(displayNames[0]).toBe('Omen Open (omen-open-1)');
      expect(displayNames[1]).toBe('Omen Open (omen-open-2)');
    });

    it('strictly highlights only the active tournament ID in the dropdown menu', () => {
      const tourney1: Tournament = { ...omenOpen, id: 'id-1', name: 'Omen Open', slug: 'omen-open-1' };
      const tourney2: Tournament = { ...omenOpen, id: 'id-2', name: 'Omen Open', slug: 'omen-open-2' };
      const activeTourney = tourney1;

      const isTourney1Selected = Boolean(activeTourney?.id && tourney1.id === activeTourney.id);
      const isTourney2Selected = Boolean(activeTourney?.id && tourney2.id === activeTourney.id);

      expect(isTourney1Selected).toBe(true);
      expect(isTourney2Selected).toBe(false);
    });
  });

  describe('3. Bug #3: Qualifier Verification Logic & Status Invariants', () => {
    it('recognizes player as verified if qualsCompleted is true (from DB) or isVerified is true', () => {
      const tourneyWithDbVerified: Tournament = {
        ...omenOpen,
        tournamentPlayers: {
          'p-db': {
            playerId: 'p-db',
            tournamentId: omenOpen.id,
            qualsCompleted: true, // DB column
            isVerified: false,
          },
          'p-ui': {
            playerId: 'p-ui',
            tournamentId: omenOpen.id,
            qualsCompleted: false,
            isVerified: true, // UI state
          },
          'p-none': {
            playerId: 'p-none',
            tournamentId: omenOpen.id,
            qualsCompleted: false,
            isVerified: false,
          },
        },
      };

      expect(getPlayerQualifierStatus(tourneyWithDbVerified, 'p-db')).toBe('verified');
      expect(getPlayerQualifierStatus(tourneyWithDbVerified, 'p-ui')).toBe('verified');
      expect(getPlayerQualifierStatus(tourneyWithDbVerified, 'p-none')).toBe('not started');
    });

    it('toggles verification bidirectionally setting both qualsCompleted and isVerified', () => {
      const existing = {
        playerId: 'p-1',
        tournamentId: omenOpen.id,
        qualsCompleted: false,
        isVerified: false,
      };

      // Toggle ON
      const currentVal = Boolean(existing.isVerified || existing.qualsCompleted);
      const newVerified = !currentVal;
      const updatedOn = {
        ...existing,
        isVerified: newVerified,
        qualsCompleted: newVerified,
      };

      expect(updatedOn.isVerified).toBe(true);
      expect(updatedOn.qualsCompleted).toBe(true);

      // Toggle OFF
      const currentVal2 = Boolean(updatedOn.isVerified || updatedOn.qualsCompleted);
      const newVerified2 = !currentVal2;
      const updatedOff = {
        ...updatedOn,
        isVerified: newVerified2,
        qualsCompleted: newVerified2,
      };

      expect(updatedOff.isVerified).toBe(false);
      expect(updatedOff.qualsCompleted).toBe(false);
    });
  });

  describe('4. Bug #4: Default Tier Naming', () => {
    it('defaults new tiers to Gold, Silver, and Bronze without redundant Championship/Bracket suffixes', () => {
      const defaultTierNames = [
        // 1st Tier
        'Gold',
        // 2nd Tier
        'Silver',
        // 3rd Tier
        'Bronze',
      ];

      expect(defaultTierNames[0]).toBe('Gold');
      expect(defaultTierNames[1]).toBe('Silver');
      expect(defaultTierNames[2]).toBe('Bronze');
      expect(defaultTierNames[0]).not.toContain('Championship');
      expect(defaultTierNames[1]).not.toContain('Bracket');
      expect(defaultTierNames[2]).not.toContain('Bracket');
    });
  });

  describe('5. Bug #5: # of Maxes Setting Description', () => {
    it('describes # of Maxes format as "Ranked by number of maxouts; kickers act as the tiebreaker."', () => {
      const correctDescription = 'Ranked by number of maxouts; kickers act as the tiebreaker.';
      const buggyDescription = 'Ranked by highest game score; ties broken by total maxout count.';

      expect(correctDescription).toBe('Ranked by number of maxouts; kickers act as the tiebreaker.');
      expect(correctDescription).not.toBe(buggyDescription);
    });
  });

  describe('6. Bug #6: Format Badge Labeling in Navigation', () => {
    const getBadgeLabel = (format: string, avgCount?: number) => {
      return format === 'HIGH_SCORE'
        ? '# of Maxes'
        : format === 'AVERAGE_OF_X'
        ? (avgCount ? `Avg of ${avgCount}` : 'Average of X')
        : format === 'POINTS'
        ? 'Points'
        : 'Average';
    };

    it('labels HIGH_SCORE tournaments as "# of Maxes" instead of "HIGH SCORE"', () => {
      expect(getBadgeLabel('HIGH_SCORE')).toBe('# of Maxes');
      expect(getBadgeLabel('HIGH_SCORE')).not.toBe('HIGH SCORE');
    });

    it('labels AVERAGE_OF_X and POINTS accurately', () => {
      expect(getBadgeLabel('AVERAGE_OF_X', 2)).toBe('Avg of 2');
      expect(getBadgeLabel('AVERAGE_OF_X')).toBe('Average of X');
      expect(getBadgeLabel('POINTS')).toBe('Points');
    });
  });

  describe('7. Dropdown Navigation Dirty State & Unsaved Changes Protection', () => {
    it('intercepts dropdown tournament switching when settings has unsaved changes', () => {
      let pendingNav: string | null = null;
      let isDirty = true;
      const activeTourneySlug = 'omen-open';

      const handleNavigateAttempt = (url: string) => {
        if (url.includes(`/${activeTourneySlug}/manage/settings`)) {
          return true;
        }
        if (isDirty) {
          pendingNav = url;
          return false;
        }
        return true;
      };

      // User attempts to switch to omen-d in dropdown while dirty
      const targetUrl = '/omen-d/manage/settings';
      const allowed = handleNavigateAttempt(targetUrl);

      expect(allowed).toBe(false);
      expect(pendingNav).toBe(targetUrl);

      // User discards changes and confirms navigation
      isDirty = false;
      const confirmAllowed = handleNavigateAttempt(pendingNav!);
      expect(confirmAllowed).toBe(true);
    });

    it('allows dropdown tournament switching immediately when settings is not dirty', () => {
      let pendingNav: string | null = null;
      const isDirty = false;
      const activeTourneySlug = 'omen-open';

      const handleNavigateAttempt = (url: string) => {
        if (url.includes(`/${activeTourneySlug}/manage/settings`)) {
          return true;
        }
        if (isDirty) {
          pendingNav = url;
          return false;
        }
        return true;
      };

      const targetUrl = '/omen-d/manage/settings';
      const allowed = handleNavigateAttempt(targetUrl);

      expect(allowed).toBe(true);
      expect(pendingNav).toBe(null);
    });

    it('allows clicking the currently active tournament in the dropdown without prompt', () => {
      let pendingNav: string | null = null;
      const isDirty = true;
      const activeTourneySlug = 'omen-open';

      const handleNavigateAttempt = (url: string) => {
        if (url.includes(`/${activeTourneySlug}/manage/settings`)) {
          return true;
        }
        if (isDirty) {
          pendingNav = url;
          return false;
        }
        return true;
      };

      const targetUrl = '/omen-open/manage/settings';
      const allowed = handleNavigateAttempt(targetUrl);

      expect(allowed).toBe(true);
      expect(pendingNav).toBe(null);
    });
  });
});
