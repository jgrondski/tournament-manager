import React from 'react';
import { PlayerDirectory } from '../features/players/components/PlayerDirectory';
import { TournamentLayout } from '../components/TournamentLayout';
import { useTournament } from '../features/tournament/store';

export const PlayerDirectoryPage: React.FC = () => {
  const { tournaments } = useTournament();
  const activeTournament = tournaments[0];

  return (
    <TournamentLayout tournament={activeTournament} activeView="globalPlayers">
      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        <PlayerDirectory />
      </main>
    </TournamentLayout>
  );
};
