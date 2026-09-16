import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Building,
  Save,
  CheckCircle2,
  Sparkles,
  Wrench,
  Users,
  Clock,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  X,
  Phone,
  Mail,
  Wand2,
  FolderPlus,
  ArrowRight,
  Search,
  Check,
  LayoutGrid,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CompanySettings, Service, TeamMember, IndustryPresetSummary } from '../types';
import { INDUSTRY_PRESETS, IndustryPreset, generateCustomTradeConfig } from '../data/industryPresets';
import { formatPhoneNumber, handlePhoneInputChange } from '../utils/phone';

const DEFAULT_PRESET_SUMMARIES: IndustryPresetSummary[] = Object.values(INDUSTRY_PRESETS).map(p => ({
  id: p.id,
  name: p.name,
  shortName: p.shortName,
  sector: p.sector,
  badgeEmoji: p.badgeEmoji,
  description: p.description,
  servicesCount: p.services.length,
  teamCount: p.teamMembers.length,
  previewServices: p.services.slice(0, 3).map(s => `${s.name} (${s.duration_minutes} min)`),
  companyActivity: p.company.activity
}));

export const Settings: React.FC = () => {
  const { refreshAll } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'company' | 'services' | 'team'>('company');

  // Company Settings
  const [company, setCompany] = useState<CompanySettings>({
    name: 'Artisan Plomberie Chauffage & Énergies',
    activity: 'Plomberie, Pompes à Chaleur, Poêles à Granulés, Cuisinières & Ramonage',
    phone: '+33 6 07 72 00 18',
    email: 'contact@artisan-plomberie-energies.fr',
    address: 'Zone Artisanale des Métiers, 75012 Paris',
    website: 'https://artisan-plomberie-energies.fr',
    description: 'Entreprise artisanale qualifiée RGE & QualiBois / QualiPAC. Spécialistes certifiés de l\'installation et du dépannage de pompes à chaleur (PAC Air/Eau et Air/Air), pose et entretien de cuisinières à bois traditionnelles et poêles à granulés, ramonage certifié assurance et dépannage plomberie d\'urgence 24/7.'
  });


  // Services / Interventions
  const [services, setServices] = useState<Service[]>([]);
  const [serviceFilterCategory, setServiceFilterCategory] = useState<string>('all');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);

  // Custom Categories
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Team / Postes
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Partial<TeamMember> | null>(null);

  // Presets & Multi-industry (pré-rempli par défaut pour être 100% disponible hors-ligne et en ligne)
  const [presets, setPresets] = useState<IndustryPresetSummary[]>(DEFAULT_PRESET_SUMMARIES);
  const [isPresetGalleryOpen, setIsPresetGalleryOpen] = useState(false);
  const [presetSearch, setPresetSearch] = useState('');
  const [presetSectorFilter, setPresetSectorFilter] = useState('all');
  const [selectedPresetForPreview, setSelectedPresetForPreview] = useState<any | null>(null);

  // Custom Trade Generator Modal
  const [isCustomGeneratorOpen, setIsCustomGeneratorOpen] = useState(false);
  const [customTradeName, setCustomTradeName] = useState('');
  const [customTradeDesc, setCustomTradeDesc] = useState('');
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

  // Status & Feedback
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [isApplyingPreset, setIsApplyingPreset] = useState(false);

  const loadAllData = () => {
    // 1. Profil Entreprise
    fetch('/api/settings/company')
      .then(res => {
        if (!res.ok) throw new Error('API non dispo');
        return res.json();
      })
      .then(data => {
        if (data.name) {
          setCompany(data);
          localStorage.setItem('pme_company_settings', JSON.stringify(data));
        }
      })
      .catch(() => {
        const saved = localStorage.getItem('pme_company_settings');
        if (saved) {
          try { setCompany(JSON.parse(saved)); } catch (e) {}
        }
      });

    // 2. Prestations / Services
    fetch('/api/services')
      .then(res => {
        if (!res.ok) throw new Error('API non dispo');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setServices(data);
          localStorage.setItem('pme_services_catalog', JSON.stringify(data));
        }
      })
      .catch(() => {
        const saved = localStorage.getItem('pme_services_catalog');
        if (saved) {
          try { setServices(JSON.parse(saved)); } catch (e) {}
        } else {
          // Prestations par défaut issues du catalogue Plomberie
          const defServices = INDUSTRY_PRESETS.plumber.services.map((s, idx) => ({
            id: idx + 1,
            name: s.name,
            category: s.category,
            duration_minutes: s.duration_minutes,
            price: s.price,
            description: s.description,
            is_active: 1
          }));
          setServices(defServices);
          localStorage.setItem('pme_services_catalog', JSON.stringify(defServices));
        }
      });

    // 4. Équipe / Collaborateurs
    fetch('/api/team')
      .then(res => {
        if (!res.ok) throw new Error('API non dispo');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setTeamMembers(data);
          localStorage.setItem('pme_team_members', JSON.stringify(data));
        }
      })
      .catch(() => {
        const saved = localStorage.getItem('pme_team_members');
        if (saved) {
          try { setTeamMembers(JSON.parse(saved)); } catch (e) {}
        } else {
          // Équipe par défaut
          const defTeam = INDUSTRY_PRESETS.plumber.teamMembers.map((m, idx) => ({
            id: idx + 1,
            name: m.name,
            role: m.role,
            email: m.email,
            phone: m.phone,
            color: m.color,
            avatar: null,
            specialties: m.specialties,
            working_hours: {},
            status: 'active' as const,
            is_active: 1,
            created_at: new Date().toISOString()
          }));
          setTeamMembers(defTeam);
          localStorage.setItem('pme_team_members', JSON.stringify(defTeam));
        }
      });

    // 5. Catalogue des Modèles d'Entreprise
    fetch('/api/presets')
      .then(res => {
        if (!res.ok) throw new Error('API non dispo');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setPresets(data);
      })
      .catch(() => {
        setPresets(DEFAULT_PRESET_SUMMARIES);
      });
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const triggerNotification = (msg: string = 'Paramètres enregistrés avec succès !') => {
    setSavedSuccess(msg);
    refreshAll();
    setTimeout(() => setSavedSuccess(null), 3500);
  };

  // Enregistrer le profil entreprise
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedCompany = {
      ...company,
      phone: formatPhoneNumber(company.phone)
    };
    setCompany(updatedCompany);
    try {
      await fetch('/api/settings/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCompany)
      });
    } catch (err) {
      console.log('Enregistrement local');
    }
    localStorage.setItem('pme_company_settings', JSON.stringify(updatedCompany));
    triggerNotification('Profil entreprise mis à jour');
  };

  // Appliquer un modèle sectoriel parmi les disponibles
  const handleApplyPreset = async (presetId: string, presetName: string) => {
    if (!confirm(`Voulez-vous activer le modèle "${presetName}" ? Cela mettra à jour le profil de votre entreprise, vos interventions types avec leurs durées et vos postes collaborateurs.`)) {
      return;
    }

    setIsApplyingPreset(true);
    const targetPreset = INDUSTRY_PRESETS[presetId];

    // 1. Tenter la mise à jour via l'API si le backend local est présent
    try {
      await fetch(`/api/presets/${presetId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replaceServices: true })
      });
    } catch (err) {
      console.log('Application locale (mode en ligne / PWA)...');
    }

    // 2. Application instantanée dans le state et dans le stockage local
    if (targetPreset) {
      // Profil Entreprise
      setCompany(targetPreset.company);
      localStorage.setItem('pme_company_settings', JSON.stringify(targetPreset.company));

      // Prestations
      const newServices = targetPreset.services.map((s, idx) => ({
        id: idx + 1,
        name: s.name,
        category: s.category,
        duration_minutes: s.duration_minutes,
        price: s.price,
        description: s.description,
        is_active: 1
      }));
      setServices(newServices);
      localStorage.setItem('pme_services_catalog', JSON.stringify(newServices));

      // Équipe
      const newTeam = targetPreset.teamMembers.map((m, idx) => ({
        id: idx + 1,
        name: m.name,
        role: m.role,
        email: m.email,
        phone: m.phone,
        color: m.color,
        avatar: null,
        specialties: m.specialties,
        working_hours: {},
        status: 'active' as const,
        is_active: 1,
        created_at: new Date().toISOString()
      }));
      setTeamMembers(newTeam);
      localStorage.setItem('pme_team_members', JSON.stringify(newTeam));
    }

    setIsApplyingPreset(false);
    setIsPresetGalleryOpen(false);
    triggerNotification(`✨ Modèle "${presetName}" activé avec succès !`);
  };

  // Générateur intelligent pour métier sur-mesure
  const handleGenerateCustomTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTradeName.trim()) return;

    setIsGeneratingCustom(true);
    const customConfig = generateCustomTradeConfig(customTradeName.trim(), customTradeDesc.trim());

    try {
      await fetch('/api/presets/generate-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeName: customTradeName.trim(),
          tradeDescription: customTradeDesc.trim(),
          applyImmediately: true
        })
      });
    } catch (e) {}

    // Application locale instantanée
    setCompany(customConfig.company);
    localStorage.setItem('pme_company_settings', JSON.stringify(customConfig.company));

    const newServices = customConfig.services.map((s, idx) => ({
      id: idx + 1,
      name: s.name,
      category: s.category,
      duration_minutes: s.duration_minutes,
      price: s.price,
      description: s.description,
      is_active: 1
    }));
    setServices(newServices);
    localStorage.setItem('pme_services_catalog', JSON.stringify(newServices));

    const newTeam = customConfig.teamMembers.map((m, idx) => ({
      id: idx + 1,
      name: m.name,
      role: m.role,
      email: m.email,
      phone: m.phone,
      color: m.color,
      avatar: null,
      specialties: m.specialties,
      working_hours: {},
      status: 'active' as const,
      is_active: 1,
      created_at: new Date().toISOString()
    }));
    setTeamMembers(newTeam);
    localStorage.setItem('pme_team_members', JSON.stringify(newTeam));

    setIsGeneratingCustom(false);
    setIsCustomGeneratorOpen(false);
    setCustomTradeName('');
    setCustomTradeDesc('');
    triggerNotification(`✨ Métier "${customTradeName}" généré et appliqué avec succès !`);
  };

  // Vider tout le catalogue pour repartir de zéro (base vierge)
  const handleClearAllServices = async () => {
    if (!confirm('Voulez-vous supprimer toutes les interventions du catalogue pour repartir d\'une base vierge ? Vous pourrez ensuite créer vos propres prestations une à une.')) {
      return;
    }

    try {
      await fetch('/api/services/clear-all', { method: 'POST' });
      setServices([]);
      triggerNotification('Catalogue vidé : vous pouvez créer vos prestations sur-mesure');
    } catch (err) {
      console.error('Erreur clear services:', err);
    }
  };

  // Ajouter une catégorie personnalisée
  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryInput.trim()) return;
    const cat = newCategoryInput.trim();
    if (!customCategories.includes(cat)) {
      setCustomCategories([...customCategories, cat]);
    }
    setServiceFilterCategory(cat);
    if (editingService) {
      setEditingService({ ...editingService, category: cat });
    }
    setNewCategoryInput('');
    setIsNewCategoryModalOpen(false);
    triggerNotification(`Catégorie "${cat}" ajoutée`);
  };


  // Sauvegarder ou créer une intervention
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService || !editingService.name) return;

    try {
      if (editingService.id) {
        // Update
        await fetch(`/api/services/${editingService.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingService)
        });
        triggerNotification('Intervention modifiée');
      } else {
        // Create
        await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingService)
        });
        triggerNotification('Nouvelle intervention ajoutée');
      }

      setIsServiceModalOpen(false);
      setEditingService(null);
      fetch('/api/services').then(r => r.json()).then(setServices);
    } catch (err) {
      console.error('Erreur save service:', err);
    }
  };

  // Supprimer une intervention
  const handleDeleteService = async (id: number, name: string) => {
    if (!confirm(`Confirmez-vous la suppression de l'intervention "${name}" ?`)) return;
    try {
      await fetch(`/api/services/${id}`, { method: 'DELETE' });
      setServices(services.filter(s => s.id !== id));
      triggerNotification('Intervention supprimée');
    } catch (err) {
      console.error('Erreur delete service:', err);
    }
  };

  // Sauvegarder ou créer un collaborateur / poste
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editingMember.name || !editingMember.role) return;

    try {
      if (editingMember.id) {
        // Update
        await fetch(`/api/team/${editingMember.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingMember)
        });
        triggerNotification('Poste / Collaborateur mis à jour');
      } else {
        // Create
        await fetch('/api/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editingMember.name,
            role: editingMember.role,
            email: editingMember.email || null,
            phone: editingMember.phone || null,
            color: editingMember.color || '#0284c7',
            specialties: editingMember.specialties || ['Plomberie'],
            working_hours: {
              monday: { enabled: true, slots: [{ start: '08:00', end: '12:30' }, { start: '13:30', end: '18:00' }] },
              tuesday: { enabled: true, slots: [{ start: '08:00', end: '12:30' }, { start: '13:30', end: '18:00' }] },
              wednesday: { enabled: true, slots: [{ start: '08:00', end: '12:30' }, { start: '13:30', end: '18:00' }] },
              thursday: { enabled: true, slots: [{ start: '08:00', end: '12:30' }, { start: '13:30', end: '18:00' }] },
              friday: { enabled: true, slots: [{ start: '08:00', end: '12:30' }, { start: '13:30', end: '17:30' }] },
              saturday: { enabled: false, slots: [] },
              sunday: { enabled: false, slots: [] }
            },
            is_active: 1
          })
        });
        triggerNotification('Nouveau poste / collaborateur ajouté');
      }

      setIsTeamModalOpen(false);
      setEditingMember(null);
      fetch('/api/team').then(r => r.json()).then(setTeamMembers);
    } catch (err) {
      console.error('Erreur save member:', err);
    }
  };

  // Supprimer un collaborateur
  const handleDeleteMember = async (id: number, name: string) => {
    if (!confirm(`Supprimer le collaborateur "${name}" ?`)) return;
    try {
      await fetch(`/api/team/${id}`, { method: 'DELETE' });
      setTeamMembers(teamMembers.filter(m => m.id !== id));
      triggerNotification('Collaborateur supprimé');
    } catch (err) {
      console.error('Erreur delete member:', err);
    }
  };

  // Durée formatée
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
  };

  // Catégories uniques pour les services
  const serviceCategories = Array.from(new Set(services.map(s => s.category || 'Général')));

  const filteredServices = serviceFilterCategory === 'all'
    ? services
    : services.filter(s => (s.category || 'Général') === serviceFilterCategory);

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-4 sm:space-y-6 overflow-y-auto h-full pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <SettingsIcon className="w-6 h-6 text-emerald-600" />
            Paramètres & Configuration Entreprise
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Gérez votre profil entreprise, vos postes métiers, vos prestations et paramètres d'agenda.
          </p>
        </div>

        {savedSuccess && (
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shadow-sm animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            {savedSuccess}
          </span>
        )}
      </div>

      {/* Universal Multi-Trade & Industry Presets Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-indigo-900/40 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-[10px] uppercase tracking-wider font-extrabold text-indigo-200 border border-indigo-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Plateforme Multi-Métiers & Universelle
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                Activité actuelle : {company.activity || 'Non définie'}
              </span>
            </div>
            <h3 className="font-extrabold text-lg text-white">
              Configurez l'application pour n'importe quel métier ou secteur d'activité
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Plomberie, électricité, serrurerie, climatisation, rénovation, paysagisme, garage, soins/beauté, nettoyage ou profession libérale : activez un modèle sectoriel clé en main ou générez instantanément vos interventions et durées sur-mesure !
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
            <button
              onClick={() => setIsPresetGalleryOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <LayoutGrid className="w-4 h-4 text-indigo-200" />
              Catalogue de Modèles ({presets.length || 10} métiers)
            </button>

            <button
              onClick={() => setIsCustomGeneratorOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Wand2 className="w-4 h-4 text-amber-300" />
              Générateur Métier Sur-Mesure
            </button>
          </div>
        </div>
      </div>


      {/* Navigation SubTabs */}
      <div className="flex gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('company')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'company'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          🏢 Profil Entreprise
        </button>

        <button
          onClick={() => setActiveSubTab('services')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'services'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4" />
          🛠️ Interventions & Durées ({services.length})
        </button>

        <button
          onClick={() => setActiveSubTab('team')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'team'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          👥 Postes & Métiers ({teamMembers.length})
        </button>
      </div>

      {/* SUBTAB 1 : Profil Entreprise */}
      {activeSubTab === 'company' && (
        <form onSubmit={handleSaveCompany} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Informations Générales de l'Établissement</h3>
              <p className="text-slate-400 text-[11px]">Ces coordonnées sont partagées avec vos clients et l'agenda en ligne.</p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">* Champs requis</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nom de l'entreprise *</label>
              <input
                type="text"
                required
                value={company.name}
                onChange={e => setCompany({ ...company, name: e.target.value })}
                placeholder="Ex: Artisan Plomberie & Chauffage Martin"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Activité / Métier principal *</label>
              <input
                type="text"
                required
                value={company.activity}
                onChange={e => setCompany({ ...company, activity: e.target.value })}
                placeholder="Ex: Plomberie, Pompes à Chaleur, Poêles à Granulés, Cuisinières & Ramonage"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Téléphone d'accueil * <span className="text-[10px] text-emerald-600 font-normal">(format auto +33...)</span>
              </label>
              <input
                type="tel"
                required
                value={company.phone}
                onChange={e => setCompany({ ...company, phone: handlePhoneInputChange(e.target.value) })}
                onBlur={e => setCompany({ ...company, phone: formatPhoneNumber(e.target.value) })}
                placeholder="Ex: 0323456776 ou +33 3 23 45 67 76"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Email professionnel</label>
              <input
                type="email"
                value={company.email}
                onChange={e => setCompany({ ...company, email: e.target.value })}
                placeholder="contact@artisan-plomberie.fr"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Site Web</label>
              <input
                type="text"
                value={company.website}
                onChange={e => setCompany({ ...company, website: e.target.value })}
                placeholder="https://artisan-plomberie.fr"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Adresse de l'atelier / Bureau</label>
            <input
              type="text"
              value={company.address}
              onChange={e => setCompany({ ...company, address: e.target.value })}
              placeholder="Ex: Zone Artisanale des Métiers, 75012 Paris"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700">
                Présentation détaillée & Qualifications de l'établissement
              </label>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                Certifications RGE, QualiBois, QualiPAC
              </span>
            </div>
            <textarea
              rows={4}
              value={company.description}
              onChange={e => setCompany({ ...company, description: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
              placeholder="Décrivez vos spécialités, labels et conditions d'intervention..."
            ></textarea>
            <p className="text-[11px] text-slate-400 mt-1">
              Texte de présentation de l'entreprise visible pour vos devis, ordres de mission et fiches d'intervention.
            </p>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Enregistrer le profil entreprise
            </button>
          </div>
        </form>
      )}

      {/* SUBTAB 2 : Catalogue d'Interventions & Durées */}
      {activeSubTab === 'services' && (
        <div className="space-y-4 text-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="font-bold text-slate-700 flex-shrink-0">Catégories :</span>
              <button
                onClick={() => setServiceFilterCategory('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  serviceFilterCategory === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Toutes ({services.length})
              </button>
              {Array.from(new Set([...serviceCategories, ...customCategories])).map(cat => (
                <button
                  key={cat}
                  onClick={() => setServiceFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap cursor-pointer ${
                    serviceFilterCategory === cat
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <button
                onClick={() => setIsNewCategoryModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition whitespace-nowrap cursor-pointer"
                title="Créer une nouvelle catégorie pour votre activité"
              >
                <Plus className="w-3.5 h-3.5" />
                Catégorie
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsPresetGalleryOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold rounded-xl transition cursor-pointer"
                title="Parcourir les modèles sectoriels"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Modèles Métiers
              </button>

              <button
                onClick={handleClearAllServices}
                className="flex items-center gap-1 px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-xl transition cursor-pointer"
                title="Vider les interventions pour repartir de zéro"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Base Vierge
              </button>

              <button
                onClick={() => {
                  setEditingService({
                    name: '',
                    category: serviceFilterCategory !== 'all' ? serviceFilterCategory : (serviceCategories[0] || 'Prestations Principales'),
                    duration_minutes: 60,
                    price: 0,
                    description: '',
                    is_active: 1
                  });
                  setIsServiceModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nouvelle Intervention
              </button>
            </div>
          </div>


          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map(service => {
              let catBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
              if (service.category?.includes('Pompe') || service.category?.includes('Chauffage')) {
                catBadgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
              } else if (service.category?.includes('Bois') || service.category?.includes('Granulés')) {
                catBadgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
              } else if (service.category?.includes('Ramonage') || service.category?.includes('Fumisterie')) {
                catBadgeColor = 'bg-stone-100 text-stone-800 border-stone-300';
              } else if (service.category?.includes('Plomberie')) {
                catBadgeColor = 'bg-teal-50 text-teal-800 border-teal-200';
              } else if (service.category?.includes('Devis')) {
                catBadgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
              }

              return (
                <div
                  key={service.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${catBadgeColor}`}>
                        {service.category || 'Général'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingService(service);
                            setIsServiceModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id, service.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm leading-snug">
                      {service.name}
                    </h4>

                    {service.description && (
                      <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-3">
                        {service.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-slate-600 font-semibold">
                    <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDuration(service.duration_minutes)}</span>
                    </div>

                    <div className="font-bold text-slate-800">
                      {service.price > 0 ? (
                        <span className="flex items-center gap-0.5 text-slate-900">
                          {service.price} € <span className="text-[10px] font-normal text-slate-400">TTC</span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold">Sur devis / Gratuit</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredServices.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400 space-y-2">
              <p>Aucune intervention trouvée dans cette catégorie.</p>
              <button
                onClick={handleSeedPlumberServices}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold inline-flex items-center gap-2 text-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Charger le catalogue Plomberie / PAC (11 prestations)
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3 : Postes & Métiers */}
      {activeSubTab === 'team' && (
        <div className="space-y-4 text-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Postes, Métiers & Collaborateurs Spécialisés</h3>
              <p className="text-slate-400 text-[11px]">
                Définissez les rôles de votre équipe (plombier, ramoneur certifié, chauffagiste PAC) pour orienter automatiquement les créneaux dans l'agenda.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingMember({
                  name: '',
                  role: '',
                  email: '',
                  phone: '',
                  color: '#0284c7',
                  specialties: []
                });
                setIsTeamModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm self-start sm:self-center flex-shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nouveau Poste / Collaborateur
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map(member => (
              <div
                key={member.id}
                className="group relative bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                {/* Barre colorée supérieure */}
                <div
                  className="h-1.5 w-full shrink-0"
                  style={{ backgroundColor: member.color || '#0284c7' }}
                />

                <div className="p-5 space-y-4">
                  {/* Header card: Avatar + Nom complet (Prénom et Nom 100% visibles) + Rôle */}
                  <div className="flex items-start gap-3.5">
                    <div className="relative shrink-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-sm ring-2 ring-white"
                        style={{ backgroundColor: member.color || '#0284c7' }}
                      >
                        {member.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || member.name.charAt(0).toUpperCase()}
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
                      {/* Nom complet bien visible sans troncature */}
                      <h4 className="font-bold text-base text-slate-900 leading-snug break-words tracking-tight">
                        {member.name}
                      </h4>
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                          {member.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sélecteur de statut dédié - En pleine largeur, séparé du nom */}
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                      Statut :
                    </span>
                    <div className="relative inline-flex items-center">
                      <select
                        value={member.status || (member.is_active ? 'active' : 'other')}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, status: newStatus as any, is_active: newStatus === 'active' ? 1 : 0 } : m));
                          await fetch(`/api/team/${member.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: newStatus, is_active: newStatus === 'active' ? 1 : 0 })
                          });
                          fetch('/api/team').then(r => r.json()).then(setTeamMembers);
                        }}
                        className={`text-xs font-bold pl-3 pr-7 py-1.5 rounded-lg border cursor-pointer appearance-none transition shadow-2xs focus:outline-none focus:ring-2 ${
                          (member.status || (member.is_active ? 'active' : 'other')) === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : (member.status || (member.is_active ? 'active' : 'other')) === 'vacation'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : (member.status || (member.is_active ? 'active' : 'other')) === 'sick'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-purple-50 text-purple-800 border-purple-300'
                        }`}
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

                  {/* Spécialités */}
                  {member.specialties && member.specialties.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Spécialités & Compétences :
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {member.specialties.map((spec, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium border border-slate-200/70"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-400">
                    ID #{member.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingMember(member);
                        setIsTeamModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition border border-transparent hover:border-blue-100 cursor-pointer"
                      title="Modifier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member.id, member.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL : Ajouter / Modifier une Intervention */}
      {isServiceModalOpen && editingService && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-600" />
                {editingService.id ? 'Modifier l\'intervention' : 'Créer une nouvelle intervention'}
              </h3>
              <button
                onClick={() => {
                  setIsServiceModalOpen(false);
                  setEditingService(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom de l'intervention *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pose Pompe à Chaleur, Ramonage conduit, Entretien poêle..."
                  value={editingService.name || ''}
                  onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catégorie Métier</label>
                  <input
                    type="text"
                    placeholder="Ex: Pompe à Chaleur & Chauffage"
                    value={editingService.category || ''}
                    onChange={e => setEditingService({ ...editingService, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Pompe à Chaleur & Chauffage', 'Bois & Granulés', 'Ramonage & Fumisterie', 'Plomberie & Sanitaire', 'Devis & Conseils'].map(cat => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setEditingService({ ...editingService, category: cat })}
                        className="text-[9px] px-1.5 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-600 cursor-pointer"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tarif indicatif (€ TTC)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="5"
                      placeholder="0 = Sur devis ou gratuit"
                      value={editingService.price ?? 0}
                      onChange={e => setEditingService({ ...editingService, price: Number(e.target.value) })}
                      className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2 text-slate-400 font-bold">€</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">0 € affichera "Sur devis / Gratuit"</p>
                </div>
              </div>

              {/* Durée d'intervention */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Durée d'intervention (minutes) *</label>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    ⏱️ {formatDuration(editingService.duration_minutes || 30)}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[
                    { label: '30 min', val: 30 },
                    { label: '45 min', val: 45 },
                    { label: '1h (60m)', val: 60 },
                    { label: '1h15 (75m)', val: 75 },
                    { label: '1h30 (90m)', val: 90 },
                    { label: '2h (120m)', val: 120 },
                    { label: '3h (180m)', val: 180 },
                    { label: '4h (240m)', val: 240 }
                  ].map(item => (
                    <button
                      type="button"
                      key={item.val}
                      onClick={() => setEditingService({ ...editingService, duration_minutes: item.val })}
                      className={`py-1.5 px-2 rounded-lg font-semibold text-[11px] border transition text-center cursor-pointer ${
                        editingService.duration_minutes === item.val
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min="10"
                  step="5"
                  value={editingService.duration_minutes || 30}
                  onChange={e => setEditingService({ ...editingService, duration_minutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Durée personnalisée en minutes"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description & Spécifications</label>
                <textarea
                  rows={3}
                  value={editingService.description || ''}
                  onChange={e => setEditingService({ ...editingService, description: e.target.value })}
                  placeholder="Détaillez les actions réalisées lors de l'intervention (ex: raccordement, mise sous pression, délivrance certificat...)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsServiceModalOpen(false);
                    setEditingService(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm cursor-pointer"
                >
                  Enregistrer l'intervention
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : Ajouter / Modifier un Collaborateur / Poste */}
      {isTeamModalOpen && editingMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                {editingMember.id ? 'Modifier le collaborateur / poste' : 'Ajouter un poste / collaborateur'}
              </h3>
              <button
                onClick={() => {
                  setIsTeamModalOpen(false);
                  setEditingMember(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom complet *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Marc Dubois"
                    value={editingMember.name || ''}
                    onChange={e => setEditingMember({ ...editingMember, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Intitulé du Poste / Métier *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Artisan Plombier & Chauffagiste PAC"
                    value={editingMember.role || ''}
                    onChange={e => setEditingMember({ ...editingMember, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Téléphone mobile direct</label>
                  <input
                    type="text"
                    placeholder="+33 6 12 34 56 78"
                    value={editingMember.phone || ''}
                    onChange={e => setEditingMember({ ...editingMember, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="artisan@entreprise.fr"
                    value={editingMember.email || ''}
                    onChange={e => setEditingMember({ ...editingMember, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Couleur d'identification agenda</label>
                <div className="flex items-center gap-2">
                  {['#0284c7', '#d97706', '#16a34a', '#9333ea', '#e11d48', '#0d9488', '#475569'].map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setEditingMember({ ...editingMember, color: c })}
                      className={`w-7 h-7 rounded-full border-2 transition cursor-pointer ${
                        editingMember.color === c ? 'border-slate-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={editingMember.color || '#0284c7'}
                    onChange={e => setEditingMember({ ...editingMember, color: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Spécialités (séparées par une virgule)</label>
                <input
                  type="text"
                  placeholder="Ex: Pompe à Chaleur, Ramonage certifié, Cuisinière à bois, Dépannage fuite"
                  value={editingMember.specialties?.join(', ') || ''}
                  onChange={e => {
                    const specs = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    setEditingMember({ ...editingMember, specialties: specs });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsTeamModalOpen(false);
                    setEditingMember(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm cursor-pointer"
                >
                  Enregistrer le collaborateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL : Galerie des 10 Modèles Métiers                   */}
      {/* ======================================================== */}
      {isPresetGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-xs">
            {/* Header Modal */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-indigo-600" />
                  Catalogue de Modèles Métiers Prêts à l'Emploi
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Sélectionnez votre secteur : interventions types, durées réalistes et postes qualifiés configurés en 1 clic.
                </p>
              </div>
              <button
                onClick={() => setIsPresetGalleryOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Search */}
            <div className="p-4 bg-slate-50 border-b border-slate-200/60 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un métier (ex: électricité, serrurier, garage, climatisation...)"
                  value={presetSearch}
                  onChange={e => setPresetSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Presets Grid */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              {presets
                .filter(p => {
                  const matchSearch = p.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
                    p.description.toLowerCase().includes(presetSearch.toLowerCase()) ||
                    p.sector.toLowerCase().includes(presetSearch.toLowerCase());
                  return matchSearch;
                })
                .map(preset => (
                  <div
                    key={preset.id}
                    className="bg-white border border-slate-200 hover:border-indigo-400 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                            {preset.badgeEmoji}
                          </span>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{preset.name}</h4>
                            <span className="inline-block text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {preset.sector}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-slate-500 text-[11px] leading-relaxed">
                        {preset.description}
                      </p>

                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                          Exemples d'interventions incluses ({preset.servicesCount}) :
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {preset.previewServices?.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        👥 {preset.teamCount} collaborateur(s) spécialisé(s)
                      </span>
                      <button
                        onClick={() => handleApplyPreset(preset.id, preset.name)}
                        disabled={isApplyingPreset}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Activer ce modèle
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
              <span className="text-slate-500 text-xs">
                Vous exercez un autre métier ?
              </span>
              <button
                onClick={() => {
                  setIsPresetGalleryOpen(false);
                  setIsCustomGeneratorOpen(true);
                }}
                className="text-emerald-700 font-bold hover:underline flex items-center gap-1 text-xs cursor-pointer"
              >
                <Wand2 className="w-4 h-4 text-emerald-600" />
                Générer un métier sur-mesure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL : Générateur Métier Sur-Mesure                     */}
      {/* ======================================================== */}
      {isCustomGeneratorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-xs animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm">
                  <Wand2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Générateur de Métier Sur-Mesure</h3>
                  <p className="text-slate-400 text-[11px]">Pour tout métier non répertorié dans les modèles prédéfinis.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCustomGeneratorOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateCustomTrade} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Intitulé de votre spécialité / métier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carreleur Mosaïste, Pisciniste, Cordonnier, Déménageur..."
                  value={customTradeName}
                  onChange={e => setCustomTradeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs font-semibold"
                />

                {/* Suggestions chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-medium self-center">Idées :</span>
                  {[
                    'Carreleur & Faïence',
                    'Pisciniste & Spas',
                    'Déménageur Pro',
                    'Menuiserie & Fenêtres',
                    'Cabinet d\'Ostéopathie',
                    'Toilettage Canin & Félin',
                    'Installation Alarmes & Vidéo'
                  ].map(sug => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setCustomTradeName(sug)}
                      className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-slate-600 font-medium transition cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Précisions sur vos prestations (optionnel)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Rénovation de terrasses carrelées, pose grand format, interventions d'urgence et devis gratuit sur place."
                  value={customTradeDesc}
                  onChange={e => setCustomTradeDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs leading-relaxed"
                ></textarea>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Ce qui va être configuré automatiquement :
                </p>
                <ul className="list-disc list-inside text-[11px] text-emerald-800/90 space-y-0.5">
                  <li>5 interventions clés avec durées réalistes adaptées à votre domaine</li>
                  <li>Vos catégories de prestations dédiées</li>
                  <li>Le rôle de votre premier artisan / collaborateur spécialisé</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCustomGeneratorOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingCustom}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Wand2 className="w-4 h-4" />
                  {isGeneratingCustom ? 'Génération en cours...' : 'Générer et Activer mon Métier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL : Ajouter une Catégorie Personnalisée              */}
      {/* ======================================================== */}
      {isNewCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-emerald-600" />
                Nouvelle Catégorie d'Intervention
              </h3>
              <button
                onClick={() => setIsNewCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomCategory} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom de la catégorie *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rénovation Salles de Bain, Piscine & Spas..."
                  value={newCategoryInput}
                  onChange={e => setNewCategoryInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCategoryModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm cursor-pointer"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


