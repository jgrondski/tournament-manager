import React from 'react';
import { Trash2, X } from 'lucide-react';
import { TournamentTier, SeedingMethod } from '../../types';

interface AdminFormModalsProps {
  seedingMethod?: SeedingMethod;
  tierToDelete: { index: number; tier: TournamentTier } | null;
  tiersCount: number;
  onConfirmDeleteTier: (index: number) => void;
  onCancelDeleteTier: () => void;
  dataActionToConfirm: 'MATCHES' | 'QUALS' | 'ALL' | null;
  qualifierCount: number;
  recordedMatchCount: number;
  isExecutingAction?: boolean;
  onConfirmDataAction: () => void;
  onCancelDataAction: () => void;
}

export const AdminFormModals: React.FC<AdminFormModalsProps> = ({
  seedingMethod = 'QUALIFIERS',
  tierToDelete,
  tiersCount,
  onConfirmDeleteTier,
  onCancelDeleteTier,
  dataActionToConfirm,
  qualifierCount,
  recordedMatchCount,
  isExecutingAction,
  onConfirmDataAction,
  onCancelDataAction,
}) => {
  const isManual = seedingMethod === 'MANUAL';
  return (
    <>
      {/* Speedbump Modal for Deleting Bracket Tier */}
      {tierToDelete && (
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
              border: '1px solid var(--color-red)',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--color-red)' }}>
                <Trash2 size={20} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Delete Bracket Tier
                </h3>
              </div>
              <button
                type="button"
                onClick={onCancelDeleteTier}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                Are you sure you want to delete bracket <strong>{tierToDelete.tier.name}</strong>?
              </p>
              {tiersCount === 1 && (
                <div
                  style={{
                    padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#f87171',
                    fontSize: '0.8rem',
                    lineHeight: 1.4,
                  }}
                >
                  ⚠️ This is the final bracket. Deleting it will leave the tournament with 0 brackets until you add a new tier.
                </div>
              )}
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
                onClick={onCancelDeleteTier}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirmDeleteTier(tierToDelete.index)}
                className="btn btn-danger"
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Yes, Delete Bracket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Speedbump Modal for Clearing Tournament Data */}
      {dataActionToConfirm && (
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
              border: '1px solid var(--color-red)',
              maxWidth: '480px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--color-red)' }}>
                <Trash2 size={20} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {dataActionToConfirm === 'MATCHES' && 'Clear Match Scores'}
                  {dataActionToConfirm === 'QUALS' && (isManual ? 'Clear Registered Seeds' : 'Clear Qualifier Scores')}
                  {dataActionToConfirm === 'ALL' && 'Clear All Tournament Data'}
                </h3>
              </div>
              <button
                type="button"
                onClick={onCancelDataAction}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                {dataActionToConfirm === 'MATCHES' && (
                  <>Are you sure you want to delete all <strong>{recordedMatchCount} recorded match score(s)</strong> across all tiers? Tournament will revert to {isManual ? 'Seeding Mode' : 'Qualifiers Mode'}.</>
                )}
                {dataActionToConfirm === 'QUALS' && (
                  isManual ? (
                    <>Are you sure you want to delete all <strong>{qualifierCount} registered seed(s)</strong>? The tournament bracket seeding will be cleared.</>
                  ) : (
                    <>Are you sure you want to delete all <strong>{qualifierCount} qualifier score(s)</strong>? The qualifiers leaderboard will be emptied.</>
                  )
                )}
                {dataActionToConfirm === 'ALL' && (
                  <>Are you sure you want to clear <strong>all {isManual ? 'seed' : 'qualifier'} and match score data</strong> for this tournament? This will reset the tournament data to a clean slate, allowing you to delete it or re-seed.</>
                )}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                This action cannot be undone.
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
                onClick={onCancelDataAction}
                disabled={isExecutingAction}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDataAction}
                disabled={isExecutingAction}
                className="btn btn-danger"
                style={{ padding: '0.5rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {isExecutingAction && (
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#ffffff',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                )}
                <span>{isExecutingAction ? 'Clearing Data...' : 'Yes, Clear Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
