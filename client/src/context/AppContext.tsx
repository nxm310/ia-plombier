import React, { createContext, useContext, useEffect, useState } from 'react';

interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedContactId: number | null;
  setSelectedContactId: (id: number | null) => void;
  triggerRefresh: number;
  refreshAll: () => void;
  customServerUrl: string;
  setCustomServerUrl: (url: string) => void;
  isBackendConnected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const DEFAULT_CLOUD_BACKEND = '';

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const custom = localStorage.getItem('pme_custom_server_url');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }
  return DEFAULT_CLOUD_BACKEND;
}

export function getWsBaseUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const baseUrl = getApiBaseUrl();
  if (baseUrl) {
    const wsProto = baseUrl.startsWith('https://') ? 'wss:' : 'ws:';
    const host = baseUrl.replace(/^https?:\/\//, '');
    return `${wsProto}//${host}/ws`;
  }
  // Sur GitHub Pages ou hébergeur statique sans backend configuré, désactiver le WebSocket par défaut
  if (window.location.hostname.includes('github.io')) {
    return null;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [triggerRefresh, setTriggerRefresh] = useState(0);
  const [customServerUrl, setCustomServerUrlState] = useState<string>(() => {
    return localStorage.getItem('pme_custom_server_url') || '';
  });
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  const setCustomServerUrl = (url: string) => {
    const clean = url.trim().replace(/\/+$/, '');
    if (clean) {
      localStorage.setItem('pme_custom_server_url', clean);
    } else {
      localStorage.removeItem('pme_custom_server_url');
    }
    setCustomServerUrlState(clean);
    refreshAll();
  };

  const refreshAll = () => setTriggerRefresh(prev => prev + 1);

  useEffect(() => {
    const wsUrl = getWsBaseUrl();

    const fetchStatus = () => {
      fetch('/api/health')
        .then(res => {
          if (!res.ok) throw new Error('Status ' + res.status);
          return res.json();
        })
        .then(data => {
          if (data && data.status === 'ok') {
            setIsBackendConnected(true);
          }
        })
        .catch(err => {
          setIsBackendConnected(false);
          console.debug('Health check:', err.message);
        });
    };

    fetchStatus();
    const pollTimer = setInterval(fetchStatus, 15000);

    if (!wsUrl) return () => clearInterval(pollTimer);

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsBackendConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.event === 'appointment_updated' || parsed.event === 'team_updated') {
              refreshAll();
            }
          } catch (e) {
            console.error('Erreur message WS:', e);
          }
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWs, 5000);
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch (e) {
        reconnectTimeout = setTimeout(connectWs, 5000);
      }
    };

    connectWs();

    return () => {
      clearInterval(pollTimer);
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [triggerRefresh]);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedContactId,
        setSelectedContactId,
        triggerRefresh,
        refreshAll,
        customServerUrl,
        setCustomServerUrl,
        isBackendConnected
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp doit être utilisé dans AppProvider');
  return context;
};
