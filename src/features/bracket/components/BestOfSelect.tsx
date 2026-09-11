import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface BestOfSelectProps {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

// All odd integers from 1 to 99
const ALL_ODD_BEST_OF: number[] = Array.from({ length: 50 }, (_, i) => i * 2 + 1);

// Quick presets for frequent tournament formats
const QUICK_PRESETS = [1, 3, 5, 7, 9, 11, 15, 21, 99];

export const BestOfSelect: React.FC<BestOfSelectProps> = ({
  value,
  onChange,
  id,
  label,
  disabled = false,
  compact = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase().replace(/^bo\s*/, '');
    if (!cleanQuery) return ALL_ODD_BEST_OF;

    const queryNum = parseInt(cleanQuery, 10);
    return ALL_ODD_BEST_OF.filter(bo => {
      if (String(bo).includes(cleanQuery)) return true;
      if (!isNaN(queryNum) && bo === queryNum) return true;
      return false;
    });
  }, [query]);

  const handleSelect = (bo: number) => {
    onChange(bo);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      e.stopPropagation();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cleanQuery = query.trim().toLowerCase().replace(/^bo\s*/, '');
      const parsed = parseInt(cleanQuery, 10);

      if (!isNaN(parsed) && parsed >= 1 && parsed <= 99) {
        // Enforce odd number
        const oddVal = parsed % 2 === 0 ? Math.min(99, parsed + 1) : parsed;
        handleSelect(oddVal);
      } else if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0]);
      }
    }
  };

  const winThreshold = Math.ceil(value / 2);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: compact ? '140px' : '100%',
        minWidth: compact ? '130px' : '200px',
      }}
    >
      {label && (
        <label
          htmlFor={id}
          style={{
            display: 'block',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            marginBottom: '0.35rem',
          }}
        >
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(prev => !prev);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          padding: compact ? '0.35rem 0.6rem' : '0.5rem 0.75rem',
          fontSize: compact ? '0.8rem' : '0.875rem',
          fontWeight: 600,
          background: 'var(--color-bg-surface-elevated)',
          border: isOpen ? '1px solid var(--color-gold)' : '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-text-primary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          boxShadow: isOpen ? '0 0 0 1px var(--color-gold)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
          <span style={{ color: 'var(--color-gold-bright)', fontWeight: 700 }}>Bo{value}</span>
          {!compact && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
              (First to {winThreshold})
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          style={{
            color: 'var(--color-text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: compact ? '220px' : '100%',
            minWidth: '220px',
            maxWidth: '320px',
            background: 'var(--color-bg-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 9999,
            padding: '0.5rem',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {/* Search / Type Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.5rem',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '0.5rem',
            }}
          >
            <Search size={14} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or type 1-99..."
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '0.8rem',
                color: 'var(--color-text-primary)',
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  padding: '0 2px',
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Presets */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div
              style={{
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                marginBottom: '0.3rem',
                letterSpacing: '0.04em',
              }}
            >
              Presets
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {QUICK_PRESETS.map(preset => {
                const isSelected = value === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelect(preset)}
                    style={{
                      padding: '0.15rem 0.45rem',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected
                        ? '1px solid var(--color-gold)'
                        : '1px solid var(--color-border-subtle)',
                      background: isSelected ? 'var(--color-gold-bg)' : 'var(--color-bg-surface)',
                      color: isSelected ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Bo{preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Odd number reminder if user entered an even number */}
          {(() => {
            const cleanQuery = query.trim().toLowerCase().replace(/^bo\s*/, '');
            const parsed = parseInt(cleanQuery, 10);
            if (!isNaN(parsed) && parsed % 2 === 0 && parsed >= 2 && parsed <= 98) {
              return (
                <div
                  style={{
                    padding: '0.35rem 0.5rem',
                    fontSize: '0.7rem',
                    color: 'var(--color-cyan)',
                    background: 'var(--color-cyan-bg)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '0.4rem',
                    lineHeight: 1.3,
                  }}
                >
                  Best-of formats must be odd. Use Bo{parsed + 1} or Bo{parsed - 1}.
                </div>
              );
            }
            return null;
          })()}

          {/* Scrollable list of options */}
          <div
            style={{
              maxHeight: '160px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '0.75rem',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                No matching odd format (1–99)
              </div>
            ) : (
              filteredOptions.map(bo => {
                const isSelected = value === bo;
                const winsNeeded = Math.ceil(bo / 2);
                return (
                  <button
                    key={bo}
                    type="button"
                    onClick={() => handleSelect(bo)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.35rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--color-gold-bg)' : 'transparent',
                      border: 'none',
                      color: isSelected ? 'var(--color-gold-bright)' : 'var(--color-text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.8rem',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'var(--color-bg-surface-highlight)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span style={{ fontWeight: isSelected ? 700 : 500 }}>Bo{bo}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: isSelected ? 'var(--color-gold)' : 'var(--color-text-muted)',
                        }}
                      >
                        First to {winsNeeded}
                      </span>
                      {isSelected && <Check size={14} color="var(--color-gold-bright)" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
