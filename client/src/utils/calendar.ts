/**
 * Utilitaires pour l'agenda, l'export de calendrier et les notifications
 */

export function generateClientGoogleCalendarUrl(params: {
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  details?: string;
  location?: string;
}): string {
  const cleanDate = (params.date || '').replace(/-/g, '');
  const cleanStart = (params.startTime || '09:00').replace(/:/g, '') + '00';
  const cleanEnd = (params.endTime || '10:00').replace(/:/g, '') + '00';
  const dates = `${cleanDate}T${cleanStart}/${cleanDate}T${cleanEnd}`;

  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: params.title || 'Rendez-vous intervention',
    dates,
    details: params.details || '',
    location: params.location || ''
  });

  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

export function downloadClientIcsFile(params: {
  id: string | number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  details?: string;
  location?: string;
}) {
  const cleanDate = (params.date || '').replace(/-/g, '');
  const cleanStart = (params.startTime || '09:00').replace(/:/g, '') + '00';
  const cleanEnd = (params.endTime || '10:00').replace(/:/g, '') + '00';
  const uid = `apt-${params.id}-${cleanDate}@hub-pme`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hub PME//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${cleanDate}T${cleanStart}`,
    `DTEND:${cleanDate}T${cleanEnd}`,
    `SUMMARY:${(params.title || 'Rendez-vous').replace(/\n/g, ' ')}`,
    params.details ? `DESCRIPTION:${params.details.replace(/\n/g, '\\n')}` : '',
    params.location ? `LOCATION:${params.location.replace(/\n/g, ' ')}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');

  const blob = new Blob([icsLines], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rendez-vous-${params.date || 'rdv'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatClientAppointmentMessage(apt: {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  contactName?: string | null;
  teamMemberName?: string | null;
  serviceName?: string | null;
  notes?: string | null;
}): string {
  let formattedDate = apt.date;
  try {
    formattedDate = new Date(`${apt.date}T00:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {}

  const parts = [
    `Bonjour ${apt.contactName || ''},`.trim(),
    ``,
    `✅ Votre rendez-vous est bien confirmé :`,
    `📅 Date : ${formattedDate}`,
    `⏰ Horaire : ${apt.startTime} - ${apt.endTime}`,
    apt.serviceName ? `🔧 Prestation : ${apt.serviceName}` : (apt.title ? `🔧 Motif : ${apt.title}` : ''),
    apt.teamMemberName ? `👷 Intervenant : ${apt.teamMemberName}` : '',
    apt.notes ? `📝 Précisions : ${apt.notes}` : '',
    ``,
    `À très bientôt !`
  ];

  return parts.filter(p => p !== '').join('\n');
}

export function formatCollaboratorMissionMessage(apt: {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  contactName?: string | null;
  contactPhone?: string | null;
  teamMemberName?: string | null;
  serviceName?: string | null;
  notes?: string | null;
}): string {
  let formattedDate = apt.date;
  try {
    formattedDate = new Date(`${apt.date}T00:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {}

  const parts = [
    `🛠️ ORDRE DE MISSION - ${apt.teamMemberName || 'Collaborateur'}`,
    ``,
    `📅 Date : ${formattedDate}`,
    `⏰ Horaire : ${apt.startTime} - ${apt.endTime}`,
    apt.serviceName ? `🔧 Prestation : ${apt.serviceName}` : `🔧 Titre : ${apt.title}`,
    apt.contactName ? `👤 Client : ${apt.contactName}` : '',
    apt.contactPhone ? `📞 Téléphone : ${apt.contactPhone}` : '',
    apt.notes ? `📝 Précisions : ${apt.notes}` : '',
    ``,
    `Merci de confirmer la bonne prise en compte de cette mission.`
  ];

  return parts.filter(p => p !== '').join('\n');
}

export interface ShareAppointmentPayload {
  id?: string | number;
  title: string;
  date: string;
  start_time?: string;
  startTime?: string;
  end_time?: string;
  endTime?: string;
  contact_name?: string | null;
  contactName?: string | null;
  contact_phone?: string | null;
  contactPhone?: string | null;
  team_member_name?: string | null;
  teamMemberName?: string | null;
  service_name?: string | null;
  serviceName?: string | null;
  notes?: string | null;
}

export function formatAppointmentForSharing(
  apt: ShareAppointmentPayload,
  type: 'client' | 'collaborator' = 'client'
): { title: string; text: string; googleCalUrl: string } {
  const startTime = apt.start_time || apt.startTime || '09:00';
  const endTime = apt.end_time || apt.endTime || '10:00';
  const contactName = apt.contact_name || apt.contactName || null;
  const contactPhone = apt.contact_phone || apt.contactPhone || null;
  const teamMemberName = apt.team_member_name || apt.teamMemberName || null;
  const serviceName = apt.service_name || apt.serviceName || null;
  const notes = apt.notes || null;

  const isCollaborator = type === 'collaborator';
  const baseMessage = isCollaborator
    ? formatCollaboratorMissionMessage({
        title: apt.title,
        date: apt.date,
        startTime,
        endTime,
        contactName,
        contactPhone,
        teamMemberName,
        serviceName,
        notes
      })
    : formatClientAppointmentMessage({
        title: apt.title,
        date: apt.date,
        startTime,
        endTime,
        contactName,
        teamMemberName,
        serviceName,
        notes
      });

  const googleCalUrl = generateClientGoogleCalendarUrl({
    title: serviceName ? `Intervention : ${serviceName}` : apt.title,
    date: apt.date,
    startTime,
    endTime,
    details: `Intervention avec ${teamMemberName || 'Notre équipe'}.${notes ? `\nPrécisions : ${notes}` : ''}`
  });

  const fullShareText = `${baseMessage}\n\n📅 Synchroniser avec Google Agenda :\n${googleCalUrl}`;
  const shareTitle = `RDV : ${apt.title} (${apt.date} à ${startTime})`;

  return {
    title: shareTitle,
    text: fullShareText,
    googleCalUrl
  };
}

export async function shareAppointmentNative(
  apt: ShareAppointmentPayload,
  type: 'client' | 'collaborator' = 'client'
): Promise<{ success: boolean; method: 'share' | 'clipboard' | 'none'; message?: string }> {
  const { title, text } = formatAppointmentForSharing(apt, type);

  // 1. Tenter la fonction de partage native sur Android / iPhone
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title,
        text
      });
      return { success: true, method: 'share' };
    } catch (err: any) {
      if (
        err &&
        (err.name === 'AbortError' ||
          String(err).toLowerCase().includes('abort') ||
          String(err).toLowerCase().includes('cancel') ||
          String(err).toLowerCase().includes('dismissed'))
      ) {
        return { success: true, method: 'share' };
      }
      console.warn('Erreur navigator.share, tentative fallback clipboard:', err);
    }
  }

  // 2. Fallback presse-papier si Web Share n'est pas actif (ex: ordinateur de bureau ou navigateur sans share)
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return {
        success: true,
        method: 'clipboard',
        message: 'Détails du rendez-vous copiés dans le presse-papier ! Prêt à être collé (SMS, Mail, etc.)'
      };
    } catch (clipErr) {
      console.warn('Erreur écriture clipboard:', clipErr);
    }
  }

  return { success: false, method: 'none' };
}
