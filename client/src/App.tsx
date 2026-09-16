import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Appointments } from './pages/Appointments';
import { ClientsManager } from './pages/ClientsManager';
import { Team } from './pages/Team';
import { Contacts } from './pages/Contacts';
import { Settings } from './pages/Settings';
import { PublicAppointmentView } from './pages/PublicAppointmentView';
import { PwaUpdateBanner } from './components/PwaUpdateBanner';
import { PatchNotesModal } from './components/PatchNotesModal';
import { CURRENT_PATCH_VERSION } from './data/patchNotes';
import { useApp } from './context/AppContext';
import { decodeAppointmentPayload } from './utils/calendar';
import {
  X,
  Menu,
  LayoutDashboard,
  Calendar,
  UserCheck,
  Briefcase,
  Sparkles
} from 'lucide-react';

export const App: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isBackendConnected
  } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPatchNotesOpen, setIsPatchNotesOpen] = useState(false);

  // Détection d'un lien de confirmation public reçu par WhatsApp / SMS / iMessage (?rdv=... ou #rdv=...)
  const [publicRdvData, setPublicRdvData] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    let rdvParam = urlParams.get('rdv');
    if (!rdvParam && window.location.hash.includes('rdv=')) {
      rdvParam = window.location.hash.split('rdv=')[1]?.split('&')[0];
    }
    if (rdvParam) {
      return decodeAppointmentPayload(rdvParam);
    }
    return null;
  });

  // Pop-up automatique à l'allumage si nouvelle version détectée
  useEffect(() => {
    const lastSeen = localStorage.getItem('assistant_last_seen_patch');
    if (lastSeen !== CURRENT_PATCH_VERSION) {
      setIsPatchNotesOpen(true);
    }
  }, []);

  // Si on consulte un lien public d'invitation/confirmation reçu par message
  if (publicRdvData) {
    return (
      <PublicAppointmentView
        data={publicRdvData}
        onClose={() => {
          setPublicRdvData(null);
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'appointments':
        return <Appointments />;
      case 'clients':
        return <ClientsManager />;
      case 'team':
        return <Team />;
      case 'contacts':
        return <Contacts />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen h-[100dvh] min-h-[100dvh] bg-slate-100/60 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Barre latérale (Desktop fixe & Drawer sur mobile) */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenPatchNotes={() => setIsPatchNotesOpen(true)}
      />

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header Mobile (visible uniquement sur mobile et tablette < md) */}
        <header className="md:hidden bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 flex items-center justify-between z-30 shrink-0 shadow-xs pt-[max(0.625rem,env(safe-area-inset-top,0px))]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-sm text-slate-900 truncate">Hub PME</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsPatchNotesOpen(true)}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer transition"
              title="Notes de mises à jour"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>v{CURRENT_PATCH_VERSION}</span>
            </button>

            {isBackendConnected ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Connecté
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Autonome
              </span>
            )}
          </div>
        </header>

        {/* Zone de contenu principale */}
        <div className="flex-1 min-w-0 overflow-hidden pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          {renderContent()}
        </div>

        {/* Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around z-30 shadow-lg">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition min-w-[50px] min-h-[44px] justify-center ${
                activeTab === 'dashboard' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px]">Aperçu</span>
            </button>

            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition min-w-[50px] min-h-[44px] justify-center ${
                activeTab === 'appointments' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[10px]">Agenda</span>
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition min-w-[50px] min-h-[44px] justify-center ${
                activeTab === 'clients' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <UserCheck className="w-5 h-5" />
              <span className="text-[10px]">Clients</span>
            </button>

            <button
              onClick={() => setActiveTab('team')}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition min-w-[50px] min-h-[44px] justify-center ${
                activeTab === 'team' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Briefcase className="w-5 h-5" />
              <span className="text-[10px]">Équipe</span>
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition min-w-[50px] min-h-[44px] justify-center"
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px]">Menu</span>
            </button>
          </nav>

        {/* Modale Pop-up Patch Notes */}
        <PatchNotesModal
          isOpen={isPatchNotesOpen}
          onClose={() => setIsPatchNotesOpen(false)}
        />

        {/* Bannière de mise à jour transparente PWA */}
        <PwaUpdateBanner />
      </main>
    </div>
  );
};

export default App;
