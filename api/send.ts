import { sendWhatsAppMessage, getWhatsAppConfig } from './lib/whatsapp.js';

export default async function handler(req: any, res: any) {
  // Activer CORS pour les requêtes frontend
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { phoneNumber, content, config } = req.body || {};

    if (!phoneNumber || !content) {
      return res.status(400).json({ error: 'Numéro de téléphone et message requis' });
    }

    const currentConfig = getWhatsAppConfig();
    const activeToken = config?.token || currentConfig.token;
    const activePhoneId = config?.phoneNumberId || currentConfig.phoneNumberId;

    if (!activeToken || !activePhoneId) {
      return res.status(400).json({
        error: 'Identifiants Meta WhatsApp Cloud manquants. Renseignez votre Token et Phone Number ID dans les paramètres.'
      });
    }

    const result = await sendWhatsAppMessage({
      to: phoneNumber,
      text: content,
      config: {
        token: activeToken,
        phoneNumberId: activePhoneId
      }
    });

    return res.status(200).json({
      success: true,
      via: 'Meta WhatsApp Cloud API (Officiel)',
      messageId: result?.messages?.[0]?.id || null,
      data: result
    });
  } catch (err: any) {
    console.error('[API send] Erreur:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erreur lors de l\'envoi WhatsApp'
    });
  }
}
