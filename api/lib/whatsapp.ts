export interface WhatsAppConfig {
  token: string;
  phoneNumberId: string;
  verifyToken: string;
}

export function getWhatsAppConfig(): WhatsAppConfig {
  return {
    token: (
      process.env.WHATSAPP_TOKEN ||
      process.env.WHATSAPP_ACCESS_TOKEN ||
      process.env.META_ACCESS_TOKEN ||
      ''
    ).trim(),
    phoneNumberId: (
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      process.env.META_PHONE_NUMBER_ID ||
      ''
    ).trim(),
    verifyToken: (
      process.env.WHATSAPP_VERIFY_TOKEN ||
      process.env.META_VERIFY_TOKEN ||
      'ia_plombier_token_2026'
    ).trim()
  };
}

export async function sendWhatsAppMessage(options: {
  to: string;
  text: string;
  config?: Partial<WhatsAppConfig>;
}) {
  const currentConfig = { ...getWhatsAppConfig(), ...options.config };

  if (!currentConfig.token || !currentConfig.phoneNumberId) {
    throw new Error('Identifiants Meta WhatsApp Cloud manquants (WHATSAPP_TOKEN ou WHATSAPP_PHONE_NUMBER_ID).');
  }

  // Normalisation du numéro : retirer les espaces, tirets et le +
  let cleanTo = options.to.replace(/[^\d]/g, '');
  // Format national français (ex: 0612345678 -> 33612345678)
  if (cleanTo.startsWith('0') && cleanTo.length === 10) {
    cleanTo = '33' + cleanTo.substring(1);
  }

  const url = `https://graph.facebook.com/v21.0/${currentConfig.phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'text',
    text: {
      preview_url: false,
      body: options.text
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${currentConfig.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.error?.message || `Erreur HTTP ${response.status}`;
    console.error('[WhatsApp Cloud API] Erreur envoi:', data);
    throw new Error(`Erreur Meta WhatsApp: ${errorMsg}`);
  }

  return data;
}

export async function markWhatsAppAsRead(messageId: string, config?: Partial<WhatsAppConfig>) {
  const currentConfig = { ...getWhatsAppConfig(), ...config };
  if (!currentConfig.token || !currentConfig.phoneNumberId) return;

  try {
    const url = `https://graph.facebook.com/v21.0/${currentConfig.phoneNumberId}/messages`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentConfig.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      })
    });
  } catch (err) {
    console.warn('[WhatsApp Cloud API] Erreur markAsRead:', err);
  }
}
