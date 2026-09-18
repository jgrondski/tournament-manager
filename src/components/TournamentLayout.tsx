import React from 'react';
import { Tournament, TournamentTier } from '../features/tournament/types';
import { TournamentSidebar, SidebarNavView } from './TournamentSidebar';

interface TournamentLayoutProps {
  tournament?: Tournament;
  activeTier?: TournamentTier;
  activeView?: SidebarNavView;
  children: React.ReactNode;
  contentStyle?: React.CSSProperties;
  className?: string;
  onNavigate?: (url: string) => boolean | void;
}

export const TournamentLayout: React.FC<TournamentLayoutProps> = ({
  tournament,
  activeTier,
  activeView,
  children,
  contentStyle,
  className,
  onNavigate,
}) => {
  return (
    <div
      className={className}
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'var(--color-bg-base)',
        width: '100%',
      }}
    >
      <TournamentSidebar
        tournament={tournament}
        activeTier={activeTier}
        activeView={activeView}
        onNavigate={onNavigate}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
};
