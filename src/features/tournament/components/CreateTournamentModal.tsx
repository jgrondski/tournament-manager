import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../store';
import { useOrganization } from '../../organizations/store';
import { QualFormat, Tournament, DEFAULT_POINTS_THRESHOLDS } from '../types';
import { ClearableNumberInput } from '../../../components/ClearableNumberInput';
import { X, Building2 } from 'lucide-react';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOrgId?: string;
  fixedOrgId?: string;
  onCreated?: (tournament: Tournament) => void;
}

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  isOpen,
  onClose,
  defaultOrgId,
  fixedOrgId,
  onCreated,
}) => {
  const { createTournament } = useTournament();
  const { organizations, getOrganizationById } = useOrganization();
  const navigate = useNavigate();

  const initialOrgId = fixedOrgId || defaultOrgId || organizations[0]?.id || 'org_ctwc';
  const [newTourneyOrgId, setNewTourneyOrgId] = useState<string>(initialOrgId);
  const [newTourneyName, setNewTourneyName] = useState('');
  const [newTourneySlug, setNewTourneySlug] = useState('');
  const [newTourneyDate, setNewTourneyDate] = useState('');
  const [newTourneyLocation, setNewTourneyLocation] = useState('');
  const [newTourneyFormat, setNewTourneyFormat] = useState<QualFormat>('AVERAGE_OF_X');
  const [newTourneyAvgCount, setNewTourneyAvgCount] = useState<number | undefined>(2);
  const [avgCountError, setAvgCountError] = useState<string | null>(null);

  // Sync with fixedOrgId or organizations loading
  useEffect(() => {
    const targetId = fixedOrgId || defaultOrgId || organizations[0]?.id || 'org_ctwc';
    setNewTourneyOrgId(targetId);

    const org = getOrganizationById(targetId);
    if (org?.defaultRules) {
      if (org.defaultRules.qualFormat) setNewTourneyFormat(org.defaultRules.qualFormat);
      if (org.defaultRules.qualAverageCount) setNewTourneyAvgCount(org.defaultRules.qualAverageCount);
    }
  }, [fixedOrgId, defaultOrgId, organizations, getOrganizationById]);

  // When selected org changes (in non-fixed mode), inherit default rules
  const handleOrgChange = (orgId: string) => {
    setNewTourneyOrgId(orgId);
    const org = getOrganizationById(orgId);
    if (org?.defaultRules) {
      if (org.defaultRules.qualFormat) setNewTourneyFormat(org.defaultRules.qualFormat);
      if (org.defaultRules.qualAverageCount) setNewTourneyAvgCount(org.defaultRules.qualAverageCount);
    }
  };

  const handleNameChange = (name: string) => {
    setNewTourneyName(name);
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    setNewTourneySlug(slug);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTourneyName.trim() || !newTourneySlug.trim()) return;

    let parsedAvgCount = 2;
    if (newTourneyFormat === 'AVERAGE_OF_X') {
      if (newTourneyAvgCount === undefined || isNaN(newTourneyAvgCount) || newTourneyAvgCount < 1) {
        setAvgCountError('Please enter a valid attempt count (minimum 1)');
        return;
      }
      parsedAvgCount = newTourneyAvgCount;
    }

    const org = getOrganizationById(newTourneyOrgId);

    const created = createTournament({
      name: newTourneyName.trim(),
      slug: newTourneySlug.trim(),
      organizationId: newTourneyOrgId,
      date: newTourneyDate.trim() || 'Upcoming',
      location: newTourneyLocation.trim() || 'TBD',
      qualFormat: newTourneyFormat,
      qualAverageCount: parsedAvgCount,
      pointsConfig: newTourneyFormat === 'POINTS'
        ? (org?.defaultRules?.pointsConfig || DEFAULT_POINTS_THRESHOLDS)
        : undefined,
      isLocked: false,
      tiers: [],
      useOrgBranding: true,
    });

    onClose();
    if (onCreated) {
      onCreated(created);
    } else {
      navigate(`/${created.slug}/manage/settings`);
    }
  };

  if (!isOpen) return null;

  const currentOrg = getOrganizationById(newTourneyOrgId);

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
          background: 'var(--color-bg-surface, #131722)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--color-border, rgba(255, 255, 255, 0.12))',
          maxWidth: '500px',
          width: '100%',
          boxShadow: 'var(--shadow-lg, 0 20px 40px rgba(0,0,0,0.6))',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            background: 'var(--color-bg-surface-elevated, #1a202c)',
            borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.12))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            Create New Tournament
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted, #64748b)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreateSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Host Organization Selector */}
          <div>
            <label style={modalLabelStyle}>Host Organization</label>
            {fixedOrgId ? (
              <div
                style={{
                  ...modalInputStyle,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: 'var(--color-text-primary, #ffffff)',
                  fontWeight: 600,
                }}
              >
                <Building2 size={16} color="var(--color-gold-bright, #ffc905)" />
                <span>{currentOrg?.name || 'Current Organization'} ({currentOrg?.shortName || currentOrg?.slug})</span>
              </div>
            ) : (
              <select
                value={newTourneyOrgId}
                onChange={e => handleOrgChange(e.target.value)}
                style={modalInputStyle}
              >
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.shortName || org.slug})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label style={modalLabelStyle}>Tournament Name</label>
            <input
              type="text"
              value={newTourneyName}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. St. Louis Open 2026"
              required
              style={modalInputStyle}
            />
          </div>

          <div>
            <label style={modalLabelStyle}>URL Slug</label>
            <input
              type="text"
              value={newTourneySlug}
              onChange={e => setNewTourneySlug(e.target.value)}
              required
              style={modalInputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={modalLabelStyle}>Event Date</label>
              <input
                type="text"
                value={newTourneyDate}
                onChange={e => setNewTourneyDate(e.target.value)}
                placeholder="e.g. April 12, 2026"
                style={modalInputStyle}
              />
            </div>
            <div>
              <label style={modalLabelStyle}>Location</label>
              <input
                type="text"
                value={newTourneyLocation}
                onChange={e => setNewTourneyLocation(e.target.value)}
                placeholder="e.g. St. Louis, MO"
                style={modalInputStyle}
              />
            </div>
          </div>

          <div>
            <label style={modalLabelStyle}>Qualifying Format</label>
            <select
              value={newTourneyFormat}
              onChange={e => setNewTourneyFormat(e.target.value as QualFormat)}
              style={modalInputStyle}
            >
              <option value="AVERAGE_OF_X">Average of X Attempts</option>
              <option value="HIGH_SCORE"># of Maxes</option>
              <option value="POINTS">Points Threshold System</option>
            </select>
          </div>

          {newTourneyFormat === 'AVERAGE_OF_X' && (
            <div>
              <label style={modalLabelStyle}>Target Attempt Count (X)</label>
              <ClearableNumberInput
                min={1}
                max={10}
                value={newTourneyAvgCount}
                onChange={val => {
                  setNewTourneyAvgCount(val);
                  if (avgCountError) setAvgCountError(null);
                }}
                error={avgCountError}
                onErrorChange={setAvgCountError}
                style={modalInputStyle}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create &amp; Configure
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const modalLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary, #94a3b8)',
  marginBottom: '0.35rem',
};

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.75rem',
  borderRadius: 'var(--radius-sm, 6px)',
  border: '1px solid var(--color-border, rgba(255, 255, 255, 0.12))',
  background: 'var(--color-bg-base, #0c0d12)',
  color: 'var(--color-text-primary, #ffffff)',
  fontSize: '0.85rem',
  outline: 'none',
  boxSizing: 'border-box',
};
