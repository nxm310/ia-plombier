import React, { useEffect, useState } from 'react';
import {
  FileText,
  Search,
  User,
  Phone,
  Calendar,
  Plus,
  Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Contact, Memory } from '../types';

export const Contacts: React.FC = () => {
  const { setSelectedContactId, setActiveTab, triggerRefresh, refreshAll } = useApp();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [search, setSearch] = useState('');

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState('preference');

  useEffect(() => {
    fetch('/api/contacts')
      .then(res => res.json())
      .then(data => {
        setContacts(data);
        if (!selectedContact && data.length > 0) {
          setSelectedContact(data[0]);
        }
      })
      .catch(err => console.error('Erreur contacts:', err));
  }, [triggerRefresh]);

  useEffect(() => {
    if (!selectedContact) return;
    fetch(`/api/contacts/${selectedContact.id}/memories`)
      .then(res => res.json())
      .then(data => setMemories(data))
      .catch(err => console.error('Erreur memories:', err));
  }, [selectedContact, triggerRefresh]);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey || !newValue || !selectedContact) return;

    try {
      await fetch(`/api/contacts/${selectedContact.id}/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newCategory,
          key: newKey,
          value: newValue
        })
      });
      setNewKey('');
      setNewValue('');
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

  const filtered = contacts.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    c.phone_number.includes(search)
  );

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Fiches Clients & Coordonnées (CRM)</h2>
        <p className="text-slate-500 text-xs mt-1">
          Consultez et complétez les fiches de vos clients, notes techniques, préférences et historique des échanges.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Colonne gauche : Liste des contacts */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher par nom ou numéro..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Aucun contact trouvé.</div>
            ) : (
              filtered.map(c => {
                const isSelected = selectedContact?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContact(c)}
                    className={`w-full p-4 text-left flex items-center justify-between transition ${
                      isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                        {c.name ? c.name.slice(0, 2).toUpperCase() : <User className="w-4 h-4" />}
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-xs text-slate-800 truncate">{c.name || 'Nom non précisé'}</p>
                        <p className="text-[11px] text-slate-500">{c.phone_number}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Colonne droite : Fiche Mémoire & Actions */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          {selectedContact ? (
            <>
              {/* Header Contact */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-base">
                    {selectedContact.name ? selectedContact.name.slice(0, 2).toUpperCase() : <User className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{selectedContact.name || 'Client sans nom'}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5" /> {selectedContact.phone_number}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`tel:${selectedContact.phone_number}`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition"
                  >
                    <Phone className="w-3.5 h-3.5" /> Appeler
                  </a>
                  <a
                    href={`sms:${selectedContact.phone_number}`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition border border-slate-200"
                  >
                    SMS
                  </a>
                  <button
                    onClick={() => {
                      setSelectedContactId(selectedContact.id);
                      setActiveTab('appointments');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Planifier RDV
                  </button>
                </div>
              </div>

              {/* Fiche Technique & Notes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Notes & Fiche Technique</span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {memories.length} notes enregistrées
                  </span>
                </div>

                {memories.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl text-xs text-slate-400">
                    Aucune note ou information spécifique enregistrée pour ce client.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {memories.map(mem => (
                      <div
                        key={mem.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 relative group space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            {mem.category}
                          </span>
                          <button
                            onClick={() => handleDeleteMemory(mem.id)}
                            className="text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="font-semibold text-xs text-slate-900 pt-1">{mem.key}</p>
                        <p className="text-xs text-slate-600">{mem.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulaire ajout de note */}
                <form onSubmit={handleAddMemory} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-blue-600" /> Ajouter une note ou consigne technique :
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
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
                      placeholder="Clé (ex: ville)"
                      value={newKey}
                      onChange={e => setNewKey(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-slate-200 rounded text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Valeur (ex: Lyon 3ème)"
                      value={newValue}
                      onChange={e => setNewValue(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newKey || !newValue}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold disabled:opacity-50"
                    >
                      Enregistrer la note
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-slate-400 text-sm">
              Sélectionnez un contact pour visualiser sa fiche technique.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
