import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider, getApiBaseUrl } from './context/AppContext';
import './index.css';

// Si un serveur Cloud (ou tunnel) est actif, rediriger automatiquement les appels /api vers ce serveur
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      const base = getApiBaseUrl();
      if (base) {
        return originalFetch(`${base}${input}`, init);
      }
    }
    return originalFetch(input, init);
  };
}


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);
