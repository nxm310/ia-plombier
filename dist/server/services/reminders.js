/**
 * Service de rappels automatiques (prêt pour SMS / Email / Webhook)
 */
export function startReminderCron(intervalMinutes = 10) {
    console.log(`[Rappels] Service de rappels initialisé (en attente du nouveau canal de messagerie, vérif ${intervalMinutes} min)`);
}
