import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import './index.css';

// Si un serveur Cloud personnalisé (ex: Railway / Render) est configuré, rediriger /api vers ce serveur
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      const customServer = localStorage.getItem('pme_custom_server_url');
      if (customServer && customServer.trim()) {
        const base = customServer.trim().replace(/\/+$/, '');
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
