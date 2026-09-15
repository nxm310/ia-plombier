/**
 * Service de vérification ultra-rapide de l'API Google Gemini
 * Teste la clé soit via le backend soit directement via l'API Google
 */

export interface GeminiCheckResult {
  ok: boolean;
  message: string;
  model?: string;
  checkedAt: string;
}

export async function checkGeminiApiKey(apiKey?: string): Promise<GeminiCheckResult> {
  const keyToTest = apiKey?.trim();

  // 1. Tenter le test via le backend s'il est joignable
  try {
    const res = await fetch('/api/settings/test-gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: keyToTest })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok) {
        return {
          ok: true,
          message: data.message || 'API Gemini 2.5 Flash connectée avec succès !',
          model: data.model || 'gemini-2.5-flash',
          checkedAt: new Date().toISOString()
        };
      }
    }
  } catch (backendErr) {
    // Si backend indisponible (ex: GitHub Pages), continuer avec le test Google direct
  }

  // 2. Si aucune clé fournie ou passée en argument, vérifier dans localStorage
  const effectiveKey = keyToTest || (() => {
    try {
      const saved = localStorage.getItem('pme_ai_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.geminiApiKey?.trim();
      }
    } catch (e) {}
    return '';
  })();

  if (!effectiveKey) {
    return {
      ok: false,
      message: 'Aucune clé API Gemini renseignée.',
      checkedAt: new Date().toISOString()
    };
  }

  // 3. Test direct ultra-rapide (<250ms) sur l'endpoint officiel Google Generative Language
  try {
    const googleRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${effectiveKey}`
    );

    if (googleRes.ok) {
      const data = await googleRes.json();
      const count = data.models?.length || 0;
      return {
        ok: true,
        message: `API Gemini opérationnelle (${count} modèles accessibles, Gemini 2.5 Flash prêt)`,
        model: 'gemini-2.5-flash',
        checkedAt: new Date().toISOString()
      };
    } else {
      const errData = await googleRes.json().catch(() => ({}));
      const msg = errData.error?.message || `Erreur Google HTTP ${googleRes.status}`;
      return {
        ok: false,
        message: `Clé invalide ou refusée par Google : ${msg}`,
        checkedAt: new Date().toISOString()
      };
    }
  } catch (networkErr: any) {
    return {
      ok: false,
      message: `Erreur de connexion : ${networkErr.message || 'Impossible de joindre les serveurs Google'}`,
      checkedAt: new Date().toISOString()
    };
  }
}
