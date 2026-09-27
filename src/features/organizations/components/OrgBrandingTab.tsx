import React from 'react';
import { Palette, Plus, Trash2 } from 'lucide-react';
import { OrgTierTheme } from '../../tournament/types';
import { TierThemeColors } from '../../bracket/colorUtils';
import { BracketThemeEditor } from '../../bracket/components/BracketThemeEditor';

interface OrgBrandingTabProps {
  orgName: string;
  primaryTheme: TierThemeColors;
  primaryTextSize: 'compact' | 'normal' | 'large';
  tierThemes: OrgTierTheme[];
  onPrimaryThemeChange: (theme: TierThemeColors) => void;
  onPrimaryTextSizeChange: (size: 'compact' | 'normal' | 'large') => void;
  onAddTierTheme: () => void;
  onUpdateTierTheme: (index: number, updates: Partial<OrgTierTheme>) => void;
  onRemoveTierTheme: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const OrgBrandingTab: React.FC<OrgBrandingTabProps> = ({
  orgName,
  primaryTheme,
  primaryTextSize,
  tierThemes,
  onPrimaryThemeChange,
  onPrimaryTextSizeChange,
  onAddTierTheme,
  onUpdateTierTheme,
  onRemoveTierTheme,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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
          <strong>Circuit Palette Hierarchy:</strong> The primary branding defines the championship bracket theme for tournaments hosted by <strong>{orgName}</strong>. Tournaments inherit these colors automatically, and you can define secondary/tertiary tier themes below.
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
          onThemeChange={onPrimaryThemeChange}
          onTextSizeChange={onPrimaryTextSizeChange}
          onReset={() => {
            onPrimaryThemeChange({
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
            onClick={onAddTierTheme}
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
                  onChange={e => onUpdateTierTheme(idx, { name: e.target.value })}
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
                onClick={() => onRemoveTierTheme(idx)}
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
              onThemeChange={colors => onUpdateTierTheme(idx, { themeColors: colors })}
              onTextSizeChange={size => onUpdateTierTheme(idx, { textSize: size })}
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
  );
};
