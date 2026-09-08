import React, { useState } from 'react';
import { Tournament } from '../../tournament/types';
import { useTournament } from '../../tournament/store';
import { AlertTriangle, Lock, Unlock, ShieldCheck } from 'lucide-react';
import { VerifyBracketModal } from '../../tournament/components/VerifyBracketModal';

interface BracketDraftBannerProps {
  tournament: Tournament;
  canManage?: boolean;
}

export const BracketDraftBanner: React.FC<BracketDraftBannerProps> = ({
  tournament,
  canManage = true,
}) => {
  const { unlockBrackets } = useTournament();
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const isDraft = !tournament.isVerified;

  const handleUnlockClick = () => {
    const res = unlockBrackets(tournament.id);
    if (!res.success && res.error) {
      setUnlockError(res.error);
    } else {
      setUnlockError(null);
    }
  };

  return (
    <>
      {isDraft ? (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.18) 0%, rgba(217, 119, 6, 0.28) 100%)',
            borderBottom: '2px solid var(--color-gold)',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            boxShadow: '0 2px 10px rgba(245, 158, 11, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '280px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-gold-bright)',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-gold-bright)', letterSpacing: '0.02em' }}>
                DRAFT SEEDING PREVIEW — Qualifiers Active
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>
                Bracket seeds update dynamically with incoming qualifier scores. Match scoring is disabled. Click &quot;Verify Brackets&quot; to lock seeds and begin match play.
              </div>
            </div>
          </div>

          {canManage && (
            <button
              onClick={() => setIsVerifyModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
            >
              <Lock size={15} />
              Verify Brackets
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '0.4rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.8rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399' }}>
            <ShieldCheck size={16} />
            <span style={{ fontWeight: 600 }}>Verified Brackets Active</span>
            <span style={{ color: 'var(--color-text-muted)' }}>• Match play and score entry unlocked</span>
          </div>

          {canManage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {unlockError && (
                <span style={{ color: 'var(--color-red)', fontSize: '0.75rem', fontWeight: 600 }}>
                  {unlockError}
                </span>
              )}
              <button
                onClick={handleUnlockClick}
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                title="Revert tournament to dynamic draft preview"
              >
                <Unlock size={13} />
                Unlock Brackets
              </button>
            </div>
          )}
        </div>
      )}

      {isVerifyModalOpen && (
        <VerifyBracketModal
          isOpen={isVerifyModalOpen}
          onClose={() => setIsVerifyModalOpen(false)}
          tournament={tournament}
        />
      )}
    </>
  );
};
