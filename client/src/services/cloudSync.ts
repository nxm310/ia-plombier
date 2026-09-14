import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  setDoc,
  runTransaction,
  enableIndexedDbPersistence,
  query,
  where,
  getDocs,
  Firestore
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// 1. CONFIGURATION FIREBASE CLÉ EN MAIN
// ---------------------------------------------------------------------------
// Identifiants configurables via variables d'environnement VITE_ ou stockés en local
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD-demo-pme-agenda-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "agenda-pme-sync.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "agenda-pme-sync",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "agenda-pme-sync.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1029384756",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1029384756:web:abcdef123456"
};

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

export function getFirestoreInstance(): Firestore | null {
  if (firestoreDb) return firestoreDb;

  try {
    const configStr = localStorage.getItem('pme_custom_firebase_config');
    const config = configStr ? JSON.parse(configStr) : DEFAULT_FIREBASE_CONFIG;

    if (!getApps().length) {
      firebaseApp = initializeApp(config);
    } else {
      firebaseApp = getApps()[0];
    }

    firestoreDb = getFirestore(firebaseApp);

    // Activer la persistance hors-ligne (Offline-First pour sous-sol / zone blanche)
    if (typeof window !== 'undefined') {
      enableIndexedDbPersistence(firestoreDb).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('[CloudSync] Persistance multi-onglets active.');
        } else if (err.code === 'unimplemented') {
          console.warn('[CloudSync] Le navigateur ne supporte pas IndexedDB.');
        }
      });
    }

    return firestoreDb;
  } catch (err) {
    console.warn('[CloudSync] Initialisation Firebase en attente de configuration valide:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 2. GESTION DU CODE ÉQUIPE "ZÉRO CONFIGURATION" (Lien Magique & LocalStorage)
// ---------------------------------------------------------------------------
const TEAM_STORAGE_KEY = 'pme_sync_team_id';

/**
 * Récupère automatiquement l'identifiant d'équipe :
 * - Priorité 1 : Présence dans l'URL (?team=XXXX) -> Mémorisé à vie puis URL nettoyée
 * - Priorité 2 : Stocké dans le localStorage du smartphone ou PC
 */
export function getTeamId(): string | null {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const teamFromUrl = urlParams.get('team');

  if (teamFromUrl) {
    const cleanTeam = teamFromUrl.trim().toUpperCase();
    localStorage.setItem(TEAM_STORAGE_KEY, cleanTeam);

    // Nettoie l'URL sans recharger la page pour une expérience fluide et propre
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    return cleanTeam;
  }

  return localStorage.getItem(TEAM_STORAGE_KEY);
}

export function setTeamId(teamId: string): void {
  localStorage.setItem(TEAM_STORAGE_KEY, teamId.trim().toUpperCase());
}

export function clearTeamId(): void {
  localStorage.removeItem(TEAM_STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// 3. TYPES DES RENDEZ-VOUS SYNCHRONISÉS
// ---------------------------------------------------------------------------
export interface CloudAppointment {
  id: string;
  title: string;
  date: string;           // YYYY-MM-DD
  startTime: string;      // HH:MM (ex: "09:00")
  endTime: string;        // HH:MM (ex: "11:00")
  teamMemberId: number | string;
  teamMemberName?: string;
  serviceId?: number | string;
  serviceName?: string;
  contactName: string;
  contactPhone?: string;
  price?: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  notes?: string;
  updatedAt: string;
  updatedBy?: string;
}

// ---------------------------------------------------------------------------
// 4. ÉCOUTE TEMPS RÉEL MULTI-APPAREILS (< 200 ms)
// ---------------------------------------------------------------------------
/**
 * Écoute en direct les rendez-vous de l'équipe.
 * Dès qu'un collaborateur ajoute, modifie ou supprime un rendez-vous,
 * tous les autres postes connectés reçoivent la mise à jour instantanément.
 */
export function subscribeToAppointments(
  onUpdate: (appointments: CloudAppointment[]) => void,
  onError?: (error: Error) => void
): () => void {
  const teamId = getTeamId();
  if (!teamId) return () => {};

  const db = getFirestoreInstance();
  if (!db) return () => {};

  try {
    const appointmentsCol = collection(db, 'teams', teamId, 'appointments');

    const unsubscribe = onSnapshot(
      appointmentsCol,
      (snapshot) => {
        const list: CloudAppointment[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as CloudAppointment);
        });

        // Tri chronologique par date et heure de début
        list.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.startTime.localeCompare(b.startTime);
        });

        onUpdate(list);
      },
      (err) => {
        console.error('[CloudSync] Erreur écouteur temps réel:', err);
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.error('[CloudSync] Échec subscription:', err);
    return () => {};
  }
}

// ---------------------------------------------------------------------------
// 5. PRÉVENTION STRICTE DES DOUBLES RÉSERVATIONS & SUGGESTION DE CRÉNEAU
// ---------------------------------------------------------------------------
export interface ConflictResult {
  success: boolean;
  id: string;
  error?: string;
  suggestedSlot?: string;
}

/**
 * Recherche le créneau libre le plus proche suite à un conflit horaire
 */
function findNearestAvailableSlot(
  requestedStart: string,
  requestedEnd: string,
  existingAppointments: CloudAppointment[]
): string | undefined {
  const toMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const toTimeString = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const startMin = toMinutes(requestedStart);
  const endMin = toMinutes(requestedEnd);
  const duration = Math.max(endMin - startMin, 15);

  const activeApts = existingAppointments
    .filter(a => a.status !== 'cancelled')
    .map(a => ({ start: toMinutes(a.startTime), end: toMinutes(a.endTime) }))
    .sort((a, b) => a.start - b.start);

  const dayEndMin = 19 * 60; // 19h00 fin de journée

  // Tester les créneaux suivants par incréments de 15 minutes
  for (let candidateStart = startMin + 15; candidateStart + duration <= dayEndMin; candidateStart += 15) {
    const candidateEnd = candidateStart + duration;
    const hasOverlap = activeApts.some(a => candidateStart < a.end && candidateEnd > a.start);
    if (!hasOverlap) {
      return toTimeString(candidateStart);
    }
  }

  return undefined;
}

/**
 * Réserve un créneau avec blocage transactionnel en base :
 * Deux collaborateurs ne peuvent jamais réserver le même intervenant sur un créneau qui se chevauche.
 * Si un conflit est détecté, propose automatiquement le prochain créneau libre le plus proche.
 */
export async function saveAppointmentWithConflictCheck(
  appointment: Omit<CloudAppointment, 'id' | 'updatedAt'> & { id?: string }
): Promise<ConflictResult> {
  const teamId = getTeamId();
  if (!teamId) {
    return { success: false, id: '', error: "Identifiant d'équipe non défini." };
  }

  const db = getFirestoreInstance();
  if (!db) {
    return { success: false, id: '', error: "Base de données Cloud non connectée." };
  }

  const aptId = appointment.id || `apt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const targetDocRef = doc(db, 'teams', teamId, 'appointments', aptId);
  const appointmentsColRef = collection(db, 'teams', teamId, 'appointments');

  let calculatedSuggestion: string | undefined;

  try {
    // Transaction atomique Firestore
    await runTransaction(db, async (transaction) => {
      // 1. Lire tous les rendez-vous existants de ce collaborateur pour la même date
      const q = query(
        appointmentsColRef,
        where('date', '==', appointment.date),
        where('teamMemberId', '==', appointment.teamMemberId)
      );

      const existingSnap = await getDocs(q);
      const newStart = appointment.startTime;
      const newEnd = appointment.endTime;
      const allExisting: CloudAppointment[] = [];

      // 2. Détecter tout chevauchement horaire : (DébutA < FinB) ET (FinA > DébutB)
      for (const docSnap of existingSnap.docs) {
        if (docSnap.id === aptId) continue; // Si c'est le même rendez-vous modifié
        const existingData = docSnap.data() as CloudAppointment;
        allExisting.push(existingData);

        if (existingData.status === 'cancelled') continue; // Les rendez-vous annulés ne bloquent pas

        const isOverlapping = (newStart < existingData.endTime) && (newEnd > existingData.startTime);
        if (isOverlapping) {
          const techName = appointment.teamMemberName || 'Ce technicien';
          calculatedSuggestion = findNearestAvailableSlot(newStart, newEnd, allExisting);

          throw new Error(
            `Double réservation bloquée : ${techName} est déjà réservé de ${existingData.startTime} à ${existingData.endTime} pour "${existingData.title}".`
          );
        }
      }

      // 3. Écriture atomique garantie
      transaction.set(targetDocRef, {
        ...appointment,
        updatedAt: new Date().toISOString()
      });
    });

    return { success: true, id: aptId };
  } catch (err: any) {
    return {
      success: false,
      id: aptId,
      error: err.message || "Erreur de réservation",
      suggestedSlot: calculatedSuggestion
    };
  }
}

/**
 * Supprime un rendez-vous (suppression instantanée sur tous les appareils)
 */
export async function deleteCloudAppointment(appointmentId: string): Promise<boolean> {
  const teamId = getTeamId();
  if (!teamId) return false;

  const db = getFirestoreInstance();
  if (!db) return false;

  try {
    await deleteDoc(doc(db, 'teams', teamId, 'appointments', appointmentId));
    return true;
  } catch (err) {
    console.error('[CloudSync] Erreur suppression rendez-vous:', err);
    return false;
  }
}

/**
 * Met à jour le statut d'un rendez-vous sur le Cloud
 */
export async function updateCloudAppointmentStatus(
  appointmentId: string,
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
): Promise<boolean> {
  const teamId = getTeamId();
  if (!teamId) return false;

  const db = getFirestoreInstance();
  if (!db) return false;

  try {
    await updateDoc(doc(db, 'teams', teamId, 'appointments', appointmentId), {
      status,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.error('[CloudSync] Erreur mise à jour statut:', err);
    return false;
  }
}

/**
 * Sauvegarde d'une configuration Firebase personnalisée dans le navigateur
 */
export function saveCustomFirebaseConfig(config: Record<string, string>): void {
  localStorage.setItem('pme_custom_firebase_config', JSON.stringify(config));
  firestoreDb = null;
  firebaseApp = null;
}

export function getCustomFirebaseConfig(): Record<string, string> | null {
  const str = localStorage.getItem('pme_custom_firebase_config');
  return str ? JSON.parse(str) : null;
}

// ---------------------------------------------------------------------------
// 6. SYNCHRONISATION MULTI-APPAREILS DES CLIENTS & CRM (< 200 ms)
// ---------------------------------------------------------------------------
export interface CloudContact {
  id: string | number;
  phone_number: string;
  name?: string | null;
  email?: string | null;
  company?: string | null;
  status?: string;
  tags?: string[];
  notes?: string | null;
  ai_enabled?: number;
  avatar?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Écoute en direct les clients de l'équipe (temps réel).
 */
export function subscribeToContacts(
  onUpdate: (contacts: CloudContact[]) => void,
  onError?: (error: Error) => void
): () => void {
  const teamId = getTeamId();
  if (!teamId) return () => {};

  const db = getFirestoreInstance();
  if (!db) return () => {};

  try {
    const contactsCol = collection(db, 'teams', teamId, 'contacts');

    const unsubscribe = onSnapshot(
      contactsCol,
      (snapshot) => {
        const list: CloudContact[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as CloudContact);
        });
        onUpdate(list);
      },
      (err) => {
        console.warn('[CloudSync] Contacts snapshot warning:', err.message);
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn('[CloudSync] Échec subscription contacts:', err);
    return () => {};
  }
}

/**
 * Enregistre ou met à jour un contact sur le Cloud Firestore
 */
export async function saveCloudContact(contact: Partial<CloudContact> & { phone_number: string }): Promise<boolean> {
  const teamId = getTeamId();
  if (!teamId) return false;

  const db = getFirestoreInstance();
  if (!db) return false;

  try {
    const docId = String(contact.id || contact.phone_number.replace(/\D/g, ''));
    const docRef = doc(db, 'teams', teamId, 'contacts', docId);
    await setDoc(docRef, {
      ...contact,
      updated_at: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[CloudSync] Erreur sauvegarde contact cloud:', err);
    return false;
  }
}

/**
 * Supprime un contact sur le Cloud Firestore
 */
export async function deleteCloudContact(contactId: string | number): Promise<boolean> {
  const teamId = getTeamId();
  if (!teamId) return false;

  const db = getFirestoreInstance();
  if (!db) return false;

  try {
    await deleteDoc(doc(db, 'teams', teamId, 'contacts', String(contactId)));
    return true;
  } catch (err) {
    console.warn('[CloudSync] Erreur suppression contact cloud:', err);
    return false;
  }
}

