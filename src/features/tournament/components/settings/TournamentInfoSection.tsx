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

      {/* Qualifying Format Controls */}
      <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>
          <div>
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

          {/* Tournament Mode Status Indicator */}
          <div>
            <label style={labelStyle}>Tournament Mode</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              {!isLocked ? (
                <span className="badge badge-gold" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}>
                  <AlertTriangle size={13} /> Qualifiers Mode
                </span>
              ) : (
                <span className="badge badge-green" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}>
                  <ShieldCheck size={13} /> Match Play Mode
                </span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {!isLocked
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
                onQualAverageCountChange(val);
                if (avgCountError) onAvgCountErrorChange(null);
              }}
              error={avgCountError}
              onErrorChange={onAvgCountErrorChange}
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
              onClick={onOpenPointsDrawer}
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
  );
};
