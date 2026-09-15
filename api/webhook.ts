import { getWhatsAppConfig, sendWhatsAppMessage, markWhatsAppAsRead } from './lib/whatsapp.js';
import { generateCopilotReply } from './lib/ai.js';

export default async function handler(req: any, res: any) {
  const config = getWhatsAppConfig();

  // 1. Validation du Webhook Meta (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === config.verifyToken) {
      console.log('[Meta Webhook] ✅ Webhook validé avec succès par Meta');
      return res.status(200).send(challenge);
    } else {
      console.warn('[Meta Webhook] ❌ Échec validation webhook. Token reçu:', token, 'attendu:', config.verifyToken);
      return res.status(403).send('Jeton de vérification invalide');
    }
  }

  // 2. Réception des événements WhatsApp (POST)
  if (req.method === 'POST') {
    try {
      const body = req.body;

      // Vérifier si l'événement concerne un compte WhatsApp Business
      if (body?.object !== 'whatsapp_business_account') {
        return res.status(200).json({ status: 'ignored' });
      }

      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (!value || value.messaging_product !== 'whatsapp') continue;

          const messages = value.messages || [];
          const contacts = value.contacts || [];

          for (const message of messages) {
            const senderPhone = message.from;
            const messageId = message.id;

            // Récupérer le nom de profil du contact si fourni par WhatsApp
            const matchedContact = contacts.find((c: any) => c.wa_id === senderPhone);
            const senderName = matchedContact?.profile?.name || '';

            let incomingText = '';

            if (message.type === 'text') {
              incomingText = message.text?.body || '';
            } else if (message.type === 'audio') {
              incomingText = "Message vocal reçu du client.";
            } else if (message.type === 'image') {
              incomingText = message.image?.caption || "Photo reçue du client.";
            } else {
              incomingText = "Message reçu.";
            }

            console.log(`[Meta Webhook] 📩 Message de ${senderPhone} (${senderName}): "${incomingText}"`);

            // Marquer le message comme lu
            await markWhatsAppAsRead(messageId);

            // Génération de la réponse IA automatique
            if (incomingText && config.token && config.phoneNumberId) {
              const aiReply = await generateCopilotReply(incomingText, senderName);
              console.log(`[Meta Webhook] 🤖 Réponse générée: "${aiReply}"`);

              // Envoi de la réponse au client via Meta Graph API
              await sendWhatsAppMessage({
                to: senderPhone,
                text: aiReply
              });
              console.log(`[Meta Webhook] 🚀 Réponse envoyée avec succès à ${senderPhone}`);
            }
          }
        }
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('[Meta Webhook] Erreur traitement:', err);
      // Toujours répondre 200 à Meta pour éviter les renvois en boucle
      return res.status(200).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
