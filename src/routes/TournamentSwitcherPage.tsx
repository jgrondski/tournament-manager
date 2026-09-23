import React, { useState } from 'react';
import { useTournament } from '../features/tournament/store';
import { TopNavSwitcher } from '../components/TopNavSwitcher';
import { Layers, Plus, Trophy, AlertTriangle } from 'lucide-react';
import { Tournament } from '../features/tournament/types';
import { TournamentCard } from '../features/tournament/components/TournamentCard';
import { CreateTournamentModal } from '../features/tournament/components/CreateTournamentModal';

export const TournamentSwitcherPage: React.FC = () => {
  const { tournaments, deleteTournament } = useTournament();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);

  const confirmDeleteTournament = () => {
    if (tournamentToDelete) {
      deleteTournament(tournamentToDelete.id);
      setTournamentToDelete(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-base)', padding: '0 0 3rem' }}>
      <TopNavSwitcher />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Hero Section */}
        <header style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={logoIconLargeStyle}>
              <Layers size={24} color="#090d16" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--color-text-primary)' }}>
              TOURNAMENT <span style={{ color: 'var(--color-gold-bright)' }}>MANAGER</span>
            </span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Live Regional Tournament Portal
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', maxWidth: '650px', margin: '0 auto 1.5rem' }}>
            Organizer command center, public broadcast brackets, and mobile floor judge portal for competitive gaming tournaments.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem', boxShadow: 'var(--shadow-gold)' }}
            >
              <Plus size={18} />
              Create New Tournament
            </button>
          </div>
        </header>

        {/* Tournament Grid / Empty State */}
        {tournaments.length === 0 ? (
          <div
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '4rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              maxWidth: '620px',
              margin: '1rem auto 3rem',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--color-gold-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-gold-bright)',
                marginBottom: '0.5rem',
              }}
            >
              <Trophy size={30} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              No Tournaments Created Yet
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', maxWidth: '440px', lineHeight: 1.5 }}>
              Get started by creating your first competitive tournament. Configure tiers, record qualifier attempts, seed brackets, and run live match play.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
              style={{ marginTop: '0.75rem', padding: '0.7rem 1.75rem', fontSize: '0.95rem', boxShadow: 'var(--shadow-gold)' }}
            >
              <Plus size={18} />
              Create New Tournament
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '1.5rem' }}>
            {tournaments.map(tournament => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onDeleteClick={setTournamentToDelete}
                showOrgBadge={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Shared Create Tournament Modal */}
      <CreateTournamentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      {tournamentToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--color-bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'rgba(239, 68, 68, 0.08)',
              }}
            >
              <AlertTriangle size={22} color="#ef4444" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                Delete Tournament
              </h3>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Are you sure you want to delete <strong style={{ color: '#ffffff' }}>{tournamentToDelete.name}</strong>?
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                This tournament has no recorded matches or qualifiers and will be permanently removed. This action cannot be undone.
              </p>
            </div>

            <div
              style={{
                padding: '1rem 1.5rem',
                background: 'var(--color-bg-surface-elevated)',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => setTournamentToDelete(null)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTournament}
                className="btn btn-danger"
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Yes, Delete Tournament
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const logoIconLargeStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, var(--color-gold-bright) 0%, var(--color-gold) 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: 'var(--shadow-gold)',
};
