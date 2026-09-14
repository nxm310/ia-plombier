import { getAppointments, updateAppointment, getContactById } from '../db/queries.js';
import { getWhatsAppState, sendManualWhatsAppMessage } from '../whatsapp/client.js';

/**
 * Service vérifiant les rendez-vous à venir pour envoyer un rappel WhatsApp automatique
 */
export function startReminderCron(intervalMinutes: number = 10) {
  console.log(`[Rappels] Service de rappels WhatsApp initialisé (vérification toutes les ${intervalMinutes} min)`);

  const runCheck = async () => {
    try {
      const waState = getWhatsAppState();
      if (waState.status !== 'connected') {
        return; // Pas de rappel possible si WhatsApp n'est pas connecté
      }

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Rendez-vous d'aujourd'hui et demain
      const upcoming = await getAppointments({
        startDate: todayStr,
        endDate: tomorrowStr,
        status: 'confirmed'
      });

      for (const apt of upcoming) {
        if (apt.reminder_sent === 1) continue;

        const aptDateTime = new Date(`${apt.date}T${apt.start_time}:00`);
        const diffHours = (aptDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

        // Envoyer rappel si le rdv est dans moins de 24h et dans plus de 30min
        if (diffHours > 0.5 && diffHours <= 24) {
          const contact = await getContactById(apt.contact_id);
          if (contact && contact.phone_number) {
            const reminderMessage = `🔔 *Rappel de rendez-vous*\n\nBonjour ${contact.name || ''},\nNous vous confirmons votre rendez-vous prévu le *${apt.date}* à *${apt.start_time}* avec *${apt.team_member_name || 'notre équipe'}*.\n\nMotif : ${apt.title}\n\nEn cas d'empêchement, n'hésitez pas à nous prévenir directement ici. À très bientôt !`;

            try {
              await sendManualWhatsAppMessage(contact.phone_number, reminderMessage);
              await updateAppointment(apt.id, { reminder_sent: 1 } as any);
              console.log(`[Rappels] Rappel envoyé avec succès à ${contact.phone_number} pour le RDV #${apt.id}`);
            } catch (err) {
              console.error(`[Rappels] Échec d'envoi du rappel pour RDV #${apt.id}:`, err);
            }
          }
        }
      }
    } catch (err) {
      console.error('[Rappels] Erreur lors de la vérification des rendez-vous:', err);
    }
  };

  // Premier check après 30 secondes, puis toutes les X minutes
  setTimeout(runCheck, 30000);
  setInterval(runCheck, intervalMinutes * 60 * 1000);
}
