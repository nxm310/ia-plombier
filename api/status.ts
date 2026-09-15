import { getWhatsAppConfig } from './lib/whatsapp.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const config = getWhatsAppConfig();
  const isConfigured = Boolean(config.token && config.phoneNumberId);

  let metaVerified = false;
  let verifiedNumberDetails: any = null;

  // Si configuré, tester la validité du Token auprès de Meta
  if (isConfigured) {
    try {
      const checkUrl = `https://graph.facebook.com/v21.0/${config.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`;
      const metaRes = await fetch(checkUrl, {
        headers: { 'Authorization': `Bearer ${config.token}` }
      });
      if (metaRes.ok) {
        metaVerified = true;
        verifiedNumberDetails = await metaRes.json();
      }
    } catch (e) {
      console.warn('[API status] Erreur vérification token Meta:', e);
    }
  }

  return res.status(200).json({
    status: isConfigured && metaVerified ? 'connected' : isConfigured ? 'configured' : 'needs_config',
    provider: 'meta_cloud_api',
    isOfficialMeta: true,
    isConfigured,
    metaVerified,
    phoneNumberId: config.phoneNumberId ? `${config.phoneNumberId.slice(0, 4)}••••${config.phoneNumberId.slice(-4)}` : null,
    verifyToken: config.verifyToken,
    displayNumber: verifiedNumberDetails?.display_phone_number || null,
    verifiedName: verifiedNumberDetails?.verified_name || null,
    qualityRating: verifiedNumberDetails?.quality_rating || null,
    hasGemini: Boolean(process.env.GEMINI_API_KEY),
    hasOpenAI: Boolean(process.env.OPENAI_API_KEY)
  });
}
