import React, { useEffect, useState } from 'react';
import {
  Users,
  MessageSquare,
  Calendar,
  Sparkles,
  QrCode,
  ArrowRight,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DashboardStats, Appointment, Contact } from '../types';
import { getStoredContacts } from '../data/defaultContacts';

export const Dashboard: React.FC = () => {
  const {
    whatsappState,
    setActiveTab,
    openConversation,
    setConversationMobileView,
    triggerRefresh,
    refreshAll
  } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>(() => getStoredContacts().slice(0, 5));
  const [quickPhone, setQuickPhone] = useState('+33 6 12 99 88 77');
  const [quickMessage, setQuickMessage] = useState('');
  const [isSendingQuick, setIsSendingQuick] = useState(false);
  const [quickSendSuccess, setQuickSendSuccess] = useState<string | null>(null);

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

  const handleQuickSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMessage.trim() || !quickPhone.trim()) return;

    setIsSendingQuick(true);
    setQuickSendSuccess(null);

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: quickPhone,
          content: quickMessage.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setQuickSendSuccess(`Message transmis avec succès (${data.via || 'WhatsApp'}) !`);
        setQuickMessage('');
        refreshAll();
        setTimeout(() => setQuickSendSuccess(null), 4000);
      } else {
        alert(data.error || 'Erreur lors de l\'envoi');
      }
    } catch (err: any) {
      alert('Erreur d\'envoi : ' + err.message);
    } finally {
      setIsSendingQuick(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 max-w-7xl mx-auto overflow-y-auto h-full">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-4 sm:p-6 rounded-2xl text-white shadow-lg shadow-emerald-900/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-2">
            <MessageSquare className="w-3.5 h-3.5" />
            Hub WhatsApp & Agenda PME
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Bienvenue sur votre Espace Entreprise</h2>
          <p className="text-emerald-100 text-sm mt-1 max-w-xl">
            Pilotez vos échanges clients WhatsApp, planifiez vos interventions et synchronisez les plannings de votre équipe en temps réel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {whatsappState.status !== 'connected' ? (
            <button
              onClick={() => setActiveTab('whatsapp')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-800 rounded-xl font-semibold text-sm shadow-sm hover:bg-emerald-50 transition"
            >
              <QrCode className="w-4 h-4" />
              Connecter WhatsApp
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/40 border border-emerald-300/40 rounded-xl text-sm font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse"></span>
              Connecté : {whatsappState.phoneNumber || 'En ligne'}
            </div>
          )}
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
            <p className="text-2xl font-bold text-slate-800">{stats?.totalContacts ?? '0'}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Messages Aujourd'hui</p>
            <p className="text-2xl font-bold text-slate-800">{stats?.messagesToday ?? '0'}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Rendez-vous Aujourd'hui</p>
            <p className="text-2xl font-bold text-slate-800">{stats?.appointmentsToday ?? '0'}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Collaborateurs Actifs</p>
            <p className="text-2xl font-bold text-slate-800">{stats?.activeTeamMembers ?? '0'}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Quick Send WhatsApp + Upcoming Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Direct Quick Send WhatsApp */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Envoi Rapide WhatsApp Direct</h3>
                <p className="text-xs text-slate-500">Transmettez immédiatement un message ou une confirmation à un client</p>
              </div>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
              WhatsApp Direct
            </span>
          </div>

          <form onSubmit={handleQuickSend} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Numéro WhatsApp du destinataire</label>
              <input
                type="text"
                value={quickPhone}
                onChange={e => setQuickPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="+33 6 12 34 56 78"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Message à transmettre</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickMessage}
                  onChange={e => setQuickMessage(e.target.value)}
                  placeholder="Ex: Bonjour, nous confirmons votre créneau d'intervention pour demain..."
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isSendingQuick || !quickMessage.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSendingQuick ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Envoyer
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Modèles de messages rapides */}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-xs text-slate-400 self-center mr-1">Modèles express :</span>
            <button
              type="button"
              onClick={() => setQuickMessage("Bonjour, nous venons de vous transmettre votre devis par message. Restant à votre disposition !")}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              📄 Devis envoyé
            </button>
            <button
              type="button"
              onClick={() => setQuickMessage("Bonjour, notre technicien est en route vers votre adresse. À tout de suite !")}
              className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition cursor-pointer"
            >
              🚗 En route
            </button>
            <button
              type="button"
              onClick={() => setQuickMessage("Bonjour, votre intervention a été réalisée avec succès. Merci de votre confiance !")}
              className="text-xs px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-800 transition cursor-pointer"
            >
              ✅ Fin d'intervention
            </button>
          </div>

          {/* Confirmation d'envoi direct */}
          {quickSendSuccess && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{quickSendSuccess}</span>
            </div>
          )}
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
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
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

          {/* Recent active chats summary */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">Conversations récentes</span>
              <button
                onClick={() => {
                  setConversationMobileView('list');
                  setActiveTab('conversations');
                }}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
              >
                Accéder au chat
              </button>
            </div>
            <div className="space-y-1.5">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-100 flex items-center justify-between transition text-xs cursor-pointer active:scale-[0.99]"
                  title={`Ouvrir la discussion avec ${c.name || c.phone_number}`}
                >
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-800">{c.name || c.phone_number}</span>
                    <p className="text-slate-500 truncate">{c.last_message || 'Pas de message'}</p>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                    c.ai_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {c.ai_enabled ? 'IA Active' : 'Humain'}
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
