import React from 'react';
import { ACCELERATED_HYBRID_POD_PALETTE } from '../../routingChips';
import { BracketLayoutMetadata } from '../../bracketLayout';
import { BracketRound, SeededPlayer } from '../../types';
import { BracketViewMode } from '../../layout/types';

interface BracketQualifierPodGridProps {
  effectiveCardBg: string;
  secondaryColor: string;
  primaryColor: string;
  lowerBracketColor?: string;
  layoutAccel: BracketLayoutMetadata;
  accelRounds: BracketRound[];
  layoutPreMergeUpper: BracketLayoutMetadata;
  preUpperRounds: BracketRound[];
  layoutLowerBracket: BracketLayoutMetadata;
  lowerBracketRounds: BracketRound[];
  renderCanvas: (
    targetLayout: BracketLayoutMetadata,
    targetRounds: BracketRound[],
    isPhase1View?: boolean,
    isPhase2View?: boolean,
    targetChampPlayer?: SeededPlayer | null
  ) => React.ReactNode;
  effectiveObsView?: BracketViewMode;
}

export const BracketQualifierPodGrid: React.FC<BracketQualifierPodGridProps> = ({
  effectiveCardBg,
  secondaryColor,
  primaryColor,
  lowerBracketColor,
  layoutAccel,
  accelRounds,
  layoutPreMergeUpper,
  preUpperRounds,
  layoutLowerBracket,
  lowerBracketRounds,
  renderCanvas,
  effectiveObsView,
}) => {
  const isSideBySide = effectiveObsView === 'fit' || effectiveObsView === 'split';
  const effectiveLbColor = lowerBracketColor || ACCELERATED_HYBRID_POD_PALETTE.LB.border;

  const renderPod1 = () => (
    <div
      style={{
        background: effectiveCardBg,
        borderTop: `1.5px solid ${secondaryColor}`,
        borderBottom: `1.5px solid ${secondaryColor}`,
        borderLeft: `4px solid ${ACCELERATED_HYBRID_POD_PALETTE.AR.border}`,
        borderRight: `4px solid ${ACCELERATED_HYBRID_POD_PALETTE.AR.border}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '0.65rem 0.85rem',
          background: effectiveCardBg,
          borderBottom: `1.5px solid ${secondaryColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 900,
              color: primaryColor,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              whiteSpace: 'nowrap',
            }}
          >
            Pod 1: Accelerated Round
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '0.15rem 0.45rem',
              borderRadius: '3px',
              background: ACCELERATED_HYBRID_POD_PALETTE.AR.badgeBg,
              color: ACCELERATED_HYBRID_POD_PALETTE.AR.text,
              border: `1px solid ${ACCELERATED_HYBRID_POD_PALETTE.AR.border}88`,
            }}
          >
            AR
          </span>
        </div>
      </div>
      <div style={{ padding: '0.5rem 0.375rem', display: 'flex', justifyContent: 'center' }}>
        {renderCanvas(layoutAccel, accelRounds, true, false, null)}
      </div>
    </div>
  );

  const renderPod2 = () => (
    <div
      style={{
        background: effectiveCardBg,
        borderTop: `1.5px solid ${secondaryColor}`,
        borderBottom: `1.5px solid ${secondaryColor}`,
        borderLeft: `4px solid ${ACCELERATED_HYBRID_POD_PALETTE.UB.border}`,
        borderRight: `4px solid ${ACCELERATED_HYBRID_POD_PALETTE.UB.border}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: `${(layoutPreMergeUpper?.totalWidth || 1168) + 24}px`,
      }}
    >
      <div
        style={{
          padding: '0.65rem 1rem',
          background: effectiveCardBg,
          borderBottom: `1.5px solid ${secondaryColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 900,
              color: primaryColor,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Pod 2: Upper Bracket
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '0.15rem 0.45rem',
              borderRadius: '3px',
              background: ACCELERATED_HYBRID_POD_PALETTE.UB.badgeBg,
              color: ACCELERATED_HYBRID_POD_PALETTE.UB.text,
              border: `1px solid ${ACCELERATED_HYBRID_POD_PALETTE.UB.border}88`,
            }}
          >
            UB
          </span>
        </div>
      </div>
      <div
        style={{
          padding: '0.5rem 0.25rem',
          overflowX: effectiveObsView === 'fit' ? 'hidden' : 'auto',
          overflowY: 'hidden',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: 'fit-content', minWidth: 'max-content', margin: '0 auto' }}>
          {renderCanvas(layoutPreMergeUpper, preUpperRounds, true, false, null)}
        </div>
      </div>
    </div>
  );

  const renderPod3 = () => (
    <div
      style={{
        background: effectiveCardBg,
        borderTop: `1.5px solid ${secondaryColor}`,
        borderBottom: `1.5px solid ${secondaryColor}`,
        borderLeft: `4px solid ${effectiveLbColor}`,
        borderRight: `4px solid ${effectiveLbColor}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: isSideBySide ? undefined : '100%',
        minWidth: isSideBySide ? `${(layoutLowerBracket?.totalWidth || 1172) + 24}px` : undefined,
      }}
    >
      <div
        style={{
          padding: '0.65rem 1rem',
          background: effectiveCardBg,
          borderBottom: `1.5px solid ${secondaryColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 900,
              color: primaryColor,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Pod 3: Lower Bracket
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '0.15rem 0.45rem',
              borderRadius: '3px',
              background: ACCELERATED_HYBRID_POD_PALETTE.LB.badgeBg,
              color: ACCELERATED_HYBRID_POD_PALETTE.LB.text,
              border: `1px solid ${ACCELERATED_HYBRID_POD_PALETTE.LB.border}88`,
            }}
          >
            LB
          </span>
        </div>
      </div>
      <div
        style={{
          padding: '0.5rem 0.25rem',
          overflowX: effectiveObsView === 'fit' ? 'hidden' : 'auto',
          overflowY: 'hidden',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: 'fit-content', minWidth: 'max-content', margin: '0 auto' }}>
          {renderCanvas(layoutLowerBracket, lowerBracketRounds, true, false, null)}
        </div>
      </div>
    </div>
  );

  if (isSideBySide) {
    return (
      <div
        className="qualifier-side-by-side-pods"
        style={{
          display: 'grid',
          gridTemplateColumns: `max-content minmax(${(layoutPreMergeUpper?.totalWidth || 1168) + 24}px, 1fr) minmax(${(layoutLowerBracket?.totalWidth || 1172) + 24}px, 1fr)`,
          gap: '1.25rem',
          width: '100%',
          boxSizing: 'border-box',
          alignItems: 'stretch',
        }}
      >
        {renderPod1()}
        {renderPod2()}
        {renderPod3()}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
      {/* Top Row: Pod 1 (Accelerated Round: compact) & Pod 2 (Upper Bracket: fills remaining space) */}
      <div
        className="qualifier-top-pods"
        style={{
          display: 'grid',
          gridTemplateColumns: `max-content minmax(${(layoutPreMergeUpper?.totalWidth || 1168) + 24}px, 1fr)`,
          gap: '1.25rem',
          width: '100%',
          boxSizing: 'border-box',
          alignItems: 'stretch',
        }}
      >
        {renderPod1()}
        {renderPod2()}
      </div>

      {/* Bottom Row: Pod 3: Lower Bracket */}
      {renderPod3()}
    </div>
  );
};
