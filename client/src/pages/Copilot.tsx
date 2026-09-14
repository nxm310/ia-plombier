import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  Calendar,
  DollarSign,
  Users,
  MessageSquare,
  Bot,
  User,
  CheckCircle2,
  Clock,
  Briefcase,
  Phone,
  ArrowRight,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { CopilotMessage } from '../types';

export const Copilot: React.FC = () => {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    {
      icon: <Calendar className="w-3.5 h-3.5 text-blue-600" />,
      text: "Clara, résume-moi la journée de demain"
    },
    {
      icon: <DollarSign className="w-3.5 h-3.5 text-emerald-600" />,
      text: "Quel est le chiffre d'affaires prévisionnel de la semaine ?"
    },
    {
      icon: <MessageSquare className="w-3.5 h-3.5 text-teal-600" />,
      text: "Envoie un message à Thomas pour lui dire qu'on a du retard"
    },
    {
      icon: <Users className="w-3.5 h-3.5 text-purple-600" />,
      text: "Quel est le statut et la disponibilité de l'équipe aujourd'hui ?"
    }
  ];

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/copilot/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Erreur chargement messages copilote:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || isLoading) return;

    setInputMessage('');
    setIsLoading(true);

    // Ajout optimiste du message utilisateur
    const tempUserMsg: CopilotMessage = {
      id: Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend })
      });

      if (res.ok) {
        const data = await res.json();
        const tempAssistantMsg: CopilotMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.reply,
          action_data: data.actionData ? JSON.stringify(data.actionData) : null,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempAssistantMsg]);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Erreur lors de la communication avec Clara');
      }
    } catch (err) {
      console.error('Erreur chat copilote:', err);
    } finally {
      setIsLoading(false);
      fetchMessages();
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Voulez-vous vraiment réinitialiser l\'historique du Copilote ?')) {
      return;
    }
    setIsClearing(true);
    try {
      const res = await fetch('/api/copilot/messages', { method: 'DELETE' });
      if (res.ok) {
        setMessages([]);
      }
    } catch (err) {
      console.error('Erreur reset messages copilote:', err);
    } finally {
      setIsClearing(false);
    }
  };

  const renderActionCard = (actionDataStr?: string | null) => {
    if (!actionDataStr) return null;
    let action: any = null;
    try {
      action = typeof actionDataStr === 'string' ? JSON.parse(actionDataStr) : actionDataStr;
    } catch (e) {
      return null;
    }
    if (!action || !action.type) return null;

    // 1. WhatsApp envoyé
    if (action.type === 'whatsapp_sent') {
      return (
        <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-slate-700 shadow-xs">
          <div className="flex items-center gap-2 mb-2 font-semibold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Message WhatsApp expédié en direct</span>
            <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
              {action.recipientType === 'collaborator' ? 'Collaborateur' : 'Client'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 mb-1.5 font-medium">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>Destinataire : <strong>{action.name}</strong> ({action.phone})</span>
          </div>
          <div className="p-2.5 bg-white rounded-lg border border-emerald-100 text-slate-800 italic">
            "{action.message}"
          </div>
        </div>
      );
    }

    // 2. Synthèse financière
    if (action.type === 'financial_forecast') {
      return (
        <div className="mt-3 p-4 bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-emerald-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-slate-900">Synthèse Chiffre d'Affaires Prévisionnel</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full uppercase">
              {action.period === 'this_week' ? 'Cette semaine' : action.period === 'tomorrow' ? 'Demain' : 'Période analysée'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-medium text-slate-500 uppercase">CA Prévisionnel Total</p>
              <p className="text-base sm:text-lg font-extrabold text-emerald-600">{action.totalRevenue} €</p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-medium text-slate-500 uppercase">Prestations prévues</p>
              <p className="text-base sm:text-lg font-bold text-slate-800">{action.appointmentsCount}</p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
              <p className="text-[10px] font-medium text-slate-500 uppercase">Panier moyen / RDV</p>
              <p className="text-base sm:text-lg font-bold text-blue-600">{action.averageBasket} €</p>
            </div>
          </div>

          {action.breakdownByMember && Object.keys(action.breakdownByMember).length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-semibold text-slate-700">Répartition par collaborateur :</p>
              {Object.entries(action.breakdownByMember).map(([member, data]: any) => (
                <div key={member} className="flex items-center justify-between text-xs bg-white/80 px-2.5 py-1.5 rounded-lg border border-slate-200/50">
                  <span className="text-slate-700 font-medium">{member}</span>
                  <span className="text-emerald-700 font-bold">{data.total} € <span className="text-[10px] font-normal text-slate-400">({data.count} rdv)</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 3. Synthèse de l'agenda
    if (action.type === 'agenda_summary') {
      return (
        <div className="mt-3 p-3.5 bg-white border border-blue-200 rounded-xl text-xs shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-blue-900 font-semibold">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Planning {action.period === 'tomorrow' ? 'de demain' : 'demandé'} ({action.count} intervention{action.count > 1 ? 's' : ''})</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">{action.startDate}</span>
          </div>

          {action.appointments.length === 0 ? (
            <p className="text-slate-500 italic py-1">Aucune intervention programmée sur ce créneau.</p>
          ) : (
            <div className="space-y-2">
              {action.appointments.map((apt: any) => (
                <div key={apt.id} className="p-2 bg-slate-50 border border-slate-200/70 rounded-lg flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 font-bold text-[10px] rounded">
                        {apt.start_time} - {apt.end_time}
                      </span>
                      <p className="font-semibold text-slate-800 text-xs truncate">{apt.title}</p>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Client : <span className="text-slate-700 font-medium">{apt.contact_name}</span> • Intervenant : <span className="text-slate-700 font-medium">{apt.team_member_name}</span>
                    </p>
                  </div>
                  {apt.price > 0 && (
                    <span className="text-xs font-bold text-emerald-600 shrink-0">{apt.price} €</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 4. Statut d'équipe
    if (action.type === 'team_status') {
      return (
        <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs shadow-xs">
          <div className="flex items-center gap-2 mb-2 font-semibold text-slate-800">
            <Users className="w-4 h-4 text-purple-600" />
            <span>Disponibilités actuelles de l'équipe</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {action.members.map((m: any) => {
              let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
              let label = '🟢 Actif';
              if (m.status === 'vacation') {
                badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
                label = '🏖️ Vacances';
              } else if (m.status === 'sick') {
                badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
                label = '🤒 Malade';
              } else if (m.status === 'other') {
                badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                label = '⚪ Autre';
              }
              return (
                <div key={m.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 text-xs">{m.name}</p>
                    <p className="text-[10px] text-slate-400">{m.role}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/60 overflow-hidden">
      {/* En-tête Supérieur */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-slate-900 leading-tight">Clara • Copilote Gérant</h1>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Opérationnel 24/7
              </span>
            </div>
            <p className="text-xs text-slate-500">Pilotez votre entreprise, agendas, finances et équipes en direct</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearHistory}
            disabled={isClearing || messages.length === 0}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition disabled:opacity-30 disabled:pointer-events-none"
            title="Effacer l'historique du chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Fil de discussion */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-8 sm:py-12 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
              <Bot className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                Bonjour ! Je suis Clara, votre copilote exécutif.
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Je suis directement connectée à votre agenda, votre CRM client, vos techniciens et votre session WhatsApp. Que souhaitez-vous faire ?
              </p>
            </div>

            {/* Suggestions de départ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto pt-2 text-left">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.text)}
                  className="p-3 bg-white hover:bg-emerald-50/50 hover:border-emerald-300 border border-slate-200 rounded-xl transition shadow-xs text-xs font-medium text-slate-700 flex items-center gap-2.5 group cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-slate-50 group-hover:bg-white border border-slate-100 shrink-0">
                    {p.icon}
                  </div>
                  <span className="flex-1 truncate">{p.text}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                    {isUser ? (
                      <span className="font-medium text-slate-600 flex items-center gap-1">
                        <User className="w-3 h-3" /> Vous (Gérant)
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <Bot className="w-3 h-3 text-emerald-600" /> Clara • Copilote
                      </span>
                    )}
                    <span>•</span>
                    <span>
                      {new Date(m.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[92%] sm:max-w-xl p-3.5 sm:p-4 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.content}</p>
                    {renderActionCard(m.action_data)}
                  </div>
                </div>
              );
            })}

            {/* Bulle de chargement quand Clara réfléchit */}
            {isLoading && (
              <div className="flex items-start gap-2 max-w-xl">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl rounded-tl-none text-xs text-slate-500 shadow-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Clara interroge l'agenda et prépare sa réponse...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Barre de saisie inférieure & Suggestions rapides */}
      <div className="bg-white border-t border-slate-200 p-3 sm:p-4 shrink-0 shadow-xs">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* Raccourcis rapides au-dessus de l'input quand il y a déjà des messages */}
          {messages.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.text)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 rounded-full transition text-slate-600 whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  {p.icon}
                  <span>{p.text}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ex: Clara, résume-moi la journée de demain, quel est le CA de la semaine, préviens Thomas..."
              disabled={isLoading}
              className="flex-1 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-hidden transition"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition shadow-sm shadow-emerald-200 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Envoyer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
