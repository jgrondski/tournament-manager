import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tournament, TournamentTier, QualFormat, PointsThreshold, DEFAULT_POINTS_THRESHOLDS } from '../types';
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
  Sparkles,
  Play,
  Users,
  Unlock,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Check,
  Sliders,
  ChevronDown,
  Building2,
  Send,
  ExternalLink,
} from 'lucide-react';
import { useOrganization } from '../../organizations/store';
import { generateTraditionalBracket, generateFlatBracket, getValidFlatWidths } from '../../bracket/math';
import { getDefaultTierColors, TierThemeColors } from '../../bracket/colorUtils';
import { generateDraftBracketsForTournament } from '../../qualifiers/scoring';
import { BestOfSelect } from '../../bracket/components/BestOfSelect';
import { BracketThemeEditor } from '../../bracket/components/BracketThemeEditor';
import { getAvailableRoundsForTier, pruneInvalidRoundOverrides } from '../roundOverrides';
import { ClearableNumberInput } from '../../../components/ClearableNumberInput';
import { VerifyBracketModal } from './VerifyBracketModal';
import { PointsThresholdsDrawer } from './PointsThresholdsDrawer';

interface DraftOverrideRow {
  id: string;
  roundNumber: number;
  bestOf: number;
  originalRoundNumber: number;
  originalBestOf: number;
  isDirty: boolean;
}

interface RoundOverridesEditorProps {
  tier: TournamentTier;
  onChange: (overrides: Record<number, number>) => void;
  inputStyle: React.CSSProperties;
}

const RoundOverridesEditor: React.FC<RoundOverridesEditorProps> = ({ tier, onChange, inputStyle }) => {
  const [draftRows, setDraftRows] = useState<DraftOverrideRow[]>(() => {
    const entries = Object.entries(tier.roundBestOfOverrides || {})
      .map(([rStr, boVal]) => ({
        roundNumber: parseInt(rStr, 10),
        bestOf: boVal,
      }))
      .sort((a, b) => a.roundNumber - b.roundNumber);

    return entries.map(e => ({
      id: `r_${e.roundNumber}`,
      roundNumber: e.roundNumber,
      bestOf: e.bestOf,
      originalRoundNumber: e.roundNumber,
      originalBestOf: e.bestOf,
      isDirty: false,
    }));
  });

  // Sync with tier.roundBestOfOverrides changes if there are no dirty edits in progress
  useEffect(() => {
    const entries = Object.entries(tier.roundBestOfOverrides || {})
      .map(([rStr, boVal]) => ({
        roundNumber: parseInt(rStr, 10),
        bestOf: boVal,
      }))
      .sort((a, b) => a.roundNumber - b.roundNumber);

    setDraftRows(prev => {
      // If user has active dirty edits, do not disrupt unless overrides structurally changed
      const hasDirty = prev.some(r => r.isDirty);
      if (hasDirty) return prev;

      if (
        prev.length === entries.length &&
        prev.every((r, idx) => r.roundNumber === entries[idx]?.roundNumber && r.bestOf === entries[idx]?.bestOf)
      ) {
        return prev;
      }

      return entries.map(e => ({
        id: `r_${e.roundNumber}`,
        roundNumber: e.roundNumber,
        bestOf: e.bestOf,
        originalRoundNumber: e.roundNumber,
        originalBestOf: e.bestOf,
        isDirty: false,
      }));
    });
  }, [tier.roundBestOfOverrides]);

  const availableRounds = getAvailableRoundsForTier(tier);

  const handleAdd = () => {
    const takenRounds = new Set(draftRows.map(r => r.roundNumber));
    const nextRound = availableRounds.find(r => !takenRounds.has(r.roundNumber));
    if (!nextRound) return;

    const newRow: DraftOverrideRow = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      roundNumber: nextRound.roundNumber,
      bestOf: tier.bestOf,
      originalRoundNumber: -1,
      originalBestOf: -1,
      isDirty: true,
    };

    setDraftRows(prev => [...prev, newRow]);
  };

  const handleRoundChange = (rowId: string, newRoundNumber: number) => {
    setDraftRows(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        const isDirty = newRoundNumber !== r.originalRoundNumber || r.bestOf !== r.originalBestOf;
        return {
          ...r,
          roundNumber: newRoundNumber,
          isDirty,
        };
      })
    );
  };

  const handleBestOfChange = (rowId: string, newBo: number) => {
    setDraftRows(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        const isDirty = r.roundNumber !== r.originalRoundNumber || newBo !== r.originalBestOf;
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
        originalRoundNumber: r.roundNumber,
        originalBestOf: r.bestOf,
        isDirty: false,
      };
    });

    // Sort by roundNumber on Save with CSS transition
    updatedRows.sort((a, b) => a.roundNumber - b.roundNumber);
    setDraftRows(updatedRows);

    const nextOverrides: Record<number, number> = {};
    for (const r of updatedRows) {
      if (r.originalRoundNumber !== -1) {
        nextOverrides[r.roundNumber] = r.bestOf;
      }
    }
    onChange(nextOverrides);
  };

  const handleDeleteRow = (rowId: string) => {
    const remaining = draftRows.filter(r => r.id !== rowId);
    setDraftRows(remaining);

    const nextOverrides: Record<number, number> = {};
    for (const r of remaining) {
      if (r.originalRoundNumber !== -1) {
        nextOverrides[r.roundNumber] = r.bestOf;
      }
    }
    onChange(nextOverrides);
  };

  const configuredCount = Object.keys(tier.roundBestOfOverrides || {}).length;
  const isAllConfigured = availableRounds.length > 0 && availableRounds.every(r =>
    draftRows.some(row => row.roundNumber === r.roundNumber)
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
            const otherDraftRounds = new Set(
              draftRows.filter(r => r.id !== row.id).map(r => r.roundNumber)
            );
            const selectableRounds = availableRounds.filter(
              r => r.roundNumber === row.roundNumber || !otherDraftRounds.has(r.roundNumber)
            );

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
                    value={row.roundNumber}
                    onChange={e => handleRoundChange(row.id, parseInt(e.target.value, 10))}
                    style={inputStyle}
                  >
                    {selectableRounds.map(r => (
                      <option key={r.roundNumber} value={r.roundNumber}>
                        {r.name}
                      </option>
                    ))}
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
    unlockBrackets,
  } = useTournament();

  const { organizations, getOrganizationById } = useOrganization();

  // Tournament Fields State
  const [name, setName] = useState(tournament.name);
  const [slug, setSlug] = useState(tournament.slug);
  const [organizationId, setOrganizationId] = useState<string>(
    tournament.organizationId || organizations[0]?.id || 'org_ctwc'
  );
  const [useOrgBranding, setUseOrgBranding] = useState<boolean>(
    tournament.useOrgBranding ?? true
  );
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState<string>(
    tournament.discordWebhookUrl || ''
  );
  const [logoUrl, setLogoUrl] = useState<string>(
    tournament.logoUrl || ''
  );
  const [bannerUrl, setBannerUrl] = useState<string>(
    tournament.bannerUrl || ''
  );
  const [webhookTestStatus, setWebhookTestStatus] = useState<string | null>(null);

  const selectedOrg = getOrganizationById(organizationId);

  const [date, setDate] = useState(tournament.date);
  const [location, setLocation] = useState(tournament.location || '');
  const [qualFormat, setQualFormat] = useState<QualFormat>(tournament.qualFormat || 'AVERAGE_OF_X');
  const [qualAverageCount, setQualAverageCount] = useState<number | undefined>(tournament.qualAverageCount || 2);
  const [avgCountError, setAvgCountError] = useState<string | null>(null);
  const [pointsConfig, setPointsConfig] = useState<PointsThreshold[]>(
    tournament.pointsConfig && tournament.pointsConfig.length > 0
      ? tournament.pointsConfig
      : DEFAULT_POINTS_THRESHOLDS
  );
  const [isPointsDrawerOpen, setIsPointsDrawerOpen] = useState(false);
  const [isSettingsVerifyModalOpen, setIsSettingsVerifyModalOpen] = useState(false);
  const [settingsUnlockError, setSettingsUnlockError] = useState<string | null>(null);

  const handleApplyOrgColorsToTiers = () => {
    const orgPalette = selectedOrg?.themeColors || selectedOrg?.branding?.themeColors;
    if (!orgPalette) return;
    const tierThemesList = selectedOrg?.tierThemes || [];

    setTiers(prev =>
      prev.map((t, idx) => {
        const palette =
          idx > 0 && tierThemesList[idx - 1]?.themeColors
            ? tierThemesList[idx - 1].themeColors
            : orgPalette;
        return {
          ...t,
          primaryColor: palette.primaryColor,
          secondaryColor: palette.secondaryColor,
          cardColor: palette.cardColor,
          textColor: palette.textColor,
          backgroundColor: palette.backgroundColor,
        };
      })
    );
  };

  const handleTestDiscordWebhook = () => {
    const targetUrl = discordWebhookUrl.trim() || selectedOrg?.discordWebhookUrl?.trim();
    if (!targetUrl) {
      setWebhookTestStatus('No webhook URL configured (either tournament or organization)');
      setTimeout(() => setWebhookTestStatus(null), 3000);
      return;
    }
    setWebhookTestStatus('Ping simulated: Discord webhook target resolved successfully!');
    setTimeout(() => setWebhookTestStatus(null), 4000);
  };

  // Tiers State
  const [tiers, setTiers] = useState<TournamentTier[]>(tournament.tiers || []);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [tierToDelete, setTierToDelete] = useState<{ index: number; tier: TournamentTier } | null>(null);
  const [dataActionToConfirm, setDataActionToConfirm] = useState<'MATCHES' | 'QUALS' | 'ALL' | null>(null);
  const [simFeedback, setSimFeedback] = useState<string | null>(null);
  const [openThemes, setOpenThemes] = useState<Record<string, boolean>>({});

  const toggleThemeCollapse = (tierId: string) => {
    setOpenThemes(prev => ({
      ...prev,
      [tierId]: !prev[tierId],
    }));
  };

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

  // Helper to normalize colors for dirty comparison
  const normColor = (
    tier: TournamentTier,
    field: keyof TierThemeColors
  ): string => {
    const val = tier[field];
    if (val && typeof val === 'string' && val.trim()) {
      return val.trim().toLowerCase();
    }
    const defaults = getDefaultTierColors(tier);
    return defaults[field].toLowerCase();
  };

  // Track dirty state
  const isDirty = useMemo(() => {
    if (name.trim() !== (tournament.name || '').trim()) return true;
    if (slug.trim() !== (tournament.slug || '').trim()) return true;
    if (organizationId !== (tournament.organizationId || 'org_ctwc')) return true;
    if (useOrgBranding !== (tournament.useOrgBranding ?? true)) return true;
    if ((discordWebhookUrl || '').trim() !== (tournament.discordWebhookUrl || '').trim()) return true;
    if ((logoUrl || '').trim() !== (tournament.logoUrl || '').trim()) return true;
    if ((bannerUrl || '').trim() !== (tournament.bannerUrl || '').trim()) return true;
    if (date.trim() !== (tournament.date || '').trim()) return true;
    if (location.trim() !== (tournament.location || '').trim()) return true;
    if (qualFormat !== tournament.qualFormat) return true;
    if (qualAverageCount !== (tournament.qualAverageCount || 2)) return true;

    // Points config
    if (qualFormat === 'POINTS') {
      const initialPoints =
        tournament.pointsConfig && tournament.pointsConfig.length > 0
          ? tournament.pointsConfig
          : DEFAULT_POINTS_THRESHOLDS;
      if (JSON.stringify(pointsConfig) !== JSON.stringify(initialPoints)) return true;
    } else if (tournament.pointsConfig && tournament.pointsConfig.length > 0) {
      if (JSON.stringify(pointsConfig) !== JSON.stringify(tournament.pointsConfig)) return true;
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
        (a.slug || '').trim() !== (b.slug || '').trim() ||
        (a.name || '').trim() !== (b.name || '').trim() ||
        a.priority !== b.priority ||
        a.bracketType !== b.bracketType ||
        a.playerCount !== b.playerCount ||
        a.bestOf !== b.bestOf ||
        (a.flatWidth || 0) !== (b.flatWidth || 0) ||
        normColor(a, 'primaryColor') !== normColor(b, 'primaryColor') ||
        normColor(a, 'secondaryColor') !== normColor(b, 'secondaryColor') ||
        normColor(a, 'cardColor') !== normColor(b, 'cardColor') ||
        normColor(a, 'textColor') !== normColor(b, 'textColor') ||
        normColor(a, 'backgroundColor') !== normColor(b, 'backgroundColor') ||
        (a.textSize || 'normal') !== (b.textSize || 'normal') ||
        JSON.stringify(a.roundBestOfOverrides || {}) !== JSON.stringify(b.roundBestOfOverrides || {})
      ) {
        return true;
      }
    }

    return false;
  }, [
    name,
    slug,
    date,
    location,
    qualFormat,
    qualAverageCount,
    pointsConfig,
    tiers,
    tournament,
    organizationId,
    useOrgBranding,
    discordWebhookUrl,
    logoUrl,
    bannerUrl,
  ]);

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
      setOrganizationId(tournament.organizationId || 'org_ctwc');
      setUseOrgBranding(tournament.useOrgBranding ?? true);
      setDiscordWebhookUrl(tournament.discordWebhookUrl || '');
      setLogoUrl(tournament.logoUrl || '');
      setBannerUrl(tournament.bannerUrl || '');
      setDate(tournament.date || '');
      setLocation(tournament.location || '');
      setQualFormat(tournament.qualFormat || 'AVERAGE_OF_X');
      setQualAverageCount(tournament.qualAverageCount || 2);
      setAvgCountError(null);
      setPointsConfig(
        tournament.pointsConfig && tournament.pointsConfig.length > 0
          ? tournament.pointsConfig
          : DEFAULT_POINTS_THRESHOLDS
      );
      setTiers(tournament.tiers || []);
    }
  }, [tournament, isDirty]);

  const handleDiscardChanges = () => {
    setName(tournament.name || '');
    setSlug(tournament.slug || '');
    setOrganizationId(tournament.organizationId || 'org_ctwc');
    setUseOrgBranding(tournament.useOrgBranding ?? true);
    setDiscordWebhookUrl(tournament.discordWebhookUrl || '');
    setLogoUrl(tournament.logoUrl || '');
    setBannerUrl(tournament.bannerUrl || '');
    setDate(tournament.date || '');
    setLocation(tournament.location || '');
    setQualFormat(tournament.qualFormat || 'AVERAGE_OF_X');
    setQualAverageCount(tournament.qualAverageCount || 2);
    setAvgCountError(null);
    setPointsConfig(
      tournament.pointsConfig && tournament.pointsConfig.length > 0
        ? tournament.pointsConfig
        : DEFAULT_POINTS_THRESHOLDS
    );
    setTiers(tournament.tiers || []);
    setOpenThemes({});
  };

  // Helper to auto-derive slug from name
  const handleNameChange = (newName: string) => {
    setName(newName);
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
    let newTier: TournamentTier;
    const tierId = `tier_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    if (tiers.length === 0) {
      // 1st Tier: Gold Championship, 16 players, Traditional, Bo5, #ffd200 / #5e512b
      newTier = {
        id: tierId,
        slug: 'gold',
        name: 'Gold Championship',
        priority: 1,
        bracketType: 'TRADITIONAL',
        playerCount: 16,
        bestOf: 5,
        primaryColor: '#ffc905',
        secondaryColor: '#705b33',
        cardColor: '#1b1c1d',
        textColor: '#94A3B8',
        backgroundColor: '#020203',
        isLocked: false,
        bracket: generateTraditionalBracket(
          Array.from({ length: 16 }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}`, seed: i + 1 })),
          { tierId, bestOf: 5 }
        ),
      };
    } else if (tiers.length === 1) {
      // 2nd Tier: Silver Bracket, 9 players, Flat bracket, 2 wide, Bo3 with semis & finals Bo5 overrides, #CBD5E1 / #3d4652
      const roundBestOfOverrides = { 4: 5, 5: 5 };
      newTier = {
        id: tierId,
        slug: 'silver',
        name: 'Silver Bracket',
        priority: 2,
        bracketType: 'FLAT',
        playerCount: 9,
        flatWidth: 2,
        bestOf: 3,
        roundBestOfOverrides,
        primaryColor: '#CBD5E1',
        secondaryColor: '#3d4652',
        cardColor: '#0E1420',
        textColor: '#4f5c6d',
        backgroundColor: '#0B0E14',
        isLocked: false,
        bracket: generateFlatBracket(
          Array.from({ length: 9 }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}`, seed: i + 1 })),
          2,
          { tierId, bestOf: 3, roundBestOfOverrides }
        ),
      };
    } else {
      const nextPriority = tiers.length + 1;
      const tierName = nextPriority === 3 ? 'Bronze Bracket' : `Tier ${nextPriority}`;
      const tierSlug = nextPriority === 3 ? 'bronze' : `tier-${nextPriority}`;
      const primaryColor = nextPriority === 3 ? '#db5f00' : '#3b82f6';
      const secondaryColor = nextPriority === 3 ? '#4e310e' : '#60a5fa';
      const cardColor = nextPriority === 3 ? '#181410' : '#0E1420';
      const textColor = nextPriority === 3 ? '#5e6f87' : '#94A3B8';
      const backgroundColor = '#0B0E14';
      newTier = {
        id: tierId,
        slug: tierSlug,
        name: tierName,
        priority: nextPriority,
        bracketType: 'TRADITIONAL',
        playerCount: 8,
        bestOf: 3,
        primaryColor,
        secondaryColor,
        cardColor,
        textColor,
        backgroundColor,
        isLocked: false,
        bracket: generateTraditionalBracket(
          Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}`, seed: i + 1 })),
          { tierId, bestOf: 3 }
        ),
      };
    }

    const nextTiers = [...tiers, newTier];
    const draftTiers = generateDraftBracketsForTournament({ ...tournament, tiers: nextTiers });
    setTiers(draftTiers);
    setOpenThemes(prev => ({
      ...prev,
      [tierId]: true,
    }));
  };

  const updateTier = (index: number, updates: Partial<TournamentTier>) => {
    setTiers(prev => {
      const next = [...prev];
      let target = { ...next[index], ...updates };
      if (updates.name && !updates.slug) {
        target.slug = updates.name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
      }
      const structuralChange =
        updates.playerCount !== undefined ||
        updates.bracketType !== undefined ||
        updates.flatWidth !== undefined;

      if (structuralChange) {
        if (target.bracketType === 'FLAT') {
          const validWidths = getValidFlatWidths(target.playerCount);
          if (!validWidths.includes(target.flatWidth || 0)) {
            target.flatWidth = validWidths[validWidths.length - 1] ?? 2;
          }
        }
        target = pruneInvalidRoundOverrides(target);
      }
      next[index] = target;

      if (!tournament.isLocked && structuralChange) {
        return generateDraftBracketsForTournament({ ...tournament, tiers: next });
      }
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
      const reordered = next.map((t, idx) => ({ ...t, priority: idx + 1 }));
      if (!tournament.isLocked) {
        return generateDraftBracketsForTournament({ ...tournament, tiers: reordered });
      }
      return reordered;
    });
  };

  const deleteTier = (index: number) => {
    const tier = tiers[index];
    if (tier) {
      setOpenThemes(prev => {
        const next = { ...prev };
        delete next[tier.id];
        return next;
      });
    }
    setTiers(prev => {
      const next = prev.filter((_, i) => i !== index).map((t, idx) => ({ ...t, priority: idx + 1 }));
      if (!tournament.isLocked) {
        return generateDraftBracketsForTournament({ ...tournament, tiers: next });
      }
      return next;
    });
  };

  const saveCurrentConfig = () => {
    let updatedTiers: TournamentTier[];
    if (tournament.isLocked) {
      // In locked match play mode, preserve existing active bracket matches, results, and player progression
      updatedTiers = tiers.map(tier => ({
        ...tier,
        bracket: tier.bracket,
      }));
    } else {
      const baseTiers = tiers.map(tier => {
        const dummyPlayers = Array.from({ length: tier.playerCount }, (_, i) => ({
          id: `dummy_${i + 1}`,
          name: `Seed ${i + 1}`,
          seed: i + 1,
        }));

        const newBracket =
          tier.bracketType === 'FLAT'
            ? generateFlatBracket(dummyPlayers, tier.flatWidth || 4, {
                tierId: tier.id,
                bestOf: tier.bestOf,
                roundBestOfOverrides: tier.roundBestOfOverrides,
              })
            : generateTraditionalBracket(dummyPlayers, {
                tierId: tier.id,
                bestOf: tier.bestOf,
                roundBestOfOverrides: tier.roundBestOfOverrides,
              });

        return {
          ...tier,
          bracket: newBracket,
        };
      });

      updatedTiers = generateDraftBracketsForTournament({ ...tournament, tiers: baseTiers });
    }

    let parsedAvg = 2;
    if (qualFormat === 'AVERAGE_OF_X') {
      if (qualAverageCount === undefined || isNaN(qualAverageCount) || qualAverageCount < 1) {
        setAvgCountError('Please enter a valid attempt count (minimum 1)');
        return;
      }
      parsedAvg = qualAverageCount;
    }

    updateTournament(tournament.id, {
      name,
      slug,
      organizationId,
      useOrgBranding,
      discordWebhookUrl,
      logoUrl,
      bannerUrl,
      date,
      location,
      qualFormat,
      qualAverageCount: parsedAvg,
      pointsConfig,
    });

    saveTiers(tournament.id, updatedTiers);
    setTiers(updatedTiers);
    return updatedTiers;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const result = saveCurrentConfig();
    if (!result) return;
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

      {/* Tournament Phase & Bracket Lock Banner */}
      <div
        style={{
          background: tournament.isLocked
            ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.18) 100%)'
            : 'linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.18) 100%)',
          border: tournament.isLocked ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: 'var(--radius-md)',
          padding: '0.6rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: tournament.isLocked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tournament.isLocked ? '#34d399' : 'var(--color-gold-bright)',
              flexShrink: 0,
            }}
          >
            {tournament.isLocked ? <ShieldCheck size={16} /> : <Lock size={16} />}
          </div>
          <div>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: tournament.isLocked ? '#34d399' : 'var(--color-gold-bright)', marginRight: '0.5rem' }}>
              {tournament.isLocked ? 'MATCH PLAY MODE (LOCKED)' : 'QUALIFIERS MODE (DRAFT PREVIEW)'}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
              {tournament.isLocked
                ? 'Bracket seeds are frozen and match play is live.'
                : 'Bracket seeds update dynamically with qualifiers.'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {settingsUnlockError && (
            <span style={{ color: 'var(--color-red)', fontSize: '0.75rem', fontWeight: 600 }}>
              {settingsUnlockError}
            </span>
          )}
          {tournament.isLocked ? (
            <button
              type="button"
              onClick={() => {
                const res = unlockBrackets(tournament.id);
                if (!res.success && res.error) {
                  setSettingsUnlockError(res.error);
                } else {
                  setSettingsUnlockError(null);
                }
              }}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              title="Revert tournament to Qualifiers Mode"
            >
              <Unlock size={14} />
              Unlock Brackets
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsSettingsVerifyModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              <Lock size={14} />
              Lock Brackets and Begin Match Play
            </button>
          )}
        </div>
      </div>

      {/* Section 1: Tournament Information */}
      <section
        style={{
          background: 'var(--color-bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
          <Shield size={18} color="var(--color-gold-bright)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Tournament Details
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
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
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
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
        <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>
            <div>
              <label style={labelStyle}>Qualifying Format</label>
              <select
                value={qualFormat}
                onChange={e => {
                  const newFmt = e.target.value as QualFormat;
                  setQualFormat(newFmt);
                  if (newFmt === 'POINTS' && (!pointsConfig || pointsConfig.length === 0)) {
                    setPointsConfig(DEFAULT_POINTS_THRESHOLDS);
                  }
                }}
                style={inputStyle}
              >
                <option value="HIGH_SCORE"># of Maxes</option>
                <option value="AVERAGE_OF_X">Average of X Attempts</option>
                <option value="POINTS">Points Threshold System</option>
              </select>
            </div>

            {/* Tournament Mode Status Indicator */}
            <div>
              <label style={labelStyle}>Tournament Mode</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                {!tournament.isLocked ? (
                  <span className="badge badge-gold" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}>
                    <AlertTriangle size={13} /> Qualifiers Mode
                  </span>
                ) : (
                  <span className="badge badge-green" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}>
                    <ShieldCheck size={13} /> Match Play Mode
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {!tournament.isLocked
                    ? 'Qualifiers active. Brackets dynamically seed.'
                    : 'Brackets locked. Live match scoring active.'}
                </span>
              </div>
            </div>
          </div>

          {/* Conditional Format Config */}
          {qualFormat === 'AVERAGE_OF_X' && (
            <div style={{ background: 'var(--color-bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-sm)', maxWidth: '360px' }}>
              <label style={labelStyle}>Target Attempt Count (X)</label>
              <ClearableNumberInput
                min={1}
                max={10}
                value={qualAverageCount}
                onChange={val => {
                  setQualAverageCount(val);
                  if (avgCountError) setAvgCountError(null);
                }}
                error={avgCountError}
                onErrorChange={setAvgCountError}
                style={inputStyle}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem', display: 'block' }}>
                e.g. 2 for Average of 2, 3 for Average of 3
              </span>
            </div>
          )}

          {qualFormat === 'POINTS' && (
            <div
              style={{
                background: 'var(--color-bg-surface-elevated)',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-text-primary)' }}>
                    Points Threshold System
                  </span>
                  <span
                    style={{
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: 'var(--color-gold-bright)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {pointsConfig.length} {pointsConfig.length === 1 ? 'cutoff' : 'cutoffs'} configured
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                  Attempts award points non-cumulatively based on highest cutoff reached.
                  {pointsConfig.length > 0 && (
                    <span style={{ marginLeft: '0.35rem', color: 'var(--color-text-secondary)' }}>
                      ({[...pointsConfig].sort((a, b) => b.minScore - a.minScore).slice(0, 4).map(p => `${(p.minScore / 1000).toFixed(0)}k → +${p.points}`).join(', ')}{pointsConfig.length > 4 ? ', ...' : ''})
                    </span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPointsDrawerOpen(true)}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem', gap: '0.4rem', whiteSpace: 'nowrap' }}
              >
                <Sliders size={14} color="var(--color-gold-bright)" />
                Configure Points Cutoffs
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Section: Organization & Brand Palette */}
      <section
        style={{
          background: 'var(--color-bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} color="var(--color-gold-bright)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Host Organization &amp; Branding
            </h2>
          </div>
          {selectedOrg && (
            <Link
              to={`/org/${selectedOrg.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.78rem',
                color: 'var(--color-gold-bright)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 600,
              }}
            >
              <span>View {selectedOrg.shortName} Dashboard</span>
              <ExternalLink size={12} />
            </Link>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Left Column: Organization Selection & Palette */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Parent Organization Circuit</label>
              <select
                value={organizationId}
                onChange={e => setOrganizationId(e.target.value)}
                style={inputStyle}
              >
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.shortName})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', display: 'block' }}>
                All match scores, career metrics, and qualifying leaderboards roll up to this organization.
              </span>
            </div>

            <div style={{ background: 'var(--color-bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={useOrgBranding}
                  onChange={e => setUseOrgBranding(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-gold-bright)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Inherit Organization Theme &amp; 5-Color Bracket Palette
                </span>
              </label>

              {useOrgBranding && (selectedOrg?.themeColors || selectedOrg?.branding?.themeColors) && (
                (() => {
                  const colors = selectedOrg.themeColors || selectedOrg.branding?.themeColors;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        Circuit 5-Color Theme:
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {[
                          { label: 'Pri', color: colors?.primaryColor },
                          { label: 'Sec', color: colors?.secondaryColor },
                          { label: 'Card', color: colors?.cardColor },
                          { label: 'Text', color: colors?.textColor },
                          { label: 'Bg', color: colors?.backgroundColor },
                        ].map(swatch => (
                          <div key={swatch.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: swatch.color, border: '1px solid rgba(255,255,255,0.2)' }} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{swatch.label}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleApplyOrgColorsToTiers}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', alignSelf: 'flex-start', marginTop: '0.25rem', gap: '0.4rem' }}
                        title="Copy these 5 colors to all tiers in this tournament"
                      >
                        <Palette size={13} color="var(--color-gold-bright)" />
                        Apply Circuit Palettes to All Tiers
                      </button>
                    </div>
                  );
                })()
              )}

              {!useOrgBranding && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  Custom regional mode: Each tier in this tournament will use its own custom colors and media independent of {selectedOrg?.shortName || 'the organization'}.
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Logo/Banner Overrides & Discord Webhooks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Tournament Logo URL</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder={selectedOrg?.branding?.logoUrl || 'https://.../logo.png'}
                  style={inputStyle}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  {logoUrl ? 'Custom tournament logo' : `Default: ${selectedOrg?.shortName || 'Org'} logo`}
                </span>
              </div>
              <div>
                <label style={labelStyle}>Tournament Banner URL</label>
                <input
                  type="text"
                  value={bannerUrl}
                  onChange={e => setBannerUrl(e.target.value)}
                  placeholder={selectedOrg?.branding?.bannerUrl || 'https://.../banner.png'}
                  style={inputStyle}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  {bannerUrl ? 'Custom tournament banner' : `Default: ${selectedOrg?.shortName || 'Org'} banner`}
                </span>
              </div>
            </div>

            {/* Discord Webhook Field (Groundwork) */}
            <div style={{ background: 'var(--color-bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ ...labelStyle, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>Discord Webhook URL</span>
                  <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 600 }}>
                    Groundwork
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={discordWebhookUrl}
                  onChange={e => setDiscordWebhookUrl(e.target.value)}
                  placeholder={selectedOrg?.discordWebhookUrl ? `Fallback: ${selectedOrg.shortName} Webhook` : 'https://discord.com/api/webhooks/...'}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleTestDiscordWebhook}
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', whiteSpace: 'nowrap', gap: '0.35rem' }}
                  title="Test resolve tournament or fallback organization webhook"
                >
                  <Send size={13} />
                  Test
                </button>
              </div>

              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                {discordWebhookUrl.trim()
                  ? 'Active tournament-specific webhook override.'
                  : selectedOrg?.discordWebhookUrl
                  ? `Inherited from ${selectedOrg.name} (${selectedOrg.discordWebhookUrl.slice(0, 32)}...)`
                  : 'No webhook configured. Circuit announcements disabled.'}
              </span>

              {webhookTestStatus && (
                <div style={{ fontSize: '0.75rem', color: webhookTestStatus.includes('resolved') ? '#34d399' : '#f87171', fontWeight: 600 }}>
                  {webhookTestStatus}
                </div>
              )}
            </div>
          </div>
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

                {/* Form Fields Grid: Aligned and robust with minWidth: 0 to prevent overflow */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ ...labelStyle, height: '1.6rem', display: 'flex', alignItems: 'flex-end', marginBottom: '0.35rem' }}>Tier Name</label>
                    <input
                      type="text"
                      value={tier.name}
                      onChange={e => updateTier(idx, { name: e.target.value })}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ ...labelStyle, height: '1.6rem', display: 'flex', alignItems: 'flex-end', marginBottom: '0.35rem' }}>URL Slug</label>
                    <input
                      type="text"
                      value={tier.slug}
                      onChange={e => updateTier(idx, { slug: e.target.value })}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ ...labelStyle, height: '1.6rem', display: 'flex', alignItems: 'flex-end', marginBottom: '0.35rem' }}>Bracket Type</label>
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
                    <div style={{ minWidth: 0 }}>
                      <label
                        style={{
                          ...labelStyle,
                          height: '1.6rem',
                          display: 'flex',
                          alignItems: 'flex-end',
                          marginBottom: '0.35rem',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden'
                        }}
                        title="Flat Width (Matches Per Round)"
                      >
                        Flat Width (Per Round)
                      </label>
                      <select
                        value={tier.flatWidth || getValidFlatWidths(tier.playerCount)[0] || 2}
                        onChange={e => updateTier(idx, { flatWidth: parseInt(e.target.value, 10) })}
                        style={inputStyle}
                      >
                        {getValidFlatWidths(tier.playerCount).map(w => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ minWidth: 0 }}>
                    <label style={{ ...labelStyle, height: '1.6rem', display: 'flex', alignItems: 'flex-end', marginBottom: '0.35rem' }}>Participant Count</label>
                    <ClearableNumberInput
                      min={2}
                      max={64}
                      value={tier.playerCount}
                      onChange={val => updateTier(idx, { playerCount: val ?? 2 })}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ ...labelStyle, height: '1.6rem', display: 'flex', alignItems: 'flex-end', marginBottom: '0.35rem' }}>Best-of Default</label>
                    <BestOfSelect
                      value={tier.bestOf}
                      onChange={val => updateTier(idx, { bestOf: val })}
                    />
                  </div>
                </div>

                {/* Round-Specific Best-of Overrides */}
                <RoundOverridesEditor
                  tier={tier}
                  onChange={newOverrides => updateTier(idx, { roundBestOfOverrides: newOverrides })}
                  inputStyle={inputStyle}
                />

                {/* Bracket Palette & Theming: Controls Above, 3-State Preview Below */}
                {(() => {
                  const defaults = getDefaultTierColors(tier);
                  const priColor = tier.primaryColor || defaults.primaryColor;
                  const secColor = tier.secondaryColor || defaults.secondaryColor;
                  const cardBg = tier.cardColor || defaults.cardColor;
                  const txtColor = tier.textColor || defaults.textColor;
                  const canvasBg = tier.backgroundColor || defaults.backgroundColor;
                  const isThemeOpen = Boolean(openThemes[tier.id]);

                  return (
                    <div
                      style={{
                        marginTop: '1.25rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-bg-surface)',
                        border: '1px solid var(--color-border-subtle)',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Accordion Header Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleThemeCollapse(tier.id)}
                        style={{
                          width: '100%',
                          padding: '0.85rem 1.25rem',
                          background: isThemeOpen ? 'var(--color-bg-surface)' : 'var(--color-bg-surface-elevated)',
                          border: 'none',
                          borderBottom: isThemeOpen ? '1px solid var(--color-border-subtle)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          textAlign: 'left',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = 'var(--color-bg-surface-elevated)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = isThemeOpen ? 'var(--color-bg-surface)' : 'var(--color-bg-surface-elevated)';
                        }}
                        aria-expanded={isThemeOpen}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <Palette size={15} color={priColor} />
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                              Bracket Theme & Palette
                            </span>
                          </div>

                          {/* Palette Color Swatches Preview */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.15rem 0.5rem',
                              background: 'var(--color-bg-base)',
                              borderRadius: 'var(--radius-full)',
                              border: '1px solid var(--color-border-subtle)',
                            }}
                            title={`Current theme: Primary (${priColor}), Secondary (${secColor}), Card (${cardBg}), Text (${txtColor}), Canvas (${canvasBg})`}
                          >
                            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: priColor, border: '1px solid rgba(0,0,0,0.3)', flexShrink: 0 }} />
                            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: secColor, border: '1px solid rgba(0,0,0,0.3)', flexShrink: 0 }} />
                            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: cardBg, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
                            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: txtColor, border: '1px solid rgba(0,0,0,0.3)', flexShrink: 0 }} />
                            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: canvasBg, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginLeft: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                              {tier.textSize ? `${tier.textSize}` : 'normal'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            {isThemeOpen ? 'Click to collapse' : 'Click to customize colors & text size'}
                          </span>
                          <ChevronDown
                            size={16}
                            color="var(--color-text-muted)"
                            style={{
                              transform: isThemeOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                            }}
                          />
                        </div>
                      </button>

                      {/* Accordion Content */}
                      {isThemeOpen && (
                        <div
                          style={{
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.25rem',
                            animation: 'fadeIn 0.15s ease-out',
                          }}
                        >
                          <BracketThemeEditor
                            themeColors={{
                              primaryColor: priColor,
                              secondaryColor: secColor,
                              cardColor: cardBg,
                              textColor: txtColor,
                              backgroundColor: canvasBg,
                            }}
                            textSize={
                              tier.textSize === 'compact' || tier.textSize === 'small'
                                ? 'compact'
                                : tier.textSize === 'large' || tier.textSize === 'xlarge'
                                ? 'large'
                                : 'normal'
                            }
                            bestOf={tier.bestOf || 5}
                            onThemeChange={colors => {
                              updateTier(idx, {
                                primaryColor: colors.primaryColor,
                                secondaryColor: colors.secondaryColor,
                                cardColor: colors.cardColor,
                                textColor: colors.textColor,
                                backgroundColor: colors.backgroundColor,
                              });
                            }}
                            onTextSizeChange={size => {
                              updateTier(idx, { textSize: size });
                            }}
                            onReset={() => {
                              const def = getDefaultTierColors({ id: tier.id, slug: tier.slug, priority: tier.priority || (idx + 1) });
                              updateTier(idx, {
                                primaryColor: def.primaryColor,
                                secondaryColor: def.secondaryColor,
                                cardColor: def.cardColor,
                                textColor: def.textColor,
                                backgroundColor: def.backgroundColor,
                                textSize: 'normal',
                              });
                            }}
                          />
                        </div>
                      )}
                </div>
              );
                })()}
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
          padding: '0.85rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="var(--color-gold-bright)" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Tournament Competitor Roster
            </h2>
          </div>
          <span
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--color-gold-bright)',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {(tournament.playersPool || []).length} / {totalCapacity} Capacity Registered
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            Manage registrations & pool imports in Register Players.
          </span>
        </div>

        <Link
          to={`/${tournament.slug}/manage/players`}
          className="btn btn-primary"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', gap: '0.4rem', textDecoration: 'none' }}
        >
          <Users size={14} /> Go to Register Players
        </Link>
      </section>

      {/* Section 4: Data Management & Simulation */}
      <section
        style={{
          background: 'var(--color-bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Data Management & Simulation
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0 0' }}>
              Simulate realistic tournament data for end-to-end testing, or reset match records and qualifier submissions.
            </p>
          </div>
        </div>

        {/* Feedback message banner if any */}
        {simFeedback && (
          <div
            style={{
              padding: '0.6rem 0.85rem',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              borderRadius: 'var(--radius-sm)',
              color: '#4ade80',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <CheckCircle2 size={15} />
            <span>{simFeedback}</span>
          </div>
        )}

        {/* Data Status Summary Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <div style={{ padding: '0.55rem 0.85rem', background: 'var(--color-bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Qualifier Attempts
            </span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: qualifierCount > 0 ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)' }}>
              {qualifierCount}
            </span>
          </div>
          <div style={{ padding: '0.55rem 0.85rem', background: 'var(--color-bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Recorded Matches
            </span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: recordedMatchCount > 0 ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)' }}>
              {recordedMatchCount}
            </span>
          </div>
        </div>

        {/* Sandbox Simulation & Maintenance Controls Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
          {/* Sandbox Simulation */}
          <div
            style={{
              padding: '0.75rem 0.95rem',
              background: 'var(--color-bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Sandbox Simulation
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Seed simulated scores or run full tournament matches.
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleSeedQualifiers}
                disabled={hasQualifiers || hasRecordedMatches}
                className="btn btn-secondary"
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  opacity: (hasQualifiers || hasRecordedMatches) ? 0.45 : 1,
                  cursor: (hasQualifiers || hasRecordedMatches) ? 'not-allowed' : 'pointer',
                }}
                title={
                  hasRecordedMatches
                    ? 'Match play has begun. Clear match scores or all tournament data to re-seed.'
                    : hasQualifiers
                    ? 'Qualifiers have already been seeded. Clear qualifier scores to re-seed.'
                    : 'Generate realistic competitors and qualifier attempts'
                }
              >
                <Sparkles size={14} style={{ color: 'var(--color-gold-bright)' }} />
                Seed Qualifiers
              </button>

              <button
                type="button"
                onClick={handleSimulate}
                disabled={!hasTiers || hasRecordedMatches}
                className="btn btn-secondary"
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  opacity: (!hasTiers || hasRecordedMatches) ? 0.45 : 1,
                  cursor: (!hasTiers || hasRecordedMatches) ? 'not-allowed' : 'pointer',
                }}
                title={
                  !hasTiers
                    ? 'Add at least one bracket tier first before simulating tournament matches'
                    : hasRecordedMatches
                    ? 'Match results have already been recorded. Clear match scores to simulate again.'
                    : hasQualifiers
                    ? 'Lock brackets from current qualifiers and simulate all match results to champion'
                    : 'Seed qualifiers, lock brackets, and simulate all tournament matches'
                }
              >
                <Play size={14} style={{ color: '#60a5fa' }} />
                {hasQualifiers ? 'Simulate Matches' : 'Seed & Simulate'}
              </button>
            </div>
          </div>

          {/* Data Maintenance */}
          <div
            style={{
              padding: '0.75rem 0.95rem',
              background: 'var(--color-bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Data Maintenance
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Clear match results or qualifier submissions.
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setDataActionToConfirm('MATCHES')}
                disabled={recordedMatchCount === 0}
                className="btn btn-secondary"
                style={{
                  padding: '0.38rem 0.75rem',
                  fontSize: '0.78rem',
                  opacity: recordedMatchCount === 0 ? 0.4 : 1,
                  cursor: recordedMatchCount === 0 ? 'not-allowed' : 'pointer',
                }}
                title={recordedMatchCount === 0 ? 'No recorded match scores to clear' : 'Clear all recorded match scores'}
              >
                Clear Matches ({recordedMatchCount})
              </button>

              <button
                type="button"
                onClick={() => setDataActionToConfirm('QUALS')}
                disabled={qualifierCount === 0}
                className="btn btn-secondary"
                style={{
                  padding: '0.38rem 0.75rem',
                  fontSize: '0.78rem',
                  opacity: qualifierCount === 0 ? 0.4 : 1,
                  cursor: qualifierCount === 0 ? 'not-allowed' : 'pointer',
                }}
                title={qualifierCount === 0 ? 'No qualifier scores to clear' : 'Clear all qualifier submissions'}
              >
                Clear Quals ({qualifierCount})
              </button>

              <button
                type="button"
                onClick={() => setDataActionToConfirm('ALL')}
                disabled={qualifierCount === 0 && recordedMatchCount === 0}
                className="btn btn-danger"
                style={{
                  padding: '0.38rem 0.75rem',
                  fontSize: '0.78rem',
                  opacity: (qualifierCount === 0 && recordedMatchCount === 0) ? 0.4 : 1,
                  cursor: (qualifierCount === 0 && recordedMatchCount === 0) ? 'not-allowed' : 'pointer',
                }}
                title={qualifierCount === 0 && recordedMatchCount === 0 ? 'No data to clear' : 'Clear all tournament data'}
              >
                <Trash2 size={13} /> Clear All
              </button>
            </div>
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

      {/* Points Thresholds Drawer */}
      <PointsThresholdsDrawer
        isOpen={isPointsDrawerOpen}
        onClose={() => setIsPointsDrawerOpen(false)}
        pointsConfig={pointsConfig}
        onAddThreshold={addThreshold}
        onUpdateThreshold={updateThreshold}
        onRemoveThreshold={removeThreshold}
      />

      {isSettingsVerifyModalOpen && (
        <VerifyBracketModal
          isOpen={isSettingsVerifyModalOpen}
          onClose={() => setIsSettingsVerifyModalOpen(false)}
          tournament={tournament}
        />
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
  backgroundColor: 'var(--color-bg-base)',
  color: 'var(--color-text-primary)',
  fontSize: '0.875rem',
};
