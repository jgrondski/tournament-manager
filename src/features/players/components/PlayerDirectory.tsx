import React, { useState, useMemo } from 'react';
import { useTournament } from '../../tournament/store';
import { PlayerProfile } from '../../tournament/types';
import { GenerateFakePlayersModal } from './GenerateFakePlayersModal';
import { PlayerEditModal } from './PlayerEditModal';
import {
  Users,
  Plus,
  Sparkles,
  Search,
  Trash2,
  Edit2,
  Trophy,
  AlertOctagon,
  AlertTriangle,
  X,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

export const PlayerDirectory: React.FC = () => {
  const {
    globalPlayers,
    addGlobalPlayer,
    updateGlobalPlayer,
    deleteGlobalPlayer,
    clearAllGlobalPlayers,
    generateFakeGlobalPlayers,
  } = useTournament();

  const [searchQuery, setSearchQuery] = useState('');
  const [playstyleFilter, setPlaystyleFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NAME_ASC' | 'PB_DESC' | 'PB_ASC' | 'COUNTRY'>('PB_DESC');

  // Modals state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerProfile | null>(null);
  const [playerToDelete, setPlayerToDelete] = useState<PlayerProfile | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);

  // Filtered & Sorted Players
  const filteredPlayers = useMemo(() => {
    return globalPlayers
      .filter(p => {
        // Text search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.name.toLowerCase().includes(q);
          const matchCountry = p.country?.toLowerCase().includes(q);
          const matchPlaystyle = p.playstyle?.toLowerCase().includes(q);
          const matchNotes = p.notes?.toLowerCase().includes(q);
          if (!matchName && !matchCountry && !matchPlaystyle && !matchNotes) {
            return false;
          }
        }

        // Playstyle / Status filter
        if (playstyleFilter === 'DQ') {
          return Boolean(p.isDisqualified);
        }
        if (playstyleFilter !== 'ALL') {
          return p.playstyle === playstyleFilter;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'NAME_ASC') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'PB_DESC') {
          return (b.personalBest || 0) - (a.personalBest || 0);
        }
        if (sortBy === 'PB_ASC') {
          return (a.personalBest || 0) - (b.personalBest || 0);
        }
        if (sortBy === 'COUNTRY') {
          return (a.country || '').localeCompare(b.country || '');
        }
        return 0;
      });
  }, [globalPlayers, searchQuery, playstyleFilter, sortBy]);

  // Summary Analytics
  const stats = useMemo(() => {
    const total = globalPlayers.length;
    let rollingCount = 0;
    let dasCount = 0;
    let hypertapCount = 0;
    let dqCount = 0;
    let maxPb = 0;
    let maxPbPlayer = '';
    let pbSum = 0;

    globalPlayers.forEach(p => {
      if (p.playstyle === 'Rolling') rollingCount++;
      else if (p.playstyle === 'DAS') dasCount++;
      else if (p.playstyle === 'Hypertap') hypertapCount++;

      if (p.isDisqualified) dqCount++;

      const pb = p.personalBest || 0;
      pbSum += pb;
      if (pb > maxPb) {
        maxPb = pb;
        maxPbPlayer = p.name;
      }
    });

    const avgPb = total > 0 ? Math.round(pbSum / total) : 0;

    return {
      total,
      rollingCount,
      dasCount,
      hypertapCount,
      dqCount,
      maxPb,
      maxPbPlayer,
      avgPb,
    };
  }, [globalPlayers]);

  const existingNames = useMemo(() => globalPlayers.map(p => p.name), [globalPlayers]);

  const handleOpenAddModal = () => {
    setEditingPlayer(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (player: PlayerProfile) => {
    setEditingPlayer(player);
    setIsEditModalOpen(true);
  };

  const handleSavePlayer = (playerData: Omit<PlayerProfile, 'id'>) => {
    if (editingPlayer) {
      updateGlobalPlayer(editingPlayer.id, playerData);
    } else {
      addGlobalPlayer(playerData);
    }
  };

  const handleDeleteConfirm = () => {
    if (playerToDelete) {
      deleteGlobalPlayer(playerToDelete.id);
      setPlayerToDelete(null);
    }
  };

  const handleClearAllConfirm = () => {
    clearAllGlobalPlayers();
    setIsClearAllConfirmOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
      {/* Header & Main Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--color-gold-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-gold-bright)',
              }}
            >
              <Users size={20} />
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
              Global Player Pool
            </h1>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
            Master directory of competitive players, manual personal bests, playstyles, and metadata stored in <code style={{ color: 'var(--color-gold-bright)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>classic_tetris_global_players</code>.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsGenerateModalOpen(true)}
            className="btn btn-secondary"
            style={{ padding: '0.6rem 1.15rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Sparkles size={16} color="var(--color-gold-bright)" />
            Generate Fake Players
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: 'var(--shadow-gold)' }}
          >
            <Plus size={16} />
            Add Competitor
          </button>

          {globalPlayers.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearAllConfirmOpen(true)}
              className="btn btn-secondary"
              style={{
                padding: '0.6rem 0.9rem',
                fontSize: '0.85rem',
                color: 'var(--color-red)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
              title="Clear all global players from catalog"
            >
              <Trash2 size={15} />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Stats Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div
          style={{
            padding: '1.1rem 1.25rem',
            background: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            Total Global Competitors
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Ready for tournament roster import
          </div>
        </div>

        <div
          style={{
            padding: '1.1rem 1.25rem',
            background: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            Playstyle Breakdown
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', fontWeight: 700 }}>
              Rolling: {stats.rollingCount}
            </span>
            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-gold-bright)', fontWeight: 700 }}>
              DAS: {stats.dasCount}
            </span>
            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(20, 184, 166, 0.15)', color: '#2dd4bf', fontWeight: 700 }}>
              Hypertap: {stats.hypertapCount}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
            Diverse competitive mechanical styles
          </div>
        </div>

        <div
          style={{
            padding: '1.1rem 1.25rem',
            background: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            Highest Personal Best
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-gold-bright)', fontFamily: 'monospace' }}>
            {stats.maxPb > 0 ? stats.maxPb.toLocaleString() : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {stats.maxPbPlayer ? `Held by ${stats.maxPbPlayer}` : 'No personal bests recorded'}
          </div>
        </div>

        <div
          style={{
            padding: '1.1rem 1.25rem',
            background: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            Average Personal Best
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
            {stats.avgPb > 0 ? stats.avgPb.toLocaleString() : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: stats.dqCount > 0 ? '#f87171' : 'var(--color-text-muted)' }}>
            {stats.dqCount > 0 ? `${stats.dqCount} player(s) currently disqualified` : 'All players in good standing'}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          background: 'var(--color-bg-surface)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search competitor name, country, notes..."
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem 0.55rem 2.25rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-base)',
              color: 'var(--color-text-primary)',
              fontSize: '0.85rem',
            }}
          />
          <Search
            size={16}
            color="var(--color-text-muted)"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginRight: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Filter size={13} /> Style:
          </span>
          {[
            { key: 'ALL', label: 'All Styles' },
            { key: 'Rolling', label: 'Rolling' },
            { key: 'DAS', label: 'DAS' },
            { key: 'Hypertap', label: 'Hypertap' },
            { key: 'DQ', label: 'Disqualified' },
          ].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setPlaystyleFilter(f.key)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: playstyleFilter === f.key ? 700 : 500,
                background: playstyleFilter === f.key ? 'var(--color-gold-bg)' : 'transparent',
                border: playstyleFilter === f.key ? '1px solid var(--color-gold)' : '1px solid var(--color-border-subtle)',
                color: playstyleFilter === f.key ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowUpDown size={14} color="var(--color-text-muted)" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'NAME_ASC' | 'PB_DESC' | 'PB_ASC' | 'COUNTRY')}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-base)',
              color: 'var(--color-text-primary)',
              fontSize: '0.8rem',
            }}
          >
            <option value="PB_DESC">Sort: PB High to Low</option>
            <option value="PB_ASC">Sort: PB Low to High</option>
            <option value="NAME_ASC">Sort: Name (A–Z)</option>
            <option value="COUNTRY">Sort: Country</option>
          </select>
        </div>
      </div>

      {/* Players Table */}
      <div
        style={{
          background: 'var(--color-bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}
      >
        {filteredPlayers.length === 0 ? (
          <div
            style={{
              padding: '4rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--color-gold-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-gold-bright)',
              }}
            >
              <Users size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 0.35rem 0' }}>
                {globalPlayers.length === 0 ? 'Global Player Directory is Empty' : 'No Competitors Match Your Filter'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: '420px', margin: 0 }}>
                {globalPlayers.length === 0
                  ? 'Add competitors manually or click "Generate Fake Players" to simulate authentic competitors for tournaments.'
                  : 'Try adjusting your search query or playstyle filter.'}
              </p>
            </div>
            {globalPlayers.length === 0 && (
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(true)}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Sparkles size={16} color="var(--color-gold-bright)" />
                  Generate Fake Players
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Plus size={16} />
                  Add Competitor
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem', width: '50px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Competitor</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Country</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Playstyle</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Personal Best</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Notes</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player, idx) => {
                  const isMaxout = (player.personalBest || 0) >= 999999;
                  return (
                    <tr
                      key={player.id}
                      style={{
                        borderBottom: '1px solid var(--color-border-subtle)',
                        background: player.isDisqualified ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Index */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        {idx + 1}
                      </td>

                      {/* Name */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              background: 'var(--color-bg-surface-elevated)',
                              border: '1px solid var(--color-border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              color: 'var(--color-gold-bright)',
                              flexShrink: 0,
                            }}
                          >
                            {player.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                              {player.name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                              ID: {player.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Country */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {player.country ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.15rem 0.45rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--color-bg-surface-highlight)',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              color: 'var(--color-text-primary)',
                              border: '1px solid var(--color-border-subtle)',
                            }}
                          >
                            {player.country}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Playstyle */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background:
                              player.playstyle === 'Rolling'
                                ? 'rgba(168, 85, 247, 0.15)'
                                : player.playstyle === 'DAS'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(20, 184, 166, 0.15)',
                            color:
                              player.playstyle === 'Rolling'
                                ? '#c084fc'
                                : player.playstyle === 'DAS'
                                ? 'var(--color-gold-bright)'
                                : '#2dd4bf',
                            border: `1px solid ${
                              player.playstyle === 'Rolling'
                                ? 'rgba(168, 85, 247, 0.3)'
                                : player.playstyle === 'DAS'
                                ? 'rgba(245, 158, 11, 0.3)'
                                : 'rgba(20, 184, 166, 0.3)'
                            }`,
                          }}
                        >
                          {player.playstyle || 'Rolling'}
                        </span>
                      </td>

                      {/* Personal Best */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              fontSize: '0.9rem',
                              color: isMaxout ? 'var(--color-gold-bright)' : 'var(--color-text-primary)',
                            }}
                          >
                            {player.personalBest ? player.personalBest.toLocaleString() : '—'}
                          </span>
                          {isMaxout && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                padding: '0.1rem 0.35rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(245, 158, 11, 0.2)',
                                color: 'var(--color-gold-bright)',
                                fontWeight: 800,
                                border: '1px solid var(--color-gold)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                              }}
                            >
                              <Trophy size={10} /> MAXOUT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {player.isDisqualified ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                            }}
                          >
                            <AlertOctagon size={12} /> Disqualified
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              background: 'rgba(34, 197, 94, 0.1)',
                              color: '#4ade80',
                            }}
                          >
                            Active
                          </span>
                        )}
                      </td>

                      {/* Notes */}
                      <td style={{ padding: '0.75rem 1rem', maxWidth: '240px' }}>
                        <div
                          style={{
                            color: 'var(--color-text-secondary)',
                            fontSize: '0.8rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={player.notes}
                        >
                          {player.notes || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(player)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                            title="Edit competitor profile"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPlayerToDelete(player)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: 'var(--color-red)' }}
                            title="Delete competitor from catalog"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Fake Players Modal */}
      <GenerateFakePlayersModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onGenerate={count => generateFakeGlobalPlayers(count)}
        existingCount={globalPlayers.length}
      />

      {/* Add / Edit Player Modal */}
      <PlayerEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPlayer(null);
        }}
        onSave={handleSavePlayer}
        initialPlayer={editingPlayer}
        existingNames={existingNames}
      />

      {/* Delete Single Player Speedbump Modal */}
      {playerToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
              maxWidth: '440px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-xl)',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-red)',
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                  Delete Competitor?
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  Remove from master player directory
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Are you sure you want to permanently delete <strong>{playerToDelete.name}</strong> from the global player pool?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setPlayerToDelete(null)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1.15rem', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="btn btn-danger"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                Delete Competitor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Players Speedbump Modal */}
      {isClearAllConfirmOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
              maxWidth: '460px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-xl)',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-red)',
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                  Clear All Global Players?
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  Destructive catalog purge action
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              This will permanently delete all <strong>{globalPlayers.length}</strong> competitors from <code style={{ color: 'var(--color-gold-bright)' }}>classic_tetris_global_players</code>. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsClearAllConfirmOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1.15rem', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllConfirm}
                className="btn btn-danger"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                Clear Entire Catalog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
