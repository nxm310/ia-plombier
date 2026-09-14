import React, { useState } from 'react';
import {
  QrCode,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Send,
  ShieldCheck,
  KeyRound,
  Smartphone,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const WhatsAppConnect: React.FC = () => {
  const { whatsappState, refreshAll } = useApp();
  const [connectMethod, setConnectMethod] = useState<'qr' | 'code'>('qr');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isBackendReachable, setIsBackendReachable] = useState(true);

  // Pairing code state
  const [phoneNumberInput, setPhoneNumberInput] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Test message state
  const [testNumber, setTestNumber] = useState('');
  const [testText, setTestText] = useState('Bonjour, ceci est un test de connexion WhatsApp !');
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/whatsapp/status')
      .then(res => {
        if (!res.ok) throw new Error('Not OK');
        setIsBackendReachable(true);
      })
      .catch(() => {
        setIsBackendReachable(false);
      });
  }, []);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    setPairingCode(null);
    try {
      await fetch('/api/whatsapp/reset', { method: 'POST' });
      setIsBackendReachable(true);
      refreshAll();
    } catch (err) {
      console.error('Erreur reconnect:', err);
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Voulez-vous vraiment déconnecter votre session WhatsApp ?')) return;
    setIsDisconnecting(true);
    setPairingCode(null);
    try {
      await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      refreshAll();
    } catch (err) {
      console.error('Erreur disconnect:', err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleRequestPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumberInput.trim()) return;

    setIsRequestingCode(true);
    setPairingCode(null);
    try {
      const res = await fetch('/api/whatsapp/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumberInput.trim() })
      });
      const data = await res.json();
      if (data.pairingCode) {
        setPairingCode(data.pairingCode);
      } else {
        alert(data.error || 'Impossible d\'obtenir le code de jumelage');
      }
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    } finally {
      setIsRequestingCode(false);
    }
  };

  const copyCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber.trim() || !testText.trim()) return;

    setTestSuccess(null);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: testNumber,
          content: testText
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestSuccess(`Message envoyé avec succès (${data.via}) !`);
      } else {
        alert(data.error || 'Erreur lors de l\'envoi');
      }
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 overflow-y-auto h-full">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Connexion WhatsApp</h2>
        <p className="text-slate-500 text-xs mt-1">
          Liez votre numéro WhatsApp pour activer l'agent IA 24h/24 et 7j/7 sans compte Meta payant.
        </p>
      </div>

      {!isBackendReachable && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Serveur Local WhatsApp Non Détecté</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Pour générer le QR Code et chiffrer la liaison WhatsApp de bout en bout, le serveur Node.js doit être actif sur votre machine. Si vous consultez cette page depuis GitHub Pages ou un autre appareil, ouvrez l'application locale sur votre ordinateur :
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1"
            >
              Ouvrir l'application sur ce PC (http://localhost:5173) ↗
            </a>
          </div>
        </div>
      )}

      {/* Main Connection Box */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {whatsappState.status === 'connected' ? (
          /* Connecté avec succès */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">WhatsApp est Connecté et Actif 24/7 !</h3>
              <p className="text-sm text-slate-500 mt-1">
                Numéro lié : <strong className="text-slate-800 font-semibold">{whatsappState.phoneNumber || 'Numéro WhatsApp actif'}</strong>
              </p>
              {whatsappState.lastConnectedAt && (
                <p className="text-xs text-slate-400 mt-0.5">
                  En ligne depuis le {new Date(whatsappState.lastConnectedAt).toLocaleString('fr-FR')}
                </p>
              )}
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex items-center gap-2 px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold transition"
              >
                <LogOut className="w-4 h-4" />
                Déconnecter WhatsApp
              </button>
            </div>
          </div>
        ) : (
          /* En attente d'appairage */
          <div>
            {/* Onglets de choix de méthode */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setConnectMethod('qr')}
                className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
                  connectMethod === 'qr'
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <QrCode className="w-4 h-4" />
                Méthode 1 : Scanner le QR Code (Corrigé anti-crash)
              </button>

              <button
                onClick={() => setConnectMethod('code')}
                className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
                  connectMethod === 'code'
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                Méthode 2 : Code à 8 chiffres (Sans caméra - 100% garanti)
              </button>
            </div>

            {/* Contenu Méthode 1 : QR Code */}
            {connectMethod === 'qr' && (
              <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100 p-6">
                <div className="md:col-span-6 p-4 flex flex-col items-center justify-center text-center space-y-4">
                  {whatsappState.qrCodeDataUrl ? (
                    <div className="p-4 bg-white border-2 border-emerald-500/20 rounded-2xl shadow-lg relative">
                      <img
                        src={whatsappState.qrCodeDataUrl}
                        alt="WhatsApp QR Code"
                        className="w-64 h-64 object-contain rounded-lg"
                      />
                      <div className="absolute inset-x-0 -bottom-3 flex justify-center">
                        <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-md animate-pulse">
                          Prêt à être scanné
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-64 h-64 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-3">
                      <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                      <span className="text-xs font-medium">Génération du QR Code en cours...</span>
                    </div>
                  )}

                  <button
                    onClick={handleReconnect}
                    disabled={isReconnecting}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
                    Régénérer le QR Code
                  </button>
                </div>

                <div className="md:col-span-6 p-6 space-y-4 flex flex-col justify-center text-xs">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Connexion par QR Code</h3>
                    <p className="text-slate-500 mt-1">
                      Le bug qui faisait planter l'application mobile a été corrigé (désactivation de l'export d'historique lourd et gestion du code de redémarrage).
                    </p>
                  </div>

                  <ol className="space-y-2.5 text-slate-700">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                      <span>Ouvrez <strong>WhatsApp</strong> sur votre téléphone.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                      <span>Allez dans <strong>Réglages</strong> &gt; <strong>Appareils connectés</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                      <span>Touchez <strong>Connecter un appareil</strong> et scannez ce QR code.</span>
                    </li>
                  </ol>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
                    💡 <em>Si le scan de votre caméra pose problème sur votre modèle de smartphone, utilisez l'onglet ci-dessus <strong>"Méthode 2 : Code à 8 chiffres"</strong>.</em>
                  </div>
                </div>
              </div>
            )}

            {/* Contenu Méthode 2 : Pairing Code sans caméra */}
            {connectMethod === 'code' && (
              <div className="p-8 max-w-xl mx-auto space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Jumelage par Code à 8 Chiffres (Sans Caméra)</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Entrez votre numéro WhatsApp ci-dessous. Vous recevrez un code à taper directement dans WhatsApp sur votre téléphone. Aucun scan d'appareil photo requis !
                  </p>
                </div>

                <form onSubmit={handleRequestPairingCode} className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">Votre numéro WhatsApp (avec indicatif pays) :</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Ex: 33612345678 ou +33 6 12 34 56 78"
                      value={phoneNumberInput}
                      onChange={e => setPhoneNumberInput(e.target.value)}
                      className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isRequestingCode || !phoneNumberInput.trim()}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 disabled:opacity-50"
                    >
                      {isRequestingCode ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4" />
                          Obtenir le code
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Code de jumelage affiché */}
                {pairingCode && (
                  <div className="p-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-4 text-center">
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      Votre Code de Jumelage WhatsApp :
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-3xl font-extrabold tracking-widest text-emerald-950 font-mono bg-white px-5 py-2.5 rounded-xl border border-emerald-200 shadow-sm">
                        {pairingCode}
                      </span>
                      <button
                        onClick={copyCode}
                        className="p-2.5 bg-white hover:bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-700 transition"
                        title="Copier le code"
                      >
                        {codeCopied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="text-left bg-white p-4 rounded-xl border border-emerald-200 text-xs text-slate-700 space-y-2">
                      <p className="font-bold text-emerald-900">Que faire sur votre téléphone maintenant ?</p>
                      <ol className="list-decimal pl-4 space-y-1">
                        <li>Ouvrez <strong>WhatsApp</strong>.</li>
                        <li>Allez dans <strong>Réglages</strong> &gt; <strong>Appareils connectés</strong> &gt; <strong>Connecter un appareil</strong>.</li>
                        <li>En bas de l'écran, appuyez sur : <strong>« Lier avec un numéro de téléphone à la place »</strong>.</li>
                        <li>Entrez les 8 caractères affichés ci-dessus : <strong className="font-mono text-emerald-800">{pairingCode}</strong>.</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Test Message Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Tester l'envoi d'un message WhatsApp</h3>
          <p className="text-xs text-slate-500">
            Envoyez un message test vers votre propre numéro pour valider la transmission.
          </p>
        </div>

        <form onSubmit={handleSendTest} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Numéro de destination</label>
              <input
                type="text"
                required
                placeholder="+33 6 12 34 56 78"
                value={testNumber}
                onChange={e => setTestNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Message</label>
              <input
                type="text"
                required
                value={testText}
                onChange={e => setTestText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {testSuccess && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {testSuccess}
              </span>
            )}
            <button
              type="submit"
              className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition"
            >
              <Send className="w-3.5 h-3.5" />
              Envoyer le test
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
