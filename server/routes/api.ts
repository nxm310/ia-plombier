import { Router, Request, Response } from 'express';
import {
  getAllContacts,
  getContactById,
  updateContact,
  getMessagesByContact,
  saveMessage,
  getMemoriesByContact,
  saveOrUpdateMemory,
  deleteMemory,
  getAllTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  deleteAllServices,
  seedPlumberServices,
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getSetting,
  setSetting,
  getDashboardStats,
  getOrCreateContact,
  createContactManually,
  deleteContact,
  getCopilotMessages,
  clearCopilotMessages
} from '../db/queries.js';
import {
  INDUSTRY_PRESETS,
  generateCustomTradeConfig,
  IndustryPreset
} from '../services/industryPresets.js';
import { getAvailableSlots } from '../services/appointments.js';
import {
  sendAppointmentConfirmationNotification,
  sendCollaboratorAppointmentNotification,
  generateIcsContent,
  generateGoogleCalendarUrl
} from '../services/calendar.js';
import path from 'path';
import fs from 'fs';
import {
  getWhatsAppState,
  initWhatsAppClient,
  resetWhatsAppSession,
  disconnectWhatsApp,
  sendManualWhatsAppMessage,
  sendManualWhatsAppFile,
  requestPairingCode,
  broadcast
} from '../whatsapp/client.js';
import { generateAgentReply } from '../ai/agent.js';
import { chatWithCopilot } from '../ai/copilot.js';

export const apiRouter = Router();

// Stats Dashboard
apiRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getDashboardStats();
    const waState = getWhatsAppState();
    res.json({ ...stats, whatsapp: waState });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// Copilote IA pour le Gérant (Chat interne avec exécution d'actions)
// =========================================================================
apiRouter.get('/copilot/messages', async (_req: Request, res: Response) => {
  try {
    const messages = await getCopilotMessages();
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/copilot/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Le message ne peut pas être vide.' });
    }
    const result = await chatWithCopilot({ message: message.trim() });
    res.json(result);
  } catch (err: any) {
    console.error('[API] Erreur Copilote Chat:', err);
    res.status(500).json({ error: err.message || 'Erreur lors du traitement copilote' });
  }
});

apiRouter.delete('/copilot/messages', async (_req: Request, res: Response) => {
  try {
    await clearCopilotMessages();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Contacts
apiRouter.get('/contacts', async (_req: Request, res: Response) => {
  try {
    const contacts = await getAllContacts();
    res.json(contacts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const contact = await getContactById(Number(req.params.id));
    if (!contact) return res.status(404).json({ error: 'Contact introuvable' });
    res.json(contact);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/contacts', async (req: Request, res: Response) => {
  try {
    const { phone_number, name, email, company, status, tags, notes } = req.body;
    if (!phone_number) return res.status(400).json({ error: 'Numéro de téléphone requis' });
    const contact = await createContactManually({
      phone_number,
      name,
      email,
      company,
      status,
      tags,
      notes
    });
    res.status(201).json(contact);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name, phone_number, email, company, status, tags, notes, ai_enabled, avatar } = req.body;
    await updateContact(id, {
      name,
      phone_number,
      email,
      company,
      status,
      tags,
      notes,
      ai_enabled,
      avatar
    });
    const updated = await getContactById(id);
    if (!updated) return res.status(404).json({ error: 'Contact introuvable' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name, phone_number, email, company, status, tags, notes, ai_enabled, avatar } = req.body;
    await updateContact(id, {
      name,
      phone_number,
      email,
      company,
      status,
      tags,
      notes,
      ai_enabled,
      avatar
    });
    const updated = await getContactById(id);
    if (!updated) return res.status(404).json({ error: 'Contact introuvable' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await deleteContact(id);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Messages d'un contact
apiRouter.get('/contacts/:id/messages', async (req: Request, res: Response) => {
  try {
    const messages = await getMessagesByContact(Number(req.params.id));
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Envoi manuel de message
apiRouter.post('/messages/send', async (req: Request, res: Response) => {
  try {
    const { contactId, phoneNumber, content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Le contenu du message est vide' });
    }

    let phone = phoneNumber;
    if (!phone && contactId) {
      const contact = await getContactById(Number(contactId));
      if (contact) phone = contact.phone_number;
    }

    if (!phone) {
      return res.status(400).json({ error: 'Numéro de téléphone requis' });
    }

    const waState = getWhatsAppState();
    if (waState.status === 'connected') {
      await sendManualWhatsAppMessage(phone, content);
      res.json({ success: true, via: 'whatsapp' });
    } else {
      // En mode non connecté / démo : enregistre directement le message dans la base
      const contact = await getOrCreateContact(phone);
      const msg = await saveMessage(contact.id, 'outbound', 'human', content, undefined, 'sent');
      res.json({ success: true, via: 'local', message: msg });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Envoi de fichiers / documents (Devis PDF, factures, tableurs Excel, images...)
apiRouter.post('/messages/send-file', async (req: Request, res: Response) => {
  try {
    const { contactId, phoneNumber, fileName, mimeType, fileData, caption } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'Fichier requis (fileName et fileData requis)' });
    }

    let phone = phoneNumber;
    if (!phone && contactId) {
      const contact = await getContactById(Number(contactId));
      if (contact) phone = contact.phone_number;
    }

    if (!phone) {
      return res.status(400).json({ error: 'Numéro de téléphone requis' });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const contact = await getOrCreateContact(cleanPhone);

    // Sauvegarder le fichier dans le dossier uploads
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${Date.now()}_${safeName}`;
    const targetPath = path.join(uploadsDir, uniqueFileName);

    const base64Data = fileData.includes(';base64,')
      ? fileData.split(';base64,')[1]
      : fileData;

    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(targetPath, buffer);

    const mediaUrl = `/uploads/${uniqueFileName}`;
    const fileSize = buffer.length;

    let mediaType = 'document';
    const lowerName = fileName.toLowerCase();
    if (mimeType?.startsWith('image/')) mediaType = 'image';
    else if (lowerName.endsWith('.pdf')) mediaType = 'pdf';
    else if (lowerName.match(/\.(xlsx|xls|csv)$/)) mediaType = 'spreadsheet';
    else if (lowerName.match(/\.(docx|doc)$/)) mediaType = 'word';

    const waState = getWhatsAppState();
    let whatsappMessageId: string | undefined;

    if (waState.status === 'connected') {
      try {
        const sent = await sendManualWhatsAppFile(
          cleanPhone,
          targetPath,
          fileName,
          mimeType || 'application/octet-stream',
          caption
        );
        whatsappMessageId = sent.messageId;
      } catch (waErr: any) {
        console.error('[API] Erreur envoi fichier WhatsApp:', waErr);
      }
    }

    const contentText = caption
      ? `${caption}\n[📎 ${fileName}]`
      : `[📎 ${fileName}]`;

    const savedMsg = await saveMessage(
      contact.id,
      'outbound',
      'human',
      contentText,
      whatsappMessageId,
      'sent',
      mediaType,
      mediaUrl,
      fileName,
      fileSize
    );

    broadcast('new_message', {
      contact,
      message: savedMsg
    });

    res.json({ success: true, message: savedMsg });
  } catch (err: any) {
    console.error('[API] Erreur envoi fichier:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upload générique de document (ex: devis, plan technique PDF pour rendez-vous)
apiRouter.post('/upload-document', async (req: Request, res: Response) => {
  try {
    const { fileName, fileData } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'Nom de fichier et données requis' });
    }

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${Date.now()}_${safeName}`;
    const targetPath = path.join(uploadsDir, uniqueFileName);

    const base64Data = fileData.includes(';base64,')
      ? fileData.split(';base64,')[1]
      : fileData;

    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(targetPath, buffer);

    const documentUrl = `/uploads/${uniqueFileName}`;
    res.json({
      success: true,
      url: documentUrl,
      name: fileName,
      size: buffer.length
    });
  } catch (err: any) {
    console.error('[API] Erreur upload document:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mémoire Client
apiRouter.get('/contacts/:id/memories', async (req: Request, res: Response) => {
  try {
    const memories = await getMemoriesByContact(Number(req.params.id));
    res.json(memories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/contacts/:id/memories', async (req: Request, res: Response) => {
  try {
    const contactId = Number(req.params.id);
    const { category, key, value } = req.body;
    if (!category || !key || !value) {
      return res.status(400).json({ error: 'category, key et value sont requis' });
    }
    await saveOrUpdateMemory(contactId, category, key, value);
    const memories = await getMemoriesByContact(contactId);
    res.json(memories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/memories/:id', async (req: Request, res: Response) => {
  try {
    await deleteMemory(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Équipe (Collaborateurs PME)
apiRouter.get('/team', async (_req: Request, res: Response) => {
  try {
    const members = await getAllTeamMembers(false);
    res.json(members);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/team', async (req: Request, res: Response) => {
  try {
    const id = await createTeamMember(req.body);
    const member = await getTeamMemberById(id);
    res.status(201).json(member);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/team/:id', async (req: Request, res: Response) => {
  try {
    const member = await getTeamMemberById(Number(req.params.id));
    if (!member) return res.status(404).json({ error: 'Collaborateur introuvable' });
    res.json(member);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/team/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await updateTeamMember(id, req.body);
    const updated = await getTeamMemberById(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/team/:id', async (req: Request, res: Response) => {
  try {
    await deleteTeamMember(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créneaux disponibles pour un collaborateur
apiRouter.get('/team/:id/slots', async (req: Request, res: Response) => {
  try {
    const teamMemberId = Number(req.params.id);
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const duration = Number(req.query.duration || 30);
    const slots = await getAvailableSlots(teamMemberId, date, duration);
    res.json({ teamMemberId, date, duration, slots });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Services / Interventions
apiRouter.get('/services', async (_req: Request, res: Response) => {
  try {
    const services = await getAllServices(false);
    res.json(services);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/services', async (req: Request, res: Response) => {
  try {
    const { name, category, duration_minutes, price, description, is_active } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom de l\'intervention est requis' });

    const id = await createService({
      name,
      category: category || 'Plomberie & Chauffage',
      duration_minutes: Number(duration_minutes) || 30,
      price: price !== undefined ? Number(price) : 0,
      description: description || null,
      is_active: is_active !== undefined ? Number(is_active) : 1
    });

    const newService = await getServiceById(id);
    res.status(201).json(newService);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/services/:id', async (req: Request, res: Response) => {
  try {
    const service = await getServiceById(Number(req.params.id));
    if (!service) return res.status(404).json({ error: 'Intervention introuvable' });
    res.json(service);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/services/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await updateService(id, req.body);
    const updated = await getServiceById(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/services/:id', async (req: Request, res: Response) => {
  try {
    await deleteService(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/services/seed-plumber', async (_req: Request, res: Response) => {
  try {
    await seedPlumberServices();
    const services = await getAllServices(false);
    res.json({ success: true, services });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vider l'ensemble du catalogue de services pour repartir de zéro (base vierge)
apiRouter.post('/services/clear-all', async (_req: Request, res: Response) => {
  try {
    await deleteAllServices();
    res.json({ success: true, message: 'Catalogue des prestations réinitialisé avec succès (base vierge).' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Liste de tous les modèles sectoriels disponibles
apiRouter.get('/presets', (_req: Request, res: Response) => {
  try {
    const list = Object.values(INDUSTRY_PRESETS).map(p => ({
      id: p.id,
      name: p.name,
      shortName: p.shortName,
      sector: p.sector,
      badgeEmoji: p.badgeEmoji,
      description: p.description,
      servicesCount: p.services.length,
      teamCount: p.teamMembers.length,
      previewServices: p.services.slice(0, 3).map(s => `${s.name} (${s.duration_minutes} min)`),
      companyActivity: p.company.activity
    }));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Détails complets d'un modèle sectoriel
apiRouter.get('/presets/:id', (req: Request, res: Response) => {
  const presetId = String(req.params.id);
  const preset = INDUSTRY_PRESETS[presetId];
  if (!preset) return res.status(404).json({ error: 'Modèle sectoriel introuvable' });
  res.json(preset);
});


// Fonction générique d'application d'un preset
async function executeApplyPreset(preset: IndustryPreset, replaceServices: boolean = true) {
  // 1. Mettre à jour l'entreprise
  await setSetting('company', preset.company);

  // 2. Remplacer ou injecter les services
  if (replaceServices) {
    await deleteAllServices();
  }
  for (const s of preset.services) {
    await createService({
      name: s.name,
      category: s.category,
      duration_minutes: s.duration_minutes,
      price: s.price,
      description: s.description,
      is_active: 1
    });
  }

  // 3. Enrichir l'équipe si nécessaire
  const existingTeam = await getAllTeamMembers(false);
  for (const memberDef of preset.teamMembers) {
    const already = existingTeam.find(m => m.name === memberDef.name || m.role === memberDef.role);
    if (!already) {
      await createTeamMember({
        name: memberDef.name,
        role: memberDef.role,
        email: memberDef.email,
        phone: memberDef.phone,
        color: memberDef.color,
        avatar: null,
        specialties: memberDef.specialties,
        working_hours: {
          monday: { enabled: true, slots: [{ start: '08:00', end: '12:30' }, { start: '13:30', end: '18:00' }] },
          tuesday: { enabled: true, slots: [{ start: '08:00', end: '12:30' }, { start: '13:30', end: '18:00' }] },
          wednesday: { enabled: true, slots: [{ start: '08:00', end: '12:30' }, { start: '13:30', end: '18:00' }] },
          thursday: { enabled: true, slots: [{ start: '08:00', end: '12:30' }, { start: '13:30', end: '18:00' }] },
          friday: { enabled: true, slots: [{ start: '08:00', end: '12:30' }, { start: '13:30', end: '17:30' }] },
          saturday: { enabled: false, slots: [] },
          sunday: { enabled: false, slots: [] }
        },
        is_active: 1
      });
    }
  }

  // 4. Mettre à jour le prompt système de Clara IA
  const currentAi = (await getSetting('ai_config')) || {};
  await setSetting('ai_config', {
    ...currentAi,
    provider: currentAi.provider || 'gemini',
    model: currentAi.model || 'gemini-2.5-flash',
    systemPrompt: preset.systemPrompt
  });
}

// Appliquer un modèle sectoriel existant
apiRouter.post('/presets/:id/apply', async (req: Request, res: Response) => {
  try {
    const presetId = String(req.params.id);
    const preset = INDUSTRY_PRESETS[presetId];
    if (!preset) return res.status(404).json({ error: 'Modèle sectoriel introuvable' });

    const replaceServices = req.body.replaceServices !== false;
    await executeApplyPreset(preset, replaceServices);

    const updatedServices = await getAllServices(false);
    res.json({
      success: true,
      message: `Modèle "${preset.name}" appliqué avec succès !`,
      presetId: preset.id,
      servicesCount: updatedServices.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Générateur intelligent de métier sur-mesure pour TOUTE autre spécialité
apiRouter.post('/presets/generate-custom', async (req: Request, res: Response) => {
  try {
    const { tradeName, tradeDescription, applyImmediately } = req.body;
    if (!tradeName || !tradeName.trim()) {
      return res.status(400).json({ error: 'L\'intitulé de votre métier ou activité est requis.' });
    }

    const customPreset = generateCustomTradeConfig(tradeName, tradeDescription);

    if (applyImmediately === true) {
      await executeApplyPreset(customPreset, true);
    }

    res.json({
      success: true,
      preset: customPreset,
      applied: !!applyImmediately,
      message: `Configuration sur-mesure pour "${tradeName}" générée avec succès !`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rétrocompatibilité : preset plombier
apiRouter.post('/settings/apply-plumber-preset', async (_req: Request, res: Response) => {
  try {
    const preset = INDUSTRY_PRESETS.plumber;
    await executeApplyPreset(preset, true);
    res.json({
      success: true,
      message: 'Modèle Plomberie, Chauffage, PAC, Poêles & Ramonage appliqué avec succès !'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});



// Rendez-vous
apiRouter.get('/appointments', async (req: Request, res: Response) => {
  try {
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      teamMemberId: req.query.teamMemberId ? Number(req.query.teamMemberId) : undefined,
      contactId: req.query.contactId ? Number(req.query.contactId) : undefined,
      status: req.query.status as string
    };
    const apts = await getAppointments(filters);
    res.json(apts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/appointments', async (req: Request, res: Response) => {
  try {
    let { contact_id, team_member_id, service_id } = req.body;

    // 1. Validation / Résolution résiliente du contact
    let contact = contact_id ? await getContactById(Number(contact_id)) : null;
    if (!contact) {
      if (req.body.contact_phone) {
        contact = await getOrCreateContact(req.body.contact_phone, req.body.contact_name);
      } else {
        const allContacts = await getAllContacts();
        if (allContacts.length > 0) {
          contact = allContacts[0];
        } else {
          contact = await getOrCreateContact('33612345678', req.body.contact_name || 'Client');
        }
      }
      contact_id = contact.id;
    }

    // 2. Validation résiliente du collaborateur
    if (team_member_id) {
      const member = await getTeamMemberById(Number(team_member_id));
      if (!member) {
        // ID non trouvé en base SQLite : trouver le premier collaborateur ou null pour éviter FOREIGN KEY constraint failed
        const allTeam = await getAllTeamMembers();
        const activeMember = allTeam.find(m => m.is_active);
        team_member_id = activeMember ? activeMember.id : null;
      }
    }

    // 3. Validation résiliente de la prestation
    if (service_id) {
      const service = await getServiceById(Number(service_id));
      if (!service) {
        service_id = null;
      }
    }

    const payload = {
      ...req.body,
      contact_id,
      team_member_id,
      service_id
    };

    const id = await createAppointment(payload);
    const appointment = await getAppointmentById(id);

    const hostUrl = `${req.protocol}://${req.get('host')}`;

    // Prévenir automatiquement le client par WhatsApp avec lien d'agenda
    if (req.body.notify_client !== false && req.body.status !== 'cancelled' && req.body.status !== 'pending') {
      try {
        await sendAppointmentConfirmationNotification(id, hostUrl);
      } catch (notifErr) {
        console.error('[Appointments] Erreur envoi notification WhatsApp client:', notifErr);
      }
    }

    // Prévenir automatiquement le collaborateur assigné par WhatsApp avec ordre de mission & acceptation 1 clic
    if (req.body.notify_collaborator !== false && appointment?.team_member_id && req.body.status !== 'cancelled') {
      try {
        await sendCollaboratorAppointmentNotification(id, hostUrl);
      } catch (collabNotifErr) {
        console.error('[Appointments] Erreur envoi ordre de mission collaborateur:', collabNotifErr);
      }
    }

    res.status(201).json({ id, ...appointment });
  } catch (err: any) {
    console.error('[Appointments] Erreur création rendez-vous:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/appointments/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const prevApt = await getAppointmentById(id);
    await updateAppointment(id, req.body);
    const updatedApt = await getAppointmentById(id);

    const hostUrl = `${req.protocol}://${req.get('host')}`;

    // Si l'intervention est confirmée/validée ou si la notification client est demandée
    const shouldNotifyClient =
      req.body.notify_client === true ||
      (req.body.status === 'confirmed' && prevApt?.status !== 'confirmed' && req.body.notify_client !== false);

    if (shouldNotifyClient) {
      try {
        await sendAppointmentConfirmationNotification(id, hostUrl);
      } catch (notifErr) {
        console.error('[Appointments] Erreur envoi notification WhatsApp client:', notifErr);
      }
    }

    // Si la notification collaborateur est demandée ou nouveau collaborateur assigné
    const shouldNotifyCollaborator =
      req.body.notify_collaborator === true ||
      (req.body.team_member_id && req.body.team_member_id !== prevApt?.team_member_id && req.body.notify_collaborator !== false);

    if (shouldNotifyCollaborator && updatedApt?.team_member_id) {
      try {
        await sendCollaboratorAppointmentNotification(id, hostUrl);
      } catch (collabNotifErr) {
        console.error('[Appointments] Erreur envoi ordre de mission collaborateur:', collabNotifErr);
      }
    }

    res.json({ success: true, id, appointment: updatedApt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Envoi manuel de la notification WhatsApp client avec lien d'agenda
apiRouter.post('/appointments/:id/notify-client', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const result = await sendAppointmentConfirmationNotification(id, hostUrl);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Envoi manuel de l'ordre de mission WhatsApp au collaborateur assigné
apiRouter.post('/appointments/:id/notify-collaborator', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const result = await sendCollaboratorAppointmentNotification(id, hostUrl);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Acceptation directe de la mission par le collaborateur
apiRouter.post('/appointments/:id/collaborator-accept', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const now = new Date().toISOString();
    await updateAppointment(id, {
      collaborator_status: 'accepted',
      collaborator_accepted_at: now
    });
    const updatedApt = await getAppointmentById(id);
    broadcast('appointment_updated', updatedApt);

    if (req.query.redirect === '1' || req.headers.accept?.includes('text/html')) {
      return res.redirect(`/api/appointments/${id}/mission?action=accepted`);
    }
    res.json({ success: true, collaborator_status: 'accepted', collaborator_accepted_at: now, appointment: updatedApt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Indisponibilité / Refus de la mission par le collaborateur
apiRouter.post('/appointments/:id/collaborator-decline', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await updateAppointment(id, {
      collaborator_status: 'declined',
      collaborator_accepted_at: null
    });
    const updatedApt = await getAppointmentById(id);
    broadcast('appointment_updated', updatedApt);

    if (req.query.redirect === '1' || req.headers.accept?.includes('text/html')) {
      return res.redirect(`/api/appointments/${id}/mission?action=declined`);
    }
    res.json({ success: true, collaborator_status: 'declined', appointment: updatedApt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Redirection directe vers Google Agenda (sans adresse, enregistrement épuré en 1 clic)
apiRouter.get('/appointments/:id/google', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const apt = await getAppointmentById(id);
    if (!apt) return res.status(404).send('Rendez-vous introuvable');

    const title = apt.service_name ? `Intervention : ${apt.service_name}` : apt.title;
    const collaborator = apt.team_member_name || 'Notre équipe technique';

    const googleUrl = generateGoogleCalendarUrl({
      title,
      date: apt.date,
      startTime: apt.start_time,
      endTime: apt.end_time,
      details: `Intervention avec ${collaborator}.${apt.notes ? `\nPrécisions : ${apt.notes}` : ''}`
      // Aucune adresse transmise pour préserver la simplicité
    });

    res.redirect(googleUrl);
  } catch (err: any) {
    res.status(500).send('Erreur ouverture Google Agenda');
  }
});

// Ajout direct Apple Calendrier (inline pour ouverture native immédiate sur iPhone / Mac)
apiRouter.get('/appointments/:id/apple', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const apt = await getAppointmentById(id);
    if (!apt) return res.status(404).send('Rendez-vous introuvable');

    const title = apt.service_name ? `Intervention : ${apt.service_name}` : apt.title;
    const collaborator = apt.team_member_name || 'Notre équipe technique';

    const icsString = generateIcsContent({
      id: apt.id,
      title,
      date: apt.date,
      startTime: apt.start_time,
      endTime: apt.end_time,
      details: `Intervention avec ${collaborator}.${apt.notes ? `\nPrécisions : ${apt.notes}` : ''}`
    });

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="rdv_${id}.ics"`);
    res.send(icsString);
  } catch (err: any) {
    res.status(500).send('Erreur ouverture Apple Calendrier');
  }
});

// Téléchargement du fichier iCalendar standard (.ics) pour Outlook et autres agendas
apiRouter.get('/appointments/:id/ics', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const apt = await getAppointmentById(id);
    if (!apt) return res.status(404).send('Rendez-vous introuvable');

    const title = apt.service_name ? `Intervention : ${apt.service_name}` : apt.title;
    const collaborator = apt.team_member_name || 'Notre équipe technique';

    const icsString = generateIcsContent({
      id: apt.id,
      title,
      date: apt.date,
      startTime: apt.start_time,
      endTime: apt.end_time,
      details: `Intervention avec ${collaborator}.${apt.notes ? `\nPrécisions : ${apt.notes}` : ''}`
    });

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="intervention_${id}.ics"`);
    res.send(icsString);
  } catch (err: any) {
    res.status(500).send('Erreur génération fichier agenda');
  }
});

// Page web responsive d'ajout à l'agenda personnel (design épuré, gros boutons cliquables Google & Apple, sans adresse)
apiRouter.get('/appointments/:id/calendar', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const apt = await getAppointmentById(id);
    if (!apt) return res.status(404).send('Rendez-vous introuvable');

    const companyName = (await getSetting('company_name')) || 'Notre entreprise';
    const companyPhone = (await getSetting('company_phone')) || '';

    const title = apt.service_name ? `Intervention : ${apt.service_name}` : apt.title;
    const collaborator = apt.team_member_name || 'Notre équipe technique';

    const dateObj = new Date(`${apt.date}T00:00:00`);
    const formattedDate = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const isFullDay = (apt.start_time === '08:00' && apt.end_time === '18:00');
    const horaireText = isFullDay ? 'Journée entière (08:00 - 18:00)' : `${apt.start_time} - ${apt.end_time}`;

    const googleUrl = generateGoogleCalendarUrl({
      title,
      date: apt.date,
      startTime: apt.start_time,
      endTime: apt.end_time,
      details: `Intervention par ${collaborator}.${apt.notes ? `\nPrécisions : ${apt.notes}` : ''}`
    });

    const appleUrl = `/api/appointments/${id}/apple`;
    const icsUrl = `/api/appointments/${id}/ics`;

    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Ajouter à mon agenda - ${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @keyframes pulse-subtle {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: .85; transform: scale(0.99); }
    }
  </style>
</head>
<body class="bg-slate-100 min-h-screen flex items-center justify-center p-3 sm:p-6 font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
  <div class="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
    
    <!-- En-tête épuré avec confirmation -->
    <div class="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white text-center relative overflow-hidden">
      <div class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase mb-3">
        <span class="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
        Intervention confirmée
      </div>
      <h1 class="text-2xl font-black tracking-tight leading-tight">${companyName}</h1>
      <p class="text-emerald-100 text-xs mt-1">Ajoutez ce rendez-vous à votre agenda personnel</p>
    </div>

    <div class="p-6 space-y-5">
      
      <!-- Récapitulatif clair & sans adresse -->
      <div class="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-3">
        <div>
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Prestation</span>
          <p class="text-base font-extrabold text-slate-900 mt-0.5">${title}</p>
        </div>

        <div class="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-200/60">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Date</span>
            <p class="text-xs font-bold text-slate-800 capitalize mt-0.5">${formattedDate}</p>
          </div>
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Horaire</span>
            <p class="text-xs font-bold text-slate-800 mt-0.5">${horaireText}</p>
          </div>
        </div>

        <div class="pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Intervenant</span>
          <span class="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
            👤 ${collaborator}
          </span>
        </div>

        ${apt.notes ? `
        <div class="pt-2.5 border-t border-slate-200/60">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Informations</span>
          <p class="text-xs text-slate-600 mt-0.5">${apt.notes}</p>
        </div>` : ''}
      </div>

      ${apt.document_url ? `
      <!-- Document joint (PDF / Devis) -->
      <div class="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
            PDF
          </div>
          <div class="min-w-0 text-left">
            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-800">Document joint</span>
            <p class="text-xs font-extrabold text-slate-900 truncate mt-0.5">${apt.document_name || 'Document d\'intervention'}</p>
          </div>
        </div>
        <a
          href="${apt.document_url}"
          target="_blank"
          rel="noopener noreferrer"
          class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          Ouvrir ↗
        </a>
      </div>` : ''}

      <!-- Section Boutons d'Action Cliquables -->
      <div class="space-y-3 pt-1">
        <p class="text-xs font-extrabold text-slate-600 text-center uppercase tracking-wider">
          Boutons d'ajout rapide (cliquables) :
        </p>

        <!-- Bouton 1 : Google Agenda -->
        <a
          href="${googleUrl}"
          target="_blank"
          rel="noopener noreferrer"
          onclick="handleClick(this, 'Ouverture de Google Agenda...')"
          class="w-full flex items-center justify-between p-4 bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.98] text-white rounded-2xl shadow-lg shadow-blue-500/20 transition-all font-semibold group cursor-pointer"
        >
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-xs">
              <svg class="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            </div>
            <div class="text-left">
              <p class="text-sm font-extrabold leading-tight">Google Agenda</p>
              <p class="text-[11px] text-blue-100 leading-tight mt-0.5">Ajouter en 1 clic (Android & Web)</p>
            </div>
          </div>
          <span class="text-xs bg-white/20 px-3 py-1.5 rounded-xl font-bold group-hover:bg-white group-hover:text-[#1a73e8] transition">
            Ajouter +
          </span>
        </a>

        <!-- Bouton 2 : Apple Calendrier -->
        <a
          href="${appleUrl}"
          onclick="handleClick(this, 'Ajout à Apple Calendrier...')"
          class="w-full flex items-center justify-between p-4 bg-black hover:bg-neutral-900 active:scale-[0.98] text-white rounded-2xl shadow-lg shadow-black/20 transition-all font-semibold group cursor-pointer"
        >
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center shrink-0 shadow-xs">
              <svg class="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.64 1.36-.57.65-1.07 1.72-.94 2.74 1 .08 2.04-.5 2.66-1.25z"/>
              </svg>
            </div>
            <div class="text-left">
              <p class="text-sm font-extrabold leading-tight">Apple Calendrier</p>
              <p class="text-[11px] text-neutral-300 leading-tight mt-0.5">Ajouter en 1 clic (iPhone, iPad, Mac)</p>
            </div>
          </div>
          <span class="text-xs bg-white/20 px-3 py-1.5 rounded-xl font-bold group-hover:bg-white group-hover:text-black transition">
            Ajouter +
          </span>
        </a>

        <!-- Bouton 3 : Outlook & Autres -->
        <a
          href="${icsUrl}"
          onclick="handleClick(this, 'Téléchargement de l\\'événement...')"
          class="w-full flex items-center justify-between p-3.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 rounded-2xl border border-slate-200 transition font-medium group cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <div class="text-left">
              <p class="text-xs font-bold text-slate-700">Outlook & Autres agendas</p>
              <p class="text-[10px] text-slate-500">Télécharger le fichier .ics standard</p>
            </div>
          </div>
          <span class="text-xs font-semibold text-slate-500 group-hover:text-slate-800">
            .ics ↓
          </span>
        </a>

      </div>

      <!-- Toast de confirmation cliquable -->
      <div id="statusToast" class="hidden text-center p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition"></div>

      ${companyPhone ? `
      <div class="pt-2 text-center border-t border-slate-100">
        <a href="tel:${companyPhone}" class="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-700 transition">
          📞 Une question ? Nous contacter au <span class="font-semibold text-slate-600">${companyPhone}</span>
        </a>
      </div>` : ''}

    </div>
  </div>

  <script>
    function handleClick(el, message) {
      const toast = document.getElementById('statusToast');
      if (toast) {
        toast.textContent = '✓ ' + message;
        toast.classList.remove('hidden');
      }
    }
  </script>
</body>
</html>`);
  } catch (err: any) {
    res.status(500).send('Erreur affichage page agenda');
  }
});

// Page web responsive d'ordre de mission pour le collaborateur (validation en 1 clic, infos client, contact direct, document & agenda)
apiRouter.get('/appointments/:id/mission', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const apt = await getAppointmentById(id);
    if (!apt) return res.status(404).send('Intervention introuvable');

    const companyName = (await getSetting('company_name')) || 'Notre entreprise';
    const companyPhone = (await getSetting('company_phone')) || '';

    const contact = apt.contact_id ? await getContactById(apt.contact_id) : null;
    const clientName = contact?.name || apt.contact_name || 'Client';
    const clientPhone = contact?.phone_number || apt.contact_phone || '';
    const cleanClientPhone = clientPhone.replace(/[^0-9+]/g, '');
    const waClientLink = cleanClientPhone ? `https://wa.me/${cleanClientPhone.replace(/[^0-9]/g, '')}` : '';

    const collaboratorName = apt.team_member_name || 'Collaborateur';
    const title = apt.service_name ? `Intervention : ${apt.service_name}` : (apt.title || 'Ordre de mission');

    const dateObj = new Date(`${apt.date}T00:00:00`);
    const formattedDate = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const isFullDay = (apt.start_time === '08:00' && apt.end_time === '18:00');
    const horaireText = isFullDay ? 'Journée entière (08:00 - 18:00)' : `${apt.start_time} - ${apt.end_time}`;

    const isAccepted = apt.collaborator_status === 'accepted';
    const isDeclined = apt.collaborator_status === 'declined';
    const isPending = !isAccepted && !isDeclined;

    const acceptedDateFormatted = apt.collaborator_accepted_at
      ? new Date(apt.collaborator_accepted_at).toLocaleString('fr-FR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      : null;

    const googleUrl = generateGoogleCalendarUrl({
      title,
      date: apt.date,
      startTime: apt.start_time,
      endTime: apt.end_time,
      details: `Client : ${clientName} (${clientPhone}).\n${apt.notes ? `Précisions : ${apt.notes}` : ''}`
    });

    const appleUrl = `/api/appointments/${id}/apple`;
    const icsUrl = `/api/appointments/${id}/ics`;

    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Ordre de Mission - ${collaboratorName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @keyframes pulse-subtle {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: .85; transform: scale(0.99); }
    }
  </style>
</head>
<body class="bg-slate-900 min-h-screen flex items-center justify-center p-3 sm:p-6 font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
  <div class="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-4">
    
    <!-- En-tête mission -->
    <div class="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white relative overflow-hidden">
      <div class="flex items-center justify-between gap-2 mb-3">
        <span class="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase text-indigo-200">
          🛠️ Ordre de Mission
        </span>
        <span class="text-xs font-semibold text-slate-300">
          ${companyName}
        </span>
      </div>
      <h1 class="text-xl font-black tracking-tight leading-tight">${title}</h1>
      <p class="text-indigo-200 text-xs mt-1">Assigné à : <span class="font-bold text-white">${collaboratorName}</span></p>
    </div>

    <!-- Statut et Actions Rapides -->
    <div class="p-5 sm:p-6 space-y-5">

      <!-- Bannière de Statut Dynamique -->
      <div id="statusBanner">
        ${isAccepted ? `
          <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black text-lg shadow-xs">
              ✓
            </div>
            <div class="min-w-0">
              <p class="text-xs font-black text-emerald-950 uppercase tracking-wide">Mission Acceptée & Validée</p>
              <p class="text-xs text-emerald-800 mt-0.5">
                Vous avez confirmé cette mission ${acceptedDateFormatted ? `le ${acceptedDateFormatted}` : ''}.
              </p>
            </div>
          </div>
        ` : isDeclined ? `
          <div class="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 font-black text-lg shadow-xs">
              ✕
            </div>
            <div class="min-w-0">
              <p class="text-xs font-black text-rose-950 uppercase tracking-wide">Indisponible</p>
              <p class="text-xs text-rose-800 mt-0.5">
                Vous aviez indiqué être indisponible pour cette intervention.
              </p>
            </div>
          </div>
        ` : `
          <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-black text-lg shadow-xs animate-bounce">
              ⏳
            </div>
            <div class="min-w-0">
              <p class="text-xs font-black text-amber-950 uppercase tracking-wide">En attente de votre confirmation</p>
              <p class="text-xs text-amber-800 mt-0.5">
                Confirmez en 1 clic votre disponibilité pour cette intervention.
              </p>
            </div>
          </div>
        `}
      </div>

      <!-- Bouton d'acceptation 1-clic principal (si en attente ou refusé) -->
      ${!isAccepted ? `
        <div id="actionButtons" class="space-y-2">
          <form action="/api/appointments/${id}/collaborator-accept?redirect=1" method="POST" onsubmit="return handleAccept(event)">
            <button
              type="submit"
              id="btnAccept"
              class="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span class="text-lg">✅</span> Accepter la mission (1 clic)
            </button>
          </form>

          ${!isDeclined ? `
            <form action="/api/appointments/${id}/collaborator-decline?redirect=1" method="POST" onsubmit="return confirm('Confirmer que vous n\\'êtes pas disponible pour cette mission ?');">
              <button
                type="submit"
                class="w-full py-2.5 px-4 bg-slate-100 hover:bg-rose-50 active:scale-[0.98] text-slate-500 hover:text-rose-700 font-semibold text-xs rounded-xl transition cursor-pointer text-center block"
              >
                ❌ Je ne suis pas disponible
              </button>
            </form>
          ` : ''}
        </div>
      ` : ''}

      <!-- Récapitulatif Date & Horaire -->
      <div class="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Date</span>
            <p class="text-xs font-black text-slate-800 capitalize mt-0.5">${formattedDate}</p>
          </div>
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Horaire</span>
            <p class="text-xs font-black text-slate-800 mt-0.5">${horaireText}</p>
          </div>
        </div>

        ${apt.notes ? `
          <div class="pt-2.5 border-t border-slate-200/60">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Consignes / Notes</span>
            <p class="text-xs text-slate-700 mt-0.5 font-medium leading-relaxed">${apt.notes}</p>
          </div>
        ` : ''}
      </div>

      <!-- Coordonnées Client & Contact Direct -->
      <div class="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Client à contacter</span>
          <span class="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
            Fiche Intervention
          </span>
        </div>

        <div>
          <p class="text-sm font-extrabold text-slate-900">${clientName}</p>
          ${clientPhone ? `<p class="text-xs text-slate-600 font-mono mt-0.5">${clientPhone}</p>` : ''}
          ${contact?.company ? `<p class="text-xs text-slate-500 mt-1">🏢 ${contact.company}</p>` : ''}
          ${(contact as any)?.address ? `<p class="text-xs text-slate-500 mt-1">📍 ${(contact as any).address}</p>` : ''}
        </div>

        ${clientPhone ? `
          <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
            <a
              href="tel:${cleanClientPhone}"
              class="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              📞 Appeler
            </a>
            ${waClientLink ? `
              <a
                href="${waClientLink}"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                💬 WhatsApp
              </a>
            ` : ''}
          </div>
        ` : ''}
      </div>

      <!-- Document Joint (Devis, Fiche technique, etc.) -->
      ${apt.document_url ? `
        <div class="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
              PDF
            </div>
            <div class="min-w-0 text-left">
              <span class="text-[10px] font-bold uppercase tracking-wider text-blue-800">Document joint</span>
              <p class="text-xs font-extrabold text-slate-900 truncate mt-0.5">${apt.document_name || 'Document d\'intervention'}</p>
            </div>
          </div>
          <a
            href="${apt.document_url}"
            target="_blank"
            rel="noopener noreferrer"
            class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            Consulter ↗
          </a>
        </div>
      ` : ''}

      <!-- Synchronisation Agenda Personnel Collaborateur -->
      <div class="space-y-2 pt-1">
        <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
          Boutons d'ajout rapide (cliquables) :
        </p>

        <div class="grid grid-cols-2 gap-2">
          <a
            href="${googleUrl}"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            📅 Google Agenda
          </a>
          <a
            href="${appleUrl}"
            class="flex items-center justify-center gap-2 p-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            🍏 Apple Calendrier
          </a>
        </div>
      </div>

    </div>

    <!-- Pied de page -->
    <div class="bg-slate-50 border-t border-slate-100 p-4 text-center text-slate-400 text-[11px]">
      ${companyName} ${companyPhone ? `• Tél. ${companyPhone}` : ''}
    </div>

  </div>

  <script>
    async function handleAccept(e) {
      e.preventDefault();
      const btn = document.getElementById('btnAccept');
      btn.disabled = true;
      btn.innerHTML = '⏳ Validation en cours...';

      try {
        const res = await fetch('/api/appointments/${id}/collaborator-accept', {
          method: 'POST',
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const banner = document.getElementById('statusBanner');
          const actions = document.getElementById('actionButtons');
          if (banner) {
            banner.innerHTML = \`
              <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black text-lg shadow-xs">
                  ✓
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-black text-emerald-950 uppercase tracking-wide">Mission Acceptée & Validée</p>
                  <p class="text-xs text-emerald-800 mt-0.5">
                    Merci ! Votre confirmation a été immédiatement transmise à l'entreprise.
                  </p>
                </div>
              </div>
            \`;
          }
          if (actions) {
            actions.remove();
          }
        } else {
          // Si l'API échoue, fallback sur submit normal
          e.target.submit();
        }
      } catch (err) {
        e.target.submit();
      }
    }
  </script>
</body>
</html>`);
  } catch (err: any) {
    res.status(500).send('Erreur affichage ordre de mission');
  }
});

apiRouter.delete('/appointments/:id', async (req: Request, res: Response) => {
  try {
    await deleteAppointment(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test rapide de la clé Google Gemini API
apiRouter.post('/settings/test-gemini', async (req: Request, res: Response) => {
  try {
    let key = req.body?.apiKey;
    if (!key) {
      const aiConfig: any = await getSetting('ai_config');
      key = aiConfig?.geminiApiKey || process.env.GEMINI_API_KEY;
    }
    if (!key || !key.trim()) {
      return res.status(400).json({ ok: false, message: 'Aucune clé API Gemini fournie ou configurée.' });
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(key.trim());
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Réponds uniquement: OK');
    const reply = result.response.text();

    res.json({
      ok: true,
      message: 'API Gemini 2.5 Flash connectée avec succès !',
      model: 'gemini-2.5-flash',
      response: reply.trim()
    });
  } catch (err: any) {
    res.status(400).json({
      ok: false,
      message: err.message || 'Erreur lors du test de la clé Gemini'
    });
  }
});

// Paramètres
apiRouter.get('/settings/:key', async (req: Request, res: Response) => {
  try {
    const key = req.params.key as string;
    const val = await getSetting(key);
    res.json(val || {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/settings/:key', async (req: Request, res: Response) => {
  try {
    const key = req.params.key as string;
    await setSetting(key, req.body);
    res.json({ success: true, key });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Contrôles WhatsApp
apiRouter.get('/whatsapp/status', (_req: Request, res: Response) => {
  res.json(getWhatsAppState());
});

apiRouter.post('/whatsapp/connect', async (req: Request, res: Response) => {
  try {
    if (req.body?.force) {
      await resetWhatsAppSession();
    } else {
      await initWhatsAppClient();
    }
    res.json(getWhatsAppState());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/whatsapp/reset', async (_req: Request, res: Response) => {
  try {
    await resetWhatsAppSession();
    res.json(getWhatsAppState());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/whatsapp/disconnect', async (_req: Request, res: Response) => {
  try {
    await disconnectWhatsApp();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/whatsapp/pairing-code', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'Numéro de téléphone requis' });
    const code = await requestPairingCode(phoneNumber);
    res.json({ pairingCode: code });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Simulation de message entrant pour tests et démos immédiats sans téléphone sous la main
apiRouter.post('/whatsapp/simulate-incoming', async (req: Request, res: Response) => {
  try {
    const { phoneNumber = '+33699887766', name = 'Client Test', message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message requis' });

    const contact = await getOrCreateContact(phoneNumber, name);
    const savedInbound = await saveMessage(contact.id, 'inbound', 'client', message);

    let aiReplyText = '';
    if (contact.ai_enabled === 1) {
      aiReplyText = await generateAgentReply({
        contact,
        incomingText: message
      });

      if (aiReplyText) {
        await saveMessage(contact.id, 'outbound', 'ai', aiReplyText);
      }
    }

    res.json({
      contact,
      inbound: savedInbound,
      aiReply: aiReplyText
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
