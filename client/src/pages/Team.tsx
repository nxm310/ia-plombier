import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Clock,
  Briefcase,
  Trash2,
  Edit2,
  Check,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TeamMember, TeamMemberStatus } from '../types';
import { INDUSTRY_PRESETS } from '../data/industryPresets';
import { formatWhatsAppPhone, handlePhoneInputChange } from '../utils/phone';

export const Team: React.FC = () => {
  const { triggerRefresh, refreshAll } = useApp();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const cached = localStorage.getItem('pme_team_members');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    const defaultTeam = INDUSTRY_PRESETS.plumber?.teamMembers || [];
    return defaultTeam.map((m, idx) => ({
      id: idx + 1,
      name: m.name,
      role: m.role,
      email: m.email,
      phone: m.phone,
      color: m.color,
      is_active: 1,
      status: 'active' as TeamMemberStatus,
      specialties: m.specialties,
      working_hours: null
    }));
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Filter State
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'vacation' | 'sick' | 'other'>('all');

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [color, setColor] = useState('#2563EB');
  const [status, setStatus] = useState<TeamMemberStatus>('active');
  const [specialtiesText, setSpecialtiesText] = useState('');

  const defaultSchedule = {
    monday: { enabled: true, slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '18:30' }] },
    tuesday: { enabled: true, slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '18:30' }] },
    wednesday: { enabled: true, slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '18:30' }] },
    thursday: { enabled: true, slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '18:30' }] },
    friday: { enabled: true, slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '17:30' }] },
    saturday: { enabled: false, slots: [] },
    sunday: { enabled: false, slots: [] }
  };

  const [workingHours, setWorkingHours] = useState<any>(defaultSchedule);

  useEffect(() => {
    fetch('/api/team')
      .then(res => {
        if (!res.ok) throw new Error('Status ' + res.status);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTeamMembers(data);
          localStorage.setItem('pme_team_members', JSON.stringify(data));
        } else {
          const cached = localStorage.getItem('pme_team_members');
          if (cached) {
            try {
              setTeamMembers(JSON.parse(cached));
            } catch (e) {
              console.error(e);
            }
          }
        }
      })
      .catch(err => {
        console.warn('Backend team non joignable, utilisation du cache local:', err);
        const cached = localStorage.getItem('pme_team_members');
        if (cached) {
          try {
            setTeamMembers(JSON.parse(cached));
          } catch (e) {
            console.error(e);
          }
        }
      });
  }, [triggerRefresh]);

  const openCreateModal = () => {
    setEditingMember(null);
    setName('');
    setRole('');
    setEmail('');
    setPhone('');
    setColor('#2563EB');
    setStatus('active');
    setSpecialtiesText('');
    setWorkingHours(defaultSchedule);
    setIsModalOpen(true);
  };

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setName(member.name);
    setRole(member.role);
    setEmail(member.email || '');
    setPhone(member.phone || '');
    setColor(member.color || '#2563EB');
    setStatus((member.status as TeamMemberStatus) || (member.is_active ? 'active' : 'other'));
    setSpecialtiesText(member.specialties.join(', '));
    setWorkingHours(member.working_hours || defaultSchedule);
    setIsModalOpen(true);
  };

  const handleStatusChange = async (memberId: number, newStatus: string) => {
    setTeamMembers(prev => {
      const next = prev.map(m => m.id === memberId ? {
        ...m,
        status: newStatus as any,
        is_active: newStatus === 'active' ? 1 : 0
      } : m);
      localStorage.setItem('pme_team_members', JSON.stringify(next));
      return next;
    });

    try {
      await fetch(`/api/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          is_active: newStatus === 'active' ? 1 : 0
        })
      });
      refreshAll();
    } catch (err) {
      console.warn('Sauvegarde statut en local effectuée (backend non joignable):', err);
    }
  };

  const getStatusConfig = (st?: string, isActive: number = 1) => {
    const effective = st || (isActive ? 'active' : 'other');
    switch (effective) {
      case 'active':
        return {
          label: 'Actif',
          icon: '🟢',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100',
          ring: 'focus:ring-emerald-400'
        };
      case 'vacation':
        return {
          label: 'Vacances',
          icon: '🏖️',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
          ring: 'focus:ring-amber-400'
        };
      case 'sick':
        return {
          label: 'Malade',
          icon: '🤒',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100',
          ring: 'focus:ring-rose-400'
        };
      case 'other':
      default:
        return {
          label: 'Autre',
          icon: '⚪',
          badgeClass: 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100',
          ring: 'focus:ring-purple-400'
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;

    const specialties = specialtiesText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      name,
      role,
      email,
      phone: formatWhatsAppPhone(phone.trim()),
      color,
      specialties,
      working_hours: workingHours,
      status,
      is_active: status === 'active' ? 1 : 0
    };

    setTeamMembers(prev => {
      let next: TeamMember[];
      if (editingMember) {
        next = prev.map(m => m.id === editingMember.id ? { ...m, ...payload } : m);
      } else {
        const newId = prev.length > 0 ? Math.max(...prev.map(p => p.id)) + 1 : 1;
        next = [...prev, { id: newId, ...payload }];
      }
      localStorage.setItem('pme_team_members', JSON.stringify(next));
      return next;
    });

    try {
      if (editingMember) {
        await fetch(`/api/team/${editingMember.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      setIsModalOpen(false);
      refreshAll();
    } catch (err) {
      console.warn('Sauvegarde collaborateur en local effectuée (backend non joignable):', err);
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Confirmez-vous la suppression de ce collaborateur ?')) return;
    setTeamMembers(prev => {
      const next = prev.filter(m => m.id !== id);
      localStorage.setItem('pme_team_members', JSON.stringify(next));
      return next;
    });

    try {
      await fetch(`/api/team/${id}`, { method: 'DELETE' });
      refreshAll();
    } catch (err) {
      console.warn('Suppression collaborateur en local effectuée (backend non joignable):', err);
    }
  };

  const DAYS_LABELS: Record<string, string> = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche'
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Collaborateurs & Horaires</h2>
          <p className="text-slate-500 text-xs mt-1">
            Configurez les membres de votre PME. L'agent IA utilise leurs compétences et leurs plages horaires pour placer les rendez-vous sans conflit.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Ajouter un Collaborateur
        </button>
      </div>

      {/* Filtres par statut */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Tous ({teamMembers.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('active')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
            statusFilter === 'active'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
          }`}
        >
          <span>🟢</span>
          <span>Actifs ({teamMembers.filter(m => (m.status || (m.is_active ? 'active' : 'other')) === 'active').length})</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('vacation')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
            statusFilter === 'vacation'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'
          }`}
        >
          <span>🏖️</span>
          <span>Vacances ({teamMembers.filter(m => (m.status || (m.is_active ? 'active' : 'other')) === 'vacation').length})</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('sick')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
            statusFilter === 'sick'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700'
          }`}
        >
          <span>🤒</span>
          <span>Malade ({teamMembers.filter(m => (m.status || (m.is_active ? 'active' : 'other')) === 'sick').length})</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('other')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
            statusFilter === 'other'
              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-purple-50 hover:text-purple-700'
          }`}
        >
          <span>⚪</span>
          <span>Autre ({teamMembers.filter(m => (m.status || (m.is_active ? 'active' : 'other')) === 'other').length})</span>
        </button>
      </div>

      {/* Grid des collaborateurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamMembers
          .filter(m => {
            if (statusFilter === 'all') return true;
            const st = m.status || (m.is_active ? 'active' : 'other');
            return st === statusFilter;
          })
          .map((member) => (
          <div
            key={member.id}
            className="group relative bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
          >
            {/* Barre colorée supérieure */}
            <div
              className="h-1.5 w-full shrink-0"
              style={{ backgroundColor: member.color || '#2563EB' }}
            />

            <div className="p-5 space-y-4">
              {/* Header card: Avatar + Nom complet (Prénom et Nom 100% visibles) + Rôle */}
              <div className="flex items-start gap-3.5">
                <div className="relative shrink-0">
                  <div
                    className="w-13 h-13 rounded-2xl text-white font-black flex items-center justify-center text-base shadow-sm ring-2 ring-white"
                    style={{ backgroundColor: member.color || '#2563EB' }}
                  >
                    {member.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'CO'}
                  </div>
                  {/* Pastille statut sur l'avatar */}
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[9px] shadow-xs ${
                      (member.status || (member.is_active ? 'active' : 'other')) === 'active'
                        ? 'bg-emerald-500'
                        : (member.status || (member.is_active ? 'active' : 'other')) === 'vacation'
                        ? 'bg-amber-500'
                        : (member.status || (member.is_active ? 'active' : 'other')) === 'sick'
                        ? 'bg-rose-500'
                        : 'bg-purple-500'
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Nom complet bien visible et sans troncature */}
                  <h3 className="font-bold text-base text-slate-900 leading-snug break-words tracking-tight">
                    {member.name}
                  </h3>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                      {member.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sélecteur de statut dédié - Aucune interférence avec le nom */}
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                  Statut :
                </span>
                <div className="relative inline-flex items-center">
                  <select
                    value={member.status || (member.is_active ? 'active' : 'other')}
                    onChange={(e) => handleStatusChange(member.id, e.target.value)}
                    className={`text-xs font-bold pl-3 pr-7 py-1.5 rounded-lg border cursor-pointer appearance-none transition shadow-2xs focus:outline-none focus:ring-2 ${getStatusConfig(member.status, member.is_active).badgeClass} ${getStatusConfig(member.status, member.is_active).ring}`}
                    title="Changer le statut du collaborateur"
                  >
                    <option value="active" className="bg-white text-slate-800">🟢 Actif (En poste)</option>
                    <option value="vacation" className="bg-white text-slate-800">🏖️ Vacances</option>
                    <option value="sick" className="bg-white text-slate-800">🤒 Malade</option>
                    <option value="other" className="bg-white text-slate-800">⚪ Autre</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2 pointer-events-none opacity-60 text-slate-700" />
                </div>
              </div>

              {/* Coordonnées */}
              <div className="space-y-2 text-xs text-slate-600 bg-white rounded-xl p-2.5 border border-slate-100">
                {member.phone ? (
                  <a
                    href={`tel:${member.phone}`}
                    className="flex items-center gap-2 text-slate-700 hover:text-blue-600 font-medium transition group/link"
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover/link:bg-blue-100 transition">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <span>{member.phone}</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 italic">
                    <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <span>Aucun téléphone</span>
                  </div>
                )}
                {member.email ? (
                  <a
                    href={`mailto:${member.email}`}
                    className="flex items-center gap-2 text-slate-700 hover:text-blue-600 font-medium transition group/link"
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover/link:bg-blue-100 transition">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{member.email}</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 italic">
                    <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <span>Aucun email</span>
                  </div>
                )}
              </div>

              {/* Spécialités reconnues par l'IA */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Spécialités reconnues par l'IA :
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {member.specialties && member.specialties.length > 0 ? (
                    member.specialties.map((spec, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium border border-slate-200/70"
                      >
                        {spec}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">Aucune spécialité renseignée</span>
                  )}
                </div>
              </div>

              {/* Horaires / Disponibilité */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Disponibilité hebdomadaire :
                </p>
                <p className="text-xs text-slate-600 font-medium">
                  {Object.entries(member.working_hours || {})
                    .filter(([_, conf]: any) => conf.enabled)
                    .map(([day]: any) => DAYS_LABELS[day] || day)
                    .join(', ') || 'Lun, Mar, Mer, Jeu, Ven (standard)'}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-400">
                ID #{member.id}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openEditModal(member)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition border border-transparent hover:border-blue-100"
                  title="Modifier"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Ajout / Modification */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-xl max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingMember ? 'Modifier le Collaborateur' : 'Ajouter un Collaborateur'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nom et Prénom *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Thomas Leroy"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Rôle / Poste *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Responsable Technique"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email professionnel</label>
                  <input
                    type="email"
                    placeholder="thomas@entreprise.fr"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Téléphone <span className="text-[10px] text-emerald-600 font-normal">(format auto +33...)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Ex: 0323456776 ou +33 3 23 45 67 76"
                    value={phone}
                    onChange={e => setPhone(handlePhoneInputChange(e.target.value))}
                    onBlur={e => setPhone(formatWhatsAppPhone(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Statut actuel</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="active">🟢 Actif</option>
                    <option value="vacation">🏖️ Vacances</option>
                    <option value="sick">🤒 Malade</option>
                    <option value="other">⚪ Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Couleur d'agenda</label>
                  <div className="flex items-center gap-3 h-[38px]">
                    <input
                      type="color"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      className="w-10 h-8 rounded border border-slate-200 cursor-pointer"
                    />
                    <span className="text-slate-500 font-mono text-xs">{color}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Spécialités & Mots-clés reconnus par l'IA (séparés par des virgules)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Devis, Audit, Dépannage informatique, SAV"
                  value={specialtiesText}
                  onChange={e => setSpecialtiesText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Quand un client demande l'une de ces prestations, l'agent IA orientera le rendez-vous vers ce collaborateur.
                </p>
              </div>

              {/* Horaires d'ouverture par jour */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block font-bold text-slate-800 mb-2">Jours travaillés et Horaires :</label>
                <div className="space-y-2">
                  {Object.entries(DAYS_LABELS).map(([key, label]) => {
                    const isEnabled = workingHours[key]?.enabled ?? false;
                    return (
                      <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={e => {
                              const checked = e.target.checked;
                              setWorkingHours((prev: any) => ({
                                ...prev,
                                [key]: {
                                  enabled: checked,
                                  slots: checked ? [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '18:30' }] : []
                                }
                              }));
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-semibold text-slate-700">{label}</span>
                        </label>
                        <span className="text-slate-500 text-[11px]">
                          {isEnabled ? '09:00 - 12:30 | 14:00 - 18:30' : 'Non disponible'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition"
                >
                  {editingMember ? 'Mettre à jour' : 'Enregistrer le collaborateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
