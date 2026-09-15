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
import { initWhatsAppClient, setWhatsAppBroadcast, getWhatsAppState } from './whatsapp/client.js';
import { startReminderCron } from './services/reminders.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
import { DATA_DIR, UPLOADS_DIR } from './config.js';
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Servir les pièces jointes / fichiers uploadés (devis, factures, images)
app.use('/uploads', express.static(UPLOADS_DIR));
// Gestion des clients WebSocket
const connectedSockets = new Set();
wss.on('connection', (ws) => {
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
setWhatsAppBroadcast((event, data) => {
    const payload = JSON.stringify({ event, data });
    for (const client of connectedSockets) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    }
});
// Endpoint de santé pour sondes Cloud (Render / Railway / Docker healthchecks)
app.get('/api/health', (_req, res) => {
    const wa = getWhatsAppState();
    res.json({
        status: 'ok',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        whatsapp: {
            status: wa.status,
            phoneNumber: wa.phoneNumber,
            lastConnectedAt: wa.lastConnectedAt
        },
        storage: {
            dataDir: DATA_DIR,
            uploadsDir: UPLOADS_DIR
        }
    });
});
// Montage des routes API
app.use('/api', apiRouter);
// Servir l'application React si le build existe (production cloud ou build local)
const candidatePaths = [
    path.resolve(__dirname, '../client'), // Production: dist/server/ -> dist/client
    path.resolve(__dirname, '../dist/client'), // Dev tsx: server/ -> dist/client
    path.resolve(process.cwd(), 'dist/client') // Racine du projet
];
const clientDistPath = candidatePaths.find(p => fs.existsSync(p));
if (clientDistPath) {
    console.log(`[Serveur] Fichiers React servis depuis: ${clientDistPath}`);
    app.use(express.static(clientDistPath));
    app.get('*', (_req, res) => {
        res.sendFile(path.join(clientDistPath, 'index.html'));
    });
}
const PORT = Number(process.env.PORT) || 3001;
const HOST = '0.0.0.0';
async function start() {
    try {
        console.log(`[Serveur] Initialisation de la base SQLite dans: ${DATA_DIR}...`);
        await initDatabase();
        console.log('[Serveur] Base de données SQLite prête.');
        // Démarrage du serveur HTTP & WebSocket sur 0.0.0.0
        server.listen(PORT, HOST, () => {
            console.log(`====================================================`);
            console.log(`🚀 Serveur Backend Cloud actif sur http://${HOST}:${PORT}`);
            console.log(`📡 WebSocket disponible sur ws://${HOST}:${PORT}/ws`);
            console.log(`📁 Dossier de données persistant : ${DATA_DIR}`);
            console.log(`====================================================`);
        });
        // Démarrage du service de rappels automatiques
        startReminderCron(15);
        // Initialisation du client WhatsApp (génère le QR code prêt à être scanné)
        console.log('[Serveur] Démarrage du client WhatsApp Baileys...');
        initWhatsAppClient().catch(err => {
            console.error('[Serveur] Erreur au démarrage WhatsApp:', err);
        });
    }
    catch (err) {
        console.error('[Serveur] Erreur fatale au démarrage:', err);
        process.exit(1);
    }
}
start();
