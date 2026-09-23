import React from 'react';
import { TierThemeColors, getTextScale, getAlternateShade } from '../colorUtils';
import { Palette, Type, RefreshCw } from 'lucide-react';

interface BracketThemeEditorProps {
  themeColors: TierThemeColors;
  textSize?: 'compact' | 'normal' | 'large';
  bestOf?: number;
  label?: string;
  onThemeChange: (colors: TierThemeColors) => void;
  onTextSizeChange?: (textSize: 'compact' | 'normal' | 'large') => void;
  onReset?: () => void;
}

export const BracketThemeEditor: React.FC<BracketThemeEditorProps> = ({
  themeColors,
  textSize = 'normal',
  bestOf = 5,
  label,
  onThemeChange,
  onTextSizeChange,
  onReset,
}) => {
  const priColor = themeColors.primaryColor || '#ffc905';
  const secColor = themeColors.secondaryColor || '#705b33';
  const cardBg = themeColors.cardColor || '#1b1c1d';
  const txtColor = themeColors.textColor || '#94A3B8';
  const canvasBg = themeColors.backgroundColor || '#020203';

  const p1ZebraBg = getAlternateShade(cardBg, -0.06);

  // Dynamic preview text scaling calculations
  const previewTextScale = getTextScale(textSize);
  const previewShelfFontSize = `${(0.64 * previewTextScale).toFixed(3)}rem`;
  const previewSeedDim = Math.max(16, Math.round(18 * previewTextScale));
  const previewSeedFontSize = `${(0.68 * previewTextScale).toFixed(3)}rem`;
  const previewFlagFontSize = `${(0.9 * previewTextScale).toFixed(3)}rem`;
  const previewNameFontSize = `${(0.84 * previewTextScale).toFixed(3)}rem`;
  const previewScoreFontSize = `${(0.88 * previewTextScale).toFixed(3)}rem`;
  const previewScoreMinW = Math.max(18, Math.round(20 * previewTextScale));
  const previewScoreH = Math.max(18, Math.round(20 * previewTextScale));

  const handleColorChange = (field: keyof TierThemeColors, value: string) => {
    onThemeChange({
      ...themeColors,
      [field]: value,
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        padding: '1.25rem',
        background: 'var(--color-bg-surface-elevated, #161922)',
        borderRadius: 'var(--radius-md, 8px)',
        border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08))',
      }}
    >
      {label && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle, rgba(255,255,255,0.06))', paddingBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Palette size={16} color={priColor} />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary, #ffffff)' }}>
              {label}
            </span>
          </div>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', gap: '0.35rem' }}
              title="Reset to default colors"
            >
              <RefreshCw size={11} />
              Reset Defaults
            </button>
          )}
        </div>
      )}

      {/* 1. Color Picker Controls (Full Row) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {/* Primary Accent */}
        <div>
          <label style={colorLabelStyle} title="Primary Accent (Lines, Rings & Winner Glory)">
            Primary Accent
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <input
              type="color"
              value={priColor}
              onChange={e => handleColorChange('primaryColor', e.target.value)}
              style={colorInputStyle}
            />
            <input
              type="text"
              value={priColor}
              onChange={e => handleColorChange('primaryColor', e.target.value)}
              style={hexTextInputStyle}
              placeholder="#ffc905"
            />
          </div>
        </div>

        {/* Secondary Accent */}
        <div>
          <label style={colorLabelStyle} title="Secondary Accent (Dividers & Winner Bg)">
            Secondary Accent
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <input
              type="color"
              value={secColor}
              onChange={e => handleColorChange('secondaryColor', e.target.value)}
              style={colorInputStyle}
            />
            <input
              type="text"
              value={secColor}
              onChange={e => handleColorChange('secondaryColor', e.target.value)}
              style={hexTextInputStyle}
              placeholder="#705b33"
            />
          </div>
        </div>

        {/* Match Card Background */}
        <div>
          <label style={colorLabelStyle} title="Match Card Background (Base)">
            Match Card Bg
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <input
              type="color"
              value={cardBg}
              onChange={e => handleColorChange('cardColor', e.target.value)}
              style={colorInputStyle}
            />
            <input
              type="text"
              value={cardBg}
              onChange={e => handleColorChange('cardColor', e.target.value)}
              style={hexTextInputStyle}
              placeholder="#1b1c1d"
            />
          </div>
        </div>

        {/* Text Color */}
        <div>
          <label style={colorLabelStyle} title="Text & Score Color">
            Text Color
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <input
              type="color"
              value={txtColor}
              onChange={e => handleColorChange('textColor', e.target.value)}
              style={colorInputStyle}
            />
            <input
              type="text"
              value={txtColor}
              onChange={e => handleColorChange('textColor', e.target.value)}
              style={hexTextInputStyle}
              placeholder="#94A3B8"
            />
          </div>
        </div>

        {/* Canvas Background Color */}
        <div>
          <label style={colorLabelStyle} title="Overall Bracket Canvas Background">
            Canvas Bg
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <input
              type="color"
              value={canvasBg}
              onChange={e => handleColorChange('backgroundColor', e.target.value)}
              style={colorInputStyle}
            />
            <input
              type="text"
              value={canvasBg}
              onChange={e => handleColorChange('backgroundColor', e.target.value)}
              style={hexTextInputStyle}
              placeholder="#020203"
            />
          </div>
        </div>
      </div>

      {/* 2. Text Size Scaling Option */}
      {onTextSizeChange && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.65rem 0.85rem',
            background: 'var(--color-bg-base, #0c0d12)',
            borderRadius: 'var(--radius-sm, 6px)',
            border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Type size={15} color={priColor} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-primary, #ffffff)' }}>
              Bracket Match Text Size:
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {(['compact', 'normal', 'large'] as const).map(opt => {
              const isSelected = (textSize || 'normal') === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onTextSizeChange(opt)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                    background: isSelected ? priColor : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? cardBg : 'var(--color-text-secondary, #94a3b8)',
                    border: isSelected ? `1px solid ${priColor}` : '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                    textTransform: 'capitalize',
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. The 3 Live Interactive Match Card Previews */}
      <div
        style={{
          padding: '1.25rem',
          background: canvasBg,
          borderRadius: 'var(--radius-md, 8px)',
          border: `1px solid ${secColor}44`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
        }}
      >
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: txtColor, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>
          Live Bracket Match Previews (Canvas Background: {canvasBg})
        </span>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '1.5rem',
            width: '100%',
          }}
        >
          {/* State 1: Inactive / Pre-Game */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              1. Inactive (Pre-Game)
            </span>
            <div
              style={{
                width: '260px',
                height: '80px',
                borderRadius: '5px',
                background: cardBg,
                border: `1.5px solid ${secColor}`,
                overflow: 'hidden',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ height: '20px', minHeight: '20px', padding: '0 0.55rem', background: cardBg, fontSize: previewShelfFontSize, color: txtColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500, borderBottom: `1.5px solid ${secColor}`, boxSizing: 'border-box', lineHeight: '20px' }}>
                <span>Match #1</span>
                <span>Bo{bestOf}</span>
              </div>
              <div style={{ height: '28px', minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.55rem', background: p1ZebraBg, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                  <span style={{ width: `${previewSeedDim}px`, height: `${previewSeedDim}px`, minWidth: `${previewSeedDim}px`, background: cardBg, border: `1.5px solid ${secColor}`, color: txtColor, fontWeight: 900, fontSize: previewSeedFontSize, fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px' }}>1</span>
                  <span style={{ fontSize: previewFlagFontSize, lineHeight: 1, flexShrink: 0 }}>🇺🇸</span>
                  <span style={{ fontSize: previewNameFontSize, fontWeight: 700, color: txtColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Cheez</span>
                </div>
                <span style={{ width: `${previewScoreMinW}px`, height: `${previewScoreH}px`, minWidth: `${previewScoreMinW}px`, background: cardBg, border: `1.5px solid ${secColor}`, color: txtColor, fontSize: previewScoreFontSize, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px', lineHeight: 1 }}>-</span>
              </div>
              <div style={{ height: '1.5px', minHeight: '1.5px', background: secColor }} />
              <div style={{ height: '28px', minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.55rem', background: cardBg, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                  <span style={{ width: `${previewSeedDim}px`, height: `${previewSeedDim}px`, minWidth: `${previewSeedDim}px`, background: cardBg, border: `1.5px solid ${secColor}`, color: txtColor, fontWeight: 900, fontSize: previewSeedFontSize, fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px' }}>4</span>
                  <span style={{ fontSize: previewFlagFontSize, lineHeight: 1, flexShrink: 0 }}>🇨🇦</span>
                  <span style={{ fontSize: previewNameFontSize, fontWeight: 700, color: txtColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Fractal</span>
                </div>
                <span style={{ width: `${previewScoreMinW}px`, height: `${previewScoreH}px`, minWidth: `${previewScoreMinW}px`, background: cardBg, border: `1.5px solid ${secColor}`, color: txtColor, fontSize: previewScoreFontSize, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px', lineHeight: 1 }}>-</span>
              </div>
            </div>
          </div>

          {/* State 2: Active Match */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: priColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              2. Active (Live Ring)
            </span>
            <div
              style={{
                width: '260px',
                height: '80px',
                borderRadius: '5px',
                background: cardBg,
                border: `2px solid ${priColor}`,
                boxShadow: `0 0 16px ${priColor}55`,
                overflow: 'hidden',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ height: '20px', minHeight: '20px', padding: '0 0.55rem', background: cardBg, fontSize: previewShelfFontSize, color: txtColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500, borderBottom: `1.5px solid ${secColor}`, boxSizing: 'border-box', lineHeight: '20px' }}>
                <span>Match #1</span>
                <span>Bo{bestOf}</span>
              </div>
              <div style={{ height: '28px', minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.55rem', background: p1ZebraBg, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                  <span style={{ width: `${previewSeedDim}px`, height: `${previewSeedDim}px`, minWidth: `${previewSeedDim}px`, background: cardBg, border: `1.5px solid ${priColor}`, color: priColor, fontWeight: 900, fontSize: previewSeedFontSize, fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px' }}>1</span>
                  <span style={{ fontSize: previewFlagFontSize, lineHeight: 1, flexShrink: 0 }}>🇺🇸</span>
                  <span style={{ fontSize: previewNameFontSize, fontWeight: 900, color: priColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Cheez</span>
                </div>
                <span style={{ width: `${previewScoreMinW}px`, height: `${previewScoreH}px`, minWidth: `${previewScoreMinW}px`, background: priColor, border: 'none', color: cardBg, fontSize: previewScoreFontSize, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px', lineHeight: 1 }}>2</span>
              </div>
              <div style={{ height: '1.5px', minHeight: '1.5px', background: secColor }} />
              <div style={{ height: '28px', minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.55rem', background: cardBg, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                  <span style={{ width: `${previewSeedDim}px`, height: `${previewSeedDim}px`, minWidth: `${previewSeedDim}px`, background: cardBg, border: `1.5px solid ${secColor}`, color: txtColor, fontWeight: 900, fontSize: previewSeedFontSize, fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px' }}>4</span>
                  <span style={{ fontSize: previewFlagFontSize, lineHeight: 1, flexShrink: 0 }}>🇨🇦</span>
                  <span style={{ fontSize: previewNameFontSize, fontWeight: 700, color: txtColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Fractal</span>
                </div>
                <span style={{ width: `${previewScoreMinW}px`, height: `${previewScoreH}px`, minWidth: `${previewScoreMinW}px`, background: 'transparent', border: 'none', color: txtColor, fontSize: previewScoreFontSize, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px', lineHeight: 1 }}>1</span>
              </div>
            </div>
          </div>

          {/* State 3: Finished Match */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: priColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              3. Finished (Final Result)
            </span>
            <div
              style={{
                width: '260px',
                height: '80px',
                borderRadius: '5px',
                background: cardBg,
                border: `2px solid ${priColor}`,
                boxShadow: `0 0 16px ${priColor}55`,
                overflow: 'hidden',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ height: '20px', minHeight: '20px', padding: '0 0.55rem', background: cardBg, fontSize: previewShelfFontSize, color: txtColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500, borderBottom: `1.5px solid ${priColor}`, boxSizing: 'border-box', lineHeight: '20px' }}>
                <span>Match #1</span>
                <span>Bo{bestOf}</span>
              </div>
              <div style={{ height: '28px', minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.55rem', background: secColor, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                  <span style={{ width: `${previewSeedDim}px`, height: `${previewSeedDim}px`, minWidth: `${previewSeedDim}px`, background: cardBg, border: `1.5px solid ${priColor}`, color: priColor, fontWeight: 900, fontSize: previewSeedFontSize, fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px' }}>1</span>
                  <span style={{ fontSize: previewFlagFontSize, lineHeight: 1, flexShrink: 0 }}>🇺🇸</span>
                  <span style={{ fontSize: previewNameFontSize, fontWeight: 900, color: priColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Cheez</span>
                </div>
                <span style={{ width: `${previewScoreMinW}px`, height: `${previewScoreH}px`, minWidth: `${previewScoreMinW}px`, background: priColor, border: 'none', color: cardBg, fontSize: previewScoreFontSize, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px', lineHeight: 1 }}>3</span>
              </div>
              <div style={{ height: '1.5px', minHeight: '1.5px', background: priColor }} />
              <div style={{ height: '28px', minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.55rem', background: cardBg, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                  <span style={{ width: `${previewSeedDim}px`, height: `${previewSeedDim}px`, minWidth: `${previewSeedDim}px`, background: cardBg, border: `1.5px solid ${secColor}`, color: txtColor, fontWeight: 900, fontSize: previewSeedFontSize, fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px' }}>4</span>
                  <span style={{ fontSize: previewFlagFontSize, lineHeight: 1, flexShrink: 0 }}>🇨🇦</span>
                  <span style={{ fontSize: previewNameFontSize, fontWeight: 700, color: txtColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Fractal</span>
                </div>
                <span style={{ width: `${previewScoreMinW}px`, height: `${previewScoreH}px`, minWidth: `${previewScoreMinW}px`, background: 'transparent', border: 'none', color: txtColor, fontSize: previewScoreFontSize, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px', lineHeight: 1 }}>1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const colorLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary, #94a3b8)',
  marginBottom: '0.25rem',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const colorInputStyle: React.CSSProperties = {
  width: '34px',
  height: '34px',
  borderRadius: '4px',
  border: 'none',
  cursor: 'pointer',
  background: 'transparent',
  flexShrink: 0,
};

const hexTextInputStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  flex: 1,
  padding: '0.35rem 0.45rem',
  borderRadius: 'var(--radius-sm, 6px)',
  border: '1px solid var(--color-border, rgba(255, 255, 255, 0.12))',
  background: 'var(--color-bg-base, #0c0d12)',
  color: 'var(--color-text-primary, #ffffff)',
  fontSize: '0.8rem',
  fontFamily: 'var(--font-mono, monospace)',
  boxSizing: 'border-box',
};
