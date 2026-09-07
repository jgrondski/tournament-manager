import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TournamentProvider } from './features/tournament/store';
import { TournamentSwitcherPage } from './routes/TournamentSwitcherPage';
import { PublicTierBracketPage } from './routes/PublicTierBracketPage';
import { PublicLeaderboardPage } from './routes/PublicLeaderboardPage';
import { ManageSheetPage } from './routes/ManageSheetPage';
import { ManageJudgePage } from './routes/ManageJudgePage';
import { SlugRedirectPage } from './routes/SlugRedirectPage';

export const App: React.FC = () => {
  return (
    <TournamentProvider>
      <BrowserRouter>
        <Routes>
          {/* Home: Tournaments Switcher */}
          <Route path="/" element={<TournamentSwitcherPage />} />

          {/* Tournament Shortlinks & Cutoffs */}
          <Route path="/:slug" element={<SlugRedirectPage />} />
          <Route path="/:slug/leaderboard" element={<PublicLeaderboardPage />} />

          {/* Management Views */}
          <Route path="/:slug/manage/sheet" element={<ManageSheetPage />} />
          <Route path="/:slug/manage/judge" element={<ManageJudgePage />} />
          <Route path="/:slug/manage/bracket" element={<ManageSheetPage />} />
          <Route path="/:slug/manage/qualifiers" element={<PublicLeaderboardPage />} />

          {/* Public Dynamic Tier Bracket (e.g. /kc-2026-open/gold, /kc-2026-open/silver, etc.) */}
          <Route path="/:slug/:tierSlug" element={<PublicTierBracketPage />} />

          {/* Fallback to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TournamentProvider>
  );
};
