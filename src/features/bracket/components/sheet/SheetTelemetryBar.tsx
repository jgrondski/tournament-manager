import React from 'react';
import { Filter, Check, ChevronDown, Clock, CheckCircle2, Search, Trophy } from 'lucide-react';
import { colorWithAlpha, getAlternateShade, getContrastingTextColor } from '../../colorUtils';
import { SheetDensitySize } from '../../sheetUtils';

interface SheetTelemetryBarProps {
  tournamentName: string;
  tierName: string;
  primaryColor: string;
  secondaryColor: string;
  cardColor: string;
  searchTerm: string;
  onSearchTermChange: (val: string) => void;
  selectedRoundFilter: 'ALL' | 'IN_PROGRESS' | 'COMPLETE' | string[];
  isFilterDropdownOpen: boolean;
  onToggleFilterDropdown: () => void;
  onSelectFilterPreset: (preset: 'ALL' | 'IN_PROGRESS' | 'COMPLETE') => void;
  onToggleRoundFilter: (roundName: string) => void;
  roundNames: string[];
  telemetry: { total: number; completed: number; inProgress: number };
  sheetSize: SheetDensitySize;
  onSizeChange: (newSize: SheetDensitySize) => void;
}

export const SheetTelemetryBar: React.FC<SheetTelemetryBarProps> = ({
  tournamentName,
  tierName,
  primaryColor,
  secondaryColor,
  cardColor,
  searchTerm,
  onSearchTermChange,
  selectedRoundFilter,
  isFilterDropdownOpen,
  onToggleFilterDropdown,
  onSelectFilterPreset,
  onToggleRoundFilter,
  roundNames,
  telemetry,
  sheetSize,
  onSizeChange,
}) => {
  return (
    <>
      {/* Tournament Name & Bracket Header - Left-aligned with the table */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          marginBottom: '0.4rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--color-gold-bright)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Master Organizer Sheet
          </span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>•</span>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: primaryColor || 'var(--color-gold-bright)',
            }}
          >
            {tierName}
          </span>
        </div>
        <h1
          style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          <Trophy color="var(--color-gold-bright)" size={28} />
          {tournamentName}
        </h1>
      </div>

      {/* Top Filter & Telemetry Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.45rem 0.85rem',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${colorWithAlpha(secondaryColor, 0.45, 'var(--color-border)')}`,
          background: cardColor,
          width: '100%',
          boxSizing: 'border-box',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Competitor / Match # Quick Search */}
          <div style={{ position: 'relative', width: '175px' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '0.6rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search competitor or #..."
              value={searchTerm}
              onChange={e => onSearchTermChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.32rem 0.55rem 0.32rem 1.8rem',
                fontSize: '0.78rem',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${colorWithAlpha(secondaryColor, 0.5, 'var(--color-border)')}`,
                background: 'var(--color-bg-base)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {/* Multi-Select Round Filter Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={onToggleFilterDropdown}
              className="btn btn-secondary"
              style={{
                padding: '0.32rem 0.75rem',
                fontSize: '0.78rem',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${colorWithAlpha(secondaryColor, 0.5, 'var(--color-border)')}`,
                background: 'var(--color-bg-base)',
                color: 'var(--color-text-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Filter size={13} color={primaryColor} />
              <span>
                Round:{' '}
                <strong style={{ color: primaryColor }}>
                  {selectedRoundFilter === 'ALL'
                    ? 'All'
                    : selectedRoundFilter === 'IN_PROGRESS'
                    ? 'Live Only'
                    : selectedRoundFilter === 'COMPLETE'
                    ? 'Complete Only'
                    : `${selectedRoundFilter.length} Selected`}
                </strong>
              </span>
              <ChevronDown size={13} />
            </button>

            {isFilterDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  zIndex: 50,
                  minWidth: '200px',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  padding: '0.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  background: getAlternateShade(cardColor, 8),
                  border: `1px solid ${colorWithAlpha(secondaryColor, 0.6, 'var(--color-border)')}`,
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.3rem 0.6rem 0.15rem' }}>
                  Filter Presets
                </div>
                <button
                  style={dropdownItemStyle}
                  onClick={() => onSelectFilterPreset('ALL')}
                >
                  <span style={{ width: 16 }}>{selectedRoundFilter === 'ALL' && <Check size={13} color={primaryColor} />}</span>
                  <span>All Rounds</span>
                </button>
                <button
                  style={dropdownItemStyle}
                  onClick={() => onSelectFilterPreset('IN_PROGRESS')}
                >
                  <span style={{ width: 16 }}>{selectedRoundFilter === 'IN_PROGRESS' && <Check size={13} color={primaryColor} />}</span>
                  <span>In Progress Only</span>
                </button>
                <button
                  style={dropdownItemStyle}
                  onClick={() => onSelectFilterPreset('COMPLETE')}
                >
                  <span style={{ width: 16 }}>{selectedRoundFilter === 'COMPLETE' && <Check size={13} color={primaryColor} />}</span>
                  <span>Completed Only</span>
                </button>

                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.3rem 0.6rem 0.15rem', marginTop: '0.4rem' }}>
                  Individual Rounds
                </div>
                {roundNames.map(rName => {
                  const isChecked = Array.isArray(selectedRoundFilter) && selectedRoundFilter.includes(rName);
                  return (
                    <button
                      key={rName}
                      style={dropdownItemStyle}
                      onClick={() => onToggleRoundFilter(rName)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        style={{ accentColor: primaryColor, cursor: 'pointer' }}
                      />
                      <span>{rName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Telemetry Stats Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.78rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                color: '#4ade80',
              }}
            >
              <CheckCircle2 size={13} />
              <span style={{ color: 'var(--color-text-secondary)' }}>Matches:</span>
              <strong className="tabular-nums" style={{ color: '#ffffff' }}>
                {telemetry.completed} / {telemetry.total}
              </strong>
            </span>

            {telemetry.inProgress > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: 'var(--radius-full)',
                  background: colorWithAlpha(primaryColor, 0.14, 'rgba(245, 158, 11, 0.1)'),
                  border: `1px solid ${colorWithAlpha(primaryColor, 0.35, 'rgba(245, 158, 11, 0.3)')}`,
                  color: primaryColor,
                }}
              >
                <Clock size={13} />
                <span>Live:</span>
                <strong className="tabular-nums">{telemetry.inProgress} active</strong>
              </span>
            )}
          </div>
        </div>

        {/* Size Density Toggle (XS / S / M / L) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Size:
          </span>
          <div
            style={{
              display: 'inline-flex',
              padding: '2px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-base)',
              border: `1px solid ${colorWithAlpha(secondaryColor, 0.5, 'var(--color-border)')}`,
              gap: '2px',
            }}
          >
            {(['xs', 'sm', 'md', 'lg'] as const).map(s => {
              const isCurrent = sheetSize === s;
              const label = s === 'xs' ? 'XS' : s === 'sm' ? 'S' : s === 'md' ? 'M' : 'L';
              const title = s === 'xs' ? 'Extra Small' : s === 'sm' ? 'Small (Default)' : s === 'md' ? 'Medium' : 'Large';
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSizeChange(s)}
                  title={`View size: ${title}`}
                  style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '2px',
                    border: 'none',
                    fontSize: '0.72rem',
                    fontWeight: isCurrent ? 800 : 600,
                    background: isCurrent ? primaryColor : 'transparent',
                    color: isCurrent ? getContrastingTextColor(primaryColor) : 'var(--color-text-secondary)',
                    cursor: isCurrent ? 'default' : 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

const dropdownItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.35rem 0.6rem',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  background: 'transparent',
  color: 'var(--color-text-primary)',
  fontSize: '0.78rem',
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
};
