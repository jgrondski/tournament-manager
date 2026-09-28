import React from 'react';
import { Shield, AlertTriangle, ShieldCheck, Sliders } from 'lucide-react';
import { QualFormat, PointsThreshold, DEFAULT_POINTS_THRESHOLDS } from '../../types';
import { ClearableNumberInput } from '../../../../components/ClearableNumberInput';
import { labelStyle, inputStyle } from './types';

interface TournamentInfoSectionProps {
  name: string;
  slug: string;
  date: string;
  location: string;
  qualFormat: QualFormat;
  qualAverageCount?: number;
  avgCountError: string | null;
  pointsConfig: PointsThreshold[];
  isLocked: boolean;
  onNameChange: (name: string) => void;
  onSlugChange: (slug: string) => void;
  onDateChange: (date: string) => void;
  onLocationChange: (loc: string) => void;
  onQualFormatChange: (fmt: QualFormat) => void;
  onQualAverageCountChange: (count: number | undefined) => void;
  onAvgCountErrorChange: (err: string | null) => void;
  onPointsConfigChange: (config: PointsThreshold[]) => void;
  onOpenPointsDrawer: () => void;
}

export const TournamentInfoSection: React.FC<TournamentInfoSectionProps> = ({
  name,
  slug,
  date,
  location,
  qualFormat,
  qualAverageCount,
  avgCountError,
  pointsConfig,
  isLocked,
  onNameChange,
  onSlugChange,
  onDateChange,
  onLocationChange,
  onQualFormatChange,
  onQualAverageCountChange,
  onAvgCountErrorChange,
  onPointsConfigChange,
  onOpenPointsDrawer,
}) => {
  return (
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={18} color="var(--color-gold-bright)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
            Tournament Details
          </h2>
        </div>

        {/* Tournament Mode Status Indicator in Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {!isLocked ? (
            <span className="badge badge-gold" style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }} title="Qualifiers active. Brackets dynamically seed.">
              <AlertTriangle size={12} /> Qualifiers Mode
            </span>
          ) : (
            <span className="badge badge-green" style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }} title="Brackets locked. Live match scoring active.">
              <ShieldCheck size={12} /> Match Play Mode
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
        <div>
          <label style={labelStyle}>Tournament Name</label>
          <input
            type="text"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>URL Slug</label>
          <input
            type="text"
            value={slug}
            onChange={e => onSlugChange(e.target.value)}
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
            onChange={e => onDateChange(e.target.value)}
            placeholder="e.g. March 21-22, 2026"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Location</label>
          <input
            type="text"
            value={location}
            onChange={e => onLocationChange(e.target.value)}
            placeholder="e.g. Kansas City, MO"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Qualifying Format Controls: Strictly Single Row */}
      <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', width: '100%' }}>
          {/* Format Selection Dropdown */}
          <div style={{ flex: '0 0 240px', minWidth: '200px' }}>
            <label style={labelStyle}>Qualifying Format</label>
            <select
              value={qualFormat}
              onChange={e => {
                const newFmt = e.target.value as QualFormat;
                onQualFormatChange(newFmt);
                if (newFmt === 'POINTS' && (!pointsConfig || pointsConfig.length === 0)) {
                  onPointsConfigChange(DEFAULT_POINTS_THRESHOLDS);
                }
              }}
              style={inputStyle}
            >
              <option value="HIGH_SCORE"># of Maxes</option>
              <option value="AVERAGE_OF_X">Average of X Attempts</option>
              <option value="POINTS">Points Threshold System</option>
            </select>
          </div>

          {/* Conditional format inline settings on the exact same row */}
          {qualFormat === 'HIGH_SCORE' && (
            <div style={{ flex: 1, minWidth: 0, marginTop: '1.45rem', display: 'flex', alignItems: 'center', height: '38px', color: 'var(--color-text-muted)', fontSize: '0.8rem', background: 'var(--color-bg-surface-elevated)', padding: '0 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
              <span>Ranked by highest game score; ties broken by total maxout count.</span>
            </div>
          )}

          {qualFormat === 'AVERAGE_OF_X' && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <div style={{ width: '150px', flexShrink: 0 }}>
                <label style={labelStyle}>Attempts (X)</label>
                <ClearableNumberInput
                  min={1}
                  max={10}
                  value={qualAverageCount}
                  onChange={val => {
                    onQualAverageCountChange(val);
                    if (avgCountError) onAvgCountErrorChange(null);
                  }}
                  error={avgCountError}
                  onErrorChange={onAvgCountErrorChange}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0, marginTop: '1.45rem', display: 'flex', alignItems: 'center', height: '38px', fontSize: '0.8rem', color: 'var(--color-text-muted)', background: 'var(--color-bg-surface-elevated)', padding: '0 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
                <span>Ranked by average of top {qualAverageCount || 'X'} qualifying attempts.</span>
              </div>
            </div>
          )}

          {qualFormat === 'POINTS' && (
            <div style={{ flex: 1, minWidth: 0, marginTop: '1.45rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', height: '38px', background: 'var(--color-bg-surface-elevated)', padding: '0 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gold-bright)', background: 'rgba(245, 158, 11, 0.15)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}>
                  {pointsConfig.length} {pointsConfig.length === 1 ? 'cutoff' : 'cutoffs'}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pointsConfig.length > 0
                    ? [...pointsConfig].sort((a, b) => b.minScore - a.minScore).slice(0, 3).map(p => `${(p.minScore / 1000).toFixed(0)}k → +${p.points}`).join(', ') + (pointsConfig.length > 3 ? ', ...' : '')
                    : 'Attempts award points by highest cutoff reached.'}
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenPointsDrawer}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.76rem', gap: '0.35rem', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                <Sliders size={13} color="var(--color-gold-bright)" />
                Configure Cutoffs
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
