import React, { useEffect, useState, useRef } from 'react';
import {
  Search,
  User,
  Send,
  Calendar,
  Phone,
  Clock,
  Plus,
  Trash2,
  ArrowLeft,
  Info,
  X,
  FileText,
  FileSpreadsheet,
  File,
  Download,
  Paperclip,
  Image as ImageIcon,
  Mic,
  Volume2
} from 'lucide-react';
import { useApp, getApiBaseUrl } from '../context/AppContext';
import { Contact, Message, Memory, Appointment } from '../types';
import { getStoredContacts, saveStoredContacts } from '../data/defaultContacts';

function renderFormattedText(text?: string | null) {
  if (!text || typeof text !== 'string') return null;
  try {
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      const parts = line.split(/(\*[^*]+\*|_[^_]+_)/g);
      return (
        <span key={lIdx} className="block min-h-[1.15em]">
          {parts.map((part, pIdx) => {
            if (part && part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
              return <strong key={pIdx} className="font-bold">{part.slice(1, -1)}</strong>;
            }
            if (part && part.startsWith('_') && part.endsWith('_') && part.length >= 2) {
              return <em key={pIdx} className="italic opacity-90">{part.slice(1, -1)}</em>;
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </span>
      );
    });
  } catch (err) {
    return <span className="whitespace-pre-line">{text}</span>;
  }
}

interface ParsedAppointmentMessage {
  isAppointment: boolean;
  introText: string;
  googleUrl: string | null;
  appleUrl: string | null;
  missionUrl: string | null;
  appointmentId: string | null;
  footerText: string;
}

function parseAppointmentMessage(content?: string | null): ParsedAppointmentMessage | null {
  if (!content || typeof content !== 'string') return null;
  try {

  const isConfirmation =
    content.includes('Confirmation de votre rendez-vous') ||
    content.includes('NOUVEL ORDRE DE MISSION') ||
    (content.includes('Prestation :') && (content.includes('Google Agenda') || content.includes('/api/appointments/')));

  if (!isConfirmation) return null;

  // Extract appointment ID
  const idMatch = content.match(/\/api\/appointments\/(\d+)/i);
  const appointmentId = idMatch ? idMatch[1] : null;

  // Extract Google URL
  const googleMatch =
    content.match(/(https?:\/\/[^\s\n]+(?:\/api\/appointments\/\d+\/google|[^\s\n]*calendar\.google\.com[^\s\n]*))/i) ||
    content.match(/Google Agenda[^\n]*\n?(?:👉\s*)?(https?:\/\/[^\s\n]+)/i);
  const googleUrl = googleMatch ? (googleMatch[1] || googleMatch[0]) : null;

  // Extract Apple URL
  const appleMatch =
    content.match(/(https?:\/\/[^\s\n]+\/api\/appointments\/\d+\/apple)/i) ||
    content.match(/Apple Calendrier[^\n]*\n?(?:👉\s*)?(https?:\/\/[^\s\n]+)/i);
  const appleUrl = appleMatch ? (appleMatch[1] || appleMatch[0]) : null;

  // Extract Collaborator Mission URL if present
  const missionMatch =
    content.match(/(https?:\/\/[^\s\n]+\/api\/appointments\/\d+\/mission)/i) ||
    content.match(/Valider la mission[^\n]*\n?(?:👉\s*)?(https?:\/\/[^\s\n]+)/i);
  const missionUrl = missionMatch ? (missionMatch[1] || missionMatch[0]) : null;

  // Extract intro text (everything before the calendar / mission button section)
  let introText = content;
  const splitPattern = /(?:📲\s*\*?Boutons d'ajout rapide|📲\s*\*?Ajouter à votre agenda|⚡\s*\*?Valider la mission|📅\s*\*?Google Agenda)/i;
  const matchIndex = content.search(splitPattern);

  let footerText = '';
  if (matchIndex !== -1) {
    introText = content.slice(0, matchIndex).trim();

    // Look for closing footer like "Restant à votre entière disposition..." or company signature
    const footerMatch = content.match(/(Restant à votre entière disposition[\s\S]*|_?[A-Z0-9\sÀ-ÿ._-]{3,}Entreprise[^\n]*_?|_Mon Entreprise[^\n]*_?)/i);
    if (footerMatch && footerMatch.index !== undefined && footerMatch.index > matchIndex) {
      footerText = footerMatch[0].trim();
    }
  }

  // Remove any unwanted remnants such as "Ouvrir page client" and raw arrows/links
  introText = introText
    .replace(/🔗\s*\*?Ouvrir page client[^\n]*\n?(?:👉\s*)?[^\n]*/gi, '')
    .replace(/👉\s*https?:\/\/[^\s\n]+/g, '')
    .trim();

  // If footer contains "Ouvrir page client" or links, clean it too
  if (footerText) {
    footerText = footerText
      .replace(/🔗\s*\*?Ouvrir page client[^\n]*\n?(?:👉\s*)?[^\n]*/gi, '')
      .replace(/👉\s*https?:\/\/[^\s\n]+/g, '')
      .trim();
  }

    return {
      isAppointment: true,
      introText,
      googleUrl,
      appleUrl,
      missionUrl,
      appointmentId,
      footerText
    };
  } catch (err) {
    console.error('Erreur parsing rendez-vous message:', err);
    return null;
  }
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getFileBadge(fileName?: string | null, mediaType?: string | null) {
  const name = (fileName || '').toLowerCase();
  if (mediaType === 'pdf' || name.endsWith('.pdf')) {
    return {
      icon: <FileText className="w-5 h-5 text-red-500" />,
      label: 'PDF',
      bgColor: 'bg-red-50 text-red-700 border-red-200'
    };
  }
  if (mediaType === 'spreadsheet' || name.match(/\.(xlsx|xls|csv)$/)) {
    return {
      icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />,
      label: 'EXCEL',
      bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }
  if (mediaType === 'word' || name.match(/\.(docx|doc)$/)) {
    return {
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      label: 'WORD',
      bgColor: 'bg-blue-50 text-blue-700 border-blue-200'
    };
  }
  if (mediaType === 'image' || name.match(/\.(png|jpg|jpeg|webp)$/)) {
    return {
      icon: <ImageIcon className="w-5 h-5 text-purple-600" />,
      label: 'IMAGE',
      bgColor: 'bg-purple-50 text-purple-700 border-purple-200'
    };
  }
  if (mediaType === 'audio' || name.match(/\.(ogg|mp3|m4a|wav)$/)) {
    return {
      icon: <Mic className="w-5 h-5 text-emerald-600" />,
      label: 'VOCAL',
      bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }
  return {
    icon: <File className="w-5 h-5 text-slate-600" />,
    label: 'FICHIER',
    bgColor: 'bg-slate-100 text-slate-700 border-slate-200'
  };
}

export const Conversations: React.FC = () => {
  const {
    selectedContactId,
    setSelectedContactId,
    conversationMobileView: mobileView,
    setConversationMobileView: setMobileView,
    triggerRefresh,
    refreshAll
  } = useApp();
  const [contacts, setContacts] = useState<Contact[]>(() => getStoredContacts());
  const [messages, setMessages] = useState<Message[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [newMemoryKey, setNewMemoryKey] = useState('');
  const [newMemoryValue, setNewMemoryValue] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState('preference');
  const [showAddMemory, setShowAddMemory] = useState(false);

  // Gestion des pièces jointes (Devis, Factures, Excel, PDF...)
  const [selectedFile, setSelectedFile] = useState<{ file: File; base64: string } | null>(null);
  const [fileCaption, setFileCaption] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu déroulant de pièces jointes au clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    if (showAttachMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttachMenu]);

  // Responsive mobile states
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sélection d'un fichier depuis l'explorateur
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      alert('Le fichier sélectionné est trop volumineux (maximum 30 Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedFile({ file, base64 });
      if (inputMessage.trim()) {
        setFileCaption(inputMessage.trim());
        setInputMessage('');
      }
    };
    reader.readAsDataURL(file);
    setShowAttachMenu(false);
    e.target.value = '';
  };

  const triggerFilePicker = (acceptTypes: string = '') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptTypes || '.pdf,.xlsx,.xls,.docx,.doc,.csv,.txt,image/*';
      fileInputRef.current.click();
    }
    setShowAttachMenu(false);
  };

  // Envoi effectif du fichier sélectionné
  const handleSendFile = async () => {
    if (!selectedFile || !currentContact) return;
    setIsUploadingFile(true);
    try {
      const res = await fetch('/api/messages/send-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: currentContact.id,
          phoneNumber: currentContact.phone_number,
          fileName: selectedFile.file.name,
          mimeType: selectedFile.file.type || 'application/octet-stream',
          fileData: selectedFile.base64,
          caption: fileCaption.trim() || undefined
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur lors de l\'envoi du fichier');
      }
      setSelectedFile(null);
      setFileCaption('');
      refreshAll();
    } catch (err: any) {
      console.error('Erreur envoi fichier:', err);
      alert(`Erreur d'envoi : ${err.message}`);
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Charger la liste des contacts
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
          if (!selectedContactId || !data.some(c => c.id === selectedContactId)) {
            setSelectedContactId(data[0].id);
          }
        }
      })
      .catch(err => {
        console.warn('Backend contacts non joignable, utilisation des contacts locaux:', err);
        const stored = getStoredContacts();
        if (Array.isArray(stored) && stored.length > 0) {
          setContacts(stored);
          if (!selectedContactId || !stored.some(c => c.id === selectedContactId)) {
            setSelectedContactId(stored[0].id);
          }
        }
      });
  }, [triggerRefresh]);

  // Si le contact sélectionné n'est pas dans la liste actuelle, basculer sur le premier
  useEffect(() => {
    if (contacts.length > 0) {
      const exists = contacts.some(c => c.id === selectedContactId);
      if (!exists) {
        setSelectedContactId(contacts[0].id);
      }
    }
  }, [contacts, selectedContactId]);

  // Charger les détails du contact sélectionné
  useEffect(() => {
    if (!selectedContactId) return;

    fetch(`/api/contacts/${selectedContactId}/messages`)
      .then(res => res.json())
      .then(data => setMessages(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Erreur messages:', err);
        setMessages([]);
      });

    fetch(`/api/contacts/${selectedContactId}/memories`)
      .then(res => res.json())
      .then(data => setMemories(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Erreur memories:', err);
        setMemories([]);
      });

    fetch(`/api/appointments?contactId=${selectedContactId}`)
      .then(res => res.json())
      .then(data => setAppointments(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Erreur appointments:', err);
        setAppointments([]);
      });
  }, [selectedContactId, triggerRefresh]);

  // Scroll en bas lors de l'arrivée d'un message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const currentContact = contacts.find(c => c.id === selectedContactId);

  // Sécurité mobile : si aucun contact valide n'est sélectionné, rester sur la liste
  useEffect(() => {
    if (!currentContact && mobileView === 'chat') {
      setMobileView('list');
    }
  }, [currentContact, mobileView]);

  // Envoi d'un message manuel
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentContact) return;

    setIsSending(true);
    try {
      await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: currentContact.id,
          phoneNumber: currentContact.phone_number,
          content: inputMessage.trim()
        })
      });
      setInputMessage('');
      refreshAll();
    } catch (err) {
      console.error('Erreur envoi message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Ajout manuel d'une mémoire
  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryKey || !newMemoryValue || !currentContact) return;

    try {
      await fetch(`/api/contacts/${currentContact.id}/memories`, {
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
      setShowAddMemory(false);
      refreshAll();
    } catch (err) {
      console.error('Erreur add memory:', err);
    }
  };

  // Suppression d'une mémoire
  const handleDeleteMemory = async (memId: number) => {
    try {
      await fetch(`/api/memories/${memId}`, { method: 'DELETE' });
      refreshAll();
    } catch (err) {
      console.error('Erreur delete memory:', err);
    }
  };

  const filteredContacts = contacts.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    c.phone_number.includes(search)
  );

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Colonne 1 : Liste des conversations (Masquée sur mobile quand mobileView === 'chat') */}
      <div
        className={`${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 border-r border-slate-200 bg-white flex-col shrink-0`}
      >
        <div className="p-4 border-b border-slate-100 space-y-3">
          <h2 className="font-bold text-slate-800 text-base">Messagerie Directe Client</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher nom ou numéro..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredContacts.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Aucune conversation trouvée.
            </div>
          ) : (
            filteredContacts.map(contact => {
              const isSelected = contact.id === selectedContactId;
              return (
                <button
                  key={contact.id}
                  onClick={() => {
                    setSelectedContactId(contact.id);
                    setMobileView('chat');
                  }}
                  className={`w-full p-3 text-left flex items-start gap-3 transition ${
                    isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-500' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                    {contact.name ? contact.name.slice(0, 2).toUpperCase() : <User className="w-5 h-5 text-slate-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs text-slate-800 truncate">
                        {contact.name || contact.phone_number}
                      </p>
                      {contact.last_message_time && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(contact.last_message_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {contact.last_message || 'Nouvelle conversation'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Colonne 2 : Fenêtre de discussion (Masquée sur mobile quand mobileView === 'list') */}
      <div
        className={`${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        } flex-1 flex-col bg-slate-50 min-w-0 h-full animate-in fade-in slide-in-from-right-3 duration-150`}
      >
        {currentContact ? (
          <>
            {/* Header du Chat */}
            <div className="px-4 sm:px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Bouton retour vers liste sur mobile */}
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  title="Retour à la liste"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                  {currentContact.name ? currentContact.name.slice(0, 2).toUpperCase() : <User className="w-4 h-4" />}
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                    {currentContact.name || 'Client sans nom'}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">{currentContact.phone_number}</p>
                </div>
              </div>

              {/* Bouton pour afficher la fiche client en tiroir sur mobile / tablette */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowMobileDrawer(!showMobileDrawer)}
                  className="xl:hidden p-2 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition"
                  title="Voir fiche client et notes"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  Aucun message pour le moment dans cette conversation.
                </div>
              ) : (
                messages.map((m) => {
                  const isClient = m.direction === 'inbound';
                  const isAudio = m.media_type === 'audio' || Boolean(m.file_name?.match(/\.(ogg|mp3|m4a|wav)$/));
                  const hasAttachment = !isAudio && Boolean(m.file_name || m.media_url || (m.content && m.content.includes('[📎 ')));
                  const badge = getFileBadge(m.file_name, m.media_type);

                  const displayContent = m.content
                    ? m.content
                        .replace(/\[(📎|📷)[^\]]+\]/g, '')
                        .replace(/\[🎙️ (Vocal|Message vocal)[^\]]*\]/g, '')
                        .trim()
                    : '';

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                        {isClient ? (
                          <span>Client</span>
                        ) : (
                          <span className="text-blue-600 font-medium flex items-center gap-1">
                            <User className="w-3 h-3" /> Vous / Entreprise
                          </span>
                        )}
                        <span>•</span>
                        <span>{new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-lg p-3 sm:p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          isClient
                            ? 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                            : 'bg-blue-600 text-white rounded-tr-none'
                        }`}
                      >
                        {/* Lecteur Audio pour message vocal */}
                        {isAudio && m.media_url && (
                          <div className={`mb-2 p-2.5 rounded-xl border ${
                            isClient ? 'bg-slate-50 border-slate-200' : 'bg-white/15 border-white/20 text-white'
                          }`}>
                            <div className={`flex items-center gap-1.5 mb-2 text-[11px] font-semibold ${
                              isClient ? 'text-slate-800' : 'text-white'
                            }`}>
                              <Volume2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>Message vocal</span>
                              {m.file_size ? (
                                <span className={`ml-auto text-[10px] font-normal ${isClient ? 'text-slate-400' : 'text-white/70'}`}>
                                  {formatBytes(m.file_size)}
                                </span>
                              ) : null}
                            </div>
                            <audio
                              controls
                              src={m.media_url}
                              className="w-full h-8 rounded max-w-full outline-hidden"
                              preload="metadata"
                            />
                          </div>
                        )}

                        {/* Retranscription du message vocal */}
                        {m.transcription && (
                          <div className={`mb-2 p-2.5 rounded-xl border text-xs leading-relaxed ${
                            isClient
                              ? 'bg-slate-50 border-slate-200 text-slate-800'
                              : 'bg-white/15 border-white/20 text-white'
                          }`}>
                            <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                              <span>Transcription</span>
                            </div>
                            <p className="italic">"{m.transcription}"</p>
                          </div>
                        )}

                        {/* Carte de pièce jointe (Devis, Facture, Excel, PDF, etc.) */}
                        {hasAttachment && (
                          <div className={`mb-2 p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                            isClient ? 'bg-slate-50 border-slate-200' : 'bg-white/15 border-white/20 text-white'
                          }`}>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${
                                isClient ? badge.bgColor : 'bg-white text-slate-800 border-white/40'
                              }`}>
                                {badge.icon}
                              </div>
                              <div className="min-w-0">
                                <p className={`font-bold text-xs truncate ${isClient ? 'text-slate-800' : 'text-white'}`}>
                                  {m.file_name || 'Document joint'}
                                </p>
                                <p className={`text-[10px] ${isClient ? 'text-slate-400' : 'text-white/80'}`}>
                                  <span className="font-semibold uppercase mr-1.5">{badge.label}</span>
                                  {m.file_size ? formatBytes(m.file_size) : ''}
                                </p>
                              </div>
                            </div>

                            {m.media_url ? (
                              <a
                                href={m.media_url}
                                download={m.file_name || 'document'}
                                target="_blank"
                                rel="noreferrer"
                                className={`p-2 rounded-lg transition shrink-0 flex items-center gap-1 text-xs font-semibold ${
                                  isClient
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                    : 'bg-white/20 hover:bg-white/30 text-white'
                                }`}
                                title="Télécharger / Ouvrir le fichier"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Ouvrir</span>
                              </a>
                            ) : (
                              <span className="text-[10px] opacity-75 italic shrink-0">Direct</span>
                            )}
                          </div>
                        )}

                        {(() => {
                          const parsedApt = parseAppointmentMessage(displayContent || m.content);
                          const apiBase = getApiBaseUrl();

                          if (parsedApt) {
                            return (
                              <div className="space-y-2.5">
                                <div>{renderFormattedText(parsedApt.introText)}</div>

                                {/* Boutons d'ajout rapide cliquables style Agenda */}
                                <div className="p-3 bg-white text-slate-800 rounded-xl shadow-xs border border-slate-200/90 space-y-2">
                                  <p className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                                    📲 Boutons d'ajout rapide (cliquables) :
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {parsedApt.missionUrl && (
                                      <a
                                        href={
                                          apiBase && parsedApt.appointmentId
                                            ? `${apiBase}/api/appointments/${parsedApt.appointmentId}/mission`
                                            : parsedApt.missionUrl
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition flex items-center gap-1 no-underline"
                                      >
                                        ⚡ Valider la mission
                                      </a>
                                    )}
                                    {(parsedApt.googleUrl || parsedApt.appointmentId) && (
                                      <a
                                        href={
                                          apiBase && parsedApt.appointmentId
                                            ? `${apiBase}/api/appointments/${parsedApt.appointmentId}/google`
                                            : parsedApt.googleUrl || `/api/appointments/${parsedApt.appointmentId}/google`
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition flex items-center gap-1 no-underline"
                                      >
                                        📅 Google Agenda
                                      </a>
                                    )}
                                    {(parsedApt.appleUrl || parsedApt.appointmentId) && (
                                      <a
                                        href={
                                          apiBase && parsedApt.appointmentId
                                            ? `${apiBase}/api/appointments/${parsedApt.appointmentId}/apple`
                                            : parsedApt.appleUrl || `/api/appointments/${parsedApt.appointmentId}/apple`
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={parsedApt.appointmentId ? `intervention-${parsedApt.appointmentId}.ics` : 'intervention.ics'}
                                        className="px-2.5 py-1.5 bg-black hover:bg-neutral-800 text-white font-bold text-[11px] rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer no-underline"
                                      >
                                        🍏 Apple Calendrier (.ics)
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {parsedApt.footerText && (
                                  <div className="text-[11px] opacity-90 pt-0.5">
                                    {renderFormattedText(parsedApt.footerText)}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          if (displayContent && (!m.transcription || displayContent !== m.transcription)) {
                            return <div>{renderFormattedText(displayContent) || <p className="whitespace-pre-line">{displayContent}</p>}</div>;
                          }
                          if (!hasAttachment && !isAudio && !m.transcription) {
                            return <div>{renderFormattedText(m.content) || <p className="whitespace-pre-line">{m.content}</p>}</div>;
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Tiroir d'aperçu d'un fichier sélectionné (Devis, Facture, Excel, etc.) */}
            {selectedFile && (
              <div className="p-3 bg-slate-100/90 border-t border-slate-200">
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs mb-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    {(() => {
                      const badge = getFileBadge(selectedFile.file.name);
                      return (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${badge.bgColor}`}>
                          {badge.icon}
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const badge = getFileBadge(selectedFile.file.name);
                          return (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${badge.bgColor}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                        <span className="text-[11px] text-slate-500 font-medium">
                          {formatBytes(selectedFile.file.size)}
                        </span>
                      </div>
                      <p className="font-semibold text-xs text-slate-800 truncate mt-0.5">
                        {selectedFile.file.name}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setFileCaption(''); }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    title="Retirer ce fichier"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modèles de messages d'accompagnement pour devis/factures */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                  <span className="text-[10px] font-semibold text-slate-500 mr-1">Raccourcis message :</span>
                  <button
                    type="button"
                    onClick={() => setFileCaption('Bonjour, veuillez trouver ci-joint votre devis. Restant à votre entière disposition.')}
                    className="text-[10px] px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 rounded-lg transition font-medium"
                  >
                    📄 Devis
                  </button>
                  <button
                    type="button"
                    onClick={() => setFileCaption('Bonjour, veuillez trouver ci-joint votre facture. Merci pour votre confiance !')}
                    className="text-[10px] px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 rounded-lg transition font-medium"
                  >
                    🧾 Facture
                  </button>
                  <button
                    type="button"
                    onClick={() => setFileCaption('Bonjour, veuillez trouver ci-joint le document convenu.')}
                    className="text-[10px] px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 rounded-lg transition font-medium"
                  >
                    📋 Document convenu
                  </button>
                </div>

                {/* Champ texte d'accompagnement + Bouton d'envoi du fichier */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={fileCaption}
                    onChange={e => setFileCaption(e.target.value)}
                    placeholder="Légende ou message d'accompagnement (ex: Voici votre devis)..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleSendFile}
                    disabled={isUploadingFile}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 shrink-0 shadow-xs"
                  >
                    {isUploadingFile ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Envoi...
                      </span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Envoyer le fichier</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Zone d'envoi de message texte avec bouton "+" pour joindre des fichiers */}
            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2 sm:gap-3 relative">
              {/* Bouton "+" pour pièces jointes */}
              <div className="relative" ref={attachMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className={`p-2 sm:p-2.5 rounded-xl border transition flex items-center justify-center ${
                    showAttachMenu
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                  title="Joindre un fichier (Devis PDF, Facture, Tableur Excel...)"
                >
                  <Plus className={`w-4 h-4 transition-transform duration-200 ${showAttachMenu ? 'rotate-45 text-emerald-600' : ''}`} />
                </button>

                {/* Menu déroulant des formats de fichiers */}
                {showAttachMenu && (
                  <div className="absolute bottom-12 left-0 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Transmettre un document
                    </p>
                    <button
                      type="button"
                      onClick={() => triggerFilePicker('.pdf')}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-red-50 text-slate-700 hover:text-red-700 transition"
                    >
                      <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs">Devis ou Facture</p>
                        <p className="text-[10px] text-slate-400">Format PDF (.pdf)</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerFilePicker('.xlsx,.xls,.csv')}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs">Tableur Excel</p>
                        <p className="text-[10px] text-slate-400">Excel, CSV (.xlsx, .csv)</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerFilePicker('.docx,.doc,.txt')}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <File className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs">Document Word ou Texte</p>
                        <p className="text-[10px] text-slate-400">Word, Texte (.docx, .txt)</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerFilePicker('image/*')}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-purple-50 text-slate-700 hover:text-purple-700 transition"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs">Photo ou Image</p>
                        <p className="text-[10px] text-slate-400">PNG, JPG, WEBP</p>
                      </div>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={() => triggerFilePicker('*')}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-slate-50 text-slate-600 transition"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <span className="text-xs">Tous les formats...</span>
                    </button>
                  </div>
                )}

                {/* Input natif masqué */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <input
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder="Écrire un message au client..."
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isSending || !inputMessage.trim()}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Envoyer</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm p-6 text-center">
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden mb-4 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-2 cursor-pointer transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voir la liste des conversations</span>
            </button>
            <p className="text-xs text-slate-500">Sélectionnez une conversation pour commencer</p>
          </div>
        )}
      </div>

      {/* Colonne 3 : Fiche Client & Mémoire (Visible en colonne sur grand écran XL, ou en drawer mobile/tablette) */}
      {currentContact && (
        <div
          className={`${
            showMobileDrawer ? 'fixed inset-0 z-50 flex justify-end bg-slate-900/40' : 'hidden xl:flex'
          } xl:static xl:w-80 border-l border-slate-200 bg-white flex-col shrink-0 overflow-y-auto p-5 space-y-6`}
        >
          {showMobileDrawer && (
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 xl:hidden">
              <span className="font-bold text-sm text-slate-900">Fiche Client & Mémoire</span>
              <button onClick={() => setShowMobileDrawer(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">Fiche Client</h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <User className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">{currentContact.name || 'Nom non précisé'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{currentContact.phone_number}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Inscrit le {new Date(currentContact.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          </div>

          {/* Notes & Fiche Client */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Notes & Fiche Client ({memories.length})</span>
              </div>
              <button
                onClick={() => setShowAddMemory(!showAddMemory)}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>

            {showAddMemory && (
              <form onSubmit={handleAddMemory} className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2 mb-3 text-xs">
                <select
                  value={newMemoryCategory}
                  onChange={e => setNewMemoryCategory(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                >
                  <option value="preference">Préférence</option>
                  <option value="project">Projet</option>
                  <option value="budget">Budget</option>
                  <option value="need">Besoin</option>
                  <option value="general">Général</option>
                </select>
                <input
                  type="text"
                  placeholder="Clé (ex: budget_max, accès digicode...)"
                  value={newMemoryKey}
                  onChange={e => setNewMemoryKey(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                />
                <input
                  type="text"
                  placeholder="Valeur (ex: 5000€ HT, Code porte 48A9...)"
                  value={newMemoryValue}
                  onChange={e => setNewMemoryValue(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                />
                <div className="flex justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddMemory(false)}
                    className="px-2 py-1 text-slate-500 hover:bg-slate-100 rounded text-[11px]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-medium"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            )}

            {memories.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl">
                Aucune note ou préférence enregistrée pour ce client.
              </p>
            ) : (
              <div className="space-y-2">
                {memories.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between text-xs group"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                        {mem.category}
                      </span>
                      <p className="font-semibold text-slate-800 mt-1">{mem.key}</p>
                      <p className="text-slate-600 mt-0.5 text-[11px]">{mem.value}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteMemory(mem.id)}
                      className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition p-1"
                      title="Supprimer ce fait mémorisé"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rendez-vous du client */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Rendez-vous ({appointments.length})</span>
            </h4>
            {appointments.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl">
                Aucun rendez-vous avec ce client.
              </p>
            ) : (
              <div className="space-y-2">
                {appointments.map(apt => (
                  <div key={apt.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-1">
                    <p className="font-semibold text-slate-800">{apt.title}</p>
                    <p className="text-slate-500 text-[11px]">
                      {apt.date} de {apt.start_time} à {apt.end_time}
                    </p>
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                      {apt.team_member_name || 'Équipe'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
