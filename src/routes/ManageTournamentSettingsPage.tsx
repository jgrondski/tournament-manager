import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';
import { TournamentNavbar } from '../components/TournamentNavbar';
import { TournamentAdminForm } from '../features/tournament/components/TournamentAdminForm';
import { AlertTriangle, X } from 'lucide-react';

export const ManageTournamentSettingsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { getTournamentBySlug } = useTournament();
  const [isDirty, setIsDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const tournament = slug ? getTournamentBySlug(slug) : undefined;
  if (!tournament) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <h2>Tournament Not Found</h2>
        <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Tournaments
        </button>
      </div>
    );
  }

  const handleNavigateAttempt = (url: string) => {
    if (url.includes(`/${tournament.slug}/manage/settings`)) {
      return true;
    }
    if (isDirty) {
      setPendingNavigation(url);
      return false;
    }
    return true;
  };

  const handleStay = () => {
    setPendingNavigation(null);
  };

  const handleConfirmLeave = () => {
    const dest = pendingNavigation;
    setPendingNavigation(null);
    setIsDirty(false);
    if (dest) {
      navigate(dest);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TournamentNavbar
        tournament={tournament}
        activeView="settings"
        onNavigate={handleNavigateAttempt}
      />
      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1100px', width: '100%', margin: '0 auto' }}>
        <TournamentAdminForm
          tournament={tournament}
          onDirtyChange={setIsDirty}
        />
      </main>

      {/* Unsaved Changes Speedbump Modal */}
      {pendingNavigation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--color-bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-gold)',
              maxWidth: '460px',
              width: '100%',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                background: 'var(--color-bg-surface-elevated)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--color-gold-bright)' }}>
                <AlertTriangle size={20} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Unsaved Changes
                </h3>
              </div>
              <button
                type="button"
                onClick={handleStay}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                You have unsaved changes in tournament settings. If you leave this page now, your changes will be discarded.
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
                onClick={handleStay}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Stay
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="btn btn-danger"
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Discard &amp; Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

