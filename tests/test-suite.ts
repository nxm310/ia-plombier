import { initDatabase } from '../server/db/database.js';
import {
  getOrCreateContact,
  saveMessage,
  getMessagesByContact,
  saveOrUpdateMemory,
  getMemoriesByContact,
  getAllTeamMembers,
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
  getDashboardStats
} from '../server/db/queries.js';
import { getAvailableSlots, isSlotAvailable } from '../server/services/appointments.js';
import { executeToolCall } from '../server/ai/tools.js';

async function runTests() {
  console.log('🧪 Lancement des tests de l\'Assistant WhatsApp PME...\n');

  // 1. Base de données
  console.log('1. Test initialisation base de données...');
  await initDatabase();
  const stats = await getDashboardStats();
  console.log('   Stats:', stats);
  if (stats.activeTeamMembers < 1) throw new Error('Collaborateurs par défaut non initialisés');
  console.log('   ✅ Base de données initialisée avec succès.\n');

  // 2. Contacts & Messages
  console.log('2. Test gestion des contacts et messages...');
  const testPhone = '+33612345678';
  const contact = await getOrCreateContact(testPhone, 'Alice Dupont');
  console.log('   Contact créé:', contact.name, contact.phone_number);
  if (contact.phone_number !== '+33612345678') throw new Error('Numéro incorrect');

  const msg1 = await saveMessage(contact.id, 'inbound', 'client', 'Bonjour, je voudrais des informations');
  const msg2 = await saveMessage(contact.id, 'outbound', 'ai', 'Bonjour Alice ! En quoi puis-je vous aider ?');
  const history = await getMessagesByContact(contact.id);
  if (history.length < 2) throw new Error('Historique incomplet');
  console.log('   ✅ Messages et historique vérifiés (total:', history.length, ').\n');

  // 3. Mémoire Long-Terme
  console.log('3. Test mémoire long-terme du client...');
  await saveOrUpdateMemory(contact.id, 'project', 'besoin_principal', 'Audit du parc informatique de 15 postes');
  await saveOrUpdateMemory(contact.id, 'budget', 'budget_estime', '4000€ HT');
  const memories = await getMemoriesByContact(contact.id);
  console.log('   Mémoires enregistrées:', memories.map(m => `${m.key} = ${m.value}`));
  if (memories.length < 2) throw new Error('Mémoire non enregistrée');
  console.log('   ✅ Mémoire client validée.\n');

  // 4. Calculs des créneaux & conflits d\'agenda
  console.log('4. Test du moteur d\'agenda et créneaux...');
  const members = await getAllTeamMembers(true);
  const marc = members[0];
  console.log(`   Collaborateur test: ${marc.name} (ID: ${marc.id})`);

  // Choisir un mardi futur
  const testDate = '2026-09-15'; // Mardi
  const slots = await getAvailableSlots(marc.id, testDate, 30);
  console.log(`   Créneaux libres trouvés le ${testDate}:`, slots.slice(0, 5), `... (${slots.length} au total)`);
  if (slots.length === 0) throw new Error('Aucun créneau disponible pour un mardi ouvré');

  const chosenSlot = slots[0]; // ex: '09:00'
  console.log(`   Réservation du créneau ${chosenSlot}...`);

  const aptId = await createAppointment({
    contact_id: contact.id,
    team_member_id: marc.id,
    title: 'Audit Informatique PME',
    date: testDate,
    start_time: chosenSlot,
    end_time: '09:30',
    status: 'confirmed'
  });
  console.log(`   Rendez-vous créé avec succès (ID: ${aptId})`);

  // Vérifier que le créneau est désormais marqué occupé
  const isStillFree = await isSlotAvailable(marc.id, testDate, chosenSlot, '09:30');
  console.log(`   Le créneau ${chosenSlot} est-il encore libre ?`, isStillFree ? 'NON (erreur)' : 'NON (conflit bien détecté)');
  if (isStillFree) throw new Error('Conflit non détecté sur le même créneau');

  const slotsAfterBooking = await getAvailableSlots(marc.id, testDate, 30);
  if (slotsAfterBooking.includes(chosenSlot)) {
    throw new Error('Le créneau réservé figure encore dans les créneaux disponibles');
  }
  console.log('   ✅ Moteur de réservation et détection de conflit validés sans faille.\n');

  // 5. Outils IA (Tool Calling)
  console.log('5. Test de l\'exécution des Outils IA...');
  const toolResult = await executeToolCall('getAvailableSlots', {
    date: testDate,
    teamMemberId: marc.id
  }, { contactId: contact.id, contactPhone: contact.phone_number });

  console.log('   Résultat outil getAvailableSlots:', toolResult.message);
  if (!toolResult.availableSlots) throw new Error('Outil IA défaillant');

  const memoryToolResult = await executeToolCall('saveClientMemory', {
    category: 'preference',
    key: 'canal_prefere',
    value: 'WhatsApp uniquement'
  }, { contactId: contact.id, contactPhone: contact.phone_number });
  console.log('   Résultat outil saveClientMemory:', memoryToolResult);

  // Nettoyage du RDV de test
  await deleteAppointment(aptId);
  console.log('   ✅ Tous les outils IA ont répondu avec succès.\n');

  console.log('🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !');
}

runTests().catch(err => {
  console.error('❌ Échec du test:', err);
  process.exit(1);
});
