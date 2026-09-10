import React, { useState, useRef, useEffect } from 'react';
import { PlayerProfile } from '../../tournament/types';
import { User, Plus, Search, Check } from 'lucide-react';

interface CreatablePlayerSelectProps {
  playersPool: PlayerProfile[];
  globalPlayers?: PlayerProfile[];
  selectedPlayer: PlayerProfile | null;
  onSelectPlayer: (player: PlayerProfile) => void;
  onCreatePlayer: (name: string) => PlayerProfile;
  onSelectGlobalPlayer?: (player: PlayerProfile) => void;
}

export const CreatablePlayerSelect: React.FC<CreatablePlayerSelectProps> = ({
  playersPool,
  globalPlayers = [],
  selectedPlayer,
  onSelectPlayer,
  onCreatePlayer,
  onSelectGlobalPlayer,
}) => {
  const [query, setQuery] = useState(selectedPlayer?.name || '');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedPlayer) {
      setQuery(selectedPlayer.name);
    }
  }, [selectedPlayer]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const queryTrimmed = query.trim().toLowerCase();

  const filteredInTournament = playersPool.filter(p =>
    p.name.toLowerCase().includes(queryTrimmed)
  );

  const existingInTournamentNames = new Set(playersPool.map(p => p.name.toLowerCase()));
  const existingInTournamentIds = new Set(playersPool.map(p => p.id));

  const filteredGlobal = globalPlayers.filter(p =>
    !existingInTournamentIds.has(p.id) &&
    !existingInTournamentNames.has(p.name.toLowerCase()) &&
    p.name.toLowerCase().includes(queryTrimmed)
  );

  const exactMatchInTournament = playersPool.find(
    p => p.name.toLowerCase() === queryTrimmed
  );
  const exactMatchInGlobal = globalPlayers.find(
    p => p.name.toLowerCase() === queryTrimmed
  );
  const exactMatch = exactMatchInTournament || exactMatchInGlobal;

  const handleSelect = (p: PlayerProfile) => {
    onSelectPlayer(p);
    setQuery(p.name);
    setIsOpen(false);
  };

  const handleSelectGlobal = (p: PlayerProfile) => {
    if (onSelectGlobalPlayer) {
      onSelectGlobalPlayer(p);
    } else {
      onSelectPlayer(p);
    }
    setQuery(p.name);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const newP = onCreatePlayer(trimmed);
    onSelectPlayer(newP);
    setQuery(newP.name);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search or enter competitor name..."
          style={{
            width: '100%',
            padding: '0.65rem 0.85rem 0.65rem 2.25rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-base)',
            color: 'var(--color-text-primary)',
            fontSize: '0.9rem',
          }}
        />
        <Search
          size={16}
          color="var(--color-text-muted)"
          style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: '260px',
            overflowY: 'auto',
            background: 'var(--color-bg-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
          }}
        >
          {/* In-Tournament Players */}
          {filteredInTournament.map(p => {
            const isSelected = selectedPlayer?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handleSelect(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.85rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--color-border-subtle)',
                  background: isSelected ? 'var(--color-gold-bg)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={15} color="var(--color-text-muted)" />
                  <span style={{ fontWeight: isSelected ? 700 : 500, color: 'var(--color-text-primary)' }}>
                    {p.name}
                  </span>
                  {p.country && (
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-surface-highlight)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                      {p.country}
                    </span>
                  )}
                  {p.playstyle && (
                    <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>
                      {p.playstyle}
                    </span>
                  )}
                </div>
                {isSelected && <Check size={16} color="var(--color-gold-bright)" />}
              </div>
            );
          })}

          {/* Global Players Section */}
          {filteredGlobal.length > 0 && (
            <div>
              <div
                style={{
                  padding: '0.4rem 0.85rem',
                  background: 'var(--color-bg-base)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--color-gold-bright)',
                  letterSpacing: '0.05em',
                  borderTop: filteredInTournament.length > 0 ? '1px solid var(--color-border)' : 'none',
                  borderBottom: '1px solid var(--color-border-subtle)',
                }}
              >
                From Global Player Pool (Auto-imports to tournament)
              </div>
              {filteredGlobal.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleSelectGlobal(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    background: 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={15} color="var(--color-gold-bright)" />
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {p.name}
                    </span>
                    {p.country && (
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-surface-highlight)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                        {p.country}
                      </span>
                    )}
                    {p.playstyle && (
                      <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>
                        {p.playstyle}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '0.15rem 0.4rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: 'var(--color-gold-bright)',
                      fontWeight: 600,
                    }}
                  >
                    + Import
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Creatable option */}
          {query.trim().length > 0 && !exactMatch && (
            <div
              onClick={handleCreateNew}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 0.85rem',
                cursor: 'pointer',
                background: 'rgba(245, 158, 11, 0.1)',
                borderTop: '1px dashed var(--color-gold)',
                color: 'var(--color-gold-bright)',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              <Plus size={16} />
              <span>Add &quot;{query.trim()}&quot; as new competitor</span>
            </div>
          )}

          {filteredInTournament.length === 0 && filteredGlobal.length === 0 && query.trim().length === 0 && (
            <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              Type a name to search or add a player
            </div>
          )}
        </div>
      )}
    </div>
  );
};
