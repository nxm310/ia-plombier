import React, { createContext, useContext, useEffect, useState } from 'react';
import { WhatsAppState, Contact, Message } from '../types';

interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  whatsappState: WhatsAppState;
  selectedContactId: number | null;
  setSelectedContactId: (id: number | null) => void;
  conversationMobileView: 'list' | 'chat';
  setConversationMobileView: (view: 'list' | 'chat') => void;
  openConversation: (contactId: number) => void;
  lastIncomingMessage: { contact: Contact; message: Message } | null;
  triggerRefresh: number;
  refreshAll: () => void;
  customServerUrl: string;
  setCustomServerUrl: (url: string) => void;
  isBackendConnected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const custom = localStorage.getItem('pme_custom_server_url');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }
  return '';
}

export function getWsBaseUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const custom = localStorage.getItem('pme_custom_server_url');
  if (custom && custom.trim()) {
    const clean = custom.trim().replace(/\/+$/, '');
    const wsProto = clean.startsWith('https://') ? 'wss:' : 'ws:';
    const host = clean.replace(/^https?:\/\//, '');
    return `${wsProto}//${host}/ws`;
  }
  // Ne pas tenter de connexion WS sur GitHub Pages sans serveur externe configuré
  if (window.location.hostname.includes('github.io')) {
    return null;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [conversationMobileView, setConversationMobileView] = useState<'list' | 'chat'>('list');
  const [triggerRefresh, setTriggerRefresh] = useState(0);
  const [lastIncomingMessage, setLastIncomingMessage] = useState<{ contact: Contact; message: Message } | null>(null);
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

  const [whatsappState, setWhatsappState] = useState<WhatsAppState>({
    status: 'disconnected',
    qrCodeDataUrl: null,
    phoneNumber: null,
    lastConnectedAt: null,
    error: null
  });

  const refreshAll = () => setTriggerRefresh(prev => prev + 1);

  const openConversation = (contactId: number) => {
    setSelectedContactId(contactId);
    setConversationMobileView('chat');
    setActiveTab('conversations');
  };

  useEffect(() => {
    const wsUrl = getWsBaseUrl();

    const fetchStatus = () => {
      fetch('/api/whatsapp/status')
        .then(res => {
          if (!res.ok) throw new Error('Status ' + res.status);
          const ct = res.headers.get('content-type') || '';
          if (!ct.includes('application/json')) throw new Error('Not JSON');
          return res.json();
        })
        .then(data => {
          setIsBackendConnected(true);
          if (data && typeof data.status === 'string') {
            setWhatsappState(data);
          }
        })
        .catch(err => {
          setIsBackendConnected(false);
          console.debug('Status check WhatsApp:', err.message);
        });
    };

    fetchStatus();
    // Poll de sécurité toutes les 3 secondes si non connecté pour capturer le QR code immédiatement
    const pollTimer = setInterval(fetchStatus, 3000);

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
            if (parsed.event === 'whatsapp_status') {
              setWhatsappState(parsed.data);
            } else if (parsed.event === 'whatsapp_qr') {
              setWhatsappState(prev => ({
                ...prev,
                status: 'qr_ready',
                qrCodeDataUrl: parsed.data.qrDataUrl
              }));
            } else if (parsed.event === 'new_message') {
              setLastIncomingMessage(parsed.data);
              refreshAll();
            }
          } catch (e) {
            console.error('Erreur message WS:', e);
          }
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch (e) {
        reconnectTimeout = setTimeout(connectWs, 3000);
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
        whatsappState,
        selectedContactId,
        setSelectedContactId,
        conversationMobileView,
        setConversationMobileView,
        openConversation,
        lastIncomingMessage,
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
