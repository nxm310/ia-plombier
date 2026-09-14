import { getAppointments, getTeamMemberById, getAllTeamMembers } from '../db/queries.js';

export interface TimeSlot {
  start: string; // HH:MM
  end: string;   // HH:MM
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

const DAYS_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Calcule tous les créneaux libres pour un collaborateur à une date donnée
 */
export async function getAvailableSlots(
  teamMemberId: number,
  date: string, // YYYY-MM-DD
  durationMinutes: number = 30
): Promise<string[]> {
  const member = await getTeamMemberById(teamMemberId);
  if (!member || !member.is_active || (member.status && member.status !== 'active')) {
    return [];
  }

  // Obtenir le jour de la semaine
  const targetDate = new Date(`${date}T00:00:00`);
  const dayName = DAYS_MAP[targetDate.getDay()];

  const daySchedule = member.working_hours[dayName];
  if (!daySchedule || !daySchedule.enabled || !daySchedule.slots || daySchedule.slots.length === 0) {
    return [];
  }

  // Obtenir les rendez-vous existants pour ce jour
  const existingAppointments = await getAppointments({
    startDate: date,
    endDate: date,
    teamMemberId
  });

  const activeAppointments = existingAppointments.filter(a => a.status !== 'cancelled');

  const availableStartTimes: string[] = [];

  // Parcourir chaque plage de travail de la journée (ex: 9h-12h et 14h-18h)
  for (const range of daySchedule.slots) {
    const rangeStart = timeToMinutes(range.start);
    const rangeEnd = timeToMinutes(range.end);

    for (let current = rangeStart; current + durationMinutes <= rangeEnd; current += durationMinutes) {
      const slotStart = current;
      const slotEnd = current + durationMinutes;

      // Vérifier le chevauchement avec un RDV existant
      const hasConflict = activeAppointments.some(apt => {
        const aptStart = timeToMinutes(apt.start_time);
        const aptEnd = timeToMinutes(apt.end_time);
        // Conflit si le créneau démarre avant la fin du RDV ET se termine après le début du RDV
        return slotStart < aptEnd && slotEnd > aptStart;
      });

      if (!hasConflict) {
        availableStartTimes.push(minutesToTime(slotStart));
      }
    }
  }

  return availableStartTimes;
}

/**
 * Trouve les collaborateurs capables d'assurer un service ou une spécialité
 */
export async function findMembersBySpecialty(specialtyOrKeyword: string) {
  const allMembers = await getAllTeamMembers(true);
  const normalized = specialtyOrKeyword.toLowerCase();

  return allMembers.filter(m => {
    const matchesRole = m.role.toLowerCase().includes(normalized);
    const matchesSpecialty = m.specialties.some(s => s.toLowerCase().includes(normalized));
    return matchesRole || matchesSpecialty;
  });
}

/**
 * Vérifie si un créneau précis est libre pour un collaborateur
 */
export async function isSlotAvailable(
  teamMemberId: number,
  date: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  const appointments = await getAppointments({
    startDate: date,
    endDate: date,
    teamMemberId
  });

  const slotStart = timeToMinutes(startTime);
  const slotEnd = timeToMinutes(endTime);

  const conflict = appointments.find(apt => {
    if (apt.status === 'cancelled') return false;
    const aptStart = timeToMinutes(apt.start_time);
    const aptEnd = timeToMinutes(apt.end_time);
    return slotStart < aptEnd && slotEnd > aptStart;
  });

  return !conflict;
}
