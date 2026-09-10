import React, { useState, useEffect } from 'react';
import { PlayerProfile } from '../../tournament/types';
import { User, X, AlertTriangle, Check } from 'lucide-react';

interface PlayerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (player: Omit<PlayerProfile, 'id'>) => void;
  initialPlayer?: PlayerProfile | null;
  existingNames: string[];
}

export const PlayerEditModal: React.FC<PlayerEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPlayer,
  existingNames,
}) => {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [personalBest, setPersonalBest] = useState<string>('1000000');
  const [playstyle, setPlaystyle] = useState<'Rolling' | 'DAS' | 'Hypertap'>('Rolling');
  const [notes, setNotes] = useState('');
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPlayer) {
      setName(initialPlayer.name);
      setCountry(initialPlayer.country || '');
      setPersonalBest(String(initialPlayer.personalBest || 1000000));
      setPlaystyle(initialPlayer.playstyle || 'Rolling');
      setNotes(initialPlayer.notes || '');
      setIsDisqualified(Boolean(initialPlayer.isDisqualified));
      setError(null);
    } else {
      setName('');
      setCountry('US');
      setPersonalBest('1000000');
      setPlaystyle('Rolling');
      setNotes('');
      setIsDisqualified(false);
      setError(null);
    }
  }, [initialPlayer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Player name is required.');
      return;
    }

    // Check unique name
    const isDuplicate = existingNames.some(
      n => n.toLowerCase() === trimmedName.toLowerCase() &&
           (!initialPlayer || initialPlayer.name.toLowerCase() !== trimmedName.toLowerCase())
    );
    if (isDuplicate) {
      setError(`A competitor named "${trimmedName}" already exists.`);
      return;
    }

    const pbNum = parseInt(personalBest.replace(/\D/g, ''), 10) || 0;

    onSave({
      name: trimmedName,
      country: country.trim().toUpperCase() || undefined,
      personalBest: pbNum,
      playstyle,
      notes: notes.trim() || undefined,
      isDisqualified,
    });
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
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--color-bg-surface-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '520px',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-gold-bright)',
              }}
            >
              <User size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                {initialPlayer ? `Edit Competitor: ${initialPlayer.name}` : 'Add New Competitor'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                {initialPlayer ? 'Update profile in master player directory' : 'Register new competitor in global directory'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {error && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#f87171',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Name & Country */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
                  Competitor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Blue Scuti"
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-base)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
                  Country (2-letter)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="US, JP, etc."
                  value={country}
                  onChange={e => setCountry(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-base)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            {/* Playstyle & Personal Best */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
                  Playstyle
                </label>
                <select
                  value={playstyle}
                  onChange={e => setPlaystyle(e.target.value as 'Rolling' | 'DAS' | 'Hypertap')}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-base)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="Rolling">Rolling</option>
                  <option value="DAS">DAS</option>
                  <option value="Hypertap">Hypertap</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
                  Personal Best (Manual)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1,200,000"
                  value={personalBest}
                  onChange={e => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    setPersonalBest(cleaned);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-base)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                  }}
                />
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                  Strict manual PB field (never auto-overwritten)
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
                Notes / Bio (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Regional qualifier notes, team affiliation, setup notes..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-base)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Disqualification Flag */}
            <div
              style={{
                padding: '0.75rem 1rem',
                background: isDisqualified ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-bg-base)',
                border: isDisqualified ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
              }}
              onClick={() => setIsDisqualified(!isDisqualified)}
            >
              <input
                type="checkbox"
                id="is-dq-checkbox"
                checked={isDisqualified}
                onChange={e => setIsDisqualified(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label
                htmlFor="is-dq-checkbox"
                onClick={e => e.stopPropagation()}
                style={{ fontSize: '0.85rem', color: isDisqualified ? '#f87171' : 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                <strong>Mark Competitor as Disqualified</strong> (moves competitor to bottom of tournament standings)
              </label>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--color-border)',
              background: 'var(--color-bg-surface)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="btn btn-primary"
              style={{
                padding: '0.55rem 1.5rem',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: 'var(--shadow-gold)',
                opacity: !name.trim() ? 0.5 : 1,
                cursor: !name.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              <Check size={16} />
              {initialPlayer ? 'Save Changes' : 'Add Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
