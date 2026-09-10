import React, { useState } from 'react';
import { Tournament, PlayerProfile } from '../../tournament/types';
import { useTournament } from '../../tournament/store';
import { CreatablePlayerSelect } from './CreatablePlayerSelect';
import { Trophy, Plus, Trash2, X, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface QualifierEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
}

export const QualifierEntryModal: React.FC<QualifierEntryModalProps> = ({
  isOpen,
  onClose,
  tournament,
}) => {
  const {
    addPlayerToPool,
    updatePlayerInPool,
    submitQualifierScore,
    deleteQualifierScore,
    togglePlayerDisqualification,
    togglePlayerQualsCompleted,
  } = useTournament();

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(
    tournament.playersPool[0] || null
  );
  const [scoreInput, setScoreInput] = useState<string>('');
  const [pbInput, setPbInput] = useState<string>(
    selectedPlayer?.personalBest ? String(selectedPlayer.personalBest) : ''
  );
  const [playstyleInput, setPlaystyleInput] = useState<'DAS' | 'Rolling' | 'Hypertap'>(
    selectedPlayer?.playstyle || 'Rolling'
  );

  if (!isOpen) return null;

  // Existing submissions for selected player
  const playerSubmissions = (tournament.qualifierSubmissions || []).filter(
    s => s.playerId === selectedPlayer?.id
  );

  const isDQ = Boolean(selectedPlayer?.isDisqualified);
  const isCompleted = Boolean(
    selectedPlayer && tournament.tournamentPlayers[selectedPlayer.id]?.qualsCompleted
  );

  const handlePlayerSelected = (player: PlayerProfile) => {
    setSelectedPlayer(player);
    setPbInput(player.personalBest ? String(player.personalBest) : '');
    setPlaystyleInput(player.playstyle || 'Rolling');
  };

  const handleCreatePlayer = (name: string): PlayerProfile => {
    return addPlayerToPool(tournament.id, {
      name,
      personalBest: 1000000,
      playstyle: 'Rolling',
    });
  };

  const handleScoreChange = (val: string) => {
    // Only digits
    const cleaned = val.replace(/\D/g, '');
    setScoreInput(cleaned);
  };

  const handleSubmitScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer) return;

    const numericScore = parseInt(scoreInput, 10);
    if (!numericScore || isNaN(numericScore)) return;

    submitQualifierScore(tournament.id, selectedPlayer.id, numericScore);
    setScoreInput('');
  };

  const handleUpdatePlayerMeta = () => {
    if (!selectedPlayer) return;
    const pbNum = parseInt(pbInput.replace(/\D/g, ''), 10) || selectedPlayer.personalBest;
    updatePlayerInPool(tournament.id, selectedPlayer.id, {
      personalBest: pbNum,
      playstyle: playstyleInput,
    });
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
        style={{
          background: 'var(--color-bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          maxWidth: '540px',
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
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
              <Trophy size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Submit Qualifier Score
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {tournament.name} • {tournament.qualFormat.replace(/_/g, ' ')}
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
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '75vh', overflowY: 'auto' }}>
          {/* 1. Player Selection */}
          <div>
            <label style={labelStyle}>Competitor (Creatable Combobox)</label>
            <CreatablePlayerSelect
              playersPool={tournament.playersPool}
              selectedPlayer={selectedPlayer}
              onSelectPlayer={handlePlayerSelected}
              onCreatePlayer={handleCreatePlayer}
            />
          </div>

          {selectedPlayer && (
            <>
              {/* 2. Player Status Toggles (DQ & Quals Complete) */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  padding: '0.85rem',
                  background: 'var(--color-bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  flexWrap: 'wrap',
                }}
              >
                {/* DQ Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    togglePlayerDisqualification(tournament.id, selectedPlayer.id, !isDQ)
                  }
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: isDQ ? '1px solid var(--color-red)' : '1px solid var(--color-border)',
                    background: isDQ ? 'var(--color-red-bg)' : 'transparent',
                    color: isDQ ? '#f87171' : 'var(--color-text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <AlertOctagon size={14} />
                  {isDQ ? 'Disqualified (DQ)' : 'Active / Eligible'}
                </button>

                {/* Quals Completed Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    togglePlayerQualsCompleted(tournament.id, selectedPlayer.id, !isCompleted)
                  }
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: isCompleted ? '1px solid var(--color-green)' : '1px solid var(--color-border)',
                    background: isCompleted ? 'var(--color-green-bg)' : 'transparent',
                    color: isCompleted ? '#34d399' : 'var(--color-text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <CheckCircle2 size={14} />
                  {isCompleted ? 'Quals Marked Complete' : 'Quals In Progress'}
                </button>
              </div>

              {/* 3. Manual PB & Playstyle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Personal Best (PB - Manual)</label>
                  <input
                    type="text"
                    value={pbInput ? parseInt(pbInput, 10).toLocaleString() : ''}
                    onChange={e => setPbInput(e.target.value.replace(/\D/g, ''))}
                    onBlur={handleUpdatePlayerMeta}
                    placeholder="e.g. 1,250,000"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Playstyle</label>
                  <select
                    value={playstyleInput}
                    onChange={e => {
                      const ps = e.target.value as 'DAS' | 'Rolling' | 'Hypertap';
                      setPlaystyleInput(ps);
                      updatePlayerInPool(tournament.id, selectedPlayer.id, { playstyle: ps });
                    }}
                    style={inputStyle}
                  >
                    <option value="Rolling">Rolling</option>
                    <option value="DAS">DAS</option>
                    <option value="Hypertap">Hypertap</option>
                  </select>
                </div>
              </div>

              {/* 4. Score Submission Form */}
              <form onSubmit={handleSubmitScore} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={labelStyle}>New Attempt Score</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={scoreInput ? parseInt(scoreInput, 10).toLocaleString() : ''}
                    onChange={e => handleScoreChange(e.target.value)}
                    placeholder="Enter score (e.g. 1,120,500)..."
                    autoFocus
                    style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: 700 }}
                  />
                  <button
                    type="submit"
                    disabled={!scoreInput}
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1.25rem' }}
                  >
                    <Plus size={16} /> Submit
                  </button>
                </div>
              </form>

              {/* 5. Existing Attempts History */}
              <div>
                <label style={labelStyle}>
                  Submitted Attempts ({playerSubmissions.length})
                </label>
                {playerSubmissions.length === 0 ? (
                  <div style={{ padding: '0.75rem', background: 'var(--color-bg-base)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    No qualifier attempts recorded yet for this competitor.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {playerSubmissions.map((sub, idx) => (
                      <div
                        key={sub.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem 0.75rem',
                          background: 'var(--color-bg-surface-elevated)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                            #{idx + 1}
                          </span>
                          <span className="tabular-nums" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-gold-bright)' }}>
                            {sub.score.toLocaleString()}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteQualifierScore(tournament.id, sub.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-red)',
                            cursor: 'pointer',
                            padding: '0.25rem',
                          }}
                          title="Delete attempt"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: 'var(--color-bg-surface-elevated)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.45rem 1rem' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  marginBottom: '0.35rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.85rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-base)',
  color: 'var(--color-text-primary)',
  fontSize: '0.875rem',
};
