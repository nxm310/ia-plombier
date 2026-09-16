import React, { useEffect, useState } from 'react';
import {
  Users,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle2,
  PlusCircle,
  Briefcase,
  Layers,
  Phone,
  Send
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DashboardStats, Appointment, Contact } from '../types';
import { getStoredContacts } from '../data/defaultContacts';

export const Dashboard: React.FC = () => {
  const {
    setActiveTab,
    setSelectedContactId,
    triggerRefresh
  } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>(() => getStoredContacts().slice(0, 5));

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Erreur stats:', err));

    fetch('/api/appointments')
      .then(res => res.json())
      .then(data => setAppointments(data.slice(0, 5)))
      .catch(err => console.error('Erreur appointments:', err));

    fetch('/api/contacts')
      .then(res => {
        if (!res.ok) throw new Error('Status ' + res.status);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setContacts(data.slice(0, 5));
        }
      })
      .catch(() => {
        setContacts(getStoredContacts().slice(0, 5));
      });
  }, [triggerRefresh]);

  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 max-w-7xl mx-auto overflow-y-auto h-full">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-4 sm:p-6 rounded-2xl text-white shadow-lg shadow-emerald-900/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-2">
            <Briefcase className="w-3.5 h-3.5" />
            Hub PME : Agenda & CRM
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Bienvenue sur votre Espace Entreprise</h2>
          <p className="text-emerald-100 text-sm mt-1 max-w-xl">
            Pilotez vos interventions, planifiez les créneaux de votre équipe et gérez votre fichier clients en toute simplicité.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('appointments')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-800 rounded-xl font-semibold text-sm shadow-sm hover:bg-emerald-50 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Planifier un rendez-vous
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Clients / Contacts</p>
            <p className="text-2xl font-bold text-slate-800">{stats?.totalContacts ?? contacts.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Interventions Confirmées</p>
            <p className="text-2xl font-bold text-slate-800">{confirmedCount > 0 ? confirmedCount : (stats?.appointmentsToday ?? '1')}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Rendez-vous Aujourd'hui</p>
            <p className="text-2xl font-bold text-slate-800">{stats?.appointmentsToday ?? appointments.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Collaborateurs Actifs</p>
            <p className="text-2xl font-bold text-slate-800">{stats?.activeTeamMembers ?? '3'}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Actions Rapides + Upcoming Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Quick Actions & Management */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Pilotage Rapide d'Entreprise</h3>
                <p className="text-xs text-slate-500">Accédez directement aux modules clés de votre activité</p>
              </div>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
              Agenda & CRM
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setActiveTab('appointments')}
              className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition cursor-pointer group shadow-2xs"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <Calendar className="w-5 h-5" />
              </div>
              <p className="font-bold text-sm text-slate-900 group-hover:text-emerald-800">Planning & Agenda Visuel</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Visualisez les créneaux libres, planifiez des rendez-vous et exportez vers Google & Apple.
              </p>
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-left transition cursor-pointer group shadow-2xs"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <Users className="w-5 h-5" />
              </div>
              <p className="font-bold text-sm text-slate-900 group-hover:text-blue-800">Gestion des Fiches Clients</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Consultez les coordonnées, codes d'accès chantiers et historique des interventions passées.
              </p>
            </button>

            <button
              onClick={() => setActiveTab('team')}
              className="p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-left transition cursor-pointer group shadow-2xs"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <Briefcase className="w-5 h-5" />
              </div>
              <p className="font-bold text-sm text-slate-900 group-hover:text-amber-800">Équipe & Horaires Ouvrés</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Définissez les techniciens, spécialités et plages horaires personnalisées par collaborateur.
              </p>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 text-left transition cursor-pointer group shadow-2xs"
            >
              <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <Layers className="w-5 h-5" />
              </div>
              <p className="font-bold text-sm text-slate-900 group-hover:text-purple-800">Prestations & Paramètres</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Ajustez le catalogue d'interventions, durées, tarifs et informations légales de l'entreprise.
              </p>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Synchronisation Cloud & Partage d'Équipe opérationnels</span>
            </div>
            <button
              onClick={() => setActiveTab('team')}
              className="text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              Code d'équipe &rarr;
            </button>
          </div>
        </div>

        {/* Right: Upcoming Appointments */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Prochains Rendez-vous</h3>
                <p className="text-xs text-slate-500">Planifiés dans l'agenda de l'équipe</p>
              </div>
              <button
                onClick={() => setActiveTab('appointments')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                Voir tout <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Aucun rendez-vous planifié pour le moment.
              </div>
            ) : (
              <div className="space-y-2.5">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-800">{apt.title}</p>
                      <p className="text-slate-500">
                        {apt.contact_name || apt.contact_phone} • avec <span className="font-medium text-slate-700">{apt.team_member_name || 'Équipe'}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-medium text-[11px]">
                        {apt.date}
                      </span>
                      <p className="text-slate-500 font-medium mt-0.5">{apt.start_time} - {apt.end_time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent active contacts summary */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">Fiches clients récentes</span>
              <button
                onClick={() => setActiveTab('clients')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
              >
                Gérer les clients
              </button>
            </div>
            <div className="space-y-1.5">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedContactId(c.id);
                    setActiveTab('clients');
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-100 flex items-center justify-between transition text-xs cursor-pointer active:scale-[0.99]"
                  title={`Ouvrir la fiche de ${c.name || c.phone_number}`}
                >
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-800">{c.name || c.phone_number}</span>
                    <p className="text-slate-500 truncate">{c.notes || 'Fiche client active'}</p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 bg-slate-100 text-slate-700">
                    {c.status || 'Client'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
