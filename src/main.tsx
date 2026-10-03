import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

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
