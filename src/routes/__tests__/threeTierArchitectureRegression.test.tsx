import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TournamentProvider } from '../../features/tournament/store';
import { OrganizationProvider } from '../../features/organizations/store';
import { ManageTournamentSettingsPage } from '../ManageTournamentSettingsPage';
import { ManageSheetPage } from '../ManageSheetPage';
import { ManageJudgePage } from '../ManageJudgePage';
import { PublicTierBracketPage } from '../PublicTierBracketPage';
import { createEmptyTournament, createDefaultTier } from '../../features/tournament/defaults';
import { Tournament } from '../../features/tournament/types';

describe('3-Tier Component Architecture & Hook Safety Regression Suite', () => {
  const sampleTournament: Tournament = createEmptyTournament({
    id: 'test-tourney-tier3',
    name: 'Apex Championship 2026',
    slug: 'apex-2026',
    tiers: [
      createDefaultTier(1, {
        id: 'tier-gold',
        name: 'Gold Division',
        slug: 'gold',
        playerCount: 8,
        bracketType: 'TRADITIONAL',
      }),
      createDefaultTier(2, {
        id: 'tier-silver',
        name: 'Silver Division',
        slug: 'silver',
        playerCount: 8,
        bracketType: 'FLAT',
      }),
    ],
  });

  describe('1. ManageTournamentSettingsPage 3-Tier Gate & View Separation', () => {
    it('renders loading screen when not hydrated (Render 1)', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/apex-2026/manage/settings']}>
          <TournamentProvider initialTournaments={[sampleTournament]} initialHydrated={false}>
            <OrganizationProvider initialHydrated={false}>
              <Routes>
                <Route path="/:slug/manage/settings" element={<ManageTournamentSettingsPage />} />
              </Routes>
            </OrganizationProvider>
          </TournamentProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Loading tournament settings...');
      expect(html).not.toContain('Tournament Administration &amp; Configuration');
    });

    it('renders settings view without hook mismatch when hydrated (Render 2)', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/apex-2026/manage/settings']}>
          <TournamentProvider initialTournaments={[sampleTournament]} initialHydrated={true}>
            <OrganizationProvider initialHydrated={true}>
              <Routes>
                <Route path="/:slug/manage/settings" element={<ManageTournamentSettingsPage />} />
              </Routes>
            </OrganizationProvider>
          </TournamentProvider>
        </MemoryRouter>
      );

      expect(html).not.toContain('Loading tournament settings...');
      expect(html).toContain('Tournament Administration &amp; Configuration');
      expect(html).toContain('Apex Championship 2026');
    });
  });

  describe('2. ManageSheetPage & ManageJudgePage Query Param Tier Selection', () => {
    it('ManageSheetPage respects ?tier=silver query parameter directly without useEffect', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/apex-2026/manage/sheet?tier=silver']}>
          <TournamentProvider initialTournaments={[sampleTournament]} initialHydrated={true}>
            <OrganizationProvider initialHydrated={true}>
              <Routes>
                <Route path="/:slug/manage/sheet" element={<ManageSheetPage />} />
              </Routes>
            </OrganizationProvider>
          </TournamentProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Silver Division');
      expect(html).toContain('View Bracket');
    });

    it('ManageJudgePage respects ?tier=silver query parameter directly without useEffect', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/apex-2026/manage/judge?tier=silver']}>
          <TournamentProvider initialTournaments={[sampleTournament]} initialHydrated={true}>
            <OrganizationProvider initialHydrated={true}>
              <Routes>
                <Route path="/:slug/manage/judge" element={<ManageJudgePage />} />
              </Routes>
            </OrganizationProvider>
          </TournamentProvider>
        </MemoryRouter>
      );

      expect(html).toContain("Judge&#x27;s Score Sheet");
      expect(html).toContain('Silver Division');
    });
  });

  describe('3. PublicTierBracketPage Keyed Tier Separation', () => {
    it('renders requested tier cleanly when hydrated without useEffect resets', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/apex-2026/gold']}>
          <TournamentProvider initialTournaments={[sampleTournament]} initialHydrated={true}>
            <OrganizationProvider initialHydrated={true}>
              <Routes>
                <Route path="/:slug/:tierSlug" element={<PublicTierBracketPage />} />
              </Routes>
            </OrganizationProvider>
          </TournamentProvider>
        </MemoryRouter>
      );

      expect(html).toContain('Gold Division');
      expect(html).toContain('Apex Championship 2026');
      expect(html).not.toContain('Loading tournament bracket...');
    });
  });
});
