import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  WASocket,
  proto,
  downloadMediaMessage
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import pino from 'pino';
import {
  getOrCreateContact,
  saveMessage,
  getContactById,
  getMessageByWhatsAppId,
  normalizePhone
} from '../db/queries.js';

export type WhatsAppStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected';

export interface WhatsAppState {
  status: WhatsAppStatus;
  qrCodeDataUrl: string | null;
  pairingCode: string | null;
  phoneNumber: string | null;
  lastConnectedAt: string | null;
  error: string | null;
}

// Caches pour la renégociation de clés et déchiffrement E2EE (évite "En attente de ce message")
const recentSentMessages = new Map<string, proto.IMessage>();
const msgRetryCounterMap = new Map<string, any>();
const msgRetryCounterCache = {
  get: <T>(key: string): T | undefined => msgRetryCounterMap.get(key) as T | undefined,
  set: <T>(key: string, value: T) => {
    msgRetryCounterMap.set(key, value);
    if (msgRetryCounterMap.size > 1000) {
      const firstKey = msgRetryCounterMap.keys().next().value;
      if (firstKey) msgRetryCounterMap.delete(firstKey);
    }
  },
  del: (key: string) => {
    msgRetryCounterMap.delete(key);
  },
  flushAll: () => {
    msgRetryCounterMap.clear();
  },
};

function cacheSentMessage(id?: string | null, message?: proto.IMessage | null) {
  if (!id || !message) return;
  if (recentSentMessages.size > 500) {
    const firstKey = recentSentMessages.keys().next().value;
    if (firstKey) recentSentMessages.delete(firstKey);
  }
  recentSentMessages.set(id, message);
}

const state: WhatsAppState = {
  status: 'disconnected',
  qrCodeDataUrl: null,
  pairingCode: null,
  phoneNumber: null,
  lastConnectedAt: null,
  error: null
};

let sock: WASocket | null = null;
let broadcastCallback: ((event: string, data: any) => void) | null = null;

export function setWhatsAppBroadcast(cb: (event: string, data: any) => void) {
  broadcastCallback = cb;
}

export function broadcast(event: string, data: any) {
  if (broadcastCallback) {
    broadcastCallback(event, data);
  }
}

export function getWhatsAppState(): WhatsAppState {
  return { ...state };
}

import { DATA_DIR } from '../config.js';
const AUTH_DIR = path.join(DATA_DIR, 'whatsapp_session');

function cleanAuthDir() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
  } catch (e) {
    console.error('[WhatsApp] Erreur nettoyage dossier auth:', e);
  }
}

if (!fs.existsSync(AUTH_DIR)) {
  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  } catch (e) {
    console.warn('[WhatsApp] Erreur création AUTH_DIR:', e);
  }
}

export async function initWhatsAppClient(forceReset: boolean = false) {
  if (forceReset) {
    return resetWhatsAppSession();
  }

  if (sock) {
    return;
  }

  try {
    state.status = 'connecting';
    state.error = null;
    broadcast('whatsapp_status', state);

    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const logger = pino({ level: 'silent' });

    // Sécurité Cloud : Si la session est déjà enregistrée (numéro jumelé),
    // on ne purge JAMAIS les clés au démarrage pour préserver l'autonomie 24/7.
    let staleCheckTimeout: NodeJS.Timeout | null = null;
    if (!authState.creds?.registered) {
      staleCheckTimeout = setTimeout(async () => {
        if (state.status === 'connecting' && !state.qrCodeDataUrl) {
          console.warn('[WhatsApp] Clés temporaires sans jumelage expirées. Nouveau QR...');
          await resetWhatsAppSession();
        }
      }, 35000);
    } else {
      console.log(`[WhatsApp] 🔐 Session persistante détectée (ID: ${authState.creds.me?.id || 'enregistré'}). Connexion immédiate sans perte de clés...`);
    }

    sock = makeWASocket({
      version,
      logger,
      auth: authState,
      // Ubuntu / Chrome est la signature la plus stable reconnue par WhatsApp
      browser: Browsers.ubuntu('Chrome'),
      // CRITIQUE : syncFullHistory à false évite le crash OOM de l'app WhatsApp sur le téléphone
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 15000,
      emitOwnEvents: false,
      fireInitQueries: true,
      msgRetryCounterCache,
      getMessage: async (key): Promise<proto.IMessage | undefined> => {
        if (!key.id) return undefined;
        // 1. Chercher dans le cache mémoire récent
        if (recentSentMessages.has(key.id)) {
          return recentSentMessages.get(key.id);
        }
        // 2. Chercher dans la base SQLite locale
        try {
          const savedMsg = await getMessageByWhatsAppId(key.id);
          if (savedMsg && savedMsg.content) {
            return {
              conversation: savedMsg.content
            };
          }
        } catch (e) {
          console.error('[WhatsApp] Erreur getMessage pour retry request:', e);
        }
        return undefined;
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        if (staleCheckTimeout) clearTimeout(staleCheckTimeout);
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
          state.status = 'qr_ready';
          state.qrCodeDataUrl = qrDataUrl;
          state.error = null;
          broadcast('whatsapp_qr', { qrDataUrl });
          broadcast('whatsapp_status', state);
          console.log('[WhatsApp] Nouveau QR code prêt à être scanné');
        } catch (err) {
          console.error('[WhatsApp] Erreur génération QR code:', err);
        }
      }

      if (connection === 'close') {
        if (staleCheckTimeout) clearTimeout(staleCheckTimeout);
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const isRestartRequired = statusCode === DisconnectReason.restartRequired; // 515
        const isLoggedOut = statusCode === DisconnectReason.loggedOut; // 401

        console.log(`[WhatsApp] Connexion fermée. Code: ${statusCode} (Restart: ${isRestartRequired}, LoggedOut: ${isLoggedOut})`);

        sock = null;

        // Le code 515 correspond à l'étape normale de validation du scan : on RECONNECTE IMMÉDIATEMENT sans toucher aux clés !
        if (isRestartRequired) {
          console.log('[WhatsApp] Code 515 (restart required) reçu : reconnexion immédiate pour finaliser le jumelage...');
          state.status = 'connecting';
          broadcast('whatsapp_status', state);
          setTimeout(() => {
            initWhatsAppClient();
          }, 800);
          return;
        }

        if (isLoggedOut) {
          console.log('[WhatsApp] Déconnexion confirmée. Nettoyage de la session.');
          cleanAuthDir();
          state.status = 'disconnected';
          state.qrCodeDataUrl = null;
          state.pairingCode = null;
          state.phoneNumber = null;
          broadcast('whatsapp_status', state);
          return;
        }

        // Reconnexion réseau temporaire
        state.status = 'disconnected';
        broadcast('whatsapp_status', state);
        setTimeout(() => {
          initWhatsAppClient();
        }, 3000);

      } else if (connection === 'open') {
        state.status = 'connected';
        state.qrCodeDataUrl = null;
        state.pairingCode = null;
        state.phoneNumber = sock?.user?.id ? sock.user.id.split(':')[0] : null;
        state.lastConnectedAt = new Date().toISOString();
        state.error = null;

        console.log(`🎉 [WhatsApp] Connecté avec succès 24/7 ! Numéro: ${state.phoneNumber}`);
        broadcast('whatsapp_status', state);
      }
    });

async function processMessageMedia(
  rawMsg: any,
  sockInstance: WASocket | null,
  loggerInstance: any
): Promise<{
  text: string;
  mediaType?: string | null;
  mediaUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  transcription?: string | null;
}> {
  const messageContent = rawMsg.message;
  if (!messageContent) return { text: '' };
  const msg =
    messageContent.ephemeralMessage?.message ||
    messageContent.viewOnceMessage?.message ||
    messageContent.viewOnceMessageV2?.message ||
    messageContent.documentWithCaptionMessage?.message ||
    messageContent;

  // 1. Message audio / vocal WhatsApp (PTT ou fichier audio)
  if (msg.audioMessage) {
    const audio = msg.audioMessage;
    const isPtt = Boolean(audio.ptt);
    const ext = audio.mimetype?.includes('mp4') ? 'm4a' : 'ogg';
    const fileName = isPtt ? 'Message vocal.ogg' : `Audio.${ext}`;
    let mediaUrl: string | null = null;
    let audioBuffer: Buffer | null = null;
    let transcription = '';

    try {
      if (sockInstance) {
        audioBuffer = (await downloadMediaMessage(
          rawMsg,
          'buffer',
          {},
          {
            logger: loggerInstance,
            reuploadRequest: sockInstance.updateMediaMessage
          }
        )) as Buffer;
      }
    } catch (e) {
      console.error('[WhatsApp] Erreur lors du téléchargement du message vocal:', e);
    }

    if (audioBuffer && audioBuffer.length > 0) {
      try {
        const uploadsDir = path.resolve(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const savedFileName = `voice_${Date.now()}_${rawMsg.key?.id || 'audio'}.${ext}`;
        const localFilePath = path.join(uploadsDir, savedFileName);
        fs.writeFileSync(localFilePath, audioBuffer);
        mediaUrl = `/uploads/${savedFileName}`;

        console.log(`[WhatsApp] 🎙️ Message vocal sauvegardé avec succès (${audioBuffer.length} octets).`);
      } catch (err) {
        console.error('[WhatsApp] Erreur traitement audio vocal:', err);
      }
    }

    const text = transcription ? `[🎙️ Vocal] ${transcription}` : '[🎙️ Message vocal]';
    return {
      text,
      mediaType: 'audio',
      mediaUrl,
      fileName,
      fileSize: audioBuffer ? audioBuffer.length : Number(audio.fileLength || 0),
      transcription: transcription || null
    };
  }

  // 2. Document
  if (msg.documentMessage) {
    const doc = msg.documentMessage;
    const fileName = doc.fileName || 'Document';
    let mediaType = 'document';
    if (fileName.toLowerCase().endsWith('.pdf')) mediaType = 'pdf';
    else if (fileName.match(/\.(xlsx|xls|csv)$/i)) mediaType = 'spreadsheet';
    else if (fileName.match(/\.(docx|doc)$/i)) mediaType = 'word';

    const caption = doc.caption || '';
    const text = caption ? `${caption}\n[📎 ${fileName}]` : `[📎 Document: ${fileName}]`;
    return {
      text,
      mediaType,
      fileName,
      fileSize: Number(doc.fileLength || 0)
    };
  }

  // 3. Image
  if (msg.imageMessage) {
    const caption = msg.imageMessage.caption || '';
    return {
      text: caption ? `${caption}\n[📷 Image]` : '[📷 Image]',
      mediaType: 'image',
      fileName: 'image.jpg',
      fileSize: Number(msg.imageMessage.fileLength || 0)
    };
  }

  // 4. Texte standard
  const text =
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.videoMessage?.caption ||
    '';

  return { text };
}

    sock.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify' && m.type !== 'append') return;

      for (const msg of m.messages) {
        if (!msg.message) continue;

        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid.endsWith('@broadcast')) {
          continue;
        }

        const mediaInfo = await processMessageMedia(msg, sock, logger);
        const messageText = mediaInfo.text;
        if (!messageText.trim()) continue;

        // CAS 1 : Message sortant (envoyé par l'humain depuis son téléphone portable ou depuis l'app web)
        if (msg.key.fromMe) {
          // Si le message a déjà été enregistré (via l'interface web ou par l'IA), ne pas le dupliquer
          if (msg.key.id) {
            const existing = await getMessageByWhatsAppId(msg.key.id);
            if (existing) continue;
          }

          const targetPhone = remoteJid.split('@')[0].split(':')[0];
          try {
            const contact = await getOrCreateContact(targetPhone);
            const savedOutbound = await saveMessage(
              contact.id,
              'outbound',
              'human',
              messageText,
              msg.key.id || undefined,
              'sent',
              mediaInfo.mediaType || null,
              mediaInfo.mediaUrl || null,
              mediaInfo.fileName || null,
              mediaInfo.fileSize || null,
              mediaInfo.transcription || null
            );

            console.log(`[WhatsApp] 📱 Message sortant capturé depuis le smartphone pour ${contact.phone_number}: "${messageText}"`);

            broadcast('new_message', {
              contact,
              message: savedOutbound
            });
          } catch (err) {
            console.error('[WhatsApp] Erreur lors de l\'enregistrement du message sortant smartphone:', err);
          }
          continue;
        }

        // CAS 2 : Message entrant (provenant d'un client)
        const pushName = msg.pushName || 'Client WhatsApp';
        const senderPhone = remoteJid.split('@')[0].split(':')[0];

        try {
          const contact = await getOrCreateContact(senderPhone, pushName);

          const savedInbound = await saveMessage(
            contact.id,
            'inbound',
            'client',
            messageText,
            msg.key.id || undefined,
            'received',
            mediaInfo.mediaType || null,
            mediaInfo.mediaUrl || null,
            mediaInfo.fileName || null,
            mediaInfo.fileSize || null,
            mediaInfo.transcription || null
          );

          broadcast('new_message', {
            contact,
            message: savedInbound
          });
        } catch (err) {
          console.error('[WhatsApp] Erreur lors du traitement du message entrant:', err);
        }
      }
    });
  } catch (err: any) {
    console.error('[WhatsApp] Erreur d\'initialisation:', err);
    state.status = 'disconnected';
    state.error = err.message || 'Erreur inconnue';
    broadcast('whatsapp_status', state);
  }
}

/**
 * Génère un code de jumelage à 8 caractères pour lier WhatsApp sans utiliser la caméra
 */
export async function requestPairingCode(phoneNumber: string): Promise<string> {
  const cleanPhone = normalizePhone(phoneNumber);
  if (!cleanPhone || cleanPhone.length < 8) {
    throw new Error('Numéro de téléphone invalide pour le code de jumelage (format attendu : ex. 06 12 34 56 78 ou +33 6 12 34 56 78)');
  }

  // Réinitialiser la session pour démarrer un appairage propre
  if (sock) {
    try {
      sock.end(undefined);
    } catch (e) {}
    sock = null;
  }
  cleanAuthDir();

  await initWhatsAppClient();

  // Attendre que le socket soit initialisé
  let attempts = 0;
  while (!sock && attempts < 15) {
    await new Promise(r => setTimeout(r, 200));
    attempts++;
  }

  if (!sock) {
    throw new Error('Impossible d\'initialiser le client WhatsApp');
  }

  // Petite pause pour s'assurer que le socket est connecté au serveur WhatsApp
  await new Promise(r => setTimeout(r, 1500));

  const activeSock: any = sock;
  if (!activeSock || typeof activeSock.requestPairingCode !== 'function') {
    throw new Error('Le client WhatsApp ne supporte pas le code de jumelage actuellement');
  }

  const code = await activeSock.requestPairingCode(cleanPhone);
  state.pairingCode = code;
  state.status = 'qr_ready';
  broadcast('whatsapp_pairing_code', { pairingCode: code });
  broadcast('whatsapp_status', state);

  console.log(`[WhatsApp] Code de jumelage généré pour ${cleanPhone}: ${code}`);
  return code;
}

/**
 * Envoi manuel d'un message par un collaborateur humain depuis le tableau de bord web
 */
export async function sendManualWhatsAppMessage(
  phoneNumber: string,
  text: string,
  explicitContactId?: number
): Promise<boolean> {
  if (!sock || state.status !== 'connected') {
    throw new Error('WhatsApp n\'est pas connecté. Veuillez scanner le QR code ou entrer un code.');
  }

  const cleanPhone = normalizePhone(phoneNumber);
  const jid = `${cleanPhone}@s.whatsapp.net`;

  const sent = await sock.sendMessage(jid, { text });
  if (sent?.key?.id && sent.message) {
    cacheSentMessage(sent.key.id, sent.message);
  }

  let contact: any = null;
  if (explicitContactId) {
    contact = await getContactById(explicitContactId);
  }
  if (!contact) {
    contact = await getOrCreateContact(cleanPhone);
  }

  const savedMsg = await saveMessage(
    contact.id,
    'outbound',
    'human',
    text,
    sent?.key?.id || undefined,
    'sent'
  );

  broadcast('new_message', {
    contact,
    message: savedMsg
  });

  return true;
}

/**
 * Envoi d'un fichier ou document (devis PDF, facture, tableur Excel, image...) via WhatsApp
 */
export async function sendManualWhatsAppFile(
  phoneNumber: string,
  filePath: string,
  originalFileName: string,
  mimeType: string,
  caption?: string
): Promise<{ messageId?: string }> {
  if (!sock || state.status !== 'connected') {
    throw new Error('WhatsApp n\'est pas connecté.');
  }

  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const jid = `${cleanPhone}@s.whatsapp.net`;
  const fileBuffer = fs.readFileSync(filePath);

  let sent: any;
  if (mimeType.startsWith('image/')) {
    sent = await sock.sendMessage(jid, {
      image: fileBuffer,
      caption: caption || undefined
    });
  } else {
    sent = await sock.sendMessage(jid, {
      document: fileBuffer,
      mimetype: mimeType || 'application/octet-stream',
      fileName: originalFileName,
      caption: caption || undefined
    });
  }

  if (sent?.key?.id && sent.message) {
    cacheSentMessage(sent.key.id, sent.message);
  }

  return { messageId: sent?.key?.id };
}

/**
 * Déconnexion propre de la session WhatsApp (avec sécurité anti-blocage)
 */
export async function disconnectWhatsApp(): Promise<void> {
  if (sock) {
    try {
      if (state.status === 'connected') {
        await Promise.race([
          sock.logout(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 2500))
        ]).catch(() => {});
      }
      sock.end(undefined);
    } catch (e) {
      console.warn('[WhatsApp] Erreur lors du logout/fermeture:', e);
    }
    sock = null;
  }
  cleanAuthDir();
  state.status = 'disconnected';
  state.qrCodeDataUrl = null;
  state.pairingCode = null;
  state.phoneNumber = null;
  state.error = null;
  broadcast('whatsapp_status', state);
}

/**
 * Réinitialise complètement la session WhatsApp et force la génération immédiate d'un nouveau QR Code
 */
export async function resetWhatsAppSession(): Promise<void> {
  console.log('[WhatsApp] Réinitialisation forcée de la session demandée.');
  if (sock) {
    try {
      sock.end(undefined);
    } catch (e) {}
    sock = null;
  }
  cleanAuthDir();
  state.status = 'disconnected';
  state.qrCodeDataUrl = null;
  state.pairingCode = null;
  state.phoneNumber = null;
  state.error = null;
  broadcast('whatsapp_status', state);

  // Petit délai de sécurité pour que le système de fichiers libère les verrous
  await new Promise(resolve => setTimeout(resolve, 500));
  await initWhatsAppClient();
}
