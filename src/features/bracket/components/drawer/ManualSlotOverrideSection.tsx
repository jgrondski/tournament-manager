import React, { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { BracketMatch } from '../../types';
import { useTournament } from '../../../tournament/store';

interface ManualSlotOverrideSectionProps {
  roundMatches: BracketMatch[];
  match: BracketMatch;
  roundName: string;
  p1Name: string;
  p2Name: string;
  tournamentId: string;
  tierId: string;
  onClose: () => void;
}

export const ManualSlotOverrideSection: React.FC<ManualSlotOverrideSectionProps> = ({
  roundMatches,
  match,
  roundName,
  p1Name,
  p2Name,
  tournamentId,
  tierId,
  onClose,
}) => {
  const { swapMatchSlots } = useTournament();

  const [showOverridePanel, setShowOverridePanel] = useState(false);
  const [sourceSlot, setSourceSlot] = useState<1 | 2>(1);
  const [targetMatchId, setTargetMatchId] = useState<string>('');
  const [targetSlot, setTargetSlot] = useState<1 | 2>(1);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);

  const handleApplyOverride = async () => {
    setOverrideError(null);
    setOverrideSuccess(null);
    const chosenTargetId = targetMatchId || roundMatches[0]?.id;
    if (!chosenTargetId) {
      setOverrideError('Please select a target match in this round.');
      return;
    }
    const res = await swapMatchSlots(tournamentId, tierId, {
      sourceMatchId: match.id,
      sourceSlot,
      targetMatchId: chosenTargetId,
      targetSlot,
    });
    if (res.success) {
      setOverrideSuccess('Match placement overridden successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setOverrideError(res.error || 'Failed to override slot placement.');
    }
  };

  return (
    <div style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255, 255, 255, 0.015)' }}>
      <button
        type="button"
        onClick={() => {
          setShowOverridePanel(!showOverridePanel);
          if (!targetMatchId && roundMatches.length > 0) {
            setTargetMatchId(roundMatches[0].id);
          }
        }}
        style={{
          width: '100%',
          padding: '0.55rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: showOverridePanel ? 'rgba(234, 88, 12, 0.08)' : 'transparent',
          border: 'none',
          color: showOverridePanel ? '#ea580c' : 'var(--color-text-secondary)',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeftRight size={14} color={showOverridePanel ? '#ea580c' : 'currentColor'} />
          <span>Override / Swap Round Placement</span>
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
          {showOverridePanel ? 'Hide Controls' : 'Adjust Slot'}
        </span>
      </button>

      {showOverridePanel && (
        <div style={{ padding: '0.85rem 1.5rem 1.25rem', borderTop: '1px dashed var(--color-border-subtle)', background: 'rgba(0, 0, 0, 0.25)' }}>
          <p style={{ margin: '0 0 0.65rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Manually move or swap an advancing player with another slot in <strong>{roundName}</strong>.
          </p>

          {overrideError && (
            <div style={{ padding: '0.4rem 0.6rem', marginBottom: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.75rem' }}>
              {overrideError}
            </div>
          )}
          {overrideSuccess && (
            <div style={{ padding: '0.4rem 0.6rem', marginBottom: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(34, 197, 94, 0.15)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '0.75rem' }}>
              {overrideSuccess}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.65rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                From (Match #{match.matchNumber})
              </label>
              <select
                value={sourceSlot}
                onChange={(e) => setSourceSlot(Number(e.target.value) as 1 | 2)}
                style={{
                  width: '100%',
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.78rem',
                  background: '#090d16',
                  border: '1px solid var(--color-border)',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <option value={1}>Slot 1: {p1Name}</option>
                <option value={2}>Slot 2: {p2Name}</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                To Slot
              </label>
              <select
                value={targetSlot}
                onChange={(e) => setTargetSlot(Number(e.target.value) as 1 | 2)}
                style={{
                  width: '100%',
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.78rem',
                  background: '#090d16',
                  border: '1px solid var(--color-border)',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <option value={1}>Target Slot 1</option>
                <option value={2}>Target Slot 2</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
              Target Match in {roundName}
            </label>
            <select
              value={targetMatchId || (roundMatches[0]?.id ?? '')}
              onChange={(e) => setTargetMatchId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.5rem',
                fontSize: '0.78rem',
                background: '#090d16',
                border: '1px solid var(--color-border)',
                color: '#ffffff',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {roundMatches.map((m) => {
                const mP1 = m.player1.player?.name || (m.player1.sourceMatchId ? 'Feeder' : 'Empty');
                const mP2 = m.player2.player?.name || (m.player2.sourceMatchId ? 'Feeder' : 'Empty');
                return (
                  <option key={m.id} value={m.id}>
                    Match #{m.matchNumber}: {mP1} vs {mP2}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            type="button"
            onClick={handleApplyOverride}
            style={{
              width: '100%',
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              background: '#ea580c',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
            }}
          >
            <ArrowLeftRight size={14} />
            <span>Apply Placement Override</span>
          </button>
        </div>
      )}
    </div>
  );
};
