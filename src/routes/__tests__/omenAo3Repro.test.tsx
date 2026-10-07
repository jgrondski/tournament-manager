import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TournamentProvider } from '../../features/tournament/store';
import { OrganizationProvider } from '../../features/organizations/store';
import { PublicTierBracketPage } from '../PublicTierBracketPage';
import { ManageSheetPage } from '../ManageSheetPage';
import { ManageJudgePage } from '../ManageJudgePage';
import { ManageTournamentSettingsPage } from '../ManageTournamentSettingsPage';
import omenDataRaw from './omenAo3Data.json';
import { Tournament } from '../../features/tournament/types';

const omenData = omenDataRaw as unknown as Tournament[];

describe('omen-ao3 hydrated rendering test', () => {
  it('renders PublicTierBracketPage at /omen-ao3/gold without error', () => {
    const html = renderToStaticMarkup(
      <OrganizationProvider initialHydrated={true}>
        <TournamentProvider initialTournaments={omenData} initialHydrated={true}>
          <MemoryRouter initialEntries={['/omen-ao3/gold']}>
            <Routes>
              <Route path="/:slug/:tierSlug" element={<PublicTierBracketPage />} />
            </Routes>
          </MemoryRouter>
        </TournamentProvider>
      </OrganizationProvider>
    );

    console.log('PublicTierBracketPage html length:', html.length);
    expect(html).not.toContain('Loading tournament bracket');
  });

  it('renders PublicTierBracketPage at /omen-ao3/manage/bracket/gold without error', () => {
    const html = renderToStaticMarkup(
      <OrganizationProvider initialHydrated={true}>
        <TournamentProvider initialTournaments={omenData} initialHydrated={true}>
          <MemoryRouter initialEntries={['/omen-ao3/manage/bracket/gold']}>
            <Routes>
              <Route path="/:slug/manage/bracket/:tierSlug" element={<PublicTierBracketPage />} />
            </Routes>
          </MemoryRouter>
        </TournamentProvider>
      </OrganizationProvider>
    );

    console.log('Manage PublicTierBracketPage html length:', html.length);
    expect(html).not.toContain('Loading tournament bracket');
  });

  it('renders ManageSheetPage at /omen-ao3/manage/sheet without error', () => {
    const html = renderToStaticMarkup(
      <OrganizationProvider initialHydrated={true}>
        <TournamentProvider initialTournaments={omenData} initialHydrated={true}>
          <MemoryRouter initialEntries={['/omen-ao3/manage/sheet']}>
            <Routes>
              <Route path="/:slug/manage/sheet" element={<ManageSheetPage />} />
            </Routes>
          </MemoryRouter>
        </TournamentProvider>
      </OrganizationProvider>
    );

    console.log('ManageSheetPage html length:', html.length);
    expect(html).not.toContain('Loading master sheet');
  });

  it('renders ManageJudgePage at /omen-ao3/manage/judge without error', () => {
    const html = renderToStaticMarkup(
      <OrganizationProvider initialHydrated={true}>
        <TournamentProvider initialTournaments={omenData} initialHydrated={true}>
          <MemoryRouter initialEntries={['/omen-ao3/manage/judge']}>
            <Routes>
              <Route path="/:slug/manage/judge" element={<ManageJudgePage />} />
            </Routes>
          </MemoryRouter>
        </TournamentProvider>
      </OrganizationProvider>
    );

    console.log('ManageJudgePage html length:', html.length);
    expect(html).not.toContain('Loading floor judge');
  });

  it('renders ManageTournamentSettingsPage at /omen-ao3/manage/settings without error', () => {
    const html = renderToStaticMarkup(
      <OrganizationProvider initialHydrated={true}>
        <TournamentProvider initialTournaments={omenData} initialHydrated={true}>
          <MemoryRouter initialEntries={['/omen-ao3/manage/settings']}>
            <Routes>
              <Route path="/:slug/manage/settings" element={<ManageTournamentSettingsPage />} />
            </Routes>
          </MemoryRouter>
        </TournamentProvider>
      </OrganizationProvider>
    );

    console.log('ManageTournamentSettingsPage html length:', html.length);
    expect(html).not.toContain('Loading tournament settings');
  });
});
