import dotenv from 'dotenv';
dotenv.config();

// Protection contre les rejets Signal / Baileys en tâche de fond pour garantir 24/7
process.on('unhandledRejection', (reason) => {
  console.warn('[Serveur] Unhandled Rejection interceptée (maintenu actif 24/7):', reason);
});

process.on('uncaughtException', (err) => {
  console.warn('[Serveur] Uncaught Exception interceptée (maintenu actif 24/7):', err);
});

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDatabase } from './db/database.js';
import { apiRouter } from './routes/api.js';
import {
  initWhatsAppClient,
  setWhatsAppBroadcast,
  getWhatsAppState
} from './whatsapp/client.js';
import { startReminderCron } from './services/reminders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir les pièces jointes / fichiers uploadés (devis, factures, images)
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Gestion des clients WebSocket
const connectedSockets = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  connectedSockets.add(ws);

  // Envoi de l'état initial WhatsApp à la connexion
  ws.send(JSON.stringify({
    event: 'whatsapp_status',
    data: getWhatsAppState()
  }));

  ws.on('close', () => {
    connectedSockets.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] Erreur client:', err);
    connectedSockets.delete(ws);
  });
});

// Diffuseur d'événements vers tous les dashboards connectés
setWhatsAppBroadcast((event: string, data: any) => {
  const payload = JSON.stringify({ event, data });
  for (const client of connectedSockets) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
});

// Montage des routes API
app.use('/api', apiRouter);

// Servir l'application React si le build existe
const clientDistPath = path.resolve(__dirname, '../dist/client');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const PORT = Number(process.env.PORT) || 3001;

async function start() {
  try {
    console.log('[Serveur] Initialisation de la base de données SQLite...');
    await initDatabase();
    console.log('[Serveur] Base de données SQLite prête.');

    // Démarrage du serveur HTTP & WebSocket
    server.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Serveur Backend démarré sur http://localhost:${PORT}`);
      console.log(`📡 WebSocket disponible sur ws://localhost:${PORT}/ws`);
      console.log(`====================================================`);
    });

    // Démarrage du service de rappels automatiques
    startReminderCron(15);

    // Initialisation du client WhatsApp (génère le QR code prêt à être scanné)
    console.log('[Serveur] Démarrage du client WhatsApp Baileys...');
    initWhatsAppClient().catch(err => {
      console.error('[Serveur] Erreur au démarrage WhatsApp:', err);
    });

  } catch (err) {
    console.error('[Serveur] Erreur fatale au démarrage:', err);
    process.exit(1);
  }
}

start();
