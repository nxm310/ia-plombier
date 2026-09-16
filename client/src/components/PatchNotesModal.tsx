import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Zap,
  Layers,
  ChevronRight,
  Calendar,
  Layers as LayersIcon
} from 'lucide-react';
import { CURRENT_PATCH_VERSION, PATCH_HISTORY, PatchVersion } from '../data/patchNotes';

interface PatchNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAutoOpen?: boolean;
}

export const PatchNotesModal: React.FC<PatchNotesModalProps> = ({
  isOpen,
  onClose,
  isAutoOpen = false
}) => {
  const [selectedVersion, setSelectedVersion] = useState<PatchVersion>(PATCH_HISTORY[0]);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setSelectedVersion(PATCH_HISTORY[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem('assistant_last_seen_patch', CURRENT_PATCH_VERSION);
    } else {
      localStorage.removeItem('assistant_last_seen_patch');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Container Principal Style Hub PME */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* En-tête épuré et moderne */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-slate-900">
                  Nouveautés & Mises à jour
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  v{CURRENT_PATCH_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Découvrez les dernières améliorations apportées à votre application Hub PME.
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sélecteur de Versions (Style Onglets Épurés) */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-500" /> Versions :
          </span>
          {PATCH_HISTORY.map((patch) => {
            const isSelected = selectedVersion.version === patch.version;
            return (
              <button
                key={patch.version}
                onClick={() => setSelectedVersion(patch)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>v{patch.version}</span>
                {patch.isLatest && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Actuelle
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Corps des Notes de Version */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Bannière de Version Sélectionnée */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                {selectedVersion.codename}
              </span>
              <span className="text-xs text-emerald-700 flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" /> {selectedVersion.date}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-emerald-950 leading-relaxed">
              {selectedVersion.highlight}
            </p>
          </div>

          {/* Section 1 : Nouvelles Fonctionnalités */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900 pb-1 border-b border-emerald-100">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Nouvelles Fonctionnalités</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {selectedVersion.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:border-emerald-300 transition space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl group-hover:scale-110 transition-transform">
                        {feat.icon}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition">
                        {feat.title}
                      </h4>
                    </div>
                    {feat.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/80 shrink-0">
                        {feat.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-8">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2 : Améliorations & Ergonomie */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900 pb-1 border-b border-blue-100">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>Améliorations & Optimisations</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedVersion.improvements.map((imp, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60 flex items-start gap-3"
                >
                  <span className="text-lg shrink-0">{imp.icon}</span>
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-xs text-slate-900">{imp.title}</h5>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{imp.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3 : Correctifs & Stabilité */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Correctifs & Fiabilisation</span>
            </div>

            <div className="space-y-2">
              {selectedVersion.fixes.map((fix, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-start gap-2.5 text-xs text-slate-700"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 mr-1.5">{fix.title} :</span>
                    <span className="text-slate-600 text-[11px]">{fix.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pied du Modal */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <span>Ne plus afficher automatiquement jusqu'à la prochaine mise à jour</span>
          </label>

          <button
            onClick={handleDismiss}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Accéder à l'application</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
