import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Share2,
  Briefcase,
  Wrench,
  FileText,
  ExternalLink
} from 'lucide-react';
import {
  downloadClientIcsFile,
  generateClientGoogleCalendarUrl,
  shareAppointmentNative,
  ShareAppointmentPayload
} from '../utils/calendar';

interface PublicAppointmentViewProps {
  data: ShareAppointmentPayload;
  onClose?: () => void;
}

export const PublicAppointmentView: React.FC<PublicAppointmentViewProps> = ({ data, onClose }) => {
  const [copied, setCopied] = useState(false);

  let formattedDate = data.date;
  try {
    formattedDate = new Date(`${data.date}T00:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {}

  const startTime = data.start_time || data.startTime || '09:00';
  const endTime = data.end_time || data.endTime || '10:00';
  const title = data.service_name || data.serviceName || data.title || 'Intervention';
  const clientName = data.contact_name || data.contactName || data.contact_phone || 'Client';
  const staffName = data.team_member_name || data.teamMemberName || 'Notre équipe';

  const googleCalendarUrl = generateClientGoogleCalendarUrl({
    title: `Intervention : ${title}`,
    date: data.date,
    startTime,
    endTime,
    details: `Rendez-vous avec ${staffName}.${data.notes ? `\nPrécisions : ${data.notes}` : ''}`
  });

  const handleDownloadIcs = () => {
    downloadClientIcsFile({
      id: data.id || Date.now(),
      title: `Intervention : ${title}`,
      date: data.date,
      startTime,
      endTime,
      details: `Rendez-vous avec ${staffName}.${data.notes ? `\nPrécisions : ${data.notes}` : ''}`
    });
  };

  const handleShareAgain = async () => {
    const res = await shareAppointmentNative(data, 'client');
    if (res.method === 'clipboard') {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-slate-800 flex flex-col items-center justify-center p-3 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Conteneur principal façon carte Apple / Doctolib */}
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-300">
        
        {/* Bandeau d'en-tête */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 sm:p-6 text-white relative">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white font-bold text-sm">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs uppercase tracking-wider text-emerald-100">Hub PME • Rendez-vous</span>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-emerald-500/30 backdrop-blur-xs border border-white/20 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> Confirmé
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
            Votre rendez-vous est confirmé
          </h1>
          <p className="text-xs text-emerald-100/90 mt-1">
            Enregistrez-le en 1 clic dans votre calendrier pour recevoir un rappel automatique.
          </p>
        </div>

        {/* Détails du Rendez-vous */}
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* Bloc Date & Heure géant */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block mb-0.5">
                Date d'intervention
              </span>
              <p className="font-extrabold text-base sm:text-lg text-slate-900 capitalize truncate">
                {formattedDate}
              </p>
              <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>{startTime} à {endTime}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          {/* Fiche d'informations */}
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-1 text-xs">
            {title && (
              <div className="p-3 flex items-start gap-3">
                <Wrench className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Motif / Prestation</span>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">{title}</span>
                </div>
              </div>
            )}

            {staffName && (
              <div className="p-3 flex items-start gap-3">
                <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Intervenant</span>
                  <span className="font-bold text-slate-800">{staffName}</span>
                </div>
              </div>
            )}

            {clientName && (
              <div className="p-3 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Réservé pour</span>
                  <span className="font-semibold text-slate-700">{clientName}</span>
                </div>
              </div>
            )}

            {data.notes && (
              <div className="p-3 flex items-start gap-3">
                <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Consignes / Précisions</span>
                  <p className="text-slate-700 whitespace-pre-line mt-0.5 font-medium">{data.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* SECTION BOUTONS CALENDRIER : Élégants et sans liens affichés */}
          <div className="space-y-3 pt-2">
            <div className="text-center">
              <h2 className="text-sm font-bold text-slate-900">
                📲 Synchroniser avec votre calendrier
              </h2>
              <p className="text-[11px] text-slate-500">
                Cliquez ci-dessous pour ajouter le créneau dans votre téléphone
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bouton 1 : Apple Calendrier pour iPhone & Mac */}
              <button
                type="button"
                onClick={handleDownloadIcs}
                className="w-full py-3.5 px-4 bg-slate-950 hover:bg-slate-800 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2.5 cursor-pointer group"
                title="Ajouter à Apple Calendrier sur iPhone, iPad et Mac"
              >
                <span className="text-base group-hover:scale-110 transition">🍏</span>
                <div className="text-left leading-tight">
                  <div className="font-bold">Apple Calendrier</div>
                  <div className="text-[10px] text-slate-300 font-normal">iPhone, iPad, Mac (.ics)</div>
                </div>
              </button>

              {/* Bouton 2 : Google Agenda pour Android & Web */}
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2.5 cursor-pointer group"
                title="Ajouter à Google Agenda sur Android, PC et Mac"
              >
                <span className="text-base group-hover:scale-110 transition">📅</span>
                <div className="text-left leading-tight">
                  <div className="font-bold">Google Agenda</div>
                  <div className="text-[10px] text-blue-100 font-normal">Android, Gmail, Web</div>
                </div>
              </a>
            </div>

            {/* Bouton secondaire Partager */}
            <button
              type="button"
              onClick={handleShareAgain}
              className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Transférer ou partager ce rendez-vous</span>
            </button>
            {copied && (
              <p className="text-[11px] text-emerald-600 font-bold text-center animate-in fade-in">
                ✓ Lien du rendez-vous copié dans le presse-papier !
              </p>
            )}
          </div>

          {/* Pied de carte */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Intervention confirmée</span>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Accéder à l'agenda</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            ) : (
              <a
                href="./"
                className="text-emerald-700 hover:underline font-bold flex items-center gap-1"
              >
                <span>Hub PME</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
