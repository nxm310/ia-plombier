import { getAppointments, updateAppointment, getContactById } from '../db/queries.js';

/**
 * Service de rappels automatiques (prêt pour SMS / Email / Webhook)
 */
export function startReminderCron(intervalMinutes: number = 10) {
  console.log(`[Rappels] Service de rappels initialisé (en attente du nouveau canal de messagerie, vérif ${intervalMinutes} min)`);
}
