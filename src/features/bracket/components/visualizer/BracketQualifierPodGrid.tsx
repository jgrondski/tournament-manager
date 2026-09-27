import React from 'react';
import { ACCELERATED_HYBRID_POD_PALETTE } from '../../routingChips';
import { BracketLayoutMetadata } from '../../bracketLayout';
import { BracketRound, SeededPlayer } from '../../types';

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
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
      {/* Top Row: Pod 1 (Accelerated Round) & Pod 2 (Upper Bracket) */}
      <div
        className="qualifier-top-pods"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: '1.75rem',
          width: '100%',
          boxSizing: 'border-box',
          alignItems: 'start',
        }}
      >
        {/* Pod 1: Accelerated Round */}
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
              padding: '0.75rem 1.25rem',
              background: effectiveCardBg,
              borderBottom: `1.5px solid ${secondaryColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  color: primaryColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
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
          <div style={{ padding: '1rem', overflowX: 'auto', overflowY: 'auto' }}>
            {renderCanvas(layoutAccel, accelRounds, true, false, null)}
          </div>
        </div>

        {/* Pod 2: Upper Bracket */}
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
          }}
        >
          <div
            style={{
              padding: '0.75rem 1.25rem',
              background: effectiveCardBg,
              borderBottom: `1.5px solid ${secondaryColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span
                style={{
                  fontSize: '0.85rem',
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
          <div style={{ padding: '1rem', overflowX: 'auto', overflowY: 'auto' }}>
            {renderCanvas(layoutPreMergeUpper, preUpperRounds, true, false, null)}
          </div>
        </div>
      </div>

      {/* Bottom Row: Pod 3: Lower Bracket */}
      <div
        style={{
          background: effectiveCardBg,
          borderTop: `1.5px solid ${secondaryColor}`,
          borderBottom: `1.5px solid ${secondaryColor}`,
          borderLeft: `4px solid ${lowerBracketColor || ACCELERATED_HYBRID_POD_PALETTE.LB.border}`,
          borderRight: `4px solid ${lowerBracketColor || ACCELERATED_HYBRID_POD_PALETTE.LB.border}`,
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <div
          style={{
            padding: '0.75rem 1.25rem',
            background: effectiveCardBg,
            borderBottom: `1.5px solid ${secondaryColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span
              style={{
                fontSize: '0.85rem',
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
        <div style={{ padding: '1rem', overflowX: 'auto', overflowY: 'auto' }}>
          {renderCanvas(layoutLowerBracket, lowerBracketRounds, true, false, null)}
        </div>
      </div>
    </div>
  );
};
