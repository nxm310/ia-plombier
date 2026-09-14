import {
  getAllTeamMembers,
  getTeamMemberById,
  createAppointment,
  getAppointments,
  updateAppointment,
  saveOrUpdateMemory,
  updateContact,
  getContactById
} from '../db/queries.js';
import { getAvailableSlots, isSlotAvailable } from '../services/appointments.js';

export const AI_TOOLS_DECLARATIONS = [
  {
    name: 'listTeamMembersAndSpecialties',
    description: 'Retourne la liste des collaborateurs de la PME, leurs rôles et leurs spécialités afin de savoir à qui assigner un rendez-vous ou vers qui orienter le client.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getAvailableSlots',
    description: 'Vérifie les créneaux disponibles pour un collaborateur précis à une date donnée (YYYY-MM-DD).',
    parameters: {
      type: 'object',
      properties: {
        teamMemberId: {
          type: 'number',
          description: "L'identifiant ID du collaborateur (obtenu via listTeamMembersAndSpecialties)."
        },
        date: {
          type: 'string',
          description: 'La date souhaitée au format YYYY-MM-DD (ex: 2026-09-15).'
        },
        durationMinutes: {
          type: 'number',
          description: 'Durée du rendez-vous en minutes (défaut 30 min).'
        }
      },
      required: ['date']
    }
  },
  {
    name: 'bookAppointment',
    description: 'Réserve un rendez-vous ferme dans le calendrier de la PME pour le client après accord sur la date et l\'heure.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date du rendez-vous (YYYY-MM-DD).'
        },
        startTime: {
          type: 'string',
          description: 'Heure de début au format HH:MM (ex: "14:30").'
        },
        durationMinutes: {
          type: 'number',
          description: 'Durée du rendez-vous en minutes (défaut 30).'
        },
        teamMemberId: {
          type: 'number',
          description: 'ID du collaborateur choisi pour le rendez-vous.'
        },
        title: {
          type: 'string',
          description: 'Titre ou motif du rendez-vous (ex: "Devis rénovation", "Point commercial").'
        },
        notes: {
          type: 'string',
          description: 'Notes complémentaires pour l\'équipe.'
        }
      },
      required: ['date', 'startTime', 'title']
    }
  },
  {
    name: 'cancelOrRescheduleAppointment',
    description: 'Annule ou décale un rendez-vous existant d\'un client.',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: {
          type: 'number',
          description: 'ID du rendez-vous à modifier ou annuler.'
        },
        action: {
          type: 'string',
          enum: ['cancel', 'reschedule'],
          description: 'Action : "cancel" pour annuler, "reschedule" pour déplacer.'
        },
        newDate: {
          type: 'string',
          description: 'Nouvelle date si action = reschedule (YYYY-MM-DD).'
        },
        newStartTime: {
          type: 'string',
          description: 'Nouvelle heure de début si action = reschedule (HH:MM).'
        }
      },
      required: ['appointmentId', 'action']
    }
  },
  {
    name: 'saveClientMemory',
    description: 'Mémorise une information importante sur le client (préférence, type de projet, budget, contrainte, adresse, etc.) pour s\'en souvenir lors de toutes les futures conversations.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['preference', 'project', 'budget', 'need', 'contact_info', 'general'],
          description: 'Catégorie du fait mémorisé.'
        },
        key: {
          type: 'string',
          description: 'Clé courte et descriptive (ex: "budget", "secteur_activite", "creneau_prefere", "nom_complet").'
        },
        value: {
          type: 'string',
          description: 'La valeur à retenir (ex: "4000€ HT", "Boulangerie artisanale", "Disponible uniquement l\'après-midi").'
        }
      },
      required: ['category', 'key', 'value']
    }
  },
  {
    name: 'handoverToHuman',
    description: 'Active le transfert vers un collaborateur humain de l\'équipe et désactive l\'auto-répondeur IA pour ce contact lorsque la demande exige une intervention humaine.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'La raison du transfert humain.'
        }
      },
      required: ['reason']
    }
  }
];

export async function executeToolCall(
  name: string,
  args: any,
  context: { contactId: number; contactPhone: string }
): Promise<any> {
  switch (name) {
    case 'listTeamMembersAndSpecialties': {
      const members = await getAllTeamMembers(true);
      return members.map(m => ({
        id: m.id,
        name: m.name,
        role: m.role,
        specialties: m.specialties
      }));
    }

    case 'getAvailableSlots': {
      const date = args.date;
      const duration = args.durationMinutes || 30;
      let memberId = args.teamMemberId;

      if (!memberId) {
        // Si aucun collaborateur n'a été spécifié, prendre le premier collaborateur actif
        const members = await getAllTeamMembers(true);
        if (members.length > 0) {
          memberId = members[0].id;
        } else {
          return { error: 'Aucun collaborateur disponible' };
        }
      }

      const member = await getTeamMemberById(memberId);
      const slots = await getAvailableSlots(memberId, date, duration);

      return {
        date,
        teamMember: member ? { id: member.id, name: member.name, role: member.role } : null,
        availableSlots: slots,
        count: slots.length,
        message: slots.length > 0
          ? `${slots.length} créneaux disponibles pour ${member?.name || 'l\'équipe'} le ${date}`
          : `Aucun créneau disponible pour ${member?.name || 'l\'équipe'} le ${date}. Proposez une autre date.`
      };
    }

    case 'bookAppointment': {
      const { date, startTime, durationMinutes = 30, title, notes } = args;
      let memberId = args.teamMemberId;

      if (!memberId) {
        const members = await getAllTeamMembers(true);
        if (members.length > 0) memberId = members[0].id;
      }

      // Calcul heure de fin
      const [h, m] = startTime.split(':').map(Number);
      const startMin = h * 60 + m;
      const endMin = startMin + durationMinutes;
      const endH = Math.floor(endMin / 60);
      const endM = endMin % 60;
      const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

      // Vérifier disponibilité
      if (memberId) {
        const isFree = await isSlotAvailable(memberId, date, startTime, endTime);
        if (!isFree) {
          return {
            success: false,
            error: `Le créneau ${startTime} - ${endTime} le ${date} est déjà occupé. Veuillez proposer un autre horaire.`
          };
        }
      }

      const aptId = await createAppointment({
        contact_id: context.contactId,
        team_member_id: memberId || null,
        title,
        date,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
        notes: notes || null,
        source: 'whatsapp_ai'
      });

      const member = memberId ? await getTeamMemberById(memberId) : null;

      return {
        success: true,
        appointmentId: aptId,
        date,
        startTime,
        endTime,
        teamMember: member?.name || 'Équipe',
        title,
        message: `Rendez-vous confirmé avec succès pour le ${date} à ${startTime} avec ${member?.name || 'l\'équipe'}.`
      };
    }

    case 'cancelOrRescheduleAppointment': {
      const { appointmentId, action, newDate, newStartTime } = args;

      if (action === 'cancel') {
        await updateAppointment(appointmentId, { status: 'cancelled' });
        return { success: true, message: `Le rendez-vous #${appointmentId} a bien été annulé.` };
      }

      if (action === 'reschedule' && newDate && newStartTime) {
        const [h, m] = newStartTime.split(':').map(Number);
        const endMin = h * 60 + m + 30;
        const endTime = `${Math.floor(endMin / 60).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`;

        await updateAppointment(appointmentId, {
          date: newDate,
          start_time: newStartTime,
          end_time: endTime,
          status: 'confirmed'
        });

        return {
          success: true,
          message: `Le rendez-vous #${appointmentId} a été déplacé au ${newDate} à ${newStartTime}.`
        };
      }

      return { success: false, error: 'Paramètres manquants pour le déplacement du rendez-vous.' };
    }

    case 'saveClientMemory': {
      const { category, key, value } = args;
      await saveOrUpdateMemory(context.contactId, category, key, value);
      return { success: true, saved: { category, key, value } };
    }

    case 'handoverToHuman': {
      const { reason } = args;
      await updateContact(context.contactId, { ai_enabled: 0, notes: `Transféré à l'équipe humaine: ${reason}` });
      return {
        success: true,
        message: 'L\'auto-répondeur IA a été désactivé pour ce contact. Un collaborateur humain de l\'équipe va prendre le relais.'
      };
    }

    default:
      return { error: `Outil inconnu : ${name}` };
  }
}
