import React, { useState, useEffect } from 'react';
import { TournamentTier } from '../types';
import { Plus, Trash2, Check } from 'lucide-react';
import { getAvailableRoundsForTier } from '../roundOverrides';
import { BestOfSelect } from '../../bracket/components/BestOfSelect';

interface DraftOverrideRow {
  id: string;
  roundKey: string | number;
  bestOf: number;
  originalRoundKey: string | number;
  originalBestOf: number;
  isDirty: boolean;
}

interface RoundOverridesEditorProps {
  tier: TournamentTier;
  onChange: (overrides: Record<string | number, number>) => void;
  inputStyle: React.CSSProperties;
}

export const RoundOverridesEditor: React.FC<RoundOverridesEditorProps> = ({ tier, onChange, inputStyle }) => {
  const [draftRows, setDraftRows] = useState<DraftOverrideRow[]>(() => {
    const entries = Object.entries(tier.roundBestOfOverrides || {})
      .map(([rStr, boVal]) => {
        const num = parseInt(rStr, 10);
        const roundKey = !isNaN(num) && String(num) === rStr ? num : rStr;
        return { roundKey, bestOf: boVal };
      });

    return entries.map(e => ({
      id: `r_${e.roundKey}`,
      roundKey: e.roundKey,
      bestOf: e.bestOf,
      originalRoundKey: e.roundKey,
      originalBestOf: e.bestOf,
      isDirty: false,
    }));
  });

  // Sync with tier.roundBestOfOverrides changes if there are no dirty edits in progress
  useEffect(() => {
    const entries = Object.entries(tier.roundBestOfOverrides || {})
      .map(([rStr, boVal]) => {
        const num = parseInt(rStr, 10);
        const roundKey = !isNaN(num) && String(num) === rStr ? num : rStr;
        return { roundKey, bestOf: boVal };
      });

    setDraftRows(prev => {
      // If user has active dirty edits, do not disrupt unless overrides structurally changed
      const hasDirty = prev.some(r => r.isDirty);
      if (hasDirty) return prev;

      if (
        prev.length === entries.length &&
        prev.every((r, idx) => r.roundKey === entries[idx]?.roundKey && r.bestOf === entries[idx]?.bestOf)
      ) {
        return prev;
      }

      return entries.map(e => ({
        id: `r_${e.roundKey}`,
        roundKey: e.roundKey,
        bestOf: e.bestOf,
        originalRoundKey: e.roundKey,
        originalBestOf: e.bestOf,
        isDirty: false,
      }));
    });
  }, [tier.roundBestOfOverrides]);

  const availableRounds = getAvailableRoundsForTier(tier);

  const handleAdd = () => {
    const takenKeys = new Set(draftRows.map(r => String(r.roundKey)));
    const nextRound = availableRounds.find(r => !takenKeys.has(String(r.roundIdentifier || r.roundNumber)));
    if (!nextRound) return;

    const roundKey = nextRound.roundIdentifier || nextRound.roundNumber;
    const newRow: DraftOverrideRow = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      roundKey,
      bestOf: tier.bestOf,
      originalRoundKey: -1,
      originalBestOf: -1,
      isDirty: true,
    };

    setDraftRows(prev => [...prev, newRow]);
  };

  const handleRoundChange = (rowId: string, newRoundKey: string | number) => {
    setDraftRows(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        const isDirty = newRoundKey !== r.originalRoundKey || r.bestOf !== r.originalBestOf;
        return {
          ...r,
          roundKey: newRoundKey,
          isDirty,
        };
      })
    );
  };

  const handleBestOfChange = (rowId: string, newBo: number) => {
    setDraftRows(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        const isDirty = r.roundKey !== r.originalRoundKey || newBo !== r.originalBestOf;
        return {
          ...r,
          bestOf: newBo,
          isDirty,
        };
      })
    );
  };

  const handleSaveRow = (rowId: string) => {
    const updatedRows = draftRows.map(r => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        originalRoundKey: r.roundKey,
        originalBestOf: r.bestOf,
        isDirty: false,
      };
    });

    setDraftRows(updatedRows);

    const nextOverrides: Record<string | number, number> = {};
    for (const r of updatedRows) {
      if (r.originalRoundKey !== -1) {
        nextOverrides[r.roundKey] = r.bestOf;
      }
    }
    onChange(nextOverrides);
  };

  const handleDeleteRow = (rowId: string) => {
    const remaining = draftRows.filter(r => r.id !== rowId);
    setDraftRows(remaining);

    const nextOverrides: Record<string | number, number> = {};
    for (const r of remaining) {
      if (r.originalRoundKey !== -1) {
        nextOverrides[r.roundKey] = r.bestOf;
      }
    }
    onChange(nextOverrides);
  };

  const configuredCount = Object.keys(tier.roundBestOfOverrides || {}).length;
  const isAllConfigured = availableRounds.length > 0 && availableRounds.every(r =>
    draftRows.some(row => String(row.roundKey) === String(r.roundIdentifier || r.roundNumber))
  );

  return (
    <div
      style={{
        marginTop: '1.25rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--color-border-subtle)',
        maxWidth: '680px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Round-Specific Best-of Overrides
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '0.1rem 0.45rem',
                borderRadius: 'var(--radius-full)',
                background: configuredCount > 0 ? 'var(--color-gold-bg)' : 'var(--color-bg-base)',
                color: configuredCount > 0 ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
                border: '1px solid var(--color-border-subtle)',
                fontWeight: 600,
              }}
            >
              {configuredCount} configured
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
            Override series format for specific rounds (e.g., Finals Bo7). Unconfigured rounds inherit default <strong>Bo{tier.bestOf}</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={isAllConfigured}
          title={
            isAllConfigured
              ? 'All rounds in this bracket already have overrides configured'
              : 'Add a round-specific Best-of format override'
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface-elevated)',
            color: isAllConfigured ? 'var(--color-text-muted)' : 'var(--color-gold-bright)',
            cursor: isAllConfigured ? 'not-allowed' : 'pointer',
            opacity: isAllConfigured ? 0.5 : 1,
          }}
        >
          <Plus size={14} /> Add Round Override
        </button>
      </div>

      {draftRows.length === 0 ? (
        <div
          style={{
            padding: '0.6rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-bg-base)',
            border: '1px dashed var(--color-border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
          }}
        >
          All rounds in this bracket currently inherit tier default <strong>Bo{tier.bestOf}</strong>.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', transition: 'all 0.3s ease' }}>
          {draftRows.map(row => {
            const otherDraftKeys = new Set(
              draftRows.filter(r => r.id !== row.id).map(r => String(r.roundKey))
            );
            const selectableRounds = availableRounds.filter(r => {
              const k = String(r.roundIdentifier || r.roundNumber);
              return k === String(row.roundKey) || !otherDraftKeys.has(k);
            });

            return (
              <div
                key={row.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--color-bg-base)',
                  borderRadius: 'var(--radius-sm)',
                  border: row.isDirty
                    ? '1px solid var(--color-gold-bright)'
                    : '1px solid var(--color-border-subtle)',
                  boxShadow: row.isDirty ? '0 0 0 1px rgba(234, 179, 8, 0.2)' : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Target Round dropdown */}
                <div style={{ flex: 1, minWidth: '170px' }}>
                  <label
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-text-muted)',
                      display: 'block',
                      marginBottom: '0.2rem',
                    }}
                  >
                    Target Round
                  </label>
                  <select
                    value={String(row.roundKey)}
                    onChange={e => {
                      const val = e.target.value;
                      const num = parseInt(val, 10);
                      const parsedKey = !isNaN(num) && String(num) === val ? num : val;
                      handleRoundChange(row.id, parsedKey);
                    }}
                    style={inputStyle}
                  >
                    {selectableRounds.map(r => {
                      const optVal = String(r.roundIdentifier || r.roundNumber);
                      return (
                        <option key={optVal} value={optVal}>
                          {r.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* BestOf Combobox */}
                <div style={{ flex: 1, minWidth: '170px' }}>
                  <label
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-text-muted)',
                      display: 'block',
                      marginBottom: '0.2rem',
                    }}
                  >
                    Format (Up to Bo99)
                  </label>
                  <BestOfSelect
                    value={row.bestOf}
                    onChange={newBo => handleBestOfChange(row.id, newBo)}
                  />
                </div>

                {/* Actions: Save & Delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', paddingTop: '1.1rem' }}>
                  <button
                    type="button"
                    disabled={!row.isDirty}
                    onClick={() => handleSaveRow(row.id)}
                    title={row.isDirty ? 'Save round override' : 'No unsaved changes'}
                    style={{
                      padding: '0.45rem',
                      background: row.isDirty ? 'var(--color-gold-bg)' : 'transparent',
                      border: `1px solid ${row.isDirty ? 'var(--color-gold-bright)' : 'var(--color-border-subtle)'}`,
                      borderRadius: 'var(--radius-sm)',
                      color: row.isDirty ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
                      cursor: row.isDirty ? 'pointer' : 'not-allowed',
                      opacity: row.isDirty ? 1 : 0.4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Check size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteRow(row.id)}
                    title="Remove round override"
                    style={{
                      padding: '0.45rem',
                      background: 'transparent',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'var(--color-red)';
                      e.currentTarget.style.borderColor = 'var(--color-red)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'var(--color-text-muted)';
                      e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};