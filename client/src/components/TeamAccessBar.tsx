import React, { useState, useEffect } from 'react';
import { getTeamId, setTeamId, clearTeamId, saveCustomFirebaseConfig, getCustomFirebaseConfig } from '../services/cloudSync';
import { Users, Share2, Check, Copy, RefreshCw, X, KeyRound, Settings as SettingsIcon, ChevronDown, ChevronUp } from 'lucide-react';

interface TeamAccessBarProps {
  onTeamChanged?: () => void;
}

export const TeamAccessBar: React.FC<TeamAccessBarProps> = ({ onTeamChanged }) => {
  const [currentTeam, setCurrentTeam] = useState<string | null>(getTeamId());
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showFirebaseConfig, setShowFirebaseConfig] = useState(false);
  const [firebaseConfigInput, setFirebaseConfigInput] = useState(() => {
    const saved = getCustomFirebaseConfig();
    return saved ? JSON.stringify(saved, null, 2) : '';
  });
  const [configSavedToast, setConfigSavedToast] = useState(false);

  useEffect(() => {
    const id = getTeamId();
    if (id) {
      setCurrentTeam(id);
    }
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    const clean = inputCode.trim().toUpperCase();
    setTeamId(clean);
    setCurrentTeam(clean);
    setInputCode('');
    setShowConfigModal(false);
    if (onTeamChanged) onTeamChanged();
  };

  const handleCreateTeam = () => {
    // Générer un code à 4 chiffres facile à retenir (ex: 4821)
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    setTeamId(newCode);
    setCurrentTeam(newCode);
    setShowConfigModal(false);
    if (onTeamChanged) onTeamChanged();
  };

  const handleLeaveTeam = () => {
    if (window.confirm("Voulez-vous dissocier cet appareil de l'équipe ?")) {
      clearTeamId();
      setCurrentTeam(null);
      if (onTeamChanged) onTeamChanged();
    }
  };

  const getShareUrl = () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?team=${currentTeam}`;
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareInvite = async () => {
    const text = `👋 Bonjour !\nVoici le lien d'accès direct à notre agenda d'équipe partagé en temps réel :\n👉 ${getShareUrl()}\n\n(Ouvre ce lien sur ton téléphone et clique sur "Ajouter à l'écran d'accueil" pour l'installer en 1 clic sans rien configurer).`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Accès Agenda Équipe',
          text: text,
          url: getShareUrl(),
        });
      } catch {
        // Annulation ou non supporté
      }
    } else {
      copyShareLink();
    }
  };

  return (
    <>
      {/* 1. Barre discrète supérieure (Visible quand l'équipe est connectée) */}
      {currentTeam ? (
        <div className="bg-emerald-600/90 backdrop-blur-xs text-white px-3 sm:px-6 py-1.5 flex items-center justify-between text-xs shadow-xs z-20 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse shrink-0"></span>
            <span className="truncate font-medium">
              Synchronisation Équipe active : <strong className="font-bold tracking-wider">#{currentTeam}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={copyShareLink}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-semibold transition cursor-pointer"
              title="Copier le lien magique à envoyer aux collaborateurs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Lien copié !' : 'Copier le lien d\'accès'}</span>
            </button>

            <button
              onClick={shareInvite}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-white text-emerald-800 hover:bg-emerald-50 rounded-lg text-[11px] font-bold transition cursor-pointer shadow-xs"
              title="Partager le lien d'accès à l'équipe"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Partager l'accès</span>
            </button>

            <button
              onClick={() => setShowConfigModal(true)}
              className="p-1 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition cursor-pointer"
              title="Paramètres de l'équipe et du Cloud"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleLeaveTeam}
              className="p-1 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition cursor-pointer"
              title="Changer de code d'équipe"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Barre d'alerte quand aucun code n'est configuré */
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-xs z-20 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0" />
            <span>Appareil non rattaché à une équipe : vos rendez-vous ne sont pas synchronisés en direct.</span>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-1 bg-white text-amber-900 font-bold rounded-lg hover:bg-amber-50 transition cursor-pointer shrink-0"
          >
            Rejoindre ou Créer une équipe
          </button>
        </div>
      )}

      {/* 2. Modale de connexion / création d'équipe */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-center space-y-4">
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-base text-slate-900">Synchronisation Équipe</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Entrez le code à 4 chiffres partagé par vos collègues pour relier instantanément cet appareil.
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                maxLength={6}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Ex : 4821"
                className="w-full text-center text-2xl tracking-widest font-extrabold uppercase py-3 border-2 border-slate-200 focus:border-emerald-500 rounded-xl outline-hidden transition"
                autoFocus
              />
              <button
                type="submit"
                disabled={!inputCode.trim()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md shadow-emerald-200"
              >
                Connecter et synchroniser
              </button>
            </form>

            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={handleCreateTeam}
                className="text-xs font-semibold text-slate-500 hover:text-emerald-700 transition"
              >
                + Créer un nouveau code d'équipe (4 chiffres)
              </button>
            </div>

            {/* Clés Firebase personnalisées (Optionnel) */}
            <div className="pt-3 border-t border-slate-100 text-left">
              <button
                type="button"
                onClick={() => setShowFirebaseConfig(!showFirebaseConfig)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition cursor-pointer"
              >
                <span>⚙️ Clés Cloud Firebase (Optionnel)</span>
                {showFirebaseConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showFirebaseConfig && (
                <div className="mt-2 space-y-2 animate-in fade-in">
                  <p className="text-[10px] text-slate-400">
                    Collez ici l'objet de configuration Firebase de votre console Google :
                  </p>
                  <textarea
                    rows={4}
                    value={firebaseConfigInput}
                    onChange={(e) => setFirebaseConfigInput(e.target.value)}
                    placeholder='{"apiKey": "...", "projectId": "...", "appId": "..."}'
                    className="w-full font-mono text-[10px] p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          if (!firebaseConfigInput.trim()) {
                            localStorage.removeItem('pme_custom_firebase_config');
                          } else {
                            const parsed = JSON.parse(firebaseConfigInput);
                            saveCustomFirebaseConfig(parsed);
                          }
                          setConfigSavedToast(true);
                          setTimeout(() => setConfigSavedToast(false), 2500);
                        } catch (err) {
                          alert('JSON invalide. Vérifiez la syntaxe.');
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-[10px] font-bold transition cursor-pointer"
                    >
                      Enregistrer les clés
                    </button>
                    {configSavedToast && (
                      <span className="text-[10px] text-emerald-600 font-bold">✓ Enregistré !</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
