import { initDatabase } from "../server/db/database.js";
import {
  getOrCreateContact,
  saveMessage,
  getMessagesByContact,
  getAllTeamMembers,
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
  getDashboardStats,
  saveOrUpdateMemory,
  getMemoriesByContact,
  updateContact,
  getContactById
} from "../server/db/queries.js";
import { getAvailableSlots, isSlotAvailable } from "../server/services/appointments.js";
import { generateIcsContent, generateGoogleCalendarUrl } from "../server/services/calendar.js";

async function runTests() {
  console.log("🧪 Lancement de la suite de tests Hub PME : Agenda & CRM...\n");

  // 1. Base de données
  console.log("1. Test initialisation base de données...");
  await initDatabase();
  const stats = await getDashboardStats();
  console.log("   Stats initiales :", stats);
  if (stats.activeTeamMembers < 1) throw new Error("Collaborateurs par défaut non initialisés");
  console.log("   ✅ Base de données initialisée avec succès.\n");

  // 2. Contacts & Messages
  console.log("2. Test gestion des contacts et échanges...");
  const testPhone = "+33612345678";
  const contact = await getOrCreateContact(testPhone, "Alice Dupont");
  console.log("   Contact créé :", contact.name, contact.phone_number);
  if (!contact.phone_number.includes("33612345678")) throw new Error("Numéro incorrect");

  const msg1 = await saveMessage(contact.id, "inbound", "client", "Bonjour, je souhaite un devis pour une intervention.");
  const msg2 = await saveMessage(contact.id, "outbound", "human", "Bonjour Alice ! Bien reçu, nous planifions un passage.");
  const history = await getMessagesByContact(contact.id);
  if (history.length < 2) throw new Error("Historique incomplet");
  console.log("   ✅ Contacts et messages vérifiés (total :", history.length, ").\n");

  // 3. Fiches CRM & Notes Techniques
  console.log("3. Test fiche CRM et consignes d'accès...");
  await updateContact(contact.id, {
    notes: "Digicode 4589B, 2ème étage droite. Contacter le gardien si absent."
  });
  await saveOrUpdateMemory(contact.id, "chantier", "consignes", "Chantier prioritaire");
  const updatedContact = await getContactById(contact.id);
  const memories = await getMemoriesByContact(contact.id);
  console.log("   Notes CRM :", updatedContact?.notes);
  if (!updatedContact || !updatedContact.notes?.includes("4589B")) throw new Error("Fiche CRM non enregistrée");
  if (memories.length === 0) throw new Error("Mémoire technique non enregistrée");
  console.log("   ✅ Fiches CRM et consignes techniques validées.\n");

  // 4. Calculs des créneaux & conflits d'agenda
  console.log("4. Test du moteur d'agenda et gestion des conflits...");
  const members = await getAllTeamMembers(true);
  const tech = members[0];
  console.log(`   Collaborateur test : ${tech.name} (ID: ${tech.id})`);

  const testDate = "2026-09-22"; // Mardi
  const slots = await getAvailableSlots(tech.id, testDate, 30);
  console.log(`   Créneaux libres trouvés le ${testDate} : ${slots.slice(0, 4).join(", ")}... (${slots.length} au total)`);
  if (slots.length === 0) throw new Error("Aucun créneau disponible pour un jour ouvré");

  const chosenSlot = slots[0];
  console.log(`   Réservation du créneau ${chosenSlot}...`);

  const aptId = await createAppointment({
    contact_id: contact.id,
    team_member_id: tech.id,
    title: "Diagnostic Installation PME",
    date: testDate,
    start_time: chosenSlot,
    end_time: "09:30",
    status: "confirmed"
  });
  console.log(`   Rendez-vous créé avec succès (ID: ${aptId})`);

  // Vérifier que le créneau est désormais marqué occupé
  const isStillFree = await isSlotAvailable(tech.id, testDate, chosenSlot, "09:30");
  if (isStillFree) throw new Error("Conflit non détecté sur le même créneau");

  const slotsAfterBooking = await getAvailableSlots(tech.id, testDate, 30);
  if (slotsAfterBooking.includes(chosenSlot)) {
    throw new Error("Le créneau réservé figure encore dans les disponibilités");
  }
  console.log("   ✅ Moteur de réservation et détection de conflit d'agenda validés.\n");

  // 5. Générateurs Calendriers (Google & ICS)
  console.log("5. Test des exports de calendrier...");
  const gCalUrl = generateGoogleCalendarUrl({
    title: "Diagnostic Installation PME",
    date: testDate,
    startTime: chosenSlot,
    endTime: "09:30",
    details: "Client : Alice Dupont"
  });
  if (!gCalUrl.includes("calendar.google.com")) throw new Error("URL Google Calendar invalide");

  const ics = generateIcsContent({
    id: aptId,
    title: "Diagnostic Installation PME",
    date: testDate,
    startTime: chosenSlot,
    endTime: "09:30",
    details: "Client : Alice Dupont"
  });
  if (!ics.includes("BEGIN:VCALENDAR") || !ics.includes("END:VCALENDAR")) {
    throw new Error("Contenu ICS invalide");
  }
  console.log("   ✅ Exports Google Calendar et Apple .ics validés.\n");

  // Nettoyage
  await deleteAppointment(aptId);
  console.log("   Nettoyage des données de test terminé.\n");

  console.log("🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !");
}

runTests().catch(err => {
  console.error("❌ Échec du test :", err);
  process.exit(1);
});
