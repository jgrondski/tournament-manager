import React, { useState } from 'react';
import { QualFormat, PointsThreshold, DEFAULT_POINTS_THRESHOLDS } from '../types';
import { ClearableNumberInput } from '../../../components/ClearableNumberInput';
import { PointsThresholdsDrawer } from './PointsThresholdsDrawer';
import { Sliders } from 'lucide-react';

interface QualFormatEditorProps {
  qualFormat: QualFormat;
  qualAverageCount?: number;
  pointsConfig?: PointsThreshold[];
  onFormatChange: (format: QualFormat) => void;
  onAverageCountChange: (count: number | undefined) => void;
  onPointsConfigChange: (points: PointsThreshold[]) => void;
  avgCountError?: string | null;
  onAvgCountErrorChange?: (err: string | null) => void;
}

export const QualFormatEditor: React.FC<QualFormatEditorProps> = ({
  qualFormat,
  qualAverageCount = 2,
  pointsConfig = DEFAULT_POINTS_THRESHOLDS,
  onFormatChange,
  onAverageCountChange,
  onPointsConfigChange,
  avgCountError,
  onAvgCountErrorChange,
}) => {
  const [isPointsDrawerOpen, setIsPointsDrawerOpen] = useState(false);

  const handleFormatSelect = (newFmt: QualFormat) => {
    onFormatChange(newFmt);
    if (newFmt === 'POINTS' && (!pointsConfig || pointsConfig.length === 0)) {
      onPointsConfigChange(DEFAULT_POINTS_THRESHOLDS);
    }
  };

  const handleAddThreshold = () => {
    const current = pointsConfig || [];
    onPointsConfigChange([...current, { minScore: 500000, points: 10 }]);
  };

  const handleUpdateThreshold = (index: number, field: keyof PointsThreshold, value: number) => {
    const current = [...(pointsConfig || [])];
    current[index] = { ...current[index], [field]: value };
    onPointsConfigChange(current);
  };

  const handleRemoveThreshold = (index: number) => {
    const current = pointsConfig || [];
    onPointsConfigChange(current.filter((_, i) => i !== index));
  };

  const activePoints = pointsConfig || DEFAULT_POINTS_THRESHOLDS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>
        <div>
          <label style={labelStyle}>Qualifying Format</label>
          <select
            value={qualFormat}
            onChange={e => handleFormatSelect(e.target.value as QualFormat)}
            style={inputStyle}
          >
            <option value="HIGH_SCORE"># of Maxes</option>
            <option value="AVERAGE_OF_X">Average of X Attempts</option>
            <option value="POINTS">Points Threshold System</option>
          </select>
        </div>

        {qualFormat === 'AVERAGE_OF_X' && (
          <div>
            <label style={labelStyle}>Target Attempt Count (X)</label>
            <ClearableNumberInput
              min={1}
              max={10}
              value={qualAverageCount}
              onChange={val => {
                onAverageCountChange(val);
                if (avgCountError && onAvgCountErrorChange) onAvgCountErrorChange(null);
              }}
              error={avgCountError}
              onErrorChange={onAvgCountErrorChange}
              style={inputStyle}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #64748b)', marginTop: '0.25rem', display: 'block' }}>
              e.g. 2 for Average of 2, 3 for Average of 3
            </span>
          </div>
        )}
      </div>

      {qualFormat === 'POINTS' && (
        <div
          style={{
            background: 'var(--color-bg-surface-elevated, #161922)',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-text-primary, #ffffff)' }}>
                Points Threshold System
              </span>
              <span
                style={{
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-full, 999px)',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: 'var(--color-gold-bright, #ffc905)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {activePoints.length} {activePoints.length === 1 ? 'cutoff' : 'cutoffs'} configured
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #64748b)', margin: '0.25rem 0 0 0' }}>
              Attempts award points non-cumulatively based on highest cutoff reached.
              {activePoints.length > 0 && (
                <span style={{ marginLeft: '0.35rem', color: 'var(--color-text-secondary, #94a3b8)' }}>
                  ({[...activePoints].sort((a, b) => b.minScore - a.minScore).slice(0, 4).map(p => `${(p.minScore / 1000).toFixed(0)}k → +${p.points}`).join(', ')}{activePoints.length > 4 ? ', ...' : ''})
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsPointsDrawerOpen(true)}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
          >
            <Sliders size={14} color="var(--color-gold-bright, #ffc905)" />
            Configure Points Cutoffs
          </button>
        </div>
      )}

      <PointsThresholdsDrawer
        isOpen={isPointsDrawerOpen}
        onClose={() => setIsPointsDrawerOpen(false)}
        pointsConfig={activePoints}
        onAddThreshold={handleAddThreshold}
        onUpdateThreshold={handleUpdateThreshold}
        onRemoveThreshold={handleRemoveThreshold}
      />
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary, #94a3b8)',
  marginBottom: '0.35rem',
};

const inputStyle: React.CSSProperties = {
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
