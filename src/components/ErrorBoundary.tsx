import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    if (typeof fetch === 'function') {
      try {
        fetch('/api/client-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'react.error_boundary',
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            url: typeof window !== 'undefined' ? window.location.href : '',
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      } catch {
        // Ignore logging failures
      }
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleResetStateAndReload = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch {
        // Ignore
      }
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg-base, #0a0d14)',
            color: 'var(--color-text-primary, #ffffff)',
            padding: '2rem',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '680px',
              width: '100%',
              background: 'var(--color-bg-surface, #121722)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
                color: '#ef4444',
              }}
            >
              <ShieldAlert size={28} />
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>
                {this.props.fallbackTitle || 'Application Rendering Error'}
              </h2>
            </div>

            <p style={{ color: 'var(--color-text-secondary, #94a3b8)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              An unexpected error occurred while rendering this tournament view. The error details below can help diagnose the cause.
            </p>

            {this.state.error && (
              <div
                style={{
                  background: '#090c12',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                  padding: '1rem',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: '#f87171',
                  overflowX: 'auto',
                  marginBottom: '1rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.toString()}
              </div>
            )}

            {this.state.errorInfo?.componentStack && (
              <details style={{ marginBottom: '1.5rem' }}>
                <summary
                  style={{
                    color: 'var(--color-text-muted, #64748b)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                    marginBottom: '0.5rem',
                  }}
                >
                  View Component Stack Trace
                </summary>
                <div
                  style={{
                    background: '#090c12',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </div>
              </details>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.9rem',
                }}
              >
                <RefreshCw size={16} /> Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleResetStateAndReload}
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.9rem',
                }}
              >
                <Home size={16} /> Return to Tournaments
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
