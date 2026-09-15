import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  RefreshCw,
  Send,
  KeyRound,
  Copy,
  Check,
  AlertTriangle,
  Server,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  Zap,
  PhoneCall
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { autoFormatPhone } from '../utils/phone';

interface MetaStatus {
  status: 'connected' | 'configured' | 'needs_config';
  provider: string;
  isOfficialMeta: boolean;
  isConfigured: boolean;
  metaVerified: boolean;
  phoneNumberId: string | null;
  verifyToken: string;
  displayNumber: string | null;
  verifiedName: string | null;
  qualityRating: string | null;
  hasGemini: boolean;
  hasOpenAI: boolean;
}

export const WhatsAppConnect: React.FC = () => {
  const { refreshAll } = useApp();

  // État de l'API Meta Cloud
  const [metaStatus, setMetaStatus] = useState<MetaStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Identifiants configurables localement ou via Vercel
  const [phoneNumberIdInput, setPhoneNumberIdInput] = useState(() => {
    return localStorage.getItem('meta_phone_number_id') || '';
  });
  const [accessTokenInput, setAccessTokenInput] = useState(() => {
    return localStorage.getItem('meta_access_token') || '';
  });
  const [verifyTokenInput, setVerifyTokenInput] = useState(() => {
    return localStorage.getItem('meta_verify_token') || 'ia_plombier_token_2026';
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Copies rapides
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Test d'envoi de message officiel
  const [testNumber, setTestNumber] = useState('');
  const [testText, setTestText] = useState('Bonjour ! Ceci est un message test officiel via WhatsApp Cloud API.');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; messageId?: string } | null>(null);

  // Accordéon guide Meta
  const [showMetaGuide, setShowMetaGuide] = useState(true);

  // Déterminer l'URL du Webhook Vercel actuel
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook`
    : 'https://votre-app.vercel.app/api/webhook';

  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setMetaStatus(data);
      }
    } catch (e) {
      console.warn('Impossible de charger le statut Meta Cloud:', e);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    const cleanPhoneId = phoneNumberIdInput.trim();
    const cleanToken = accessTokenInput.trim();
    const cleanVerify = verifyTokenInput.trim() || 'ia_plombier_token_2026';

    try {
      localStorage.setItem('meta_phone_number_id', cleanPhoneId);
      localStorage.setItem('meta_access_token', cleanToken);
      localStorage.setItem('meta_verify_token', cleanVerify);

      // Tester directement la validité du Token auprès de Meta Graph API
      if (cleanPhoneId && cleanToken) {
        const testRes = await fetch(`https://graph.facebook.com/v21.0/${cleanPhoneId}?fields=display_phone_number,verified_name`, {
          headers: { 'Authorization': `Bearer ${cleanToken}` }
        });
        const testData = await testRes.json();
        if (!testRes.ok) {
          throw new Error(testData?.error?.message || 'Identifiants Meta invalides');
        }
        setSaveSuccess(`Connexion validée ! Numéro WhatsApp : ${testData.display_phone_number || cleanPhoneId}`);
      } else {
        setSaveSuccess('Paramètres sauvegardés.');
      }

      await fetchStatus();
      refreshAll();
    } catch (err: any) {
      setSaveError(err.message || 'Erreur de validation auprès de Meta');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber.trim() || !testText.trim()) return;

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: testNumber.trim(),
          content: testText.trim(),
          config: {
            phoneNumberId: phoneNumberIdInput.trim(),
            token: accessTokenInput.trim(),
            verifyToken: verifyTokenInput.trim()
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de l\'envoi Meta');
      }

      setTestResult({
        success: true,
        message: 'Message officiel WhatsApp Cloud envoyé avec succès !',
        messageId: data.messageId
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erreur lors de l\'envoi'
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const isConnected = metaStatus?.status === 'connected' || (phoneNumberIdInput && accessTokenInput);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">WhatsApp Cloud API (Officiel Meta)</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              0 €/mois · 1 000 conv. offertes
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Connecteur officiel WhatsApp Business Platform. 100 % hébergé sur Vercel, sans serveur Node.js lourd, sans QR code et sans PC allumé.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs ${
            isConnected
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border border-amber-200 text-amber-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {isConnected ? 'API Meta Active 24/7' : 'Configuration Requise'}
          </span>
        </div>
      </div>

      {/* Bannière de confirmation Serverless */}
      <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 rounded-2xl text-slate-800 space-y-2 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-slate-900">
              Solution Officielle Recommandée : Zéro Risque, Zéro Machine Locale
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Contrairement à Baileys qui simule WhatsApp Web et risque d'être bloqué, l'<strong>API WhatsApp Cloud de Meta</strong> est le canal officiel pour les professionnels. Elle tourne directement sur les fonctions Serverless de Vercel à chaque message reçu et ne consomme aucune ressource continue.
            </p>
          </div>
        </div>
      </div>

      {/* Cartes Clés Webhook Vercel à Copier */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* URL du Webhook */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-emerald-600" />
              1. URL de Rappel (Callback URL)
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">À coller dans Meta</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <code className="text-xs font-mono text-slate-800 select-all truncate flex-1">{webhookUrl}</code>
            <button
              onClick={() => copyToClipboard(webhookUrl, 'webhook')}
              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs transition"
              title="Copier l'URL du Webhook"
            >
              {copiedField === 'webhook' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            C'est l'URL Vercel qui recevra instantanément les messages de vos clients.
          </p>
        </div>

        {/* Jeton de Vérification (Verify Token) */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              2. Jeton de Vérification (Verify Token)
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Secret Partagé</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <code className="text-xs font-mono text-slate-800 select-all truncate flex-1">{verifyTokenInput}</code>
            <button
              onClick={() => copyToClipboard(verifyTokenInput, 'verify')}
              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs transition"
              title="Copier le Verify Token"
            >
              {copiedField === 'verify' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            À renseigner dans Meta lors de la configuration du Webhook.
          </p>
        </div>
      </div>

      {/* Formulaire des Identifiants Meta Cloud */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">Identifiants WhatsApp Business (Meta)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Récupérez ces 2 valeurs depuis votre tableau de bord <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-semibold underline">Meta for Developers</a>.
          </p>
        </div>

        <form onSubmit={handleSaveCredentials} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ID du numéro de téléphone (Phone Number ID) :
              </label>
              <input
                type="text"
                placeholder="Ex: 104928374829102"
                value={phoneNumberIdInput}
                onChange={e => setPhoneNumberIdInput(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-mono bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Trouvable dans WhatsApp &gt; Configuration de l'API sur Meta.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jeton de vérification Webhook (Optionnel) :
              </label>
              <input
                type="text"
                value={verifyTokenInput}
                onChange={e => setVerifyTokenInput(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-mono bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Par défaut : ia_plombier_token_2026.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jeton d'accès (Access Token Meta) :
            </label>
            <input
              type="password"
              placeholder="Ex: EAAG... (Jeton temporaire ou Jeton d'utilisateur système permanent)"
              value={accessTokenInput}
              onChange={e => setAccessTokenInput(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-mono bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Pour des tests immédiats, utilisez le jeton temporaire (valide 24h). Pour la production, créez un utilisateur système permanent dans Meta Business Manager.
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {saveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Enregistrer & Valider avec Meta
            </button>
          </div>
        </form>
      </div>

      {/* Formulaire de Test d'Envoi WhatsApp Officiel */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Tester l'envoi d'un message officiel WhatsApp</h3>
          <p className="text-xs text-slate-500">
            Envoyez un message vers votre propre numéro pour valider que Meta expédie correctement les messages.
          </p>
        </div>

        <form onSubmit={handleSendTestMessage} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Numéro de destination :</label>
              <input
                type="text"
                required
                placeholder="+33 6 12 34 56 78"
                value={testNumber}
                onChange={e => setTestNumber(autoFormatPhone(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Message :</label>
              <input
                type="text"
                required
                value={testText}
                onChange={e => setTestText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />}
              <div>
                <span>{testResult.message}</span>
                {testResult.messageId && (
                  <span className="block font-mono text-[10px] text-emerald-700 mt-0.5">ID: {testResult.messageId}</span>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSendingTest}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Envoyer le message test
            </button>
          </div>
        </form>
      </div>

      {/* Guide Pas-à-Pas Développeur Meta */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-4">
        <button
          type="button"
          onClick={() => setShowMetaGuide(!showMetaGuide)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Guide Rapide : Obtenir mes accès gratuits sur Meta for Developers en 3 minutes
            </h3>
          </div>
          {showMetaGuide ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showMetaGuide && (
          <div className="pt-2 border-t border-slate-100 text-xs space-y-4 text-slate-600 animate-in fade-in">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                <div>
                  <p className="font-semibold text-slate-800">Créez votre compte Développeur Meta (100% gratuit) :</p>
                  <p className="mt-0.5">
                    Rendez-vous sur <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-medium underline inline-flex items-center gap-0.5">developers.facebook.com <ExternalLink className="w-3 h-3" /></a> et connectez-vous avec votre compte Facebook standard.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                <div>
                  <p className="font-semibold text-slate-800">Créez une Application :</p>
                  <p className="mt-0.5">
                    Cliquez sur <strong>« Mes apps »</strong> &gt; <strong>« Créer une app »</strong> &gt; Sélectionnez le cas d'usage <strong>« Autre »</strong> ou <strong>« Entreprise » (Business)</strong>. Donnez-lui un nom (ex: <em>Assistant Plombier</em>).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                <div>
                  <p className="font-semibold text-slate-800">Ajoutez le produit WhatsApp :</p>
                  <p className="mt-0.5">
                    Dans le tableau de bord de votre app, trouvez <strong>WhatsApp</strong> et cliquez sur <strong>« Configurer »</strong>.
                    Meta vous attribue immédiatement un <strong>numéro de test gratuit</strong>, un <strong>Phone Number ID</strong> et un <strong>Jeton temporaire</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">4</span>
                <div>
                  <p className="font-semibold text-slate-800">Configurez le Webhook Vercel :</p>
                  <p className="mt-0.5">
                    Dans le menu de gauche, allez dans <strong>WhatsApp</strong> &gt; <strong>Configuration</strong> &gt; section <strong>Webhook</strong> :
                  </p>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-700">
                    <li>URL de rappel : collez <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-mono">{webhookUrl}</code></li>
                    <li>Jeton de vérification : collez <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-mono">{verifyTokenInput}</code></li>
                    <li>Cliquez sur <strong>« Vérifier et enregistrer »</strong>. Meta validera instantanément la liaison !</li>
                    <li>Dans les champs du webhook, cliquez sur <strong>Gérer</strong> et cochez la case <strong>messages</strong>.</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">5</span>
                <div>
                  <p className="font-semibold text-slate-800">Bravo, c'est terminé !</p>
                  <p className="mt-0.5">
                    Désormais, tout client qui envoie un message sur WhatsApp déclenche votre fonction Vercel Serverless. Clara (l'IA) analyse la demande et répond en moins de 2 secondes, 24h/24 et 7j/7 sans aucun serveur payant.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
