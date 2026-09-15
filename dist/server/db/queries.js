import { db } from './database.js';
// Contacts
export function normalizePhone(raw) {
    if (!raw)
        return '';
    let digits = raw.replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) {
        digits = digits.substring(1);
    }
    // Format national français 10 chiffres (ex: 0612345678 -> 33612345678)
    if (digits.startsWith('0') && digits.length === 10) {
        digits = '33' + digits.substring(1);
    }
    return digits.replace(/\D/g, '');
}
export async function getOrCreateContact(phoneNumber, name) {
    const normalizedPhone = normalizePhone(phoneNumber);
    const existing = await db.execute({
        sql: `SELECT * FROM contacts 
          WHERE phone_number = ? 
             OR phone_number = ? 
             OR phone_number = ?
             OR phone_number LIKE ?
          LIMIT 1`,
        args: [
            normalizedPhone,
            `+${normalizedPhone}`,
            normalizedPhone.startsWith('33') ? `0${normalizedPhone.substring(2)}` : normalizedPhone,
            `%${normalizedPhone.slice(-9)}`
        ]
    });
    const now = new Date().toISOString();
    if (existing.rows.length > 0) {
        const contact = existing.rows[0];
        if (name && (!contact.name || contact.name === contact.phone_number)) {
            await db.execute({
                sql: 'UPDATE contacts SET name = ?, updated_at = ? WHERE id = ?',
                args: [name, now, contact.id]
            });
            contact.name = name;
        }
        // Normaliser son numéro en base s'il était stocké sous un ancien format
        if (contact.phone_number !== normalizedPhone) {
            try {
                await db.execute({
                    sql: 'UPDATE contacts SET phone_number = ? WHERE id = ?',
                    args: [normalizedPhone, contact.id]
                });
                contact.phone_number = normalizedPhone;
            }
            catch (e) {
                // En cas de contrainte UNIQUE
            }
        }
        return {
            ...contact,
            tags: typeof contact.tags === 'string' ? JSON.parse(contact.tags || '[]') : (contact.tags || [])
        };
    }
    const result = await db.execute({
        sql: 'INSERT INTO contacts (phone_number, name, ai_enabled, created_at, updated_at) VALUES (?, ?, 1, ?, ?)',
        args: [normalizedPhone, name || null, now, now]
    });
    return {
        id: Number(result.lastInsertRowid),
        phone_number: normalizedPhone,
        name: name || null,
        avatar: null,
        notes: null,
        ai_enabled: 1,
        created_at: now,
        updated_at: now
    };
}
export async function getContactById(id) {
    const res = await db.execute({
        sql: 'SELECT * FROM contacts WHERE id = ?',
        args: [id]
    });
    if (res.rows.length === 0)
        return null;
    const c = res.rows[0];
    return {
        ...c,
        tags: typeof c.tags === 'string' ? JSON.parse(c.tags || '[]') : (c.tags || [])
    };
}
export async function getAllContacts() {
    const res = await db.execute(`
    SELECT c.*,
      (SELECT content FROM messages WHERE contact_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message,
      (SELECT timestamp FROM messages WHERE contact_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message_time
    FROM contacts c
    ORDER BY COALESCE(last_message_time, c.updated_at) DESC
  `);
    return res.rows.map(r => {
        const c = r;
        return {
            ...c,
            tags: typeof c.tags === 'string' ? JSON.parse(c.tags || '[]') : (c.tags || [])
        };
    });
}
export async function createContactManually(data) {
    const now = new Date().toISOString();
    const normalizedPhone = normalizePhone(data.phone_number);
    // Vérifier si un contact existe déjà avec ce numéro ou ses variantes
    const existing = await db.execute({
        sql: `SELECT id FROM contacts 
          WHERE phone_number = ? 
             OR phone_number = ? 
             OR phone_number LIKE ?
          LIMIT 1`,
        args: [normalizedPhone, `+${normalizedPhone}`, `%${normalizedPhone.slice(-9)}`]
    });
    if (existing.rows.length > 0) {
        const existingId = Number(existing.rows[0].id);
        await updateContact(existingId, {
            name: data.name,
            phone_number: normalizedPhone,
            email: data.email,
            company: data.company,
            status: data.status || 'prospect',
            tags: data.tags,
            notes: data.notes
        });
        return (await getContactById(existingId));
    }
    const res = await db.execute({
        sql: `INSERT INTO contacts (phone_number, name, email, company, status, tags, notes, ai_enabled, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [
            normalizedPhone,
            data.name || null,
            data.email || null,
            data.company || null,
            data.status || 'prospect',
            JSON.stringify(data.tags || []),
            data.notes || null,
            now,
            now
        ]
    });
    return {
        id: Number(res.lastInsertRowid),
        phone_number: normalizedPhone,
        name: data.name || null,
        email: data.email || null,
        company: data.company || null,
        status: data.status || 'prospect',
        tags: data.tags || [],
        avatar: null,
        notes: data.notes || null,
        ai_enabled: 1,
        created_at: now,
        updated_at: now
    };
}
export async function updateContact(id, fields) {
    const now = new Date().toISOString();
    const updates = ['updated_at = ?'];
    const args = [now];
    if (fields.name !== undefined) {
        updates.push('name = ?');
        args.push(fields.name);
    }
    if (fields.phone_number !== undefined) {
        updates.push('phone_number = ?');
        args.push(normalizePhone(fields.phone_number));
    }
    if (fields.email !== undefined) {
        updates.push('email = ?');
        args.push(fields.email);
    }
    if (fields.company !== undefined) {
        updates.push('company = ?');
        args.push(fields.company);
    }
    if (fields.status !== undefined) {
        updates.push('status = ?');
        args.push(fields.status);
    }
    if (fields.tags !== undefined) {
        updates.push('tags = ?');
        args.push(JSON.stringify(fields.tags));
    }
    if (fields.notes !== undefined) {
        updates.push('notes = ?');
        args.push(fields.notes);
    }
    if (fields.ai_enabled !== undefined) {
        updates.push('ai_enabled = ?');
        args.push(fields.ai_enabled ? 1 : 0);
    }
    if (fields.avatar !== undefined) {
        updates.push('avatar = ?');
        args.push(fields.avatar);
    }
    args.push(id);
    await db.execute({
        sql: `UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`,
        args
    });
}
export async function deleteContact(id) {
    await db.execute({
        sql: 'DELETE FROM contacts WHERE id = ?',
        args: [id]
    });
}
// Messages
export async function saveMessage(contactId, direction, senderType, content, whatsappMessageId, status = 'sent', mediaType, mediaUrl, fileName, fileSize, transcription) {
    const now = new Date().toISOString();
    const res = await db.execute({
        sql: `INSERT INTO messages (whatsapp_message_id, contact_id, direction, sender_type, content, status, timestamp, media_type, media_url, file_name, file_size, transcription)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
            whatsappMessageId || null,
            contactId,
            direction,
            senderType,
            content,
            status,
            now,
            mediaType || null,
            mediaUrl || null,
            fileName || null,
            fileSize || null,
            transcription || null
        ]
    });
    await db.execute({
        sql: 'UPDATE contacts SET updated_at = ? WHERE id = ?',
        args: [now, contactId]
    });
    return {
        id: Number(res.lastInsertRowid),
        whatsapp_message_id: whatsappMessageId || null,
        contact_id: contactId,
        direction,
        sender_type: senderType,
        content,
        media_type: mediaType || null,
        media_url: mediaUrl || null,
        file_name: fileName || null,
        file_size: fileSize || null,
        transcription: transcription || null,
        status,
        timestamp: now
    };
}
export async function getMessagesByContact(contactId, limit = 50) {
    const res = await db.execute({
        sql: `SELECT * FROM (
            SELECT * FROM messages WHERE contact_id = ? ORDER BY timestamp DESC LIMIT ?
          ) ORDER BY timestamp ASC`,
        args: [contactId, limit]
    });
    return res.rows;
}
export async function getMessageByWhatsAppId(whatsappMessageId) {
    const res = await db.execute({
        sql: 'SELECT * FROM messages WHERE whatsapp_message_id = ?',
        args: [whatsappMessageId]
    });
    return res.rows[0] || null;
}
// Mémoire Client
export async function getMemoriesByContact(contactId) {
    const res = await db.execute({
        sql: 'SELECT * FROM memories WHERE contact_id = ? ORDER BY created_at ASC',
        args: [contactId]
    });
    return res.rows;
}
export async function saveOrUpdateMemory(contactId, category, key, value) {
    const now = new Date().toISOString();
    const existing = await db.execute({
        sql: 'SELECT id FROM memories WHERE contact_id = ? AND key = ?',
        args: [contactId, key]
    });
    if (existing.rows.length > 0) {
        await db.execute({
            sql: 'UPDATE memories SET value = ?, category = ?, updated_at = ? WHERE id = ?',
            args: [value, category, now, existing.rows[0].id]
        });
    }
    else {
        await db.execute({
            sql: 'INSERT INTO memories (contact_id, category, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            args: [contactId, category, key, value, now, now]
        });
    }
}
export async function deleteMemory(id) {
    await db.execute({
        sql: 'DELETE FROM memories WHERE id = ?',
        args: [id]
    });
}
// Collaborateurs PME
export async function getAllTeamMembers(onlyActive = false) {
    const query = onlyActive
        ? "SELECT * FROM team_members WHERE (status = 'active' OR (status IS NULL AND is_active = 1)) AND is_active = 1 ORDER BY name ASC"
        : 'SELECT * FROM team_members ORDER BY name ASC';
    const res = await db.execute(query);
    return res.rows.map(r => ({
        ...r,
        status: r.status || (r.is_active ? 'active' : 'other'),
        specialties: typeof r.specialties === 'string' ? JSON.parse(r.specialties || '[]') : r.specialties,
        working_hours: typeof r.working_hours === 'string' ? JSON.parse(r.working_hours || '{}') : r.working_hours
    }));
}
export async function getTeamMemberById(id) {
    const res = await db.execute({
        sql: 'SELECT * FROM team_members WHERE id = ?',
        args: [id]
    });
    if (res.rows.length === 0)
        return null;
    const r = res.rows[0];
    return {
        ...r,
        status: r.status || (r.is_active ? 'active' : 'other'),
        specialties: typeof r.specialties === 'string' ? JSON.parse(r.specialties || '[]') : r.specialties,
        working_hours: typeof r.working_hours === 'string' ? JSON.parse(r.working_hours || '{}') : r.working_hours
    };
}
export async function createTeamMember(data) {
    const now = new Date().toISOString();
    const status = data.status || (data.is_active === 0 ? 'other' : 'active');
    const isActive = status === 'active' ? 1 : (data.is_active ?? 1);
    const res = await db.execute({
        sql: `INSERT INTO team_members (name, role, email, phone, color, avatar, specialties, working_hours, status, is_active, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
            data.name,
            data.role,
            data.email || null,
            data.phone || null,
            data.color || '#2563EB',
            data.avatar || null,
            JSON.stringify(data.specialties || []),
            JSON.stringify(data.working_hours || {}),
            status,
            isActive,
            now
        ]
    });
    return Number(res.lastInsertRowid);
}
export async function updateTeamMember(id, data) {
    const updates = [];
    const args = [];
    if (data.name !== undefined) {
        updates.push('name = ?');
        args.push(data.name);
    }
    if (data.role !== undefined) {
        updates.push('role = ?');
        args.push(data.role);
    }
    if (data.email !== undefined) {
        updates.push('email = ?');
        args.push(data.email);
    }
    if (data.phone !== undefined) {
        updates.push('phone = ?');
        args.push(data.phone);
    }
    if (data.color !== undefined) {
        updates.push('color = ?');
        args.push(data.color);
    }
    if (data.avatar !== undefined) {
        updates.push('avatar = ?');
        args.push(data.avatar);
    }
    if (data.specialties !== undefined) {
        updates.push('specialties = ?');
        args.push(JSON.stringify(data.specialties));
    }
    if (data.working_hours !== undefined) {
        updates.push('working_hours = ?');
        args.push(JSON.stringify(data.working_hours));
    }
    if (data.status !== undefined) {
        updates.push('status = ?');
        args.push(data.status);
        if (data.is_active === undefined) {
            updates.push('is_active = ?');
            args.push(data.status === 'active' ? 1 : 0);
        }
    }
    if (data.is_active !== undefined) {
        updates.push('is_active = ?');
        args.push(data.is_active);
        if (data.status === undefined) {
            updates.push('status = ?');
            args.push(data.is_active ? 'active' : 'other');
        }
    }
    if (updates.length > 0) {
        args.push(id);
        await db.execute({
            sql: `UPDATE team_members SET ${updates.join(', ')} WHERE id = ?`,
            args
        });
    }
}
export async function deleteTeamMember(id) {
    await db.execute({
        sql: 'DELETE FROM team_members WHERE id = ?',
        args: [id]
    });
}
// Services
export async function getAllServices(onlyActive = true) {
    const query = onlyActive
        ? 'SELECT * FROM services WHERE is_active = 1 ORDER BY category ASC, name ASC'
        : 'SELECT * FROM services ORDER BY category ASC, name ASC';
    const res = await db.execute(query);
    return res.rows;
}
export async function getServiceById(id) {
    const res = await db.execute({
        sql: 'SELECT * FROM services WHERE id = ?',
        args: [id]
    });
    return res.rows[0] || null;
}
export async function createService(data) {
    const now = new Date().toISOString();
    const res = await db.execute({
        sql: `INSERT INTO services (name, category, duration_minutes, price, description, is_active, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
            data.name,
            data.category || 'Plomberie & Chauffage',
            data.duration_minutes || 30,
            data.price ?? 0,
            data.description || null,
            data.is_active ?? 1,
            now
        ]
    });
    return Number(res.lastInsertRowid);
}
export async function updateService(id, data) {
    const updates = [];
    const args = [];
    if (data.name !== undefined) {
        updates.push('name = ?');
        args.push(data.name);
    }
    if (data.category !== undefined) {
        updates.push('category = ?');
        args.push(data.category);
    }
    if (data.duration_minutes !== undefined) {
        updates.push('duration_minutes = ?');
        args.push(data.duration_minutes);
    }
    if (data.price !== undefined) {
        updates.push('price = ?');
        args.push(data.price);
    }
    if (data.description !== undefined) {
        updates.push('description = ?');
        args.push(data.description);
    }
    if (data.is_active !== undefined) {
        updates.push('is_active = ?');
        args.push(data.is_active);
    }
    if (updates.length > 0) {
        args.push(id);
        await db.execute({
            sql: `UPDATE services SET ${updates.join(', ')} WHERE id = ?`,
            args
        });
    }
}
export async function deleteService(id) {
    await db.execute({
        sql: 'DELETE FROM services WHERE id = ?',
        args: [id]
    });
}
export async function deleteAllServices() {
    await db.execute('DELETE FROM services');
}
/**
 * Charge l'ensemble des prestations et interventions types pour une entreprise de
 * Plomberie, Chauffage, Pompes à Chaleur (PAC), Cuisinières à bois, Poêles à granulés et Ramonage.
 */
export async function seedPlumberServices() {
    const plumberServices = [
        {
            name: 'Installation Pompe à Chaleur (PAC Air/Eau & Air/Air)',
            category: 'Pompe à Chaleur & Chauffage',
            duration_minutes: 240,
            price: 0,
            description: 'Pose intégrale de pompe à chaleur, raccordements hydrauliques & frigorifiques, raccordement électrique et mise en service certifiée RGE.'
        },
        {
            name: 'Entretien & Révision annuelle Pompe à Chaleur',
            category: 'Pompe à Chaleur & Chauffage',
            duration_minutes: 90,
            price: 180,
            description: 'Contrôle d\'étanchéité du circuit frigorigène, nettoyage filtres et échangeurs, contrôle des pressions et optimisation du rendement.'
        },
        {
            name: 'Installation Poêle à granulés (Pellets)',
            category: 'Bois & Granulés',
            duration_minutes: 180,
            price: 0,
            description: 'Mise en place et fixation du poêle à granulés, raccordement au conduit de fumée, paramétrage électronique et mise à feu test.'
        },
        {
            name: 'Entretien complet & Nettoyage Poêle à granulés',
            category: 'Bois & Granulés',
            duration_minutes: 75,
            price: 150,
            description: 'Démontage et dépoussiérage de la chambre de combustion, nettoyage de l\'extracteur, contrôle de la bougie et des sécurités.'
        },
        {
            name: 'Installation Cuisinière à bois',
            category: 'Bois & Granulés',
            duration_minutes: 240,
            price: 0,
            description: 'Pose de cuisinière à bois traditionnelle, raccordement fumisterie sécurisé, isolation thermique murale conforme normes DTU 24.1.'
        },
        {
            name: 'Ramonage certifié de conduit de cheminée / poêle',
            category: 'Ramonage & Fumisterie',
            duration_minutes: 45,
            price: 85,
            description: 'Ramonage mécanique rotatif par hérisson, test de tirage et délivrance immédiate du certificat officiel de ramonage pour assurance.'
        },
        {
            name: 'Débistrage mécanique de conduit goudronné',
            category: 'Ramonage & Fumisterie',
            duration_minutes: 120,
            price: 280,
            description: 'Élimination du bistre durci à la débistreuse mécanique pour sécuriser le conduit et éviter tout risque d\'incendie.'
        },
        {
            name: 'Dépannage Plomberie & Recherche de fuite d\'eau',
            category: 'Plomberie & Sanitaire',
            duration_minutes: 60,
            price: 95,
            description: 'Recherche et réparation immédiate de fuite d\'eau (cuivre, multicouche, PER, PVC), remplacement robinet d\'arrêt ou vanne générale.'
        },
        {
            name: 'Remplacement Chauffe-eau / Ballon Thermodynamique',
            category: 'Plomberie & Sanitaire',
            duration_minutes: 150,
            price: 0,
            description: 'Dépose de l\'ancien cumulus, fourniture et raccordement d\'un ballon neuf avec groupe de sécurité et raccord diélectrique.'
        },
        {
            name: 'Débouchage canalisations & Réseau sanitaire',
            category: 'Plomberie & Sanitaire',
            duration_minutes: 60,
            price: 110,
            description: 'Débouchage mécanique au furet professionnel ou pompe haute pression pour WC, douche, évier ou colonne principale.'
        },
        {
            name: 'Visite technique préalable & Devis gratuit sur place',
            category: 'Devis & Conseils',
            duration_minutes: 45,
            price: 0,
            description: 'Déplacement d\'un technicien qualifié pour évaluer la faisabilité, les accès, le dimensionnement thermique et établir un devis clair.'
        }
    ];
    const now = new Date().toISOString();
    for (const s of plumberServices) {
        const existing = await db.execute({
            sql: 'SELECT id FROM services WHERE name = ?',
            args: [s.name]
        });
        if (existing.rows.length === 0) {
            await db.execute({
                sql: `INSERT INTO services (name, category, duration_minutes, price, description, is_active, created_at)
              VALUES (?, ?, ?, ?, ?, 1, ?)`,
                args: [s.name, s.category, s.duration_minutes, s.price, s.description, now]
            });
        }
    }
}
// Rendez-vous
export async function getAppointments(filters) {
    let query = `
    SELECT a.*,
           c.name as contact_name,
           c.phone_number as contact_phone,
           t.name as team_member_name,
           t.color as team_member_color,
           s.name as service_name,
           s.price as service_price,
           s.duration_minutes as service_duration
    FROM appointments a
    LEFT JOIN contacts c ON a.contact_id = c.id
    LEFT JOIN team_members t ON a.team_member_id = t.id
    LEFT JOIN services s ON a.service_id = s.id
    WHERE 1=1
  `;
    const args = [];
    if (filters?.startDate) {
        query += ' AND a.date >= ?';
        args.push(filters.startDate);
    }
    if (filters?.endDate) {
        query += ' AND a.date <= ?';
        args.push(filters.endDate);
    }
    if (filters?.teamMemberId) {
        query += ' AND a.team_member_id = ?';
        args.push(filters.teamMemberId);
    }
    if (filters?.contactId) {
        query += ' AND a.contact_id = ?';
        args.push(filters.contactId);
    }
    if (filters?.status) {
        query += ' AND a.status = ?';
        args.push(filters.status);
    }
    query += ' ORDER BY a.date ASC, a.start_time ASC';
    const res = await db.execute({ sql: query, args });
    return res.rows;
}
export async function getAppointmentById(id) {
    const res = await db.execute({
        sql: `
      SELECT a.*,
             c.name as contact_name,
             c.phone_number as contact_phone,
             t.name as team_member_name,
             t.color as team_member_color,
             s.name as service_name
      FROM appointments a
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN team_members t ON a.team_member_id = t.id
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.id = ?
    `,
        args: [id]
    });
    return res.rows[0] || null;
}
export async function createAppointment(data) {
    const now = new Date().toISOString();
    const res = await db.execute({
        sql: `INSERT INTO appointments (
            contact_id, team_member_id, service_id, title, date, start_time, end_time, status, notes, source, document_url, document_name, collaborator_status, collaborator_accepted_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
            data.contact_id,
            data.team_member_id || null,
            data.service_id || null,
            data.title,
            data.date,
            data.start_time,
            data.end_time,
            data.status || 'confirmed',
            data.notes || null,
            data.source || 'whatsapp_ai',
            data.document_url || null,
            data.document_name || null,
            data.collaborator_status || (data.team_member_id ? 'pending' : null),
            data.collaborator_accepted_at || null,
            now,
            now
        ]
    });
    return Number(res.lastInsertRowid);
}
export async function updateAppointment(id, data) {
    const now = new Date().toISOString();
    const updates = ['updated_at = ?'];
    const args = [now];
    if (data.title !== undefined) {
        updates.push('title = ?');
        args.push(data.title);
    }
    if (data.team_member_id !== undefined) {
        updates.push('team_member_id = ?');
        args.push(data.team_member_id);
    }
    if (data.service_id !== undefined) {
        updates.push('service_id = ?');
        args.push(data.service_id);
    }
    if (data.date !== undefined) {
        updates.push('date = ?');
        args.push(data.date);
    }
    if (data.start_time !== undefined) {
        updates.push('start_time = ?');
        args.push(data.start_time);
    }
    if (data.end_time !== undefined) {
        updates.push('end_time = ?');
        args.push(data.end_time);
    }
    if (data.status !== undefined) {
        updates.push('status = ?');
        args.push(data.status);
    }
    if (data.notes !== undefined) {
        updates.push('notes = ?');
        args.push(data.notes);
    }
    if (data.document_url !== undefined) {
        updates.push('document_url = ?');
        args.push(data.document_url);
    }
    if (data.document_name !== undefined) {
        updates.push('document_name = ?');
        args.push(data.document_name);
    }
    if (data.collaborator_status !== undefined) {
        updates.push('collaborator_status = ?');
        args.push(data.collaborator_status);
    }
    if (data.collaborator_accepted_at !== undefined) {
        updates.push('collaborator_accepted_at = ?');
        args.push(data.collaborator_accepted_at);
    }
    args.push(id);
    await db.execute({
        sql: `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`,
        args
    });
}
export async function deleteAppointment(id) {
    await db.execute({
        sql: 'DELETE FROM appointments WHERE id = ?',
        args: [id]
    });
}
// Paramètres
export async function getSetting(key) {
    const res = await db.execute({
        sql: 'SELECT value FROM settings WHERE key = ?',
        args: [key]
    });
    if (res.rows.length === 0)
        return null;
    try {
        return JSON.parse(res.rows[0].value);
    }
    catch {
        return res.rows[0].value;
    }
}
export async function setSetting(key, value) {
    const now = new Date().toISOString();
    const valString = typeof value === 'string' ? value : JSON.stringify(value);
    await db.execute({
        sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: [key, valString, now]
    });
}
// Stats pour le tableau de bord
export async function getDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const [contactsCount, messagesToday, appointmentsToday, teamCount] = await Promise.all([
        db.execute('SELECT COUNT(*) as count FROM contacts'),
        db.execute({
            sql: 'SELECT COUNT(*) as count FROM messages WHERE timestamp >= ?',
            args: [`${today}T00:00:00`]
        }),
        db.execute({
            sql: "SELECT COUNT(*) as count FROM appointments WHERE date = ? AND status != 'cancelled'",
            args: [today]
        }),
        db.execute('SELECT COUNT(*) as count FROM team_members WHERE is_active = 1')
    ]);
    return {
        totalContacts: Number(contactsCount.rows[0].count),
        messagesToday: Number(messagesToday.rows[0].count),
        appointmentsToday: Number(appointmentsToday.rows[0].count),
        activeTeamMembers: Number(teamCount.rows[0].count)
    };
}
// Copilote IA Gérant (Chat interne)
export async function getCopilotMessages(limit = 100) {
    const res = await db.execute({
        sql: `SELECT * FROM copilot_messages ORDER BY id ASC LIMIT ?`,
        args: [limit]
    });
    return res.rows;
}
export async function saveCopilotMessage(role, content, actionData) {
    const now = new Date().toISOString();
    const actionDataStr = actionData ? (typeof actionData === 'string' ? actionData : JSON.stringify(actionData)) : null;
    const res = await db.execute({
        sql: `INSERT INTO copilot_messages (role, content, action_data, timestamp) VALUES (?, ?, ?, ?)`,
        args: [role, content, actionDataStr, now]
    });
    return {
        id: Number(res.lastInsertRowid),
        role,
        content,
        action_data: actionDataStr,
        timestamp: now
    };
}
export async function clearCopilotMessages() {
    await db.execute('DELETE FROM copilot_messages');
}
