import React, { useState } from 'react';
import { Tournament } from '../types';
import { useTournament } from '../store';
import { Lock, ShieldAlert, CheckCircle2, X } from 'lucide-react';

interface VerifyBracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
}

export const VerifyBracketModal: React.FC<VerifyBracketModalProps> = ({
  isOpen,
  onClose,
  tournament,
}) => {
  const { verifyBrackets } = useTournament();
  const [step, setStep] = useState<1 | 2>(1);

  if (!isOpen) return null;

  const totalPlayers = tournament.tiers.reduce((acc, t) => acc + t.playerCount, 0);

  const handleConfirm = () => {
    verifyBrackets(tournament.id);
    onClose();
  };

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-gold)',
          maxWidth: '520px',
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--color-gold-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-gold-bright)',
              }}
            >
              <Lock size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Verify Tournament Brackets
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Double-confirmation seed lock
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {step === 1 ? (
            <>
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--color-gold-bright)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldAlert size={16} />
                  Freeze Seeding &amp; Initialize Match Play
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                  Verifying brackets will freeze the current qualifier standings into static match entities across all <strong>{tournament.tiers.length} tiers</strong> ({totalPlayers} competitors).
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  Subsequent qualifier score edits will be recorded in the qualifiers table, but will <strong>not</strong> re-seed or mutate the verified match pairings.
                </p>
              </div>

              {/* Tiers Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                  Tiers to lock:
                </span>
                {tournament.tiers.map(t => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0.75rem',
                      background: 'var(--color-bg-surface-highlight)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{t.name}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {t.playerCount} players • {t.bracketType} (Bo{t.bestOf})
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div
              style={{
                background: 'var(--color-bg-surface-elevated)',
                border: '1px solid var(--color-gold)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--color-gold-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-gold-bright)',
                }}
              >
                <Lock size={24} />
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                Final Verification Confirmation
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '380px' }}>
                Are you ready to officially start the tournament? Floor judges and score submission drawers will become active immediately.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
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
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1rem' }}
          >
            Cancel
          </button>
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1.25rem' }}
            >
              Proceed to Verify
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1.25rem' }}
            >
              <CheckCircle2 size={16} />
              Yes, Lock Seeds &amp; Begin Matches
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
