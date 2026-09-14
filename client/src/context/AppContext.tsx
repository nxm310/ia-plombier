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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  // 1. Paramètre URL direct ?backend=https://... (ex: lien magique partagé)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const backendParam = urlParams.get('backend');
    if (backendParam && backendParam.startsWith('http')) {
      const clean = backendParam.trim().replace(/\/+$/, '');
      localStorage.setItem('pme_custom_server_url', clean);
      urlParams.delete('backend');
      const newSearch = urlParams.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
      window.history.replaceState({}, '', newUrl);
      return clean;
    }
  } catch {}

  // 2. Mémorisé en localStorage
  const custom = localStorage.getItem('pme_custom_server_url');
  if (custom) return custom.trim().replace(/\/+$/, '');

  // 3. Variable d'environnement Vite / Vercel
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL || (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  return '';
}

export function getWsBaseUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const apiBase = getApiBaseUrl();
  if (apiBase) {
    const clean = apiBase.replace(/\/+$/, '');
    return clean.replace(/^http/, 'ws') + '/ws';
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  return null;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [conversationMobileView, setConversationMobileView] = useState<'list' | 'chat'>('list');
  const [triggerRefresh, setTriggerRefresh] = useState(0);
  const [lastIncomingMessage, setLastIncomingMessage] = useState<{ contact: Contact; message: Message } | null>(null);
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
    const apiBase = getApiBaseUrl();
    const wsUrl = getWsBaseUrl();
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // Sur Vercel / GitHub Pages sans serveur externe configuré
    if (!isLocal && !apiBase) {
      setWhatsappState({
        status: 'disconnected',
        qrCodeDataUrl: null,
        phoneNumber: null,
        lastConnectedAt: null,
        error: 'server_not_configured'
      });
      return;
    }

    // Initial fetch of WhatsApp status
    fetch(`${apiBase}/api/whatsapp/status`)
      .then(res => {
        if (!res.ok) throw new Error('Not OK');
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('Not JSON');
        return res.json();
      })
      .then(data => {
        if (data && typeof data.status === 'string') {
          setWhatsappState(data);
        }
      })
      .catch(err => console.warn('Erreur fetch whatsapp status:', err));

    if (!wsUrl) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      try {
        ws = new WebSocket(wsUrl);

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
        refreshAll
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
