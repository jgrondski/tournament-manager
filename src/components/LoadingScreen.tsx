import React from 'react';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
  inline?: boolean;
  minHeight?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading tournament data...',
  subMessage,
  fullScreen = true,
  inline = false,
  minHeight,
}) => {
  const containerStyle: React.CSSProperties = inline
    ? {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        gap: '0.75rem',
        color: 'var(--color-text-secondary, #94a3b8)',
        minHeight: minHeight || '240px',
      }
    : {
        minHeight: minHeight || (fullScreen ? '100vh' : '400px'),
        height: fullScreen ? '100vh' : undefined,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-base, #0b0e14)',
        color: 'var(--color-text-secondary, #94a3b8)',
        padding: '2rem',
        boxSizing: 'border-box',
        userSelect: 'none',
      };

  return (
    <div style={containerStyle} data-testid="loading-screen" role="status" aria-live="polite">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          maxWidth: '380px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '3px solid rgba(245, 158, 11, 0.18)',
            borderTopColor: 'var(--color-gold-bright, #f59e0b)',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span
            style={{
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--color-text-primary, #ffffff)',
              letterSpacing: '-0.01em',
            }}
          >
            {message}
          </span>
          {subMessage && (
            <span
              style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-muted, #64748b)',
                lineHeight: 1.4,
              }}
            >
              {subMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
