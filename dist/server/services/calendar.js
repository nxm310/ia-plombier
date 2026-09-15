import { getAppointmentById, getContactById, getTeamMemberById, getSetting, saveMessage } from '../db/queries.js';
import { getWhatsAppState, sendManualWhatsAppMessage, broadcast } from '../whatsapp/client.js';
/**
 * Génère un lien direct vers Google Agenda avec tous les paramètres pré-remplis
 */
export function generateGoogleCalendarUrl(params) {
    const cleanDate = params.date.replace(/[^0-9]/g, '');
    const cleanStart = params.startTime.replace(/[^0-9]/g, '').padEnd(4, '0') + '00';
    const cleanEnd = params.endTime.replace(/[^0-9]/g, '').padEnd(4, '0') + '00';
    const startIso = `${cleanDate}T${cleanStart}`;
    const endIso = `${cleanDate}T${cleanEnd}`;
    const queryParams = {
        action: 'TEMPLATE',
        text: params.title,
        dates: `${startIso}/${endIso}`,
        details: params.details || '',
        ctz: 'Europe/Paris'
    };
    // Ne pas afficher d'adresse si non spécifiée (garde le calendrier confidentiel et épuré)
    if (params.location && params.location.trim()) {
        queryParams.location = params.location.trim();
    }
    const query = new URLSearchParams(queryParams);
    return `https://calendar.google.com/calendar/render?${query.toString()}`;
}
/**
 * Génère le contenu d'un fichier standard .ics (iCalendar) compatible Apple Calendrier & Outlook
 */
export function generateIcsContent(params) {
    const cleanDate = params.date.replace(/[^0-9]/g, '');
    const cleanStart = params.startTime.replace(/[^0-9]/g, '').padEnd(4, '0') + '00';
    const cleanEnd = params.endTime.replace(/[^0-9]/g, '').padEnd(4, '0') + '00';
    const nowIso = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Assistant WhatsApp PME//FR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:intervention-${params.id}-${cleanDate}@assistant-whatsapp`,
        `DTSTAMP:${nowIso}`,
        `DTSTART;TZID=Europe/Paris:${cleanDate}T${cleanStart}`,
        `DTEND;TZID=Europe/Paris:${cleanDate}T${cleanEnd}`,
        `SUMMARY:${params.title.replace(/\n/g, ' ')}`,
        `DESCRIPTION:${(params.details || '').replace(/\n/g, '\\n')}`
    ];
    if (params.location && params.location.trim()) {
        lines.push(`LOCATION:${params.location.replace(/\n/g, ' ')}`);
    }
    lines.push('STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR');
    return lines.join('\r\n');
}
/**
 * Envoie la notification de confirmation d'intervention au client sur WhatsApp
 * et l'enregistre immédiatement dans le fil de discussion.
 */
export async function sendAppointmentConfirmationNotification(appointmentId, hostUrl) {
    const appointment = await getAppointmentById(appointmentId);
    if (!appointment) {
        throw new Error(`Rendez-vous #${appointmentId} introuvable`);
    }
    const contact = await getContactById(appointment.contact_id);
    if (!contact || !contact.phone_number) {
        throw new Error('Client introuvable pour ce rendez-vous');
    }
    const companyName = (await getSetting('company_name')) || 'Notre entreprise';
    const companyPhone = (await getSetting('company_phone')) || '';
    // Formater la date en français (ex: Vendredi 18 septembre 2026)
    const dateObj = new Date(`${appointment.date}T00:00:00`);
    const formattedDate = dateObj.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const title = appointment.service_name
        ? `Intervention : ${appointment.service_name}`
        : appointment.title || 'Rendez-vous intervention';
    const collaboratorName = appointment.team_member_name || 'Notre équipe technique';
    // Liens pour agenda personnel et page client (même présentation que dans l'agenda)
    const baseUrl = hostUrl || 'http://localhost:3001';
    const calendarPageUrl = `${baseUrl}/api/appointments/${appointment.id}/calendar`;
    const googlePageUrl = `${baseUrl}/api/appointments/${appointment.id}/google`;
    const applePageUrl = `${baseUrl}/api/appointments/${appointment.id}/apple`;
    const greeting = contact.name && contact.name.trim()
        ? `Bonjour ${contact.name.split(' ')[0]}`
        : 'Bonjour';
    const isFullDay = (appointment.start_time === '08:00' && appointment.end_time === '18:00');
    const horaireText = isFullDay ? 'Journée entière (08:00 - 18:00)' : `${appointment.start_time} - ${appointment.end_time}`;
    const messageText = `✅ *Confirmation de votre rendez-vous*

${greeting}, votre intervention a bien été confirmée :

🛠️ *Prestation :* ${appointment.service_name || appointment.title}
👤 *Intervenant :* ${collaboratorName}
🗓️ *Date :* ${formattedDate}
⏰ *Horaire :* ${horaireText}
${appointment.notes ? `📝 *Précisions :* ${appointment.notes}\n` : ''}${appointment.document_url ? `📄 *Document joint :* ${appointment.document_name || 'Document associé'} (consultable sur le lien ci-dessous)\n` : ''}
📲 *Boutons d'ajout rapide (cliquables) :*

📅 *Google Agenda :*
👉 ${googlePageUrl}

🍏 *Apple Calendrier :*
👉 ${applePageUrl}

🔗 *Ouvrir page client :*
👉 ${calendarPageUrl}

Restant à votre entière disposition,
_${companyName}_`;
    const waState = getWhatsAppState();
    if (waState.status === 'connected') {
        await sendManualWhatsAppMessage(contact.phone_number, messageText, contact.id);
    }
    else {
        // Mode local ou hors connexion WhatsApp : enregistre directement le message
        const savedMsg = await saveMessage(contact.id, 'outbound', 'human', messageText, undefined, 'sent');
        broadcast('new_message', {
            contact,
            message: savedMsg
        });
    }
    return {
        success: true,
        appointment,
        contact,
        messageText
    };
}
/**
 * Envoie la notification d'ordre de mission au collaborateur assigné sur WhatsApp
 * avec tous les détails de l'intervention et le lien direct pour accepter la mission en 1 clic.
 */
export async function sendCollaboratorAppointmentNotification(appointmentId, hostUrl) {
    const appointment = await getAppointmentById(appointmentId);
    if (!appointment) {
        throw new Error(`Rendez-vous #${appointmentId} introuvable`);
    }
    if (!appointment.team_member_id) {
        return { success: false, reason: 'Aucun collaborateur assigné à cette intervention' };
    }
    const member = await getTeamMemberById(appointment.team_member_id);
    if (!member || !member.phone) {
        return { success: false, reason: 'Collaborateur introuvable ou sans numéro de téléphone' };
    }
    const contact = appointment.contact_id ? await getContactById(appointment.contact_id) : null;
    const companyName = (await getSetting('company_name')) || 'Notre entreprise';
    const dateObj = new Date(`${appointment.date}T00:00:00`);
    const formattedDate = dateObj.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const isFullDay = (appointment.start_time === '08:00' && appointment.end_time === '18:00');
    const horaireText = isFullDay ? 'Journée entière (08:00 - 18:00)' : `${appointment.start_time} - ${appointment.end_time}`;
    const prestation = appointment.service_name || appointment.title || 'Intervention';
    const baseUrl = hostUrl || 'http://localhost:3001';
    const missionUrl = `${baseUrl}/api/appointments/${appointment.id}/mission`;
    const googlePageUrl = `${baseUrl}/api/appointments/${appointment.id}/google`;
    const applePageUrl = `${baseUrl}/api/appointments/${appointment.id}/apple`;
    const memberFirstName = member.name.split(' ')[0] || member.name;
    const clientName = contact?.name || appointment.contact_name || 'Client';
    const clientPhone = contact?.phone_number || appointment.contact_phone || 'Non renseigné';
    const messageText = `🛠️ *NOUVEL ORDRE DE MISSION* 📋

Bonjour ${memberFirstName}, une nouvelle intervention vous a été assignée :

🏷️ *Prestation :* ${prestation}
🗓️ *Date :* ${formattedDate}
⏰ *Horaire :* ${horaireText}
👤 *Client :* ${clientName}
📞 *Téléphone client :* ${clientPhone}
${appointment.notes ? `📝 *Précisions / Consignes :* ${appointment.notes}\n` : ''}${appointment.document_url ? `📄 *Document joint :* ${appointment.document_name || 'Pièce jointe'} (consultable sur le lien ci-dessous)\n` : ''}
⚡ *Valider la mission & voir les détails (1 clic) :*
👉 ${missionUrl}

📲 *Boutons d'ajout rapide (cliquables) :*

📅 *Google Agenda :*
👉 ${googlePageUrl}

🍏 *Apple Calendrier :*
👉 ${applePageUrl}

_${companyName}_`;
    const waState = getWhatsAppState();
    if (waState.status === 'connected') {
        await sendManualWhatsAppMessage(member.phone, messageText);
    }
    else {
        console.log(`[WhatsApp Collaborator Mock] Message pour ${member.name} (${member.phone}) :\n${messageText}`);
    }
    return {
        success: true,
        appointment,
        member,
        messageText
    };
}
