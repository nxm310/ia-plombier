import { Contact } from '../types';

export const DEFAULT_SAMPLE_CONTACTS: Contact[] = [
  {
    id: 1,
    name: 'Sophie Martin',
    phone_number: '+33 6 12 34 56 78',
    email: 'sophie.martin@gmail.com',
    company: 'Résidence Les Chênes',
    status: 'active',
    tags: ['Particulier', 'Entretien Annuel', 'Pompe à Chaleur'],
    notes: 'Cliente fidèle. Préfère les interventions le matin.',
    ai_enabled: 1,
    avatar: null,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Marc Lefebvre',
    phone_number: '+33 6 98 76 54 32',
    email: 'marc.lefebvre@boulangerie-moderne.fr',
    company: 'Boulangerie Moderne',
    status: 'vip',
    tags: ['Professionnel', 'Contrat Pro', 'Urgence'],
    notes: 'Commerce en centre-ville. Interventions avant 11h ou après 14h.',
    ai_enabled: 1,
    avatar: null,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Thomas Bernard',
    phone_number: '+33 7 45 67 89 01',
    email: 't.bernard@wanadoo.fr',
    company: null,
    status: 'prospect',
    tags: ['Devis en attente', 'Rénovation'],
    notes: 'Demande de devis pour remplacement de chaudière par PAC.',
    ai_enabled: 1,
    avatar: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

export function getStoredContacts(): Contact[] {
  if (typeof window === 'undefined') return DEFAULT_SAMPLE_CONTACTS;
  const raw = localStorage.getItem('pme_contacts_list');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.warn('Erreur lecture cache contacts:', e);
    }
  }
  return DEFAULT_SAMPLE_CONTACTS;
}

export function saveStoredContacts(contacts: Contact[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('pme_contacts_list', JSON.stringify(contacts));
}
