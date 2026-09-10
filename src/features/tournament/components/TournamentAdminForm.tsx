import React, { useState, useMemo, useEffect } from 'react';
import { Tournament, TournamentTier, QualFormat, PointsThreshold, PlayerProfile } from '../types';
import { useTournament } from '../store';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  CheckCircle2,
  Shield,
  Palette,
  X,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Play,
  Users,
  UserPlus,
  Download,
  UserX,
  Search,
} from 'lucide-react';
import { generateTraditionalBracket, generateFlatBracket } from '../../bracket/math';
import { ImportFromGlobalModal } from '../../players/components/ImportFromGlobalModal';
import { PlayerEditModal } from '../../players/components/PlayerEditModal';

interface TournamentAdminFormProps {
  tournament: Tournament;
  onSaved?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export const TournamentAdminForm: React.FC<TournamentAdminFormProps> = ({
  tournament,
  onSaved,
  onDirtyChange,
}) => {
  const {
    updateTournament,
    saveTiers,
    clearMatchScores,
    clearQualifierScores,
    clearAllTournamentData,
    seedQualifiers,
    simulateFullTournament,
    globalPlayers,
    importPlayersToTournament,
    removePlayerFromTournament,
    addPlayerToPool,
  } = useTournament();

  // Tournament Fields State
  const [name, setName] = useState(tournament.name);
  const [slug, setSlug] = useState(tournament.slug);
  const [date, setDate] = useState(tournament.date);
  const [location, setLocation] = useState(tournament.location);
  const [qualFormat, setQualFormat] = useState<QualFormat>(tournament.qualFormat || 'AVERAGE_OF_X');
  const [qualAverageCount, setQualAverageCount] = useState<number>(tournament.qualAverageCount || 2);
  const [pointsConfig, setPointsConfig] = useState<PointsThreshold[]>(
    tournament.pointsConfig || [
      { minScore: 1200000, points: 100 },
      { minScore: 1000000, points: 50 },
      { minScore: 800000, points: 25 },
    ]
  );

  // Tiers State
  const [tiers, setTiers] = useState<TournamentTier[]>(tournament.tiers || []);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [tierToDelete, setTierToDelete] = useState<{ index: number; tier: TournamentTier } | null>(null);
  const [dataActionToConfirm, setDataActionToConfirm] = useState<'MATCHES' | 'QUALS' | 'ALL' | null>(null);
  const [simFeedback, setSimFeedback] = useState<string | null>(null);

  // Roster Management State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState<PlayerProfile | null>(null);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterFeedback, setRosterFeedback] = useState<string | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);

  useEffect(() => {
    if (!rosterFeedback) return;
    const timer = setTimeout(() => setRosterFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [rosterFeedback]);

  useEffect(() => {
    if (!rosterError) return;
    const timer = setTimeout(() => setRosterError(null), 5000);
    return () => clearTimeout(timer);
  }, [rosterError]);

  useEffect(() => {
    if (!simFeedback) return;
    const timer = setTimeout(() => setSimFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [simFeedback]);

  const qualifierCount = (tournament.qualifierSubmissions?.length || 0) + (tournament.qualifiers?.length || 0);
  const recordedMatchCount = Object.values(tournament.matchScores || {}).filter(
    m => m.isComplete || m.player1Wins > 0 || m.player2Wins > 0 ||
      m.games?.some(g => g.player1Points !== null || g.player2Points !== null)
  ).length;

  // Track dirty state
  const isDirty = useMemo(() => {
    if (name !== (tournament.name || '')) return true;
    if (slug !== (tournament.slug || '')) return true;
    if (date !== (tournament.date || '')) return true;
    if (location !== (tournament.location || '')) return true;
    if (qualFormat !== (tournament.qualFormat || 'AVERAGE_OF_X')) return true;
    if (qualAverageCount !== (tournament.qualAverageCount || 2)) return true;

    // Points config
    const initialPoints = tournament.pointsConfig || [
      { minScore: 1200000, points: 100 },
      { minScore: 1000000, points: 50 },
      { minScore: 800000, points: 25 },
    ];
    if (pointsConfig.length !== initialPoints.length) return true;
    for (let i = 0; i < pointsConfig.length; i++) {
      if (
        pointsConfig[i].minScore !== initialPoints[i].minScore ||
        pointsConfig[i].points !== initialPoints[i].points
      ) {
        return true;
      }
    }

    // Tiers
    const initialTiers = tournament.tiers || [];
    if (tiers.length !== initialTiers.length) return true;
    for (let i = 0; i < tiers.length; i++) {
      const a = tiers[i];
      const b = initialTiers[i];
      if (!b) return true;
      if (
        a.id !== b.id ||
        a.slug !== b.slug ||
        a.name !== b.name ||
        a.priority !== b.priority ||
        a.bracketType !== b.bracketType ||
        a.playerCount !== b.playerCount ||
        a.bestOf !== b.bestOf ||
        a.primaryColor !== b.primaryColor ||
        a.secondaryColor !== b.secondaryColor ||
        a.flatWidth !== b.flatWidth
      ) {
        return true;
      }
    }

    return false;
  }, [name, slug, date, location, qualFormat, qualAverageCount, pointsConfig, tiers, tournament]);

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Hook browser window beforeunload warning if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Re-sync fields when tournament changes if form is clean
  useEffect(() => {
    if (!isDirty) {
      setName(tournament.name || '');
      setSlug(tournament.slug || '');
      setDate(tournament.date || '');
      setLocation(tournament.location || '');
      setQualFormat(tournament.qualFormat || 'AVERAGE_OF_X');
      setQualAverageCount(tournament.qualAverageCount || 2);
      setPointsConfig(
        tournament.pointsConfig || [
          { minScore: 1200000, points: 100 },
          { minScore: 1000000, points: 50 },
          { minScore: 800000, points: 25 },
        ]
      );
      setTiers(tournament.tiers || []);
    }
  }, [tournament, isDirty]);

  const handleDiscardChanges = () => {
    setName(tournament.name || '');
    setSlug(tournament.slug || '');
    setDate(tournament.date || '');
    setLocation(tournament.location || '');
    setQualFormat(tournament.qualFormat || 'AVERAGE_OF_X');
    setQualAverageCount(tournament.qualAverageCount || 2);
    setPointsConfig(
      tournament.pointsConfig || [
        { minScore: 1200000, points: 100 },
        { minScore: 1000000, points: 50 },
        { minScore: 800000, points: 25 },
      ]
    );
    setTiers(tournament.tiers || []);
  };

  // Helper to auto-derive slug from name
  const handleNameChange = (newName: string) => {
    setName(newName);
    // Auto derive slug if current slug matches previous derived pattern or is default
    const derived = newName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setSlug(derived);
  };

  // Add Points threshold
  const addThreshold = () => {
    setPointsConfig(prev => [...prev, { minScore: 500000, points: 10 }]);
  };

  const updateThreshold = (index: number, field: 'minScore' | 'points', value: number) => {
    setPointsConfig(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeThreshold = (index: number) => {
    setPointsConfig(prev => prev.filter((_, i) => i !== index));
  };

  // Tier Management
  const addTier = () => {
    const nextPriority = tiers.length + 1;
    const tierName = `Tier ${nextPriority}`;
    const tierSlug = `tier-${nextPriority}`;
    const newTier: TournamentTier = {
      id: `tier_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      slug: tierSlug,
      name: tierName,
      priority: nextPriority,
      bracketType: 'TRADITIONAL',
      playerCount: 8,
      bestOf: 3,
      primaryColor: '#3b82f6',
      secondaryColor: '#60a5fa',
      isLocked: false,
      bracket: generateTraditionalBracket(
        Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}`, seed: i + 1 })),
        { bestOf: 3 }
      ),
    };
    setTiers([...tiers, newTier]);
  };

  const updateTier = (index: number, updates: Partial<TournamentTier>) => {
    setTiers(prev => {
      const next = [...prev];
      const target = { ...next[index], ...updates };
      // If name changed, derive slug
      if (updates.name && !updates.slug) {
        target.slug = updates.name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
      }
      next[index] = target;
      return next;
    });
  };

  const moveTier = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === tiers.length - 1) return;

    setTiers(prev => {
      const next = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      const temp = next[index];
      next[index] = next[swapIndex];
      next[swapIndex] = temp;

      // Re-assign priorities 1..N
      return next.map((t, idx) => ({ ...t, priority: idx + 1 }));
    });
  };

  const deleteTier = (index: number) => {
    setTiers(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((t, idx) => ({ ...t, priority: idx + 1 }));
    });
  };

  const saveCurrentConfig = () => {
    // Re-generate bracket structures for tiers if player count or type changed
    const updatedTiers = tiers.map(tier => {
      const dummyPlayers = Array.from({ length: tier.playerCount }, (_, i) => ({
        id: `dummy_${i + 1}`,
        name: `Seed ${i + 1}`,
        seed: i + 1,
      }));

      const newBracket =
        tier.bracketType === 'FLAT'
          ? generateFlatBracket(dummyPlayers, tier.flatWidth || 4, { tierId: tier.id, bestOf: tier.bestOf })
          : generateTraditionalBracket(dummyPlayers, { tierId: tier.id, bestOf: tier.bestOf });

      return {
        ...tier,
        bracket: newBracket,
      };
    });

    updateTournament(tournament.id, {
      name,
      slug,
      date,
      location,
      qualFormat,
      qualAverageCount,
      pointsConfig,
    });

    saveTiers(tournament.id, updatedTiers);
    setTiers(updatedTiers);
    return updatedTiers;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveCurrentConfig();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    if (onSaved) onSaved();
  };

  const hasRecordedMatches = recordedMatchCount > 0;
  const hasQualifiers = qualifierCount > 0;
  const hasTiers = tiers.length > 0;

  const handleSeedQualifiers = () => {
    if (isDirty) {
      saveCurrentConfig();
    }
    seedQualifiers(tournament.id);
    setSimFeedback('Seeded realistic competitors and qualifier attempts in draft mode.');
  };

  const handleSimulate = () => {
    if (isDirty) {
      saveCurrentConfig();
    }
    simulateFullTournament(tournament.id);
    setSimFeedback(
      hasQualifiers
        ? 'Built brackets from current qualifiers and simulated all matches to champion!'
        : 'Seeded qualifiers, locked brackets, and simulated all matches to champion!'
    );
  };

  // Calculate auto-thresholds for display
  let runningPlayerCount = 0;
  const tierThresholdBadges = tiers.map(t => {
    const start = runningPlayerCount + 1;
    const end = runningPlayerCount + t.playerCount;
    runningPlayerCount = end;
    return { start, end };
  });

  // Roster helpers
  const totalCapacity = useMemo(() => {
    return tiers.reduce((acc, t) => acc + (t.playerCount || 0), 0);
  }, [tiers]);

  const availableGlobalCount = useMemo(() => {
    const existingIds = new Set((tournament.playersPool || []).map(p => p.id));
    const existingNames = new Set((tournament.playersPool || []).map(p => p.name.toLowerCase()));
    return globalPlayers.filter(
      p => !existingIds.has(p.id) && !existingNames.has(p.name.toLowerCase())
    ).length;
  }, [globalPlayers, tournament.playersPool]);

  const filteredRoster = useMemo(() => {
    if (!rosterSearch.trim()) return tournament.playersPool || [];
    const q = rosterSearch.toLowerCase().trim();
    return (tournament.playersPool || []).filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.country?.toLowerCase().includes(q) ||
        p.playstyle?.toLowerCase().includes(q)
    );
  }, [tournament.playersPool, rosterSearch]);

  const existingRosterNames = useMemo(
    () => (tournament.playersPool || []).map(p => p.name),
    [tournament.playersPool]
  );

  const playerToRemoveHasMatches = useMemo(() => {
    if (!playerToRemove) return false;
    return Object.values(tournament.matchScores || {}).some(
      m =>
        m.winnerPlayerId === playerToRemove.id ||
        m.loserPlayerId === playerToRemove.id ||
        (m.isComplete && (m.games || []).length > 0)
    );
  }, [playerToRemove, tournament.matchScores]);

  const handleImportGlobalPlayers = (playersToImport: PlayerProfile[]) => {
    importPlayersToTournament(tournament.id, playersToImport);
    setRosterFeedback(`Imported ${playersToImport.length} competitor(s) into tournament roster.`);
  };

  const handleImportAllGlobal = () => {
    const existingIds = new Set((tournament.playersPool || []).map(p => p.id));
    const existingNames = new Set((tournament.playersPool || []).map(p => p.name.toLowerCase()));
    const toImport = globalPlayers.filter(
      p => !existingIds.has(p.id) && !existingNames.has(p.name.toLowerCase())
    );
    if (toImport.length > 0) {
      importPlayersToTournament(tournament.id, toImport);
      setRosterFeedback(`Imported all ${toImport.length} available global competitor(s).`);
    }
  };

  const handleRegisterNewCompetitor = (playerData: Omit<PlayerProfile, 'id'>) => {
    addPlayerToPool(tournament.id, playerData);
    setRosterFeedback(`Registered ${playerData.name} into tournament roster.`);
  };

  const handleRemoveCompetitorConfirm = () => {
    if (!playerToRemove) return;
    const res = removePlayerFromTournament(tournament.id, playerToRemove.id);
    if (!res.success) {
      setRosterError(res.error || 'Failed to remove competitor.');
    } else {
      setRosterFeedback(`Removed ${playerToRemove.name} from tournament roster.`);
      setPlayerToRemove(null);
    }
  };

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner & Save Indicator */}
      {saveSuccess && (
        <div
          style={{
            background: 'var(--color-green-bg)',
            border: '1px solid var(--color-green)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={20} />
          Tournament configuration &amp; tiers saved successfully!
        </div>
      )}

      {/* Section 1: Tournament Information */}
      <section
        style={{
          background: 'var(--color-bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
          <Shield size={20} color="var(--color-gold-bright)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Tournament Details
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Tournament Name</label>
            <input
              type="text"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>URL Slug</label>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              required
              style={inputStyle}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Public routing: /{slug}
            </span>
          </div>

          <div>
            <label style={labelStyle}>Event Date</label>
            <input
              type="text"
              value={date}
              onChange={e => setDate(e.target.value)}
              placeholder="e.g. March 21-22, 2026"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Kansas City, MO"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Qualifying Format Controls */}
        <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
            <div>
              <label style={labelStyle}>Qualifying Format</label>
              <select
                value={qualFormat}
                onChange={e => setQualFormat(e.target.value as QualFormat)}
                style={inputStyle}
              >
                <option value="HIGH_SCORE">High Score (MAX of attempts)</option>
                <option value="AVERAGE_OF_X">Average of X Attempts</option>
                <option value="POINTS">Points Threshold System</option>
              </select>
            </div>

            {/* Tournament Mode Status Indicator */}
            <div>
              <label style={labelStyle}>Tournament Mode</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                {!tournament.isLocked ? (
                  <span className="badge badge-gold" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}>
                    <AlertTriangle size={14} /> Qualifiers Mode
                  </span>
                ) : (
                  <span className="badge badge-green" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}>
                    <ShieldCheck size={14} /> Match Play Mode
                  </span>
                )}
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {!tournament.isLocked
                    ? 'Qualifiers active. Brackets dynamically seed with score entries.'
                    : 'Brackets locked. Live match scoring and play active.'}
                </span>
              </div>
            </div>
          </div>

          {/* Conditional Format Config */}
          {qualFormat === 'AVERAGE_OF_X' && (
            <div style={{ background: 'var(--color-bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-sm)', maxWidth: '360px' }}>
              <label style={labelStyle}>Target Attempt Count (X)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={qualAverageCount}
                onChange={e => setQualAverageCount(parseInt(e.target.value, 10) || 2)}
                style={inputStyle}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                e.g. 2 for Average of 2, 3 for Average of 3
              </span>
            </div>
          )}

          {qualFormat === 'POINTS' && (
            <div style={{ background: 'var(--color-bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                  Points Thresholds (Highest met threshold awards points)
                </span>
                <button
                  type="button"
                  onClick={addThreshold}
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                >
                  <Plus size={14} /> Add Threshold
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pointsConfig.map((th, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Min Score</label>
                      <input
                        type="number"
                        value={th.minScore}
                        onChange={e => updateThreshold(idx, 'minScore', parseInt(e.target.value, 10) || 0)}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ width: '120px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Points Awarded</label>
                      <input
                        type="number"
                        value={th.points}
                        onChange={e => updateThreshold(idx, 'points', parseInt(e.target.value, 10) || 0)}
                        style={inputStyle}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeThreshold(idx)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-red)', cursor: 'pointer', padding: '0.5rem', marginTop: '1.25rem' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Tier Management */}
      <section
        style={{
          background: 'var(--color-bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Bracket Tiers
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Organize 1 to N tiered brackets (Gold, Silver, Bronze) with automatic cutoff ranges.
            </p>
          </div>
          <button
            type="button"
            onClick={addTier}
            className="btn btn-primary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Add Tier
          </button>
        </div>

        {/* Tiers List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tiers.length === 0 ? (
            <div
              style={{
                padding: '2.5rem 1rem',
                background: 'var(--color-bg-base)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--color-border)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>
                No bracket tiers configured for this tournament.
              </p>
              <button
                type="button"
                onClick={addTier}
                className="btn btn-primary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
              >
                <Plus size={16} /> Add First Bracket Tier
              </button>
            </div>
          ) : (
            tiers.map((tier, idx) => {
              const badge = tierThresholdBadges[idx];

            return (
              <div
                key={tier.id}
                style={{
                  background: 'var(--color-bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  borderLeft: `5px solid ${tier.primaryColor || 'var(--color-gold)'}`,
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                {/* Header: Priority, Name, Cutoff Badge & Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-bg-surface-highlight)',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      Priority #{tier.priority}
                    </span>

                    {/* Auto-derived cutoff badge */}
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: 'var(--color-gold-bright)',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                      }}
                    >
                      Cutoff: Leaderboard Ranks {badge.start} – {badge.end}
                    </span>
                  </div>

                  {/* Move up / down / delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() => moveTier(idx, 'up')}
                      disabled={idx === 0}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', opacity: idx === 0 ? 0.3 : 1 }}
                      title="Move tier up in priority"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTier(idx, 'down')}
                      disabled={idx === tiers.length - 1}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', opacity: idx === tiers.length - 1 ? 0.3 : 1 }}
                      title="Move tier down in priority"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTierToDelete({ index: idx, tier })}
                      className="btn btn-danger"
                      style={{ padding: '0.25rem 0.5rem' }}
                      title="Delete bracket tier"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Tier Name</label>
                    <input
                      type="text"
                      value={tier.name}
                      onChange={e => updateTier(idx, { name: e.target.value })}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>URL Slug</label>
                    <input
                      type="text"
                      value={tier.slug}
                      onChange={e => updateTier(idx, { slug: e.target.value })}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Bracket Type</label>
                    <select
                      value={tier.bracketType}
                      onChange={e => updateTier(idx, { bracketType: e.target.value as 'TRADITIONAL' | 'FLAT' })}
                      style={inputStyle}
                    >
                      <option value="TRADITIONAL">Traditional Single Elimination</option>
                      <option value="FLAT">Flat Bracket</option>
                    </select>
                  </div>

                  {tier.bracketType === 'FLAT' && (
                    <div>
                      <label style={labelStyle}>Flat Width (Matches/Round)</label>
                      <input
                        type="number"
                        min={1}
                        max={16}
                        value={tier.flatWidth || 4}
                        onChange={e => updateTier(idx, { flatWidth: parseInt(e.target.value, 10) || 4 })}
                        style={inputStyle}
                      />
                    </div>
                  )}

                  <div>
                    <label style={labelStyle}>Participant Count</label>
                    <input
                      type="number"
                      min={2}
                      max={64}
                      value={tier.playerCount}
                      onChange={e => updateTier(idx, { playerCount: parseInt(e.target.value, 10) || 2 })}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Best-of Default</label>
                    <select
                      value={tier.bestOf}
                      onChange={e => updateTier(idx, { bestOf: parseInt(e.target.value, 10) || 3 })}
                      style={inputStyle}
                    >
                      <option value={1}>Best of 1</option>
                      <option value={3}>Best of 3</option>
                      <option value={5}>Best of 5</option>
                      <option value={7}>Best of 7</option>
                    </select>
                  </div>

                  {/* Colors */}
                  <div>
                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Palette size={12} /> Primary Color
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="color"
                        value={tier.primaryColor || '#f59e0b'}
                        onChange={e => updateTier(idx, { primaryColor: e.target.value })}
                        style={{ width: '38px', height: '38px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                      />
                      <input
                        type="text"
                        value={tier.primaryColor || '#f59e0b'}
                        onChange={e => updateTier(idx, { primaryColor: e.target.value })}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          }))}
        </div>
      </section>

      {/* Section 3: Tournament Roster Management */}
      <section
        style={{
          background: 'var(--color-bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} color="var(--color-gold-bright)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                Tournament Roster
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', margin: 0 }}>
              Registered competitors for this tournament. Import from the global catalog or register new players directly.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Download size={14} color="var(--color-gold-bright)" />
              Import from Global Pool
            </button>

            {availableGlobalCount > 0 && (
              <button
                type="button"
                onClick={handleImportAllGlobal}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Import All Available ({availableGlobalCount})
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <UserPlus size={14} />
              Register Competitor
            </button>
          </div>
        </div>

        {/* Feedback / Error Alerts */}
        {rosterFeedback && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              borderRadius: 'var(--radius-sm)',
              color: '#4ade80',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{rosterFeedback}</span>
          </div>
        )}

        {rosterError && (
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
            <span>{rosterError}</span>
          </div>
        )}

        {/* Capacity Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.85rem 1rem', background: 'var(--color-bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Registered Competitors
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: (tournament.playersPool || []).length > 0 ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)' }}>
              {(tournament.playersPool || []).length}
            </div>
          </div>

          <div style={{ padding: '0.85rem 1rem', background: 'var(--color-bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Bracket Capacity
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {totalCapacity}
            </div>
          </div>

          <div style={{ padding: '0.85rem 1rem', background: 'var(--color-bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Roster Status
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.25rem' }}>
              {(tournament.playersPool || []).length < totalCapacity ? (
                <span style={{ color: 'var(--color-gold-bright)' }}>
                  Underfilled ({(tournament.playersPool || []).length}/{totalCapacity})
                </span>
              ) : (tournament.playersPool || []).length === totalCapacity ? (
                <span style={{ color: '#4ade80' }}>
                  Full Capacity ({totalCapacity}/{totalCapacity})
                </span>
              ) : (
                <span style={{ color: '#60a5fa' }}>
                  Ready ({totalCapacity} in tiers + {(tournament.playersPool || []).length - totalCapacity} DNQ)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Competitor Search & List */}
        {(tournament.playersPool || []).length === 0 ? (
          <div
            style={{
              padding: '2.5rem 1rem',
              background: 'var(--color-bg-base)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--color-border)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              No competitors registered in this tournament roster yet.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Download size={14} color="var(--color-gold-bright)" />
                Import from Global Pool
              </button>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <UserPlus size={14} />
                Register Competitor
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ position: 'relative', maxWidth: '320px' }}>
              <input
                type="text"
                placeholder="Search registered competitors..."
                value={rosterSearch}
                onChange={e => setRosterSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2.1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-base)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.8rem',
                }}
              />
              <Search
                size={14}
                color="var(--color-text-muted)"
                style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-surface-elevated)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '0.65rem 0.85rem', width: '40px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Competitor</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Country</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Playstyle</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Personal Best</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Qual Attempts</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Status</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoster.map((player, pIdx) => {
                    const qualAttempts = (tournament.qualifierSubmissions || []).filter(
                      s => s.playerId === player.id
                    ).length;
                    return (
                      <tr
                        key={player.id}
                        style={{
                          borderBottom: '1px solid var(--color-border-subtle)',
                          background: player.isDisqualified ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                          {pIdx + 1}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {player.name}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          {player.country ? (
                            <span style={{ padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-surface-highlight)', fontSize: '0.7rem', fontWeight: 700 }}>
                              {player.country}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>
                            {player.playstyle}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace' }}>
                          {player.personalBest ? player.personalBest.toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <span style={{ fontWeight: 600, color: qualAttempts > 0 ? 'var(--color-gold-bright)' : 'var(--color-text-muted)' }}>
                            {qualAttempts} attempt{qualAttempts === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          {player.isDisqualified ? (
                            <span style={{ color: '#f87171', fontSize: '0.7rem', fontWeight: 700 }}>DQ</span>
                          ) : (
                            <span style={{ color: '#4ade80', fontSize: '0.7rem', fontWeight: 600 }}>Active</span>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setPlayerToRemove(player)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.7rem', color: 'var(--color-red)' }}
                            title="Remove competitor from tournament"
                          >
                            <UserX size={13} /> Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Section 4: Data Management & Simulation */}
      <section
        style={{
          background: 'var(--color-bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Data Management & Simulation
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Simulate realistic tournament data for end-to-end testing, or reset match records and qualifier submissions.
          </p>
        </div>

        {/* Feedback message banner if any */}
        {simFeedback && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              borderRadius: 'var(--radius-sm)',
              color: '#4ade80',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{simFeedback}</span>
          </div>
        )}

        {/* Data Status Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.85rem 1rem', background: 'var(--color-bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Qualifier Attempts
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: qualifierCount > 0 ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)' }}>
              {qualifierCount}
            </div>
          </div>
          <div style={{ padding: '0.85rem 1rem', background: 'var(--color-bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Recorded Matches
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: recordedMatchCount > 0 ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)' }}>
              {recordedMatchCount}
            </div>
          </div>
        </div>

        {/* Sandbox Simulation Controls */}
        <div
          style={{
            padding: '1.1rem',
            background: 'var(--color-bg-surface-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Sandbox Simulation
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Seed realistic competitors or run an entire tournament simulation with round-by-round match results.
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleSeedQualifiers}
              disabled={!hasTiers || hasQualifiers || hasRecordedMatches}
              className="btn btn-secondary"
              style={{
                padding: '0.55rem 1.1rem',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: (!hasTiers || hasQualifiers || hasRecordedMatches) ? 0.45 : 1,
                cursor: (!hasTiers || hasQualifiers || hasRecordedMatches) ? 'not-allowed' : 'pointer',
              }}
              title={
                !hasTiers
                  ? 'Add at least one bracket tier first'
                  : hasRecordedMatches
                  ? 'Match play has begun. Clear match scores or all tournament data to re-seed.'
                  : hasQualifiers
                  ? 'Qualifiers have already been seeded. Clear qualifier scores to re-seed.'
                  : 'Generate realistic competitors and qualifier attempts'
              }
            >
              <Sparkles size={15} style={{ color: 'var(--color-gold-bright)' }} />
              Seed Qualifiers Only
            </button>

            <button
              type="button"
              onClick={handleSimulate}
              disabled={!hasTiers || hasRecordedMatches}
              className="btn btn-secondary"
              style={{
                padding: '0.55rem 1.1rem',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: (!hasTiers || hasRecordedMatches) ? 0.45 : 1,
                cursor: (!hasTiers || hasRecordedMatches) ? 'not-allowed' : 'pointer',
              }}
              title={
                !hasTiers
                  ? 'Add at least one bracket tier first'
                  : hasRecordedMatches
                  ? 'Match results have already been recorded. Clear match scores to simulate again.'
                  : hasQualifiers
                  ? 'Lock brackets from current qualifiers and simulate all match results to champion'
                  : 'Seed qualifiers, lock brackets, and simulate all tournament matches'
              }
            >
              <Play size={15} style={{ color: '#60a5fa' }} />
              {hasQualifiers ? 'Simulate Matches' : 'Seed & Simulate Tournament'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Data Maintenance
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setDataActionToConfirm('MATCHES')}
              disabled={recordedMatchCount === 0}
              className="btn btn-secondary"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                opacity: recordedMatchCount === 0 ? 0.4 : 1,
                cursor: recordedMatchCount === 0 ? 'not-allowed' : 'pointer',
              }}
              title={recordedMatchCount === 0 ? 'No recorded match scores to clear' : 'Clear all recorded match scores'}
            >
              Clear Match Scores ({recordedMatchCount})
            </button>

            <button
              type="button"
              onClick={() => setDataActionToConfirm('QUALS')}
              disabled={qualifierCount === 0}
              className="btn btn-secondary"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                opacity: qualifierCount === 0 ? 0.4 : 1,
                cursor: qualifierCount === 0 ? 'not-allowed' : 'pointer',
              }}
              title={qualifierCount === 0 ? 'No qualifier scores to clear' : 'Clear all qualifier submissions'}
            >
              Clear Qualifier Scores ({qualifierCount})
            </button>

            <button
              type="button"
              onClick={() => setDataActionToConfirm('ALL')}
              disabled={qualifierCount === 0 && recordedMatchCount === 0}
              className="btn btn-danger"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                opacity: qualifierCount === 0 && recordedMatchCount === 0 ? 0.4 : 1,
                cursor: qualifierCount === 0 && recordedMatchCount === 0 ? 'not-allowed' : 'pointer',
              }}
              title={qualifierCount === 0 && recordedMatchCount === 0 ? 'No data to clear' : 'Clear all tournament data'}
            >
              <Trash2 size={14} /> Clear All Tournament Data
            </button>
          </div>
        </div>
      </section>

      {/* Save Button Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '1rem',
          position: 'sticky',
          bottom: '1.5rem',
          background: 'var(--color-bg-surface-elevated)',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontSize: '0.85rem',
            color: isDirty ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
            fontWeight: 600,
            marginRight: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          {isDirty ? (
            <>
              <AlertTriangle size={16} /> Unsaved changes
            </>
          ) : (
            <>
              <CheckCircle2 size={16} color="var(--color-green)" /> All changes saved
            </>
          )}
        </span>

        <button
          type="button"
          onClick={handleDiscardChanges}
          disabled={!isDirty}
          className="btn btn-secondary"
          style={{
            padding: '0.65rem 1.25rem',
            fontSize: '0.9rem',
            opacity: !isDirty ? 0.4 : 1,
            cursor: !isDirty ? 'not-allowed' : 'pointer',
          }}
          title={!isDirty ? 'No changes to discard' : 'Revert unsaved changes'}
        >
          Discard Changes
        </button>

        <button
          type="submit"
          disabled={!isDirty}
          className="btn btn-primary"
          style={{
            padding: '0.65rem 1.75rem',
            fontSize: '0.95rem',
            boxShadow: isDirty ? 'var(--shadow-gold)' : 'none',
            opacity: !isDirty ? 0.45 : 1,
            cursor: !isDirty ? 'not-allowed' : 'pointer',
          }}
        >
          <Save size={18} />
          Save Configuration
        </button>
      </div>

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
                onClick={() => setTierToDelete(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                Are you sure you want to delete bracket <strong>{tierToDelete.tier.name}</strong>?
              </p>
              {tiers.length === 1 && (
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
                onClick={() => setTierToDelete(null)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteTier(tierToDelete.index);
                  setTierToDelete(null);
                }}
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
                  {dataActionToConfirm === 'QUALS' && 'Clear Qualifier Scores'}
                  {dataActionToConfirm === 'ALL' && 'Clear All Tournament Data'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDataActionToConfirm(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                {dataActionToConfirm === 'MATCHES' && (
                  <>Are you sure you want to delete all <strong>{recordedMatchCount} recorded match score(s)</strong> across all tiers? Tournament will revert to Qualifiers Mode.</>
                )}
                {dataActionToConfirm === 'QUALS' && (
                  <>Are you sure you want to delete all <strong>{qualifierCount} qualifier score(s)</strong>? The qualifiers leaderboard will be emptied.</>
                )}
                {dataActionToConfirm === 'ALL' && (
                  <>Are you sure you want to clear <strong>all qualifier and match score data</strong> for this tournament? This will reset the tournament data to a clean slate, allowing you to delete it or re-seed.</>
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
                onClick={() => setDataActionToConfirm(null)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (dataActionToConfirm === 'MATCHES') {
                    clearMatchScores(tournament.id);
                    setSimFeedback('Match scores cleared.');
                  } else if (dataActionToConfirm === 'QUALS') {
                    clearQualifierScores(tournament.id);
                    setSimFeedback('Qualifier scores cleared.');
                  } else if (dataActionToConfirm === 'ALL') {
                    clearAllTournamentData(tournament.id);
                    setSimFeedback('All tournament data cleared.');
                  }
                  setDataActionToConfirm(null);
                }}
                className="btn btn-danger"
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Yes, Clear Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import from Global Pool Modal */}
      <ImportFromGlobalModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        globalPlayers={globalPlayers}
        currentTournamentPlayers={tournament.playersPool || []}
        onImport={handleImportGlobalPlayers}
      />

      {/* Register New Competitor Modal */}
      <PlayerEditModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSave={handleRegisterNewCompetitor}
        existingNames={existingRosterNames}
      />

      {/* Remove Competitor Speedbump Modal */}
      {playerToRemove && (
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
              background: 'var(--color-bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: playerToRemoveHasMatches ? '1px solid var(--color-border)' : '1px solid var(--color-red)',
              maxWidth: '460px',
              width: '100%',
              boxShadow: 'var(--shadow-xl)',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: playerToRemoveHasMatches ? 'var(--color-gold-bright)' : 'var(--color-red)' }}>
                {playerToRemoveHasMatches ? <AlertTriangle size={20} /> : <UserX size={20} />}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                  {playerToRemoveHasMatches ? 'Cannot Remove Competitor' : 'Remove from Roster?'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPlayerToRemove(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {playerToRemoveHasMatches ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', lineHeight: 1.5, margin: 0 }}>
                  <strong>{playerToRemove.name}</strong> cannot be removed from this tournament because they have recorded bracket matches. To remove this competitor, first clear match scores in the Data Maintenance section.
                </p>
              ) : (
                <>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', lineHeight: 1.5, margin: 0 }}>
                    Are you sure you want to remove <strong>{playerToRemove.name}</strong> from this tournament roster?
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4, margin: 0 }}>
                    Any qualifier scores submitted by this competitor for this tournament will also be removed. The competitor remains in the global catalog.
                  </p>
                </>
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
                onClick={() => setPlayerToRemove(null)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                {playerToRemoveHasMatches ? 'Close' : 'Cancel'}
              </button>
              {!playerToRemoveHasMatches && (
                <button
                  type="button"
                  onClick={handleRemoveCompetitorConfirm}
                  className="btn btn-danger"
                  style={{ padding: '0.5rem 1.25rem' }}
                >
                  Remove Competitor
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  marginBottom: '0.4rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.85rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-base)',
  color: 'var(--color-text-primary)',
  fontSize: '0.875rem',
};
