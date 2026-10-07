import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Global error logger to capture any uncaught client errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    try {
      fetch('/api/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'window.onerror',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack || String(event.error),
          url: window.location.href,
        }),
      }).catch(() => {});
    } catch {
      // Ignore
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    try {
      fetch('/api/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'window.unhandledrejection',
          reason: event.reason?.stack || event.reason?.message || String(event.reason),
          url: window.location.href,
        }),
      }).catch(() => {});
    } catch {
      // Ignore
    }
  });
}

// One-time clean-slate wipe of legacy LocalStorage test data for Phase 7
if (typeof window !== 'undefined' && !localStorage.getItem('tm_phase7_migrated')) {
  try {
    localStorage.clear();
    localStorage.setItem('tm_phase7_migrated', '1');
    console.info('[Phase 7] Clean-slate: LocalStorage wiped successfully.');
  } catch {
    // ignore storage access errors
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found in index.html');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
