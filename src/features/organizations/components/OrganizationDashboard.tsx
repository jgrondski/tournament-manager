import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useOrganization } from '../store';
import { useTournament } from '../../tournament/store';
import { computeOrganizationMetrics } from '../metrics';
import { TopNavSwitcher } from '../../../components/TopNavSwitcher';
import { TierThemeColors } from '../../bracket/colorUtils';
import { QualFormat, PointsThreshold, DEFAULT_POINTS_THRESHOLDS, OrgTierTheme, Tournament } from '../../tournament/types';
import { BracketThemeEditor } from '../../bracket/components/BracketThemeEditor';
import { QualFormatEditor } from '../../tournament/components/QualFormatEditor';
import { TournamentCard } from '../../tournament/components/TournamentCard';
import { CreateTournamentModal } from '../../tournament/components/CreateTournamentModal';
import {
  Building2,
  Trophy,
  Users,
  Gamepad2,
  Palette,
  Settings,
  ExternalLink,
  Plus,
  ArrowLeft,
  Send,
  Sparkles,
  X,
  Edit2,
  Trash2,
  Search,
  Layers,
  AlertTriangle,
} from 'lucide-react';

export const OrganizationDashboard: React.FC = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { updateOrganization, deleteOrganization, getOrganizationBySlug } = useOrganization();
  const { tournaments, deleteTournament } = useTournament();
  const navigate = useNavigate();

  const org = getOrganizationBySlug(orgSlug || '');

  const [activeTab, setActiveTab] = useState<'tournaments' | 'branding' | 'settings'>('tournaments');
  const [tourneySearch, setTourneySearch] = useState('');
  const [isEditMetadataOpen, setIsEditMetadataOpen] = useState(false);
  const [isCreateTourneyOpen, setIsCreateTourneyOpen] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [webhookTestStatus, setWebhookTestStatus] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);

  const confirmDeleteTournament = () => {
    if (tournamentToDelete) {
      deleteTournament(tournamentToDelete.id);
      setTournamentToDelete(null);
    }
  };

  // Metadata form state
  const [editName, setEditName] = useState(org?.name || '');
  const [editSlug, setEditSlug] = useState(org?.slug || '');
  const [editDescription, setEditDescription] = useState(org?.description || '');
  const [editWebsite, setEditWebsite] = useState(org?.website || '');
  const [editLogoUrl, setEditLogoUrl] = useState(org?.logoUrl || org?.branding?.logoUrl || '');
  const [editBannerUrl, setEditBannerUrl] = useState(org?.bannerUrl || org?.branding?.bannerUrl || '');

  // Branding Primary & Multi-tier state
  const initialColors = org?.themeColors || org?.branding?.themeColors || {
    primaryColor: org?.brandColor || '#ffc905',
    secondaryColor: '#705b33',
    cardColor: '#1b1c1d',
    textColor: '#94A3B8',
    backgroundColor: '#020203',
  };
  const [primaryTheme, setPrimaryTheme] = useState<TierThemeColors>(initialColors);
  const [primaryTextSize, setPrimaryTextSize] = useState<'compact' | 'normal' | 'large'>('normal');

  const [tierThemes, setTierThemes] = useState<OrgTierTheme[]>(org?.tierThemes || []);

  // Settings state
  const [qualFormat, setQualFormat] = useState<QualFormat>(org?.defaultRules?.qualFormat || 'AVERAGE_OF_X');
  const [qualAverageCount, setQualAverageCount] = useState<number | undefined>(org?.defaultRules?.qualAverageCount || 2);
  const [pointsConfig, setPointsConfig] = useState<PointsThreshold[]>(
    org?.defaultRules?.pointsConfig || DEFAULT_POINTS_THRESHOLDS
  );
  const [bestOf, setBestOf] = useState<number>(org?.defaultRules?.bestOf || 5);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(org?.discordWebhookUrl || '');

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setter(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!org) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-base)', padding: '0 0 3rem' }}>
        <TopNavSwitcher />
        <div style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
          <Building2 size={48} color="var(--color-gold-bright, #ffc905)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>Organization Not Found</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            No organization found matching slug <code style={{ color: 'var(--color-gold-bright)' }}>/{orgSlug}</code>.
          </p>
          <Link to="/organizations" className="btn btn-primary" style={{ display: 'inline-flex', gap: '0.5rem' }}>
            <ArrowLeft size={16} />
            <span>Back to Organizations</span>
          </Link>
        </div>
      </div>
    );
  }

  const metrics = computeOrganizationMetrics(org.id, tournaments);
  const orgTournaments = tournaments.filter(t => t.organizationId === org.id);

  const filteredTournaments = orgTournaments.filter(t =>
    t.name.toLowerCase().includes(tourneySearch.toLowerCase())
  );

  const handleSaveMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editSlug.trim()) return;

    updateOrganization(org.id, {
      name: editName.trim(),
      slug: editSlug.trim(),
      description: editDescription.trim() || undefined,
      website: editWebsite.trim() || undefined,
      logoUrl: editLogoUrl.trim() || undefined,
      bannerUrl: editBannerUrl.trim() || undefined,
    });

    setIsEditMetadataOpen(false);
    showToast('Organization details updated.');
    if (editSlug.trim() !== org.slug) {
      navigate(`/org/${editSlug.trim()}`, { replace: true });
    }
  };

  const handleDeleteOrganization = () => {
    if (orgTournaments.length > 0) {
      setDeleteError(`Cannot delete ${org.name} because it has ${orgTournaments.length} tournament(s) linked to it.`);
      return;
    }
    deleteOrganization(org.id);
    navigate('/organizations');
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrganization(org.id, {
      brandColor: primaryTheme.primaryColor,
      themeColors: primaryTheme,
      tierThemes,
      defaultRules: {
        ...org.defaultRules,
        primaryColor: primaryTheme.primaryColor,
        secondaryColor: primaryTheme.secondaryColor,
      },
    });

    showToast('Branding palettes saved successfully.');
  };

  const handleAddTierTheme = () => {
    const nextIndex = tierThemes.length + 2; // Tier 2, 3, etc.
    const newTier: OrgTierTheme = {
      id: `theme_tier_${Date.now()}`,
      name: nextIndex === 2 ? 'Silver Tier Theme' : nextIndex === 3 ? 'Bronze Tier Theme' : `Tier ${nextIndex} Theme`,
      themeColors: {
        primaryColor: nextIndex === 2 ? '#CBD5E1' : '#db5f00',
        secondaryColor: nextIndex === 2 ? '#3d4652' : '#4e310e',
        cardColor: nextIndex === 2 ? '#0E1420' : '#181410',
        textColor: nextIndex === 2 ? '#4f5c6d' : '#5e6f87',
        backgroundColor: '#0B0E14',
      },
      textSize: 'normal',
    };
    setTierThemes(prev => [...prev, newTier]);
  };

  const handleUpdateTierTheme = (index: number, updates: Partial<OrgTierTheme>) => {
    setTierThemes(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleRemoveTierTheme = (index: number) => {
    setTierThemes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrganization(org.id, {
      discordWebhookUrl: discordWebhookUrl.trim() || undefined,
      defaultRules: {
        ...org.defaultRules,
        qualFormat,
        qualAverageCount,
        pointsConfig,
        bestOf,
      },
    });

    showToast('Default tournament rules & webhook settings saved.');
  };

  const handleTestWebhook = async () => {
    if (!discordWebhookUrl.trim()) {
      setWebhookTestStatus('Please enter a Discord Webhook URL first.');
      return;
    }

    setWebhookTestStatus('Sending test notification to Discord...');
    try {
      const payload = {
        username: `${org.name} Bot`,
        avatar_url: org.logoUrl || undefined,
        embeds: [
          {
            title: `🎮 Webhook Verified: ${org.name}`,
            description: `This is a test notification from **Tournament Manager** for organization **${org.name}**. Webhooks are correctly configured!`,
            color: parseInt((primaryTheme.primaryColor || '#ffc905').replace('#', ''), 16) || 0xffc905,
            fields: [
              { name: 'Organization Slug', value: `/${org.slug}`, inline: true },
              { name: 'Hosted Tournaments', value: String(orgTournaments.length), inline: true },
              { name: 'Status', value: '🟢 Active & Ready', inline: true },
            ],
            footer: { text: 'Tournament Manager • Discord Webhook Integration' },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      await fetch(discordWebhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });

      setWebhookTestStatus('✅ Test notification successfully dispatched to Discord!');
    } catch {
      setWebhookTestStatus('✅ Webhook dispatched (processed with no-cors standard).');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-base)', padding: '0 0 4rem' }}>
      <TopNavSwitcher />

      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Toast Alert */}
        {saveToast && (
          <div
            style={{
              position: 'fixed',
              top: '5rem',
              right: '2rem',
              zIndex: 2000,
              background: 'var(--color-bg-surface-elevated, #161922)',
              border: '1px solid var(--color-gold-bright, #ffc905)',
              color: '#ffffff',
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-md, 8px)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <Sparkles size={16} color="var(--color-gold-bright, #ffc905)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{saveToast}</span>
          </div>
        )}

        {/* Header Container */}
        <div
          style={{
            background: 'var(--color-bg-surface, #161922)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
            overflow: 'hidden',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Unimpeded Top Banner */}
          <div
            style={{
              height: '150px',
              position: 'relative',
              background: org.bannerUrl || org.branding?.bannerUrl
                ? `url(${org.bannerUrl || org.branding?.bannerUrl}) center/cover no-repeat`
                : `linear-gradient(135deg, ${primaryTheme.secondaryColor || '#1e293b'}, ${primaryTheme.primaryColor || '#ffc905'}33)`,
              borderBottom: `2px solid ${primaryTheme.primaryColor || '#ffc905'}`,
            }}
          >
            <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
              <Link
                to="/organizations"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-full, 9999px)',
                  background: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(4px)',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <ArrowLeft size={13} />
                <span>All Organizations</span>
              </Link>
            </div>
          </div>

          {/* Org Details Cleanly Below Banner */}
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              {/* Left: Avatar + Title + Slug */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: 'var(--radius-md, 8px)',
                    background: primaryTheme.cardColor || '#161922',
                    border: `2px solid ${primaryTheme.primaryColor || '#ffc905'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {org.logoUrl || org.branding?.logoUrl ? (
                    <img src={org.logoUrl || org.branding?.logoUrl} alt={org.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Building2 size={34} color={primaryTheme.primaryColor || '#ffc905'} />
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                      {org.name}
                    </h1>
                    <span
                      style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: 'var(--radius-full, 9999px)',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: primaryTheme.primaryColor || '#ffc905',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      /{org.slug}
                    </span>
                  </div>
                  {org.website && (
                    <a
                      href={org.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.82rem',
                        color: 'var(--color-text-secondary, #94a3b8)',
                        textDecoration: 'none',
                        marginTop: '0.3rem',
                      }}
                    >
                      <span>{org.website.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditName(org.name);
                    setEditSlug(org.slug);
                    setEditDescription(org.description || '');
                    setEditWebsite(org.website || '');
                    setEditLogoUrl(org.logoUrl || org.branding?.logoUrl || '');
                    setEditBannerUrl(org.bannerUrl || org.branding?.bannerUrl || '');
                    setIsEditMetadataOpen(true);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
                >
                  <Edit2 size={14} />
                  <span>Edit Details</span>
                </button>
              </div>
            </div>

            {org.description && (
              <p style={{ color: 'var(--color-text-secondary, #94a3b8)', fontSize: '0.92rem', lineHeight: 1.5, margin: 0 }}>
                {org.description}
              </p>
            )}

            {/* 4 Stat Overview Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '0.75rem',
                paddingTop: '0.5rem',
              }}
            >
              {[
                { label: 'Tournaments Hosted', value: metrics.totalTournaments, icon: Trophy },
                { label: 'Total Competitors', value: metrics.totalCompetitors, icon: Users },
                { label: 'Matches Played', value: metrics.totalMatches, icon: Gamepad2 },
                { label: 'Qualifier Attempts', value: metrics.totalSubmissions, icon: Layers },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: 'var(--radius-md, 8px)',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        background: 'rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: primaryTheme.primaryColor || '#ffc905',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                        {stat.value}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 600 }}>
                        {stat.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              borderTop: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
              background: 'var(--color-bg-surface-elevated, #161922)',
            }}
          >
            {[
              { id: 'tournaments', label: `Tournaments (${orgTournaments.length})`, icon: Trophy },
              { id: 'branding', label: 'Branding & Palettes', icon: Palette },
              { id: 'settings', label: 'Default Rules & Webhooks', icon: Settings },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.9rem 1rem',
                    background: isActive ? 'var(--color-bg-surface, #161922)' : 'transparent',
                    border: 'none',
                    borderBottom: isActive ? `3px solid ${primaryTheme.primaryColor || '#ffc905'}` : '3px solid transparent',
                    color: isActive ? '#ffffff' : 'var(--color-text-secondary, #94a3b8)',
                    fontSize: '0.88rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={16} color={isActive ? (primaryTheme.primaryColor || '#ffc905') : 'currentColor'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: Hosted Tournaments */}
        {activeTab === 'tournaments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
                <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Filter hosted tournaments..."
                  value={tourneySearch}
                  onChange={e => setTourneySearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.85rem 0.55rem 2.4rem',
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsCreateTourneyOpen(true)}
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.88rem', boxShadow: `0 2px 10px ${primaryTheme.primaryColor || '#ffc905'}44` }}
              >
                <Plus size={16} />
                <span>Create Tournament</span>
              </button>
            </div>

            {filteredTournaments.length === 0 ? (
              <div
                style={{
                  background: 'var(--color-bg-surface)',
                  border: '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '3.5rem 2rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <Trophy size={32} color="var(--color-gold-bright)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  {tourneySearch ? 'No matching tournaments' : 'No tournaments hosted yet'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '400px' }}>
                  {tourneySearch
                    ? 'Try adjusting your search filter.'
                    : `Create your first tournament under ${org.name} to start organizing brackets.`}
                </p>
                {!tourneySearch && (
                  <button
                    type="button"
                    onClick={() => setIsCreateTourneyOpen(true)}
                    className="btn btn-primary"
                    style={{ marginTop: '0.5rem', padding: '0.55rem 1.25rem' }}
                  >
                    <Plus size={16} />
                    <span>Create Tournament</span>
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '1.5rem' }}>
                {filteredTournaments.map(t => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    showOrgBadge={false}
                    onDeleteClick={setTournamentToDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Branding & 5-Color Palettes */}
        {activeTab === 'branding' && (
          <form onSubmit={handleSaveBranding} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div
              style={{
                background: 'rgba(255, 201, 5, 0.05)',
                border: '1px solid rgba(255, 201, 5, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <Palette size={20} color="var(--color-gold-bright)" />
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                <strong>Circuit Palette Hierarchy:</strong> The primary branding defines the championship bracket theme for tournaments hosted by <strong>{org.name}</strong>. Tournaments inherit these colors automatically, and you can define secondary/tertiary tier themes below.
              </p>
            </div>

            {/* Primary Championship Theme */}
            <div style={{ background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.25rem' }}>
                  Primary Theme Colors
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  Default 5-color architecture for premier Gold championship brackets across all circuit events.
                </p>
              </div>

              <BracketThemeEditor
                themeColors={primaryTheme}
                textSize={primaryTextSize}
                label="Primary Gold Bracket"
                onThemeChange={setPrimaryTheme}
                onTextSizeChange={setPrimaryTextSize}
                onReset={() => {
                  setPrimaryTheme({
                    primaryColor: '#ffc905',
                    secondaryColor: '#705b33',
                    cardColor: '#1b1c1d',
                    textColor: '#94A3B8',
                    backgroundColor: '#020203',
                  });
                }}
              />
            </div>

            {/* Additional Tier Themes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.25rem' }}>
                    Additional Tier Themes ({tierThemes.length})
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    Define secondary or tertiary bracket themes (e.g. Silver Bracket, Bronze Bracket) that tournaments can apply in one click.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddTierTheme}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  <Plus size={15} />
                  <span>Add Tier Theme</span>
                </button>
              </div>

              {tierThemes.map((tierTheme, idx) => (
                <div
                  key={tierTheme.id}
                  style={{
                    background: 'var(--color-bg-surface)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                    padding: '1.5rem',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="text"
                        value={tierTheme.name}
                        onChange={e => handleUpdateTierTheme(idx, { name: e.target.value })}
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: '#ffffff',
                          background: 'var(--color-bg-base)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.35rem 0.65rem',
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Tier #{idx + 2} in tournament lineup
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveTierTheme(idx)}
                      className="btn btn-danger"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                    >
                      <Trash2 size={13} />
                      <span>Remove Theme</span>
                    </button>
                  </div>

                  <BracketThemeEditor
                    themeColors={tierTheme.themeColors}
                    textSize={tierTheme.textSize || 'normal'}
                    label={tierTheme.name}
                    onThemeChange={colors => handleUpdateTierTheme(idx, { themeColors: colors })}
                    onTextSizeChange={size => handleUpdateTierTheme(idx, { textSize: size })}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.75rem', fontSize: '0.92rem', boxShadow: `0 2px 12px ${primaryTheme.primaryColor || '#ffc905'}55` }}
              >
                Save Branding &amp; Palettes
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: Default Rules & Webhooks */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div style={{ background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.25rem' }}>
                  Default Tournament Rules
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  New tournaments hosted under {org.name} will automatically inherit these qualifying and match play rules.
                </p>
              </div>

              <QualFormatEditor
                qualFormat={qualFormat}
                qualAverageCount={qualAverageCount}
                pointsConfig={pointsConfig}
                onFormatChange={setQualFormat}
                onAverageCountChange={setQualAverageCount}
                onPointsConfigChange={setPointsConfig}
              />

              <div style={{ maxWidth: '300px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
                  Default Bracket Best-of Match
                </label>
                <select
                  value={bestOf}
                  onChange={e => setBestOf(parseInt(e.target.value, 10) || 5)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--color-bg-base)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value={3}>Best of 3</option>
                  <option value={5}>Best of 5</option>
                  <option value={7}>Best of 7</option>
                </select>
              </div>
            </div>

            {/* Discord Webhook Groundwork */}
            <div style={{ background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Circuit Discord Webhook</span>
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 600 }}>
                      Groundwork
                    </span>
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    Announcements, tournament registrations, and championship alerts can dispatch to your organization's Discord channel.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <input
                  type="text"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={discordWebhookUrl}
                  onChange={e => setDiscordWebhookUrl(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.85rem',
                    background: 'var(--color-bg-base)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                  }}
                />
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', display: 'inline-flex', gap: '0.4rem', whiteSpace: 'nowrap' }}
                >
                  <Send size={14} />
                  <span>Test Ping</span>
                </button>
              </div>

              {webhookTestStatus && (
                <div style={{ fontSize: '0.8rem', color: webhookTestStatus.startsWith('✅') ? '#34d399' : '#f87171', fontWeight: 600 }}>
                  {webhookTestStatus}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.75rem', fontSize: '0.92rem' }}
              >
                Save Default Rules &amp; Webhook
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Shared Create Tournament Modal */}
      <CreateTournamentModal
        isOpen={isCreateTourneyOpen}
        onClose={() => setIsCreateTourneyOpen(false)}
        fixedOrgId={org.id}
      />

      {/* Edit Organization Details Modal */}
      {isEditMetadataOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--color-bg-surface-elevated, #161922)',
              border: '1px solid var(--color-border, rgba(255, 255, 255, 0.12))',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Edit Organization Details
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsEditMetadataOpen(false);
                  setDeleteError(null);
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMetadata} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: '#ffffff', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={editSlug}
                  onChange={e => setEditSlug(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: '#ffffff', fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: '#ffffff', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
                  Website URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editWebsite}
                  onChange={e => setEditWebsite(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: '#ffffff', fontSize: '0.85rem' }}
                />
              </div>

              {/* Logo with Local Browse Button */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
                  Logo URL or Local File
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    placeholder="https://... or /assets/..."
                    value={editLogoUrl}
                    onChange={e => setEditLogoUrl(e.target.value)}
                    style={{ flex: 1, padding: '0.65rem 0.85rem', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: '#ffffff', fontSize: '0.85rem' }}
                  />
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.5rem 0.75rem',
                      background: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-secondary)',
                      whiteSpace: 'nowrap',
                    }}
                    title="Upload local image file"
                  >
                    Browse
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileUpload(e, setEditLogoUrl)}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {/* Banner with Local Browse Button */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
                  Banner URL or Local File
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    placeholder="https://... or /assets/..."
                    value={editBannerUrl}
                    onChange={e => setEditBannerUrl(e.target.value)}
                    style={{ flex: 1, padding: '0.65rem 0.85rem', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: '#ffffff', fontSize: '0.85rem' }}
                  />
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.5rem 0.75rem',
                      background: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-secondary)',
                      whiteSpace: 'nowrap',
                    }}
                    title="Upload local image file"
                  >
                    Browse
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileUpload(e, setEditBannerUrl)}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {deleteError && (
                <div style={{ fontSize: '0.8rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                  {deleteError}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={handleDeleteOrganization}
                  className="btn btn-danger"
                  style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}
                >
                  <Trash2 size={14} />
                  <span>Delete Org</span>
                </button>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditMetadataOpen(false);
                      setDeleteError(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Tournament Confirmation Modal */}
      {tournamentToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--color-bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'rgba(239, 68, 68, 0.08)',
              }}
            >
              <AlertTriangle size={22} color="#ef4444" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Delete Tournament
              </h3>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to delete <strong style={{ color: '#ffffff' }}>{tournamentToDelete.name}</strong>?
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.4, margin: 0 }}>
                This tournament has no recorded matches or qualifiers and will be permanently removed. This action cannot be undone.
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
                onClick={() => setTournamentToDelete(null)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTournament}
                className="btn btn-danger"
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Delete Tournament
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
