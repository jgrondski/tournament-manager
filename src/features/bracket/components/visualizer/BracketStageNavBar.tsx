import React from 'react';
import { getContrastingTextColor } from '../../colorUtils';
import { ACCELERATED_HYBRID_POD_PALETTE } from '../../routingChips';
import { BracketViewMode } from '../../bracketLayout';

export type HybridStageTab = 'qualifiers' | 'championship' | 'combined' | 'accel' | 'premerge';

interface BracketStageNavBarProps {
  activeHybridTab: HybridStageTab;
  onSelectTab: (tab: HybridStageTab) => void;
  effectiveObsView: BracketViewMode;
  primaryColor: string;
  finalsCutoff?: number;
}

export const BracketStageNavBar: React.FC<BracketStageNavBarProps> = ({
  activeHybridTab,
  onSelectTab,
  effectiveObsView,
  primaryColor,
  finalsCutoff = 16,
}) => {
  return (
    <div
      id="bracket-stage-nav-bar"
      style={{
        position: effectiveObsView === 'fit' ? 'relative' : 'sticky',
        top: effectiveObsView === 'fit' ? 0 : 'var(--bracket-tier-bar-height, 48px)',
        zIndex: 41,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        background: 'rgba(15, 18, 26, 0.88)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0.55rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-muted)',
          }}
        >
          Stage:
        </span>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--color-bg-base)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '3px',
            gap: '4px',
          }}
        >
          {/* Tab 1: Early Rounds */}
          <button
            type="button"
            onClick={() => onSelectTab('qualifiers')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.78rem',
              fontWeight:
                activeHybridTab === 'qualifiers' || activeHybridTab === 'accel' || activeHybridTab === 'premerge'
                  ? 800
                  : 600,
              background:
                activeHybridTab === 'qualifiers' || activeHybridTab === 'accel' || activeHybridTab === 'premerge'
                  ? primaryColor
                  : 'transparent',
              color:
                activeHybridTab === 'qualifiers' || activeHybridTab === 'accel' || activeHybridTab === 'premerge'
                  ? getContrastingTextColor(primaryColor)
                  : 'var(--color-text-secondary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow:
                activeHybridTab === 'qualifiers' || activeHybridTab === 'accel' || activeHybridTab === 'premerge'
                  ? `0 0 10px ${primaryColor}44`
                  : 'none',
            }}
          >
            <span>Early Rounds</span>
          </button>

          {/* Tab 2: Top C */}
          <button
            type="button"
            onClick={() => onSelectTab('championship')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.78rem',
              fontWeight: activeHybridTab === 'championship' ? 800 : 600,
              background: activeHybridTab === 'championship' ? primaryColor : 'transparent',
              color:
                activeHybridTab === 'championship'
                  ? getContrastingTextColor(primaryColor)
                  : 'var(--color-text-secondary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeHybridTab === 'championship' ? `0 0 10px ${primaryColor}44` : 'none',
            }}
          >
            <span>Top {finalsCutoff}</span>
          </button>

          {/* Tab 3: Combined View */}
          <button
            type="button"
            onClick={() => onSelectTab('combined')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.78rem',
              fontWeight: activeHybridTab === 'combined' ? 800 : 600,
              background: activeHybridTab === 'combined' ? primaryColor : 'transparent',
              color:
                activeHybridTab === 'combined'
                  ? getContrastingTextColor(primaryColor)
                  : 'var(--color-text-secondary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeHybridTab === 'combined' ? `0 0 10px ${primaryColor}44` : 'none',
            }}
          >
            <span>Combined View</span>
          </button>
        </div>
      </div>

      {/* Embedded Right-Side Compact Dot Badge Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.74rem',
          flexWrap: 'wrap',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: ACCELERATED_HYBRID_POD_PALETTE.AR.border,
              boxShadow: `0 0 6px ${ACCELERATED_HYBRID_POD_PALETTE.AR.glow}`,
            }}
          />
          <span style={{ color: ACCELERATED_HYBRID_POD_PALETTE.AR.text, fontWeight: 700 }}>
            Accelerated
          </span>
        </div>
        <span style={{ color: 'var(--color-border)' }}>|</span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: ACCELERATED_HYBRID_POD_PALETTE.UB.border,
              boxShadow: `0 0 6px ${ACCELERATED_HYBRID_POD_PALETTE.UB.glow}`,
            }}
          />
          <span style={{ color: ACCELERATED_HYBRID_POD_PALETTE.UB.text, fontWeight: 700 }}>
            Upper Bracket
          </span>
        </div>
        <span style={{ color: 'var(--color-border)' }}>|</span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: ACCELERATED_HYBRID_POD_PALETTE.LB.border,
              boxShadow: `0 0 6px ${ACCELERATED_HYBRID_POD_PALETTE.LB.glow}`,
            }}
          />
          <span style={{ color: ACCELERATED_HYBRID_POD_PALETTE.LB.text, fontWeight: 700 }}>
            Lower Bracket
          </span>
        </div>
      </div>
    </div>
  );
};
