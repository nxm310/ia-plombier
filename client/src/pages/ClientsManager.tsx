import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Building,
  Tag,
  MessageSquare,
  Calendar,
  FileText,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  ExternalLink,
  UserCheck,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Contact, Memory, Appointment, Message } from '../types';
import { getStoredContacts, saveStoredContacts } from '../data/defaultContacts';
import { subscribeToContacts, saveCloudContact, deleteCloudContact, getTeamId } from '../services/cloudSync';
import { formatWhatsAppPhone, handlePhoneInputChange } from '../utils/phone';

export const ClientsManager: React.FC = () => {
  const { openConversation, setSelectedContactId, setActiveTab, triggerRefresh, refreshAll } = useApp();
  const [contacts, setContacts] = useState<Contact[]>(() => getStoredContacts());
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Client Detail Tabs
  const [detailTab, setDetailTab] = useState<'info' | 'memories' | 'appointments' | 'messages'>('info');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formStatus, setFormStatus] = useState<'prospect' | 'active' | 'vip' | 'support'>('prospect');
  const [formTags, setFormTags] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Edit State in Drawer
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editStatus, setEditStatus] = useState<string>('prospect');
  const [editTags, setEditTags] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Direct Edit Modal from Tile
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editFormName, setEditFormName] = useState('');
  const [editFormPhone, setEditFormPhone] = useState('');
  const [editFormEmail, setEditFormEmail] = useState('');
  const [editFormCompany, setEditFormCompany] = useState('');
  const [editFormStatus, setEditFormStatus] = useState<string>('prospect');
  const [editFormTags, setEditFormTags] = useState('');
  const [editFormNotes, setEditFormNotes] = useState('');

  const handleOpenEditModal = (c: Contact) => {
    setEditingContact(c);
    setEditFormName(c.name || '');
    setEditFormPhone(c.phone_number || '');
    setEditFormEmail(c.email || '');
    setEditFormCompany(c.company || '');
    setEditFormStatus(c.status || 'prospect');
    setEditFormTags(Array.isArray(c.tags) ? c.tags.join(', ') : '');
    setEditFormNotes(c.notes || '');
  };

  const handleSaveEditModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;

    const tagsArray = editFormTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const formattedPhone = formatWhatsAppPhone(editFormPhone.trim()) || editingContact.phone_number;

    const updated: Contact = {
      ...editingContact,
      name: editFormName.trim() || null,
      phone_number: formattedPhone,
      email: editFormEmail.trim() || null,
      company: editFormCompany.trim() || null,
      status: editFormStatus as any,
      tags: tagsArray,
      notes: editFormNotes.trim() || null,
      updated_at: new Date().toISOString()
    };

    setContacts(prev => {
      const next = prev.map(c => c.id === updated.id ? updated : c);
      saveStoredContacts(next);
      return next;
    });

    if (selectedContact?.id === updated.id) {
      setSelectedContact(updated);
    }
    setEditingContact(null);
    refreshAll();

    // Sync cloud & API
    saveCloudContact(updated).catch(() => {});
    fetch(`/api/contacts/${editingContact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(err => console.warn('Sauvegarde contact en local (serveur non connecté):', err));
  };

  // Add Memory in Drawer
  const [newMemoryCategory, setNewMemoryCategory] = useState('preference');
  const [newMemoryKey, setNewMemoryKey] = useState('');
  const [newMemoryValue, setNewMemoryValue] = useState('');

  // 1. Chargement de l'API locale avec fallback sur le cache local
  useEffect(() => {
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
      .catch(err => {
        console.warn('Backend contacts non connecté, utilisation du cache local:', err);
      });
  }, [triggerRefresh]);

  // Fermer la fiche client ou les modales avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedContact(null);
        setEditingContact(null);
        setIsCreateModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 2. Écouteur Cloud Firestore en temps réel pour synchroniser les clients entre collaborateurs
  useEffect(() => {
    const teamId = getTeamId();
    if (!teamId) return;

    const unsubscribe = subscribeToContacts(
      (cloudList) => {
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
      },
      (err) => console.warn('Erreur synchro cloud contacts:', err)
    );

    return () => unsubscribe();
  }, [triggerRefresh]);

  // Load client details when selected
  useEffect(() => {
    if (!selectedContact) return;

    fetch(`/api/contacts/${selectedContact.id}/memories`)
      .then(res => res.json())
      .then(data => setMemories(data))
      .catch(err => console.error('Erreur memories:', err));

    fetch(`/api/appointments?contactId=${selectedContact.id}`)
      .then(res => res.json())
      .then(data => setAppointments(data))
      .catch(err => console.error('Erreur appointments:', err));

    fetch(`/api/contacts/${selectedContact.id}/messages`)
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(err => console.error('Erreur messages:', err));

    // Sync edit fields
    setEditName(selectedContact.name || '');
    setEditPhone(selectedContact.phone_number || '');
    setEditEmail(selectedContact.email || '');
    setEditCompany(selectedContact.company || '');
    setEditStatus(selectedContact.status || 'prospect');
    setEditTags(Array.isArray(selectedContact.tags) ? selectedContact.tags.join(', ') : '');
    setEditNotes(selectedContact.notes || '');
    setIsEditing(false);
  }, [selectedContact, triggerRefresh]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPhone.trim()) {
      alert('Veuillez renseigner un numéro de téléphone.');
      return;
    }

    const tagsArray = formTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const formattedPhone = formatWhatsAppPhone(formPhone.trim());

    const newContact: Contact = {
      id: Date.now(),
      name: formName.trim() || null,
      phone_number: formattedPhone,
      email: formEmail.trim() || null,
      company: formCompany.trim() || null,
      status: formStatus,
      tags: tagsArray,
      notes: formNotes.trim() || null,
      ai_enabled: 1,
      avatar: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 1. Mise à jour immédiate de l'état local et persistance dans le navigateur
    setContacts(prev => {
      const filtered = prev.filter(c => c.phone_number !== newContact.phone_number);
      const next = [newContact, ...filtered];
      saveStoredContacts(next);
      return next;
    });

    setSelectedContact(newContact);
    setIsCreateModalOpen(false);
    resetCreateForm();
    refreshAll();

    // 2. Synchronisation Cloud multi-appareils pour les collègues
    saveCloudContact(newContact).catch(() => {});

    // 3. Sauvegarde sur l'API backend si disponible
    try {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContact.name,
          phone_number: newContact.phone_number,
          email: newContact.email,
          company: newContact.company,
          status: newContact.status,
          tags: newContact.tags,
          notes: newContact.notes
        })
      });
    } catch (err) {
      console.warn('Backend contacts non connecté, client conservé en local/cloud:', err);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact) return;

    const tagsArray = editTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const formattedPhone = formatWhatsAppPhone(editPhone.trim()) || selectedContact.phone_number;

    const updated: Contact = {
      ...selectedContact,
      name: editName.trim() || null,
      phone_number: formattedPhone,
      email: editEmail.trim() || null,
      company: editCompany.trim() || null,
      status: editStatus as any,
      tags: tagsArray,
      notes: editNotes.trim() || null,
      updated_at: new Date().toISOString()
    };

    setContacts(prev => {
      const next = prev.map(c => c.id === updated.id ? updated : c);
      saveStoredContacts(next);
      return next;
    });

    setSelectedContact(updated);
    setIsEditing(false);
    refreshAll();

    // Sync cloud & API
    saveCloudContact(updated).catch(() => {});
    fetch(`/api/contacts/${selectedContact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(err => console.warn('Sauvegarde contact en local (serveur non connecté):', err));
  };

  const handleDeleteClient = async (id: number) => {
    const target = contacts.find(c => c.id === id);
    const label = target?.name ? `${target.name} (${target.phone_number})` : (target?.phone_number || 'ce client');
    if (!confirm(`Voulez-vous vraiment supprimer définitivement ${label} ?`)) return;

    setContacts(prev => {
      const next = prev.filter(c => c.id !== id);
      saveStoredContacts(next);
      return next;
    });

    if (selectedContact?.id === id) {
      setSelectedContact(null);
    }
    refreshAll();

    // Sync cloud & API
    deleteCloudContact(id).catch(() => {});
    fetch(`/api/contacts/${id}`, { method: 'DELETE' }).catch(err =>
      console.warn('Suppression contact en local (serveur non connecté):', err)
    );
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !newMemoryKey || !newMemoryValue) return;

    try {
      await fetch(`/api/contacts/${selectedContact.id}/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newMemoryCategory,
          key: newMemoryKey,
          value: newMemoryValue
        })
      });
      setNewMemoryKey('');
      setNewMemoryValue('');
      refreshAll();
    } catch (err) {
      console.error('Erreur add memory:', err);
    }
  };

  const handleDeleteMemory = async (memId: number) => {
    try {
      await fetch(`/api/memories/${memId}`, { method: 'DELETE' });
      refreshAll();
    } catch (err) {
      console.error('Erreur delete memory:', err);
    }
  };

  const resetCreateForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormCompany('');
    setFormStatus('prospect');
    setFormTags('');
    setFormNotes('');
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      c.phone_number.includes(search) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || (c.status || 'prospect') === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'vip':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">⭐ Client VIP</span>;
      case 'active':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Client Actif</span>;
      case 'support':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">SAV / Suivi</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">Prospect</span>;
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Gestion des Clients & CRM</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              {contacts.length} au total
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Visualisez vos prospects et clients, modifiez leurs coordonnées et consultez leurs fiches techniques en un coup d'œil.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nouveau Client
        </button>
      </div>

      {/* Barre de Filtres & Recherche */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Recherche */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Rechercher par nom, téléphone, entreprise, email ou tag..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Filtres Statuts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'prospect', label: 'Prospects' },
              { id: 'active', label: 'Clients Actifs' },
              { id: 'vip', label: 'VIP' },
              { id: 'support', label: 'SAV / Suivi' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste des Clients */}
      {filteredContacts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm text-slate-400 text-sm">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
          Aucun client ne correspond à votre recherche.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredContacts.map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedContact(c)}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md hover:border-emerald-300 transition cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Header card */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                      {c.name ? c.name.slice(0, 2).toUpperCase() : 'WA'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 truncate group-hover:text-emerald-700 transition">
                        {c.name || 'Client sans nom'}
                      </h3>
                      {c.company && (
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1 font-medium">
                          <Building className="w-3 h-3 text-slate-400" />
                          {c.company}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div>{getStatusBadge(c.status)}</div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(c);
                      }}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition cursor-pointer"
                      title={`Modifier directement ${c.name || c.phone_number}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClient(c.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition cursor-pointer"
                      title={`Supprimer directement ${c.name || c.phone_number}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Coordonnées */}
                <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{c.phone_number}</span>
                  </div>
                  {c.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {c.tags && c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {c.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer card */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[11px] text-slate-400">
                  {c.phone_number}
                </span>

                <span className="text-emerald-600 font-semibold group-hover:underline flex items-center gap-1 text-[11px]">
                  Fiche Client &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tiroir Fiche Client 360° */}
      {selectedContact && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end cursor-pointer"
          onClick={() => setSelectedContact(null)}
        >
          <div
            className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header tiroir */}
            <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center text-base sm:text-lg shadow-md shadow-emerald-200 shrink-0">
                  {selectedContact.name ? selectedContact.name.slice(0, 2).toUpperCase() : 'WA'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 truncate">{selectedContact.name || 'Client sans nom'}</h3>
                    {getStatusBadge(selectedContact.status)}
                  </div>
                  <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 shrink-0" /> {selectedContact.phone_number}</span>
                    {selectedContact.company && <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5 shrink-0" /> {selectedContact.company}</span>}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedContact(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={() => openConversation(selectedContact.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Ouvrir Chat WhatsApp
              </button>

              <button
                onClick={() => {
                  setSelectedContactId(selectedContact.id);
                  setActiveTab('appointments');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl font-semibold transition"
              >
                <Calendar className="w-3.5 h-3.5" /> Prendre un RDV
              </button>

              <button
                onClick={() => handleDeleteClient(selectedContact.id)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition ml-auto"
                title="Supprimer ce client"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
              {[
                { id: 'info', label: 'Coordonnées & Profil' },
                { id: 'memories', label: `Notes & Fiche (${memories.length})` },
                { id: 'appointments', label: `Rendez-vous (${appointments.length})` },
                { id: 'messages', label: `Historique (${messages.length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDetailTab(tab.id as any)}
                  className={`py-3 px-3 text-xs font-semibold border-b-2 transition ${
                    detailTab === tab.id
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Informations & Coordonnées */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailTab === 'info' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-800">Fiche de Coordonnées</h4>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      {isEditing ? 'Annuler' : 'Modifier les infos'}
                    </button>
                  </div>

                  {isEditing ? (
                    <form onSubmit={handleUpdateClient} className="space-y-4 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">Nom complet *</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                            placeholder="Ex: Jean Dupont"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">Téléphone WhatsApp *</label>
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={e => setEditPhone(handlePhoneInputChange(e.target.value))}
                            onBlur={e => setEditPhone(formatWhatsAppPhone(e.target.value))}
                            required
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                            placeholder="Ex: 0323456776 ou +33 3 23 45 67 76"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">Entreprise / Société</label>
                          <input
                            type="text"
                            value={editCompany}
                            onChange={e => setEditCompany(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                            placeholder="Optionnel"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={e => setEditEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">Statut Client</label>
                          <select
                            value={editStatus}
                            onChange={e => setEditStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="prospect">Prospect</option>
                            <option value="active">Client Actif</option>
                            <option value="vip">Client VIP</option>
                            <option value="support">SAV / Suivi</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block font-medium text-slate-700 mb-1">Tags (séparés par des virgules)</label>
                        <input
                          type="text"
                          placeholder="Ex: Devis, Chantier nov, Urgent"
                          value={editTags}
                          onChange={e => setEditTags(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-slate-700 mb-1">Notes internes</label>
                        <textarea
                          rows={3}
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        ></textarea>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition"
                        >
                          Enregistrer les modifications
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Nom :</span>
                          <span className="font-semibold text-slate-800">{selectedContact.name || 'Non renseigné'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Entreprise :</span>
                          <span className="font-semibold text-slate-800">{selectedContact.company || 'Non renseignée'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Téléphone WhatsApp :</span>
                          <span className="font-mono text-slate-800 font-medium">{selectedContact.phone_number}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Email :</span>
                          <span className="text-slate-800">{selectedContact.email || 'Non renseigné'}</span>
                        </div>
                      </div>

                      {selectedContact.notes && (
                        <div className="pt-2 border-t border-slate-200">
                          <span className="text-slate-400 block mb-1">Notes internes :</span>
                          <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-100">{selectedContact.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Mémoire IA */}
              {detailTab === 'memories' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>Notes & Fiche Technique Client</span>
                    </div>
                  </div>

                  {memories.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-400">
                      Aucune note spécifique pour ce client. Vous pouvez ajouter des consignes d'accès, besoins ou préférences.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {memories.map(m => (
                        <div
                          key={m.id}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between group"
                        >
                          <div>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              {m.category}
                            </span>
                            <p className="font-bold text-slate-900 mt-1">{m.key}</p>
                            <p className="text-slate-600 mt-0.5">{m.value}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteMemory(m.id)}
                            className="p-1 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulaire ajout mémoire */}
                  <form onSubmit={handleAddMemory} className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                    <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-600" /> Ajouter une note ou consigne technique :
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={newMemoryCategory}
                        onChange={e => setNewMemoryCategory(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-slate-200 rounded text-xs"
                      >
                        <option value="preference">Préférence</option>
                        <option value="project">Projet</option>
                        <option value="budget">Budget</option>
                        <option value="need">Besoin</option>
                        <option value="general">Général</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Clé (ex: digicode, budget)"
                        value={newMemoryKey}
                        onChange={e => setNewMemoryKey(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-slate-200 rounded text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Valeur (ex: Bât B - code 48A9)"
                        value={newMemoryValue}
                        onChange={e => setNewMemoryValue(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!newMemoryKey || !newMemoryValue}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold disabled:opacity-50"
                      >
                        Enregistrer la note
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab 3: Rendez-vous */}
              {detailTab === 'appointments' && (
                <div className="space-y-3 text-xs">
                  <h4 className="font-bold text-sm text-slate-800">Historique des Rendez-vous</h4>
                  {appointments.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-400">
                      Aucun rendez-vous planifié avec ce client.
                    </div>
                  ) : (
                    appointments.map(apt => (
                      <div key={apt.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800">{apt.title}</p>
                          <p className="text-slate-500 mt-0.5">
                            {apt.date} • {apt.start_time} - {apt.end_time} • avec <strong className="text-slate-700">{apt.team_member_name || 'Équipe'}</strong>
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                          apt.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 4: Messages */}
              {detailTab === 'messages' && (
                <div className="space-y-3 text-xs">
                  <h4 className="font-bold text-sm text-slate-800">Derniers Messages WhatsApp</h4>
                  {messages.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-400">
                      Aucun message archivé pour ce client.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {messages.map(m => (
                        <div
                          key={m.id}
                          className={`p-3 rounded-xl border ${
                            m.direction === 'inbound'
                              ? 'bg-slate-50 border-slate-200 text-slate-800 mr-8'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-900 ml-8'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span className="font-semibold">{m.sender_type === 'client' ? 'Client' : 'Entreprise'}</span>
                            <span>{new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="whitespace-pre-line text-xs">{m.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Création Client */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-xl cursor-default max-h-[90dvh] overflow-y-auto my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Ajouter un Nouveau Client</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1">✕</button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nom complet *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sophie Martin"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Entreprise</label>
                  <input
                    type="text"
                    placeholder="Ex: Boulangerie Moderne"
                    value={formCompany}
                    onChange={e => setFormCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Numéro WhatsApp * <span className="text-[10px] text-emerald-600 font-normal">(format auto +33...)</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 0323456776 ou +33 3 23 45 67 76"
                    value={formPhone}
                    onChange={e => setFormPhone(handlePhoneInputChange(e.target.value))}
                    onBlur={e => setFormPhone(formatWhatsAppPhone(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="sophie@entreprise.fr"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Statut Initial</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="active">Client Actif</option>
                    <option value="vip">Client VIP</option>
                    <option value="support">SAV / Suivi</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tags (séparés par virgules)</label>
                  <input
                    type="text"
                    placeholder="Ex: Devis, Audit, VIP"
                    value={formTags}
                    onChange={e => setFormTags(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notes internes</label>
                <textarea
                  rows={2}
                  placeholder="Informations utiles pour l'équipe..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition"
                >
                  Créer le client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modification Directe Client depuis la tuile */}
      {editingContact && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer"
          onClick={() => setEditingContact(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150 cursor-default max-h-[90dvh] overflow-y-auto my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Modifier la Fiche Client</h3>
                  <p className="text-[11px] text-slate-400">Édition rapide directe depuis la tuile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingContact(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nom complet *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sophie Martin"
                    value={editFormName}
                    onChange={e => setEditFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Entreprise</label>
                  <input
                    type="text"
                    placeholder="Ex: Boulangerie Moderne"
                    value={editFormCompany}
                    onChange={e => setEditFormCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Numéro WhatsApp * <span className="text-[10px] text-emerald-600 font-normal">(format auto +33...)</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 0323456776 ou +33 3 23 45 67 76"
                    value={editFormPhone}
                    onChange={e => setEditFormPhone(handlePhoneInputChange(e.target.value))}
                    onBlur={e => setEditFormPhone(formatWhatsAppPhone(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="sophie@entreprise.fr"
                    value={editFormEmail}
                    onChange={e => setEditFormEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Statut</label>
                  <select
                    value={editFormStatus}
                    onChange={e => setEditFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="active">Client Actif</option>
                    <option value="vip">Client VIP</option>
                    <option value="support">SAV / Suivi</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tags (séparés par virgules)</label>
                  <input
                    type="text"
                    placeholder="Ex: Devis, Audit, VIP"
                    value={editFormTags}
                    onChange={e => setEditFormTags(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notes internes</label>
                <textarea
                  rows={2}
                  placeholder="Informations utiles pour l'équipe..."
                  value={editFormNotes}
                  onChange={e => setEditFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingContact(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs transition"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
