/**
 * Utilitaires pour l'agenda, l'export de calendrier et la messagerie WhatsApp
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
  const uid = `apt-${params.id}-${cleanDate}@artisan`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Artisan Assistant//FR',
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
