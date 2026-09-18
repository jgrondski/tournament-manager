import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TournamentProvider } from './features/tournament/store';
import { TournamentSwitcherPage } from './routes/TournamentSwitcherPage';
import { PublicTierBracketPage } from './routes/PublicTierBracketPage';
import { PublicLeaderboardPage } from './routes/PublicLeaderboardPage';
import { ManageSheetPage } from './routes/ManageSheetPage';
import { ManageJudgePage } from './routes/ManageJudgePage';
import { ManageTournamentSettingsPage } from './routes/ManageTournamentSettingsPage';
import { ManageTournamentPlayersPage } from './routes/ManageTournamentPlayersPage';
import { FinalStandingsPage } from './routes/FinalStandingsPage';
import { SlugRedirectPage } from './routes/SlugRedirectPage';
import { PlayerDirectoryPage } from './routes/PlayerDirectoryPage';
import { OBSHubPage } from './routes/OBSHubPage';

export const App: React.FC = () => {
  return (
    <TournamentProvider>
      <BrowserRouter>
        <Routes>
          {/* Home: Tournaments Switcher */}
          <Route path="/" element={<TournamentSwitcherPage />} />

          {/* Global Player Directory */}
          <Route path="/players" element={<PlayerDirectoryPage />} />

          {/* Tournament Shortlinks & Cutoffs */}
          <Route path="/:slug" element={<SlugRedirectPage />} />
          <Route path="/:slug/leaderboard" element={<PublicLeaderboardPage />} />
          <Route path="/:slug/standings" element={<FinalStandingsPage />} />

          {/* OBS Broadcast Studio Hub */}
          <Route path="/:slug/obs" element={<OBSHubPage />} />

          {/* Management Views */}
          <Route path="/:slug/manage/sheet" element={<ManageSheetPage />} />
          <Route path="/:slug/manage/judge" element={<ManageJudgePage />} />
          <Route path="/:slug/manage/bracket" element={<ManageJudgePage />} />
          <Route path="/:slug/manage/qualifiers" element={<PublicLeaderboardPage />} />
          <Route path="/:slug/manage/players" element={<ManageTournamentPlayersPage />} />
          <Route path="/:slug/manage/settings" element={<ManageTournamentSettingsPage />} />

          {/* Route Aliases for Direct Friendly URLs */}
          <Route path="/:slug/brackets" element={<PublicTierBracketPage />} />
          <Route path="/:slug/sheet" element={<ManageSheetPage />} />
          <Route path="/:slug/judge" element={<ManageJudgePage />} />
          <Route path="/:slug/players" element={<ManageTournamentPlayersPage />} />
          <Route path="/:slug/settings" element={<ManageTournamentSettingsPage />} />

          {/* Public Dynamic Tier Bracket (e.g. /kc-2026-open/gold, /kc-2026-open/silver, etc.) */}
          <Route path="/:slug/:tierSlug" element={<PublicTierBracketPage />} />

          {/* Fallback to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TournamentProvider>
  );
};
