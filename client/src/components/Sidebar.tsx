import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Users,
  Brain,
  QrCode,
  Settings,
  Sparkles,
  Bot,
  UserCheck,
  Briefcase,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CURRENT_PATCH_VERSION } from '../data/patchNotes';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenPatchNotes?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose, onOpenPatchNotes }) => {
  const { activeTab, setActiveTab, setConversationMobileView, whatsappState } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { id: 'copilot', label: 'Copilote IA Gérant', icon: Sparkles, isHighlight: true },
    { id: 'conversations', label: 'Conversations Live', icon: MessageSquare },
    { id: 'appointments', label: 'Agenda Visuel', icon: Calendar },
    { id: 'clients', label: 'Clients & CRM', icon: UserCheck },
    { id: 'team', label: 'Équipe & Horaires', icon: Briefcase },
    { id: 'whatsapp', label: 'Connexion WhatsApp', icon: QrCode },
    { id: 'settings', label: 'Paramètres IA & PME', icon: Settings },
  ];

  const getStatusBadge = () => {
    switch (whatsappState.status) {
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            WhatsApp 24/7 Connecté
          </span>
        );
      case 'qr_ready':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            Prêt à être lié
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            WhatsApp Déconnecté
          </span>
        );
    }
  };

  const handleSelectTab = (tabId: string) => {
    if (tabId === 'conversations') {
      setConversationMobileView('list');
    }
    setActiveTab(tabId);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Backdrop sombre sur mobile quand le tiroir est ouvert */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* Sidebar / Tiroir */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col h-full shadow-lg md:shadow-xs select-none shrink-0 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-200">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-base text-slate-900 leading-tight">Assistant WA 24/7</h1>
                <p className="text-xs text-slate-500 font-medium">Pour PME & Équipes</p>
              </div>
            </div>

            {/* Bouton fermer sur mobile */}
            <button
              onClick={onClose}
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            {getStatusBadge()}
            {localStorage.getItem('pme_gemini_verified') === 'true' ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                🟢 API Gemini OK
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                ⚪ API Gemini en attente
              </span>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : item.isHighlight ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="truncate flex-1 text-left">{item.label}</span>
                {item.isHighlight && !isActive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                    IA
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bouton Nouveautés & Mises à jour */}
        <div className="px-3 pb-3">
          <button
            onClick={() => {
              if (onOpenPatchNotes) onOpenPatchNotes();
              if (onClose) onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition border border-slate-200/80 group cursor-pointer shadow-2xs"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span>Nouveautés & MAJ</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
              v{CURRENT_PATCH_VERSION}
            </span>
          </button>
        </div>

        {/* Footer Info Box */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-3">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold mb-1">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Mémoire & IA Active
            </div>
            <p className="text-[11px] text-emerald-700/90 leading-relaxed">
              Vos clients reçoivent des réponses instantanées et réservent leurs créneaux 24h/24.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
