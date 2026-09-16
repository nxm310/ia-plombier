import React, { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Filter,
  Phone,
  Bot,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Sparkles,
  Trash2,
  Paperclip,
  Upload,
  FileText,
  Wrench,
  AlertTriangle
} from 'lucide-react';
import { useApp, getApiBaseUrl } from '../context/AppContext';
import { Appointment, TeamMember, Contact, Service } from '../types';
import {
  getTeamId,
  saveAppointmentWithConflictCheck,
  deleteCloudAppointment,
  updateCloudAppointmentStatus,
  subscribeToAppointments,
  CloudAppointment,
  saveCloudContact,
  subscribeToContacts
} from '../services/cloudSync';
import { INDUSTRY_PRESETS } from '../data/industryPresets';
import { getStoredContacts, saveStoredContacts } from '../data/defaultContacts';
import { formatPhoneNumber, handlePhoneInputChange } from '../utils/phone';
import {
  generateClientGoogleCalendarUrl,
  downloadClientIcsFile,
  formatClientAppointmentMessage,
  formatCollaboratorMissionMessage
} from '../utils/calendar';

export const Appointments: React.FC = () => {
  const { triggerRefresh, refreshAll, selectedContactId, setSelectedContactId } = useApp();
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const cached = localStorage.getItem('pme_local_appointments');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const cached = localStorage.getItem('pme_team_members');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return (INDUSTRY_PRESETS.plumber?.teamMembers || []).map((m, idx) => ({
      id: idx + 1,
      name: m.name,
      role: m.role,
      email: m.email,
      phone: m.phone,
      color: m.color,
      is_active: 1,
      status: 'active' as const,
      specialties: m.specialties,
      working_hours: null
    }));
  });
  const [contacts, setContacts] = useState<Contact[]>(() => getStoredContacts());
  const [services, setServices] = useState<Service[]>(() => {
    const cached = localStorage.getItem('pme_services_catalog');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return (INDUSTRY_PRESETS.plumber?.services || []).map((s, idx) => ({
      id: idx + 1,
      name: s.name,
      category: s.category,
      duration_minutes: s.duration_minutes,
      price: s.price,
      description: s.description,
      is_active: 1
    }));
  });

  // Navigation Date
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'list';
    }
    return 'grid';
  });
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<number[]>([]);

  // Si on arrive depuis la fiche d'un client avec "Prendre un RDV"
  useEffect(() => {
    if (selectedContactId) {
      setFormContactId(selectedContactId);
      setFormDate(currentDate);
      setFormStartTime('09:00');
      setFormDuration(30);
      setFormTitle('Nouveau Rendez-vous');
      setFormNotes('');
      setIsModalOpen(true);
      setSelectedContactId(null);
    }
  }, [selectedContactId]);

  // Modal Création
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formContactId, setFormContactId] = useState<number | ''>('');
  const [formTeamMemberId, setFormTeamMemberId] = useState<number | ''>('');
  const [formServiceId, setFormServiceId] = useState<number | ''>('');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState<string>(currentDate);
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formDuration, setFormDuration] = useState(30);
  const [isAllDay, setIsAllDay] = useState(false);
  const [formNotes, setFormNotes] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [conflictError, setConflictError] = useState<{ error: string; suggestedSlot?: string } | null>(null);
  const [cloudAppointments, setCloudAppointments] = useState<CloudAppointment[]>([]);

  // Ajout rapide client depuis la modale de prise de rendez-vous
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientPhone, setQuickClientPhone] = useState('');
  const [quickClientCompany, setQuickClientCompany] = useState('');

  const handleQuickCreateClient = () => {
    if (!quickClientPhone.trim()) {
      alert('Veuillez renseigner au moins un numéro de téléphone.');
      return;
    }
    const newContact: Contact = {
      id: Date.now(),
      name: quickClientName.trim() || null,
      phone_number: formatPhoneNumber(quickClientPhone.trim()),
      email: null,
      company: quickClientCompany.trim() || null,
      status: 'active',
      tags: ['Ajout Agenda'],
      notes: null,
      ai_enabled: 0,
      avatar: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setContacts(prev => {
      const next = [newContact, ...prev.filter(c => c.phone_number !== newContact.phone_number)];
      saveStoredContacts(next);
      return next;
    });
    setFormContactId(newContact.id);
    setIsQuickClientOpen(false);
    setQuickClientName('');
    setQuickClientPhone('');
    setQuickClientCompany('');
    saveCloudContact(newContact).catch(() => {});
    fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newContact.name,
        phone_number: newContact.phone_number,
        company: newContact.company,
        status: newContact.status,
        tags: newContact.tags
      })
    }).catch(err => console.warn('Sauvegarde contact local agenda:', err));
    refreshAll();
  };

  // Calcul dynamique de l'horaire de fin
  const calculatedEndTime = React.useMemo(() => {
    if (isAllDay || formDuration === 600) return '18:00';
    const [h, m] = (formStartTime || '09:00').split(':').map(Number);
    const endMin = (h || 0) * 60 + (m || 0) + Number(formDuration);
    const endH = Math.floor(endMin / 60);
    const endM = endMin % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  }, [formStartTime, formDuration, isAllDay]);

  const handleToggleAllDay = () => {
    if (!isAllDay) {
      setIsAllDay(true);
      setFormStartTime('08:00');
      setFormDuration(600);
    } else {
      setIsAllDay(false);
      setFormStartTime('09:00');
      setFormDuration(60);
    }
  };

  // Gestion des documents joints (PDF, devis, etc.)
  const [attachedFile, setAttachedFile] = useState<{ name: string; base64: string; size: number } | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [detailUploadingDoc, setDetailUploadingDoc] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        base64: reader.result as string,
        size: file.size
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAttachDocToExisting = async (aptId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDetailUploadingDoc(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const uploadRes = await fetch('/api/upload-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileData: reader.result as string
          })
        });
        if (!uploadRes.ok) throw new Error('Upload failed');
        const uploadData = await uploadRes.json();
        await fetch(`/api/appointments/${aptId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_url: uploadData.url,
            document_name: uploadData.name
          })
        });
        setSelectedAppointment(prev => prev ? { ...prev, document_url: uploadData.url, document_name: uploadData.name } : null);
        refreshAll();
      } catch (err) {
        console.error('Erreur attachement document:', err);
      } finally {
        setDetailUploadingDoc(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDocFromExisting = async (aptId: number) => {
    try {
      await fetch(`/api/appointments/${aptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_url: null,
          document_name: null
        })
      });
      setSelectedAppointment(prev => prev ? { ...prev, document_url: null, document_name: null } : null);
      refreshAll();
    } catch (err) {
      console.error('Erreur suppression document:', err);
    }
  };

  // Modal Détail / Action RDV
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    fetch('/api/appointments')
      .then(res => {
        if (!res.ok) throw new Error('Status ' + res.status);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setAppointments(data);
          localStorage.setItem('pme_local_appointments', JSON.stringify(data));
        }
      })
      .catch(err => {
        console.warn('Backend appointments non joignable (utilisation cache local):', err.message);
      });


    fetch('/api/team')
      .then(res => {
        if (!res.ok) throw new Error('Status ' + res.status);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTeamMembers(data);
          localStorage.setItem('pme_team_members', JSON.stringify(data));
          if (selectedCollaboratorIds.length === 0) {
            setSelectedCollaboratorIds(data.map((m: TeamMember) => m.id));
          }
        }
      })
      .catch(err => console.warn('Erreur team (utilisation fallback):', err));

    fetch('/api/contacts')
      .then(res => {
        if (!res.ok) throw new Error('Status ' + res.status);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setContacts(data);
          saveStoredContacts(data);
        }
      })
      .catch(err => console.warn('Contacts backend non joignable, utilisation du cache:', err));

    fetch('/api/services')
      .then(res => {
        if (!res.ok) throw new Error('Status ' + res.status);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setServices(data);
          localStorage.setItem('pme_services_catalog', JSON.stringify(data));
        }
      })
      .catch(err => console.warn('Erreur services (utilisation fallback):', err));
  }, [triggerRefresh]);

  // Écouteur Cloud Firestore en temps réel (<200ms) pour la synchronisation multi-appareils
  useEffect(() => {
    const teamId = getTeamId();
    if (!teamId) return;

    const unsubscribeApts = subscribeToAppointments(
      (list) => {
        setCloudAppointments(list);
      },
      (err) => {
        console.warn('[Appointments] Synchronisation Firestore RDV:', err.message);
      }
    );

    const unsubscribeContacts = subscribeToContacts((cloudList) => {
      if (cloudList && cloudList.length > 0) {
        setContacts(prev => {
          const map = new Map<string, Contact>();
          prev.forEach(c => map.set(c.phone_number, c));
          cloudList.forEach(c => {
            map.set(c.phone_number, {
              id: typeof c.id === 'number' ? c.id : (Number(c.id) || Date.now()),
              phone_number: c.phone_number,
              name: c.name || null,
              email: c.email || null,
              company: c.company || null,
              status: (c.status as any) || 'prospect',
              tags: c.tags || [],
              notes: c.notes || null,
              ai_enabled: c.ai_enabled ?? 1,
              avatar: c.avatar || null,
              created_at: c.created_at || new Date().toISOString(),
              updated_at: c.updated_at || new Date().toISOString()
            });
          });
          const merged = Array.from(map.values());
          saveStoredContacts(merged);
          return merged;
        });
      }
    });

    return () => {
      unsubscribeApts();
      unsubscribeContacts();
    };
  }, [triggerRefresh]);

  // Récupérer créneaux disponibles
  useEffect(() => {
    if (!formTeamMemberId || !formDate) {
      setAvailableSlots([]);
      return;
    }

    fetch(`/api/team/${formTeamMemberId}/slots?date=${formDate}&duration=${formDuration}`)
      .then(res => res.json())
      .then(data => {
        if (data.slots) {
          setAvailableSlots(data.slots);
          if (data.slots.length > 0 && !data.slots.includes(formStartTime)) {
            setFormStartTime(data.slots[0]);
          }
        }
      })
      .catch(err => console.error('Erreur slots:', err));
  }, [formTeamMemberId, formDate, formDuration]);

  // Date Navigation Helpers
  const goToDate = (dateStr: string) => {
    setCurrentDate(dateStr);
    setFormDate(dateStr);
  };

  const shiftDay = (days: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    const newStr = d.toISOString().split('T')[0];
    goToDate(newStr);
  };

  const handleOpenNewAppointmentOnSlot = (memberId: number, timeStr: string) => {
    setIsAllDay(false);
    setAttachedFile(null);
    setConflictError(null);
    setFormTeamMemberId(memberId);
    setFormDate(currentDate);
    setFormStartTime(timeStr);
    setFormDuration(30);
    setFormTitle('Nouveau Rendez-vous');
    setFormNotes('');
    setFormContactId('');
    setIsModalOpen(true);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContactId || !formTitle || !formDate) return;
    setConflictError(null);

    const startTime = (isAllDay || formDuration === 600) ? '08:00' : formStartTime;
    const endTime = calculatedEndTime;

    const selectedMember = teamMembers.find(m => m.id === Number(formTeamMemberId));
    const selectedContact = contacts.find(c => c.id === Number(formContactId));
    const selectedService = services.find(s => s.id === Number(formServiceId));

    // 1. Vérification transactionnelle Cloud Firestore contre les doubles réservations
    const teamId = getTeamId();
    if (teamId) {
      try {
        const conflictCheck = await saveAppointmentWithConflictCheck({
          title: formTitle,
          date: formDate,
          startTime,
          endTime,
          teamMemberId: formTeamMemberId || 0,
          teamMemberName: selectedMember?.name,
          serviceId: formServiceId || undefined,
          serviceName: selectedService?.name,
          contactName: selectedContact ? (selectedContact.name || selectedContact.phone_number) : 'Client',
          contactPhone: selectedContact?.phone_number,
          status: 'confirmed',
          notes: formNotes
        });

        if (!conflictCheck.success && conflictCheck.suggestedSlot) {
          setConflictError({
            error: conflictCheck.error || 'Ce créneau est déjà réservé par un collaborateur.',
            suggestedSlot: conflictCheck.suggestedSlot
          });
          return;
        }
      } catch (cErr) {
        console.warn('[Appointments] Erreur conflict check (ignoré en local):', cErr);
      }
    }

    let docUrl: string | null = null;
    let docName: string | null = null;

    if (attachedFile) {
      setIsUploadingDoc(true);
      try {
        const uploadRes = await fetch('/api/upload-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: attachedFile.name,
            fileData: attachedFile.base64
          })
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          docUrl = uploadData.url;
          docName = uploadData.name;
        }
      } catch (uErr) {
        console.error('Erreur upload document:', uErr);
      } finally {
        setIsUploadingDoc(false);
      }
    }

    const localApt: Appointment = {
      id: Date.now(),
      contact_id: Number(formContactId) || 0,
      team_member_id: formTeamMemberId ? Number(formTeamMemberId) : null,
      service_id: formServiceId ? Number(formServiceId) : null,
      title: formTitle,
      date: formDate,
      start_time: startTime,
      end_time: endTime,
      status: 'confirmed',
      notes: formNotes || null,
      document_url: docUrl,
      document_name: docName,
      source: 'manual',
      collaborator_status: 'pending',
      collaborator_accepted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      contact_name: selectedContact ? (selectedContact.name || selectedContact.phone_number) : 'Client',
      contact_phone: selectedContact?.phone_number || null,
      team_member_name: selectedMember?.name || null,
      service_name: selectedService?.name || null
    };

    let finalApt = localApt;
    let backendHandledNotifs = false;

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: formContactId,
          contact_name: selectedContact?.name || null,
          contact_phone: selectedContact?.phone_number || null,
          team_member_id: formTeamMemberId || null,
          service_id: formServiceId || null,
          title: formTitle,
          date: formDate,
          start_time: startTime,
          end_time: endTime,
          status: 'confirmed',
          notes: formNotes,
          document_url: docUrl,
          document_name: docName,
          source: 'manual'
        })
      });

      if (res.ok) {
        const createdApt = await res.json();
        if (createdApt && createdApt.id) {
          finalApt = createdApt;
        }
      }
    } catch (err: any) {
      console.warn('Mode déconnecté ou hébergeur statique :', err);
    }

    // Toujours enregistrer et afficher le RDV dans l'agenda !
    setAppointments(prev => {
      const next = [finalApt, ...prev.filter(a => a.id !== finalApt.id)];
      localStorage.setItem('pme_local_appointments', JSON.stringify(next));
      return next;
    });

    setIsModalOpen(false);
    setIsAllDay(false);
    setAttachedFile(null);
    setConflictError(null);
    setFormTitle('');
    setFormNotes('');
    setFormContactId('');
    refreshAll();
  };

  const handleMarkCollaboratorAccepted = async (appointmentId: number | string) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/collaborator-accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setSelectedAppointment(prev => prev ? { ...prev, collaborator_status: 'accepted', collaborator_accepted_at: new Date().toISOString() } : null);
        refreshAll();
      }
    } catch (err) {
      console.error('Erreur validation manuelle collaborateur:', err);
    }
  };

  const updateStatus = async (id: number | string, status: string) => {
    try {
      // 1. Mise à jour Cloud Firestore si synchronisation active
      await updateCloudAppointmentStatus(String(id), status as any);

      // 2. Mise à jour SQLite local si id numérique
      if (typeof id === 'number' || !isNaN(Number(id))) {
        await fetch(`/api/appointments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            notify_client: status === 'confirmed'
          })
        }).catch(() => {});
      }

      setAppointments(prev => {
        const next = prev.map(a => String(a.id) === String(id) ? { ...a, status: status as any } : a);
        localStorage.setItem('pme_local_appointments', JSON.stringify(next));
        return next;
      });

      if (selectedAppointment && String(selectedAppointment.id) === String(id)) {
        setSelectedAppointment(prev => prev ? { ...prev, status: status as any } : null);
      }
      refreshAll();
    } catch (err) {
      console.error('Erreur update status:', err);
    }
  };

  const handleDeleteAppointment = async (id: number | string) => {
    if (!confirm('Supprimer définitivement ce rendez-vous ?')) return;
    try {
      // 1. Suppression Cloud Firestore en temps réel
      await deleteCloudAppointment(String(id));

      // 2. Suppression base locale si id numérique
      if (typeof id === 'number' || !isNaN(Number(id))) {
        await fetch(`/api/appointments/${id}`, { method: 'DELETE' }).catch(() => {});
      }

      setAppointments(prev => {
        const next = prev.filter(a => String(a.id) !== String(id));
        localStorage.setItem('pme_local_appointments', JSON.stringify(next));
        return next;
      });

      setSelectedAppointment(null);
      refreshAll();
    } catch (err) {
      console.error('Erreur delete appointment:', err);
    }
  };

  // Liste des heures de la journée de 08:00 à 19:30 par pas de 30min
  const TIME_SLOTS: string[] = [];
  for (let hour = 8; hour <= 19; hour++) {
    TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`);
    TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  // Filtrage des collaborateurs affichés
  const visibleMembers = teamMembers.filter(m =>
    selectedCollaboratorIds.length === 0 || selectedCollaboratorIds.includes(m.id)
  );

  // Fusion fluide des rendez-vous locaux et des rendez-vous Cloud Firestore
  const effectiveAppointments = React.useMemo(() => {
    if (cloudAppointments.length === 0) return appointments;

    const map = new Map<string, Appointment>();

    // 1. Rendez-vous de la base locale
    for (const a of appointments) {
      const key = `${a.date}_${a.team_member_id}_${a.start_time}`;
      map.set(key, a);
    }

    // 2. Fusion en direct des rendez-vous Cloud
    for (const c of cloudAppointments) {
      const key = `${c.date}_${c.teamMemberId}_${c.startTime}`;
      const local = map.get(key);
      map.set(key, {
        id: c.id,
        contact_id: local?.contact_id || 0,
        team_member_id: Number(c.teamMemberId) || null,
        service_id: Number(c.serviceId) || null,
        title: c.title,
        date: c.date,
        start_time: c.startTime,
        end_time: c.endTime,
        status: c.status,
        notes: c.notes || null,
        source: 'manual',
        reminder_sent: 0,
        created_at: c.updatedAt || new Date().toISOString(),
        updated_at: c.updatedAt || new Date().toISOString(),
        contact_name: c.contactName,
        contact_phone: c.contactPhone,
        team_member_name: c.teamMemberName,
        service_name: c.serviceName,
        document_url: local?.document_url || null,
        document_name: local?.document_name || null
      });
    }

    return Array.from(map.values());
  }, [appointments, cloudAppointments]);

  // Rendez-vous de la date sélectionnée
  const dayAppointments = effectiveAppointments.filter(a => a.date === currentDate);

  const formattedDateTitle = new Date(`${currentDate}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-5 overflow-y-auto h-full">
      {/* Top Header & Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Agenda Visuel Multi-Collaborateurs</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shrink-0">
              {dayAppointments.length} RDV aujourd'hui
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Visualisez côte à côte les plannings de vos collaborateurs pour éviter les conflits et voir les disponibilités d'un seul coup d'œil.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grille</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Liste</span>
            </button>
          </div>

          <button
            onClick={() => {
              setFormDate(currentDate);
              setFormTeamMemberId(visibleMembers[0]?.id || '');
              setIsAllDay(false);
              setAttachedFile(null);
              setFormDuration(30);
              setFormStartTime('09:00');
              setFormTitle('');
              setFormNotes('');
              setFormContactId('');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau RDV</span>
          </button>
        </div>
      </div>

      {/* Date Navigator Bar & Collaborator Pills */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 sm:space-y-4">
        {/* Navigation Jour */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => shiftDay(-1)}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                title="Jour précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => goToDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                Aujourd'hui
              </button>

              <button
                onClick={() => shiftDay(1)}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                title="Jour suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <span className="font-bold text-xs sm:text-base text-slate-900 capitalize">
              {formattedDateTitle}
            </span>
          </div>

          {/* Date Picker direct */}
          <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-end">
            <span className="text-slate-400 font-medium whitespace-nowrap">Aller au :</span>
            <input
              type="date"
              value={currentDate}
              onChange={e => goToDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Collaborators Selector Pills */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Collaborateurs :
          </span>

          <button
            onClick={() => {
              if (selectedCollaboratorIds.length === teamMembers.length) {
                setSelectedCollaboratorIds([]);
              } else {
                setSelectedCollaboratorIds(teamMembers.map(m => m.id));
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              selectedCollaboratorIds.length === teamMembers.length
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tous ({teamMembers.length})
          </button>

          {teamMembers.map(m => {
            const isSelected = selectedCollaboratorIds.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => {
                  if (isSelected) {
                    setSelectedCollaboratorIds(prev => prev.filter(id => id !== m.id));
                  } else {
                    setSelectedCollaboratorIds(prev => [...prev, m.id]);
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                  isSelected
                    ? 'bg-white text-slate-800 border-slate-300 shadow-xs ring-1 ring-emerald-500/20'
                    : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color || '#3B82F6' }}></span>
                <span>{m.name}</span>
                {m.status === 'vacation' && <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full font-semibold">🏖️</span>}
                {m.status === 'sick' && <span className="text-[10px] px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded-full font-semibold">🤒</span>}
                {m.status === 'other' && <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded-full font-semibold">⚪</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Vue 1: GRILLE ÉQUIPE MULTI-COLONNES (Style Doctolib / Google Calendar) */}
      {viewMode === 'grid' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          {visibleMembers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Veuillez sélectionner au moins un collaborateur pour afficher la grille.
            </div>
          ) : (
            <>
              <div className="md:hidden px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                <span>👉 Glissez horizontalement pour voir toute l'équipe</span>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                >
                  Vue Liste
                </button>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[750px]">
                {/* En-tête des colonnes (Collaborateurs) */}
                <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
                  {/* Coin Heure */}
                  <div className="w-[80px] shrink-0 p-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center border-r border-slate-200 flex items-center justify-center">
                    Heure
                  </div>

                  {/* Colonnes Collaborateurs */}
                  <div className="flex-1 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] divide-x divide-slate-200">
                    {visibleMembers.map(member => (
                      <div
                        key={member.id}
                        className="p-3 flex items-center gap-2.5"
                      >
                        <div
                          className="w-9 h-9 rounded-xl text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs"
                          style={{ backgroundColor: member.color || '#2563EB' }}
                        >
                          {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate">{member.name}</p>
                          <p className="text-[10px] text-slate-500 truncate font-medium">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alerte si des rendez-vous ne sont assignés à aucun collaborateur */}
                {dayAppointments.filter(a => !a.team_member_id).length > 0 && (
                  <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900">
                    <span className="font-semibold flex items-center gap-1.5">
                      ⚠️ {dayAppointments.filter(a => !a.team_member_id).length} rendez-vous non assigné(s) à un collaborateur :
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {dayAppointments.filter(a => !a.team_member_id).map(unassigned => (
                        <button
                          key={unassigned.id}
                          onClick={() => setSelectedAppointment(unassigned)}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-amber-900 font-medium transition cursor-pointer shadow-2xs flex items-center gap-1"
                        >
                          <span>{unassigned.title} ({unassigned.start_time}-{unassigned.end_time})</span>
                          <span className="text-amber-600 font-bold">&rarr;</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Corps de la Grille : Colonne Heures + Colonnes Collaborateurs */}
                <div className="flex">
                  {/* Axe des Heures (80px fixe) */}
                  <div className="w-[80px] shrink-0 border-r border-slate-200 bg-slate-50/40 divide-y divide-slate-100">
                    {TIME_SLOTS.map(timeStr => (
                      <div
                        key={timeStr}
                        className="h-[56px] p-2 text-center text-xs font-semibold text-slate-500 select-none flex items-center justify-center"
                      >
                        {timeStr}
                      </div>
                    ))}
                  </div>

                  {/* Zone des colonnes des collaborateurs */}
                  <div className="flex-1 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] divide-x divide-slate-200">
                    {visibleMembers.map(member => {
                      const memberAppointments = dayAppointments.filter(a => a.team_member_id === member.id);

                      return (
                        <div
                          key={member.id}
                          className="relative"
                          style={{ height: `${TIME_SLOTS.length * 56}px` }}
                        >
                          {/* Lignes d'arrière-plan créneau par créneau */}
                          <div className="absolute inset-0 divide-y divide-slate-100 pointer-events-none">
                            {TIME_SLOTS.map(timeStr => (
                              <div key={timeStr} className="h-[56px]" />
                            ))}
                          </div>

                          {/* Boutons de réservation sur les créneaux libres */}
                          {TIME_SLOTS.map((timeStr, idx) => {
                            const isOccupied = memberAppointments.some(a => {
                              return a.start_time <= timeStr && a.end_time > timeStr;
                            });

                            return (
                              <div
                                key={timeStr}
                                className="absolute left-0 right-0 h-[56px] p-1 group z-0"
                                style={{ top: `${idx * 56}px` }}
                              >
                                {!isOccupied && (
                                  <button
                                    onClick={() => handleOpenNewAppointmentOnSlot(member.id, timeStr)}
                                    className="w-full h-full rounded-lg text-slate-300 hover:text-emerald-700 hover:bg-emerald-50/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-[11px] font-semibold cursor-pointer"
                                  >
                                    + Réserver {timeStr}
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          {/* Rendez-vous du collaborateur : Un seul grand rectangle par intervention */}
                          {memberAppointments.map(apt => {
                            const [startH, startM] = apt.start_time.split(':').map(Number);
                            const [endH, endM] = apt.end_time.split(':').map(Number);

                            const startMin = Math.max(0, (startH - 8) * 60 + startM);
                            const endMin = (endH - 8) * 60 + endM;
                            const durationMin = Math.max(30, endMin - startMin);

                            const topPx = (startMin / 30) * 56 + 2;
                            const heightPx = Math.max(48, (durationMin / 30) * 56 - 4);
                            const isFullDay = (apt.start_time === '08:00' && apt.end_time === '18:00') || durationMin >= 480;

                            const memberColor = member.color || '#2563EB';

                            return (
                              <div
                                key={apt.id}
                                onClick={() => setSelectedAppointment(apt)}
                                className="absolute left-1 right-1 rounded-xl p-2.5 text-xs flex flex-col justify-between shadow-xs transition hover:shadow-md hover:scale-[1.005] cursor-pointer z-10 overflow-hidden"
                                style={{
                                  top: `${topPx}px`,
                                  height: `${heightPx}px`,
                                  backgroundColor: `${memberColor}15`,
                                  borderLeft: `4px solid ${memberColor}`,
                                  borderTop: `1px solid ${memberColor}35`,
                                  borderRight: `1px solid ${memberColor}35`,
                                  borderBottom: `1px solid ${memberColor}35`,
                                }}
                                title={`${apt.title} (${apt.start_time} - ${apt.end_time})`}
                              >
                                <div className="space-y-1 overflow-hidden">
                                  {/* Titre & Badges */}
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="font-bold text-slate-900 text-xs leading-tight line-clamp-2">
                                      {apt.title}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {apt.document_url && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-bold flex items-center gap-0.5" title={apt.document_name || 'Document joint'}>
                                          <Paperclip className="w-2.5 h-2.5 text-blue-700" /> PDF
                                        </span>
                                      )}
                                      {isFullDay && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold flex items-center gap-0.5">
                                          ☀️ Journée
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Client */}
                                  <p className="text-[11px] text-slate-700 truncate font-medium flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-semibold text-slate-800">{apt.contact_name || apt.contact_phone || 'Client non assigné'}</span>
                                  </p>

                                  {/* Détails complémentaires si durée suffisante */}
                                  {heightPx > 90 && apt.service_name && (
                                    <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                                      <Wrench className="w-3 h-3 text-slate-400 shrink-0" />
                                      {apt.service_name}
                                    </p>
                                  )}

                                  {heightPx > 130 && apt.notes && (
                                    <p className="text-[10px] text-slate-600 line-clamp-2 bg-white/70 p-1.5 rounded-md border border-slate-200/50 mt-1">
                                      {apt.notes}
                                    </p>
                                  )}
                                </div>

                                {/* Pied de carte : Horaires & Statut */}
                                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/40 mt-1">
                                  <span className="font-mono font-medium">
                                    {isFullDay ? 'Journée (08:00 - 18:00)' : `${apt.start_time} - ${apt.end_time}`}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {apt.team_member_id && (
                                      <span
                                        className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                                          apt.collaborator_status === 'accepted'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : apt.collaborator_status === 'declined'
                                            ? 'bg-rose-100 text-rose-800'
                                            : 'bg-amber-100 text-amber-900'
                                        }`}
                                        title={
                                          apt.collaborator_status === 'accepted'
                                            ? 'Mission validée par le collaborateur'
                                            : apt.collaborator_status === 'declined'
                                            ? 'Collaborateur indisponible'
                                            : 'En attente de validation collaborateur'
                                        }
                                      >
                                        {apt.collaborator_status === 'accepted' ? '✓ Validé' : apt.collaborator_status === 'declined' ? '✕ Refusé' : '⏳ Attente'}
                                      </span>
                                    )}
                                    <span className={`px-1.5 py-0.5 rounded font-semibold ${
                                      apt.status === 'confirmed' ? 'text-emerald-700 bg-emerald-100/70' :
                                      apt.status === 'completed' ? 'text-blue-700 bg-blue-100/70' : 'text-rose-700 bg-rose-100/70'
                                    }`}>
                                      {apt.status === 'confirmed' ? 'Confirmé' : apt.status === 'completed' ? 'Terminé' : 'Annulé'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    )}

      {/* Vue 2: LISTE CLASSIQUE */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {dayAppointments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Aucun rendez-vous planifié pour le {formattedDateTitle}.
            </div>
          ) : (
            dayAppointments.map(apt => (
              <div
                key={apt.id}
                onClick={() => setSelectedAppointment(apt)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">{apt.title}</span>
                    {apt.document_url && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium flex items-center gap-1" title={apt.document_name || 'Document joint'}>
                        <Paperclip className="w-2.5 h-2.5" /> PDF
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="font-semibold">{apt.contact_name || apt.contact_phone}</span>
                    <span>•</span>
                    <span>Avec <strong className="text-slate-800">{apt.team_member_name || 'Équipe'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-xs text-slate-900 flex items-center justify-end gap-1.5">
                      {apt.start_time === '08:00' && apt.end_time === '18:00' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          ☀️ Journée
                        </span>
                      )}
                      {apt.start_time} - {apt.end_time}
                    </p>
                    <span className="text-[11px] text-slate-500">{apt.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {apt.team_member_id && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          apt.collaborator_status === 'accepted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : apt.collaborator_status === 'declined'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {apt.collaborator_status === 'accepted' ? '✓ Validé' : apt.collaborator_status === 'declined' ? '✕ Refusé' : '⏳ Attente collab'}
                      </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                      apt.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Détail du Rendez-vous cliqué */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 space-y-4 shadow-xl text-xs max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Détails du Rendez-vous</h3>
              <button onClick={() => setSelectedAppointment(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-slate-400 block mb-0.5">Titre :</span>
                <p className="text-sm font-bold text-slate-900">{selectedAppointment.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block mb-0.5">Date :</span>
                  <p className="font-semibold text-slate-800">{selectedAppointment.date}</p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Horaire :</span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    {selectedAppointment.start_time} - {selectedAppointment.end_time}
                    {selectedAppointment.start_time === '08:00' && selectedAppointment.end_time === '18:00' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-850">
                        ☀️ Journée entière
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Collaborateur :</span>
                  <p className="font-semibold text-slate-800">{selectedAppointment.team_member_name || 'Non assigné'}</p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Client :</span>
                  <p className="font-semibold text-slate-800">{selectedAppointment.contact_name || selectedAppointment.contact_phone}</p>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <span className="text-slate-400 block mb-1">Notes :</span>
                  <p className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-700">{selectedAppointment.notes}</p>
                </div>
              )}

              {/* Document joint au rendez-vous (PDF / Devis / Plan) */}
              <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    Document associé (PDF, devis, plan...)
                  </span>
                  {detailUploadingDoc && (
                    <span className="text-[10px] text-blue-600 font-semibold animate-pulse">Envoi en cours...</span>
                  )}
                </div>

                {selectedAppointment.document_url ? (
                  <div className="p-2.5 bg-white border border-blue-200 rounded-lg flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        PDF
                      </div>
                      <span className="font-bold text-xs text-slate-800 truncate" title={selectedAppointment.document_name || 'Document'}>
                        {selectedAppointment.document_name || 'Document joint'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={selectedAppointment.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-md transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        Visualiser ↗
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocFromExisting(selectedAppointment.id)}
                        className="px-1.5 py-1 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                        title="Retirer ce document"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-2 bg-white border border-dashed border-slate-300 hover:border-blue-500 rounded-lg cursor-pointer text-slate-600 hover:text-blue-600 text-xs font-semibold transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Joindre un document (PDF, devis, etc.)</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                      className="hidden"
                      onChange={e => handleAttachDocToExisting(selectedAppointment.id, e)}
                    />
                  </label>
                )}
              </div>

              {/* Liens Synchronisation Agenda */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5">
                <div className="min-w-0">
                  <p className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    📅 Synchronisation Agenda
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Boutons d'ajout en 1 clic pour Google Agenda & Apple Calendrier
                  </p>
                </div>

                {/* Boutons d'accès direct cliquables */}
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <a
                    href={generateClientGoogleCalendarUrl({
                      title: selectedAppointment.service_name ? `Intervention : ${selectedAppointment.service_name}` : selectedAppointment.title,
                      date: selectedAppointment.date,
                      startTime: selectedAppointment.start_time,
                      endTime: selectedAppointment.end_time,
                      details: `Intervention avec ${selectedAppointment.team_member_name || 'Notre équipe'}.${selectedAppointment.notes ? `\nPrécisions : ${selectedAppointment.notes}` : ''}`
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    📅 Google Agenda
                  </a>
                  <button
                    type="button"
                    onClick={() => downloadClientIcsFile({
                      id: selectedAppointment.id,
                      title: selectedAppointment.service_name ? `Intervention : ${selectedAppointment.service_name}` : selectedAppointment.title,
                      date: selectedAppointment.date,
                      startTime: selectedAppointment.start_time,
                      endTime: selectedAppointment.end_time,
                      details: `Intervention avec ${selectedAppointment.team_member_name || 'Notre équipe'}.${selectedAppointment.notes ? `\nPrécisions : ${selectedAppointment.notes}` : ''}`
                    })}
                    className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    🍏 Apple Calendrier (.ics)
                  </button>
                </div>
              </div>

              {/* Ordre de mission collaborateur */}
              {selectedAppointment.team_member_id && (
                <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                        🛠️ Ordre de Mission Collaborateur
                      </p>
                      <p className="text-[10px] text-indigo-700 truncate">
                        Assigné à : <span className="font-bold">{selectedAppointment.team_member_name || 'Collaborateur'}</span>
                      </p>
                    </div>

                    {/* Badge de statut d'acceptation collaborateur */}
                    <div>
                      {selectedAppointment.collaborator_status === 'accepted' ? (
                        <span className="px-2 py-1 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                          ✓ Validé
                        </span>
                      ) : selectedAppointment.collaborator_status === 'declined' ? (
                        <span className="px-2 py-1 rounded-md bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-bold flex items-center gap-1">
                          ✕ Refusé
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold flex items-center gap-1">
                          ⏳ Attente
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedAppointment.collaborator_status === 'accepted' && selectedAppointment.collaborator_accepted_at && (
                    <p className="text-[10px] text-emerald-700 bg-white/80 p-1.5 rounded-md border border-emerald-100">
                      Accepté le {new Date(selectedAppointment.collaborator_accepted_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}

                  {/* Actions Collaborateur */}
                  <div className="pt-2 border-t border-indigo-200/70 flex flex-wrap items-center gap-1.5">
                    <a
                      href={`/api/appointments/${selectedAppointment.id}/mission`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                    >
                      📋 Fiche mission ↗
                    </a>

                    {selectedAppointment.collaborator_status !== 'accepted' && (
                      <button
                        type="button"
                        onClick={() => handleMarkCollaboratorAccepted(selectedAppointment.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        ✓ Marquer accepté
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => handleDeleteAppointment(selectedAppointment.id)}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-semibold transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Supprimer
              </button>

              <div className="flex items-center gap-2">
                {selectedAppointment.status !== 'confirmed' && (
                  <button
                    onClick={() => updateStatus(selectedAppointment.id, 'confirmed')}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition flex items-center gap-1 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Valider l'intervention
                  </button>
                )}
                {selectedAppointment.status !== 'completed' && (
                  <button
                    onClick={() => updateStatus(selectedAppointment.id, 'completed')}
                    className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-semibold transition"
                  >
                    Marquer Terminé
                  </button>
                )}
                {selectedAppointment.status !== 'cancelled' && (
                  <button
                    onClick={() => updateStatus(selectedAppointment.id, 'cancelled')}
                    className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-semibold transition"
                  >
                    Annuler RDV
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Création de RDV */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-xl max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Planifier un Nouveau Rendez-vous</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-3.5 text-xs">
              {conflictError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-2 animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs font-semibold leading-relaxed">
                      {conflictError.error}
                    </div>
                  </div>
                  {conflictError.suggestedSlot && (
                    <div className="flex items-center justify-between pt-2 border-t border-amber-200/70">
                      <span className="text-[11px] text-amber-800">
                        💡 Créneau alternatif le plus proche : <strong>{conflictError.suggestedSlot}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormStartTime(conflictError.suggestedSlot!);
                          setConflictError(null);
                        }}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition shadow-xs cursor-pointer"
                      >
                        Prendre ce créneau
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-slate-700">Client *</label>
                  <button
                    type="button"
                    onClick={() => setIsQuickClientOpen(!isQuickClientOpen)}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isQuickClientOpen ? 'Annuler' : 'Nouveau client'}
                  </button>
                </div>

                {isQuickClientOpen && (
                  <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <p className="text-[11px] font-bold text-slate-800">Ajout rapide de client :</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nom complet (ex: Pierre Martin)"
                        value={quickClientName}
                        onChange={e => setQuickClientName(e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="tel"
                        placeholder="Numéro de téléphone *"
                        value={quickClientPhone}
                        onChange={e => setQuickClientPhone(handlePhoneInputChange(e.target.value))}
                        onBlur={e => setQuickClientPhone(formatPhoneNumber(e.target.value))}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        placeholder="Entreprise ou Résidence (facultatif)"
                        value={quickClientCompany}
                        onChange={e => setQuickClientCompany(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleQuickCreateClient}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        Créer & Sélectionner
                      </button>
                    </div>
                  </div>
                )}

                <select
                  value={formContactId}
                  onChange={e => setFormContactId(e.target.value ? Number(e.target.value) : '')}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Sélectionner un client...</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name ? `${c.name} (${c.phone_number})` : c.phone_number} {c.company ? `- ${c.company}` : ''}
                    </option>
                  ))}
                </select>
                {formContactId && (
                  <div className="mt-1.5 p-2 bg-emerald-50/70 border border-emerald-200/80 rounded-lg flex items-center justify-between text-[11px] text-emerald-900">
                    <span className="font-semibold flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      Client sélectionné : {contacts.find(c => c.id === formContactId)?.name || 'Client sans nom'}
                    </span>
                    <span className="font-mono text-[10px] text-emerald-700">
                      {contacts.find(c => c.id === formContactId)?.phone_number}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Collaborateur assigné</label>
                  <select
                    value={formTeamMemberId}
                    onChange={e => setFormTeamMemberId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Sélectionner...</option>
                    {teamMembers.map(m => {
                      const st = m.status || (m.is_active ? 'active' : 'other');
                      const tag = st === 'vacation' ? ' 🏖️ (En vacances)' : st === 'sick' ? ' 🤒 (Malade)' : st === 'other' ? ' ⚪ (Indisponible)' : '';
                      return (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role}){tag}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Service / Prestation</label>
                  <select
                    value={formServiceId}
                    onChange={e => {
                      const sId = Number(e.target.value);
                      setFormServiceId(sId || '');
                      const s = services.find(x => x.id === sId);
                      if (s) {
                        setFormTitle(s.name);
                        setFormDuration(s.duration_minutes);
                        if (s.duration_minutes >= 480) {
                          setIsAllDay(true);
                          setFormStartTime('08:00');
                        } else {
                          setIsAllDay(false);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Choisir une prestation...</option>
                    {Array.from(new Set(services.map(s => s.category || 'Prestations'))).map(cat => (
                      <optgroup key={cat} label={`📦 ${cat}`}>
                        {services
                          .filter(s => (s.category || 'Prestations') === cat)
                          .map(s => {
                            const dur = s.duration_minutes >= 60
                              ? `${Math.floor(s.duration_minutes / 60)}h${s.duration_minutes % 60 > 0 ? (s.duration_minutes % 60).toString().padStart(2, '0') : ''}`
                              : `${s.duration_minutes} min`;
                            return (
                              <option key={s.id} value={s.id}>
                                {s.name} — {dur} {s.price > 0 ? `(${s.price}€)` : ''}
                              </option>
                            );
                          })}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Titre ou Motif du RDV *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Devis rénovation, Point commercial"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Horaires et Durée avec Bouton Journée Entière */}
              <div className="space-y-2 pt-1 bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-700 text-xs">Date & Horaires :</span>
                  {/* Bouton cliquable Journée entière */}
                  <button
                    type="button"
                    onClick={handleToggleAllDay}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border shadow-2xs cursor-pointer ${
                      isAllDay
                        ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-200'
                        : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    ☀️ {isAllDay ? '✓ Journée entière sélectionnée' : 'Cliquer sur Journée entière'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1 text-[11px]">Date *</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1 text-[11px]">Début *</label>
                    <select
                      value={formStartTime}
                      disabled={isAllDay}
                      onChange={e => setFormStartTime(e.target.value)}
                      className={`w-full px-2.5 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-xs ${
                        isAllDay ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white'
                      }`}
                    >
                      {TIME_SLOTS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1 text-[11px]">Durée</label>
                    <select
                      value={formDuration}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setFormDuration(val);
                        if (val === 600) {
                          setIsAllDay(true);
                          setFormStartTime('08:00');
                        } else {
                          setIsAllDay(false);
                        }
                      }}
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium text-xs bg-white"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 heure (60 min)</option>
                      <option value={90}>1h30 (90 min)</option>
                      <option value={120}>2 heures</option>
                      <option value={180}>3 heures</option>
                      <option value={240}>Demi-journée (4h)</option>
                      <option value={600}>☀️ Journée entière (08:00 - 18:00)</option>
                    </select>
                  </div>
                </div>

                {/* Pilules de raccourci cliquables pour la durée */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60">
                  <span className="text-[10px] text-slate-400 font-medium mr-0.5">Raccourcis :</span>
                  {[
                    { label: '30m', val: 30 },
                    { label: '1h', val: 60 },
                    { label: '2h', val: 120 },
                    { label: 'Demi-journée (4h)', val: 240 },
                    { label: '☀️ Journée entière', val: 600 }
                  ].map(p => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => {
                        setFormDuration(p.val);
                        if (p.val === 600) {
                          setIsAllDay(true);
                          setFormStartTime('08:00');
                        } else {
                          setIsAllDay(false);
                        }
                      }}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                        formDuration === p.val
                          ? p.val === 600
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-emerald-600 text-white border-emerald-600'
                          : p.val === 600
                            ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Récapitulatif visuel du créneau réservé */}
                <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-[11px]">
                  <span className="text-slate-500 font-medium">Plage horaire réservée :</span>
                  <span className="font-bold text-slate-800 font-mono flex items-center gap-1.5">
                    {isAllDay ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-amber-950 font-bold">08:00 - 18:00 (Journée entière)</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>{formStartTime} - {calculatedEndTime}</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Document joint au rendez-vous (PDF, devis, plan...) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-700 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    Document joint (Devis, plan, fiche technique...)
                  </label>
                  <span className="text-[10px] text-slate-400 font-normal">PDF principalement</span>
                </div>

                {attachedFile ? (
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        PDF
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="font-bold text-xs text-slate-900 truncate" title={attachedFile.name}>
                          {attachedFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {(attachedFile.size / 1024).toFixed(0)} Ko • Prêt à joindre
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="px-2 py-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer text-xs font-semibold"
                      title="Retirer ce document"
                    >
                      ✕ Retirer
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-3 bg-slate-50 border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl cursor-pointer text-slate-600 hover:text-blue-700 text-xs font-semibold transition group">
                    <Upload className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                    <span>Cliquez pour joindre un document (PDF, devis, plan...)</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notes complémentaires</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Informations utiles pour le collaborateur..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUploadingDoc}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  {isUploadingDoc ? 'Téléversement...' : 'Confirmer le rendez-vous'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

