import { createClient, Client } from '@libsql/client';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || './data';
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'assistant.db');
export const db: Client = createClient({
  url: `file:${DB_PATH}`
});

export async function initDatabase(): Promise<void> {
  // Activer les foreign keys
  await db.execute('PRAGMA foreign_keys = ON;');

  // Contacts
  await db.execute(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT UNIQUE NOT NULL,
      name TEXT,
      email TEXT,
      company TEXT,
      status TEXT DEFAULT 'prospect', -- 'prospect' | 'active' | 'vip' | 'support'
      tags TEXT DEFAULT '[]', -- JSON array
      avatar TEXT,
      notes TEXT,
      ai_enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Migration des colonnes si la table existait déjà
  const contactCols = await db.execute('PRAGMA table_info(contacts);');
  const colNames = contactCols.rows.map(r => r.name);
  if (!colNames.includes('email')) {
    await db.execute('ALTER TABLE contacts ADD COLUMN email TEXT;');
  }
  if (!colNames.includes('company')) {
    await db.execute('ALTER TABLE contacts ADD COLUMN company TEXT;');
  }
  if (!colNames.includes('status')) {
    await db.execute("ALTER TABLE contacts ADD COLUMN status TEXT DEFAULT 'prospect';");
  }
  if (!colNames.includes('tags')) {
    await db.execute("ALTER TABLE contacts ADD COLUMN tags TEXT DEFAULT '[]';");
  }

  // Messages
  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      whatsapp_message_id TEXT UNIQUE,
      contact_id INTEGER NOT NULL,
      direction TEXT NOT NULL, -- 'inbound' | 'outbound'
      sender_type TEXT NOT NULL, -- 'client' | 'ai' | 'human'
      content TEXT NOT NULL,
      status TEXT DEFAULT 'sent', -- 'received', 'sent', 'delivered', 'read'
      media_type TEXT, -- 'document', 'pdf', 'spreadsheet', 'word', 'image', etc.
      media_url TEXT,
      file_name TEXT,
      file_size INTEGER,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );
  `);

  // Migration des colonnes média pour les messages
  const messageCols = await db.execute('PRAGMA table_info(messages);');
  const msgColNames = messageCols.rows.map(r => r.name);
  if (!msgColNames.includes('media_type')) {
    await db.execute('ALTER TABLE messages ADD COLUMN media_type TEXT;');
  }
  if (!msgColNames.includes('media_url')) {
    await db.execute('ALTER TABLE messages ADD COLUMN media_url TEXT;');
  }
  if (!msgColNames.includes('file_name')) {
    await db.execute('ALTER TABLE messages ADD COLUMN file_name TEXT;');
  }
  if (!msgColNames.includes('file_size')) {
    await db.execute('ALTER TABLE messages ADD COLUMN file_size INTEGER;');
  }
  if (!msgColNames.includes('transcription')) {
    await db.execute('ALTER TABLE messages ADD COLUMN transcription TEXT;');
  }

  // Messages internes du Copilote IA pour le Gérant
  await db.execute(`
    CREATE TABLE IF NOT EXISTS copilot_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL, -- 'user' | 'assistant'
      content TEXT NOT NULL,
      action_data TEXT, -- JSON structure des actions exécutées
      timestamp TEXT NOT NULL
    );
  `);

  // Mémoire à long terme par contact
  await db.execute(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL,
      category TEXT NOT NULL, -- 'preference', 'project', 'budget', 'need', 'contact_info', 'general'
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      confidence REAL DEFAULT 1.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );
  `);

  // Collaborateurs de la PME
  await db.execute(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      color TEXT DEFAULT '#2563EB',
      avatar TEXT,
      specialties TEXT DEFAULT '[]', -- JSON Array
      working_hours TEXT NOT NULL, -- JSON Schedule
      status TEXT DEFAULT 'active', -- 'active' | 'vacation' | 'sick' | 'other'
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  const teamCols = await db.execute('PRAGMA table_info(team_members);');
  const tColNames = teamCols.rows.map(r => r.name);
  if (!tColNames.includes('status')) {
    await db.execute("ALTER TABLE team_members ADD COLUMN status TEXT DEFAULT 'active';");
  }

  // Prestations / Services / Interventions
  await db.execute(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Plomberie & Chauffage',
      duration_minutes INTEGER DEFAULT 30,
      price REAL DEFAULT 0,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  const serviceCols = await db.execute('PRAGMA table_info(services);');
  const sColNames = serviceCols.rows.map(r => r.name);
  if (!sColNames.includes('category')) {
    await db.execute("ALTER TABLE services ADD COLUMN category TEXT DEFAULT 'Plomberie & Chauffage';");
  }

  // Rendez-vous
  await db.execute(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL,
      team_member_id INTEGER,
      service_id INTEGER,
      title TEXT NOT NULL,
      date TEXT NOT NULL, -- YYYY-MM-DD
      start_time TEXT NOT NULL, -- HH:MM
      end_time TEXT NOT NULL, -- HH:MM
      status TEXT DEFAULT 'confirmed', -- 'pending', 'confirmed', 'cancelled', 'completed'
      notes TEXT,
      source TEXT DEFAULT 'whatsapp_ai', -- 'whatsapp_ai' | 'manual'
      document_url TEXT,
      document_name TEXT,
      reminder_sent INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
      FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE SET NULL,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
    );
  `);

  // Migrations colonnes documents
  try {
    await db.execute('ALTER TABLE appointments ADD COLUMN document_url TEXT;');
  } catch (_) {}
  try {
    await db.execute('ALTER TABLE appointments ADD COLUMN document_name TEXT;');
  } catch (_) {}

  // Paramètres globaux (Configuration IA, entreprise, horaires d'entreprise)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed des données par défaut si la base est neuve
  await seedDefaultData();
}

async function seedDefaultData() {
  const now = new Date().toISOString();

  // 1. Vérifier si les paramètres existent
  const settingsCheck = await db.execute('SELECT COUNT(*) as count FROM settings');
  if (Number(settingsCheck.rows[0].count) === 0) {
    const defaultSettings = [
      {
        key: 'company',
        value: JSON.stringify({
          name: process.env.COMPANY_NAME || 'InnovTech Solutions',
          activity: process.env.COMPANY_ACTIVITY || 'Conseil, Informatique & Services PME',
          phone: process.env.COMPANY_PHONE || '+33 1 89 20 30 40',
          email: 'contact@innovtech-pme.fr',
          address: '14 Avenue de la République, 75011 Paris',
          website: 'https://innovtech-pme.fr',
          description: 'PME spécialisée dans l\'accompagnement digital, la maintenance informatique, les devis personnalisés et le support technique 24/7 pour professionnels et particuliers.'
        })
      },
      {
        key: 'ai_config',
        value: JSON.stringify({
          provider: process.env.LLM_PROVIDER || 'gemini',
          model: process.env.LLM_MODEL || 'gemini-2.5-flash',
          geminiApiKey: process.env.GEMINI_API_KEY || '',
          openaiApiKey: process.env.OPENAI_API_KEY || '',
          systemPrompt: `Tu es Clara, l'assistante virtuelle intelligente et chaleureuse de l'entreprise.
Tu es disponible 24h/24 et 7j/7 sur WhatsApp pour accueillir les clients, répondre précisément à leurs questions, mémoriser leurs besoins et planifier des rendez-vous avec les bons membres de l'équipe.

Consignes clés :
- Reste toujours courtoise, professionnelle, concise et orientée solution (style WhatsApp : clair, pas de pavés interminables).
- Utilise la mémoire à long terme : rappelle-toi des noms, projets et préférences des clients.
- Quand un client souhaite un rendez-vous, utilise l'outil de vérification des créneaux (getAvailableSlots) pour le collaborateur adapté, puis propose des créneaux précis.
- Dès que le créneau est validé par le client, enregistre le rendez-vous immédiatement avec l'outil bookAppointment.
- Si le client demande à parler à un humain ou que la situation dépasse tes compétences, active l'outil handoverToHuman.
- Ne mentionne jamais que tu es un programme LLM ou que tu appelles des "fonctions/outils", parle naturellement comme une vraie assistante de l'entreprise.`,
          autoReplyHours: 'always', // 'always' | 'outside_business_hours' | 'manual'
          temperature: 0.7
        })
      }
    ];

    for (const s of defaultSettings) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        args: [s.key, s.value, now]
      });
    }
  }

  // 2. Vérifier les collaborateurs
  const teamCheck = await db.execute('SELECT COUNT(*) as count FROM team_members');
  if (Number(teamCheck.rows[0].count) === 0) {
    const defaultSchedule = {
      monday: { enabled: true, slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '18:30' }] },
      tuesday: { enabled: true, slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '18:30' }] },
      wednesday: { enabled: true, slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '18:30' }] },
      thursday: { enabled: true, slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '18:30' }] },
      friday: { enabled: true, slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '17:30' }] },
      saturday: { enabled: false, slots: [] },
      sunday: { enabled: false, slots: [] }
    };

    const team = [
      {
        name: 'Marc Dupont',
        role: 'Directeur Commercial & Devis',
        email: 'marc.dupont@innovtech-pme.fr',
        phone: '+33 6 12 34 56 78',
        color: '#2563EB',
        specialties: JSON.stringify(['Devis commercial', 'Nouveaux projets', 'Audit initial', 'Grand compte']),
        working_hours: JSON.stringify(defaultSchedule)
      },
      {
        name: 'Sophie Martin',
        role: 'Responsable Support & Projets',
        email: 'sophie.martin@innovtech-pme.fr',
        phone: '+33 6 23 45 67 89',
        color: '#10B981',
        specialties: JSON.stringify(['Support technique', 'Suivi de chantier', 'SAV', 'Formation client']),
        working_hours: JSON.stringify(defaultSchedule)
      },
      {
        name: 'Thomas Leroy',
        role: 'Expert Technique & Déploiement',
        email: 'thomas.leroy@innovtech-pme.fr',
        phone: '+33 6 34 56 78 90',
        color: '#8B5CF6',
        specialties: JSON.stringify(['Installation sur site', 'Diagnostic panne', 'Infrastructure', 'Réseau']),
        working_hours: JSON.stringify(defaultSchedule)
      }
    ];

    for (const m of team) {
      await db.execute({
        sql: `INSERT INTO team_members (name, role, email, phone, color, specialties, working_hours, is_active, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        args: [m.name, m.role, m.email, m.phone, m.color, m.specialties, m.working_hours, now]
      });
    }
  }

  // 3. Vérifier les services
  const servicesCheck = await db.execute('SELECT COUNT(*) as count FROM services');
  if (Number(servicesCheck.rows[0].count) === 0) {
    const services = [
      { name: 'Échange Découverte & Devis (Téléphone)', duration: 30, price: 0, description: 'Premier contact téléphonique pour cadrer les besoins et préparer une proposition sur-mesure.' },
      { name: 'Rendez-vous Diagnostic Approfondi', duration: 45, price: 0, description: 'Analyse détaillée en visio ou par téléphone avec un expert dédié.' },
      { name: 'Intervention Technique sur Site', duration: 90, price: 120, description: 'Déplacement et intervention directe par notre technicien.' }
    ];

    for (const s of services) {
      await db.execute({
        sql: `INSERT INTO services (name, duration_minutes, price, description, is_active, created_at)
              VALUES (?, ?, ?, ?, 1, ?)`,
        args: [s.name, s.duration, s.price, s.description, now]
      });
    }
  }
}
