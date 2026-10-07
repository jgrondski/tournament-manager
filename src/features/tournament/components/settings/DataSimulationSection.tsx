import React from 'react';
import { CheckCircle2, Sparkles, Play, Trash2 } from 'lucide-react';

import { SeedingMethod } from '../../types';

interface DataSimulationSectionProps {
  seedingMethod?: SeedingMethod;
  manualSeedsCount?: number;
  qualifierCount: number;
  recordedMatchCount: number;
  hasTiers: boolean;
  simFeedback: string | null;
  onSeedQualifiers: () => void;
  onSimulate: () => void;
  onRequestDataAction: (action: 'MATCHES' | 'QUALS' | 'ALL') => void;
}

export const DataSimulationSection: React.FC<DataSimulationSectionProps> = ({
  seedingMethod = 'QUALIFIERS',
  manualSeedsCount = 0,
  qualifierCount,
  recordedMatchCount,
  hasTiers,
  simFeedback,
  onSeedQualifiers,
  onSimulate,
  onRequestDataAction,
}) => {
  const isManual = seedingMethod === 'MANUAL';
  const seedCount = isManual ? manualSeedsCount : qualifierCount;
  const hasSeeds = seedCount > 0;
  const hasRecordedMatches = recordedMatchCount > 0;

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
      <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
          Data Management &amp; Simulation
        </h2>

        {/* Right-aligned Data Status Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '0.3rem 0.65rem',
              background: 'var(--color-bg-surface-elevated)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              {isManual ? 'Registered Seeds' : 'Qualifier Attempts'}
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: seedCount > 0 ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {seedCount}
            </span>
          </div>
          <div
            style={{
              padding: '0.3rem 0.65rem',
              background: 'var(--color-bg-surface-elevated)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Recorded Matches
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: recordedMatchCount > 0 ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {recordedMatchCount}
            </span>
          </div>
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
              {isManual ? 'Generate simulated player seeds or run full tournament matches.' : 'Seed simulated scores or run full tournament matches.'}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onSeedQualifiers}
              disabled={hasSeeds || hasRecordedMatches}
              className="btn btn-secondary"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                opacity: (hasSeeds || hasRecordedMatches) ? 0.45 : 1,
                cursor: (hasSeeds || hasRecordedMatches) ? 'not-allowed' : 'pointer',
              }}
              title={
                hasRecordedMatches
                  ? 'Match play has begun. Clear match scores or all tournament data to re-seed.'
                  : hasSeeds
                  ? (isManual ? 'Manual seeds have already been registered. Clear seeds to re-seed.' : 'Qualifiers have already been seeded. Clear qualifier scores to re-seed.')
                  : (isManual ? 'Generate realistic competitors and manual seed order' : 'Generate realistic competitors and qualifier attempts')
              }
            >
              <Sparkles size={14} style={{ color: 'var(--color-gold-bright)' }} />
              {isManual ? 'Generate Seeds' : 'Seed Qualifiers'}
            </button>

            <button
              type="button"
              onClick={onSimulate}
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
                  : hasSeeds
                  ? (isManual ? 'Lock brackets from current seeds and simulate all match results to champion' : 'Lock brackets from current qualifiers and simulate all match results to champion')
                  : (isManual ? 'Generate seeds, lock brackets, and simulate all tournament matches' : 'Seed qualifiers, lock brackets, and simulate all tournament matches')
              }
            >
              <Play size={14} style={{ color: '#60a5fa' }} />
              {hasSeeds ? 'Simulate Matches' : 'Seed & Simulate'}
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
              {isManual ? 'Clear match results or registered player seeds.' : 'Clear match results or qualifier submissions.'}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => onRequestDataAction('MATCHES')}
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
              onClick={() => onRequestDataAction('QUALS')}
              disabled={seedCount === 0 || hasRecordedMatches}
              className="btn btn-secondary"
              style={{
                padding: '0.38rem 0.75rem',
                fontSize: '0.78rem',
                opacity: (seedCount === 0 || hasRecordedMatches) ? 0.4 : 1,
                cursor: (seedCount === 0 || hasRecordedMatches) ? 'not-allowed' : 'pointer',
              }}
              title={
                hasRecordedMatches
                  ? 'Cannot clear qualifier data while match scores exist. Execute "Clear Matches" first.'
                  : seedCount === 0
                  ? (isManual ? 'No registered seeds to clear' : 'No qualifier scores to clear')
                  : (isManual ? 'Clear all registered player seeds' : 'Clear all qualifier submissions')
              }
            >
              {isManual ? `Clear Seeds (${seedCount})` : `Clear Quals (${seedCount})`}
            </button>

            <button
              type="button"
              onClick={() => onRequestDataAction('ALL')}
              disabled={seedCount === 0 && recordedMatchCount === 0}
              className="btn btn-danger"
              style={{
                padding: '0.38rem 0.75rem',
                fontSize: '0.78rem',
                opacity: (seedCount === 0 && recordedMatchCount === 0) ? 0.4 : 1,
                cursor: (seedCount === 0 && recordedMatchCount === 0) ? 'not-allowed' : 'pointer',
              }}
              title={seedCount === 0 && recordedMatchCount === 0 ? 'No data to clear' : 'Clear all tournament data'}
            >
              <Trash2 size={13} /> Clear All
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
