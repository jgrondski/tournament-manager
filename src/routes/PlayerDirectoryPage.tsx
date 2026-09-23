import React from 'react';
import { PlayerDirectory } from '../features/players/components/PlayerDirectory';
import { TopNavSwitcher } from '../components/TopNavSwitcher';

export const PlayerDirectoryPage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-base)', padding: '0 0 4rem' }}>
      <TopNavSwitcher />
      <main style={{ maxWidth: '1180px', width: '100%', margin: '0 auto', padding: '2rem 1.5rem', boxSizing: 'border-box' }}>
        <PlayerDirectory />
      </main>
    </div>
  );
};
