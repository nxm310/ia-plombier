export interface PresetService {
  name: string;
  category: string;
  duration_minutes: number;
  price: number;
  description: string;
}

export interface PresetTeamMember {
  name: string;
  role: string;
  email: string;
  phone: string;
  color: string;
  specialties: string[];
}

export interface IndustryPreset {
  id: string;
  name: string;
  shortName: string;
  sector: string;
  badgeEmoji: string;
  description: string;
  company: {
    name: string;
    activity: string;
    phone: string;
    email: string;
    address: string;
    website: string;
    description: string;
  };
  services: PresetService[];
  teamMembers: PresetTeamMember[];
}

export const INDUSTRY_PRESETS: Record<string, IndustryPreset> = {
  // 1. PLOMBERIE / CHAUFFAGE / PAC / RAMONAGE
  plumber: {
    id: 'plumber',
    name: 'Artisan Plombier, Chauffage, PAC & Ramonage',
    shortName: 'Plomberie & Chauffage',
    sector: 'BTP & Second Œuvre',
    badgeEmoji: '🔧',
    description: 'Pompes à chaleur (PAC Air/Eau et Air/Air), cuisinières à bois, poêles à granulés, ramonage certifié assurance et dépannage fuite.',
    company: {
      name: 'Artisan Plomberie Chauffage & Énergies',
      activity: 'Plomberie, Pompes à Chaleur, Poêles à Granulés, Cuisinières & Ramonage',
      phone: '+33 6 07 72 00 18',
      email: 'contact@artisan-plomberie-energies.fr',
      address: 'Zone Artisanale des Métiers, 75012 Paris',
      website: 'https://artisan-plomberie-energies.fr',
      description: 'Entreprise artisanale qualifiée RGE & QualiBois / QualiPAC. Spécialistes certifiés de l\'installation et du dépannage de pompes à chaleur (PAC Air/Eau et Air/Air), pose et entretien de cuisinières à bois traditionnelles et poêles à granulés, ramonage certifié assurance et dépannage plomberie d\'urgence 24/7.'
    },
    services: [
      {
        name: 'Installation Pompe à Chaleur (PAC Air/Eau & Air/Air)',
        category: 'Pompe à Chaleur & Chauffage',
        duration_minutes: 240,
        price: 0,
        description: 'Pose intégrale de pompe à chaleur, raccordements hydrauliques & frigorifiques, raccordement électrique et mise en service certifiée RGE.'
      },
      {
        name: 'Entretien & Révision annuelle Pompe à Chaleur',
        category: 'Pompe à Chaleur & Chauffage',
        duration_minutes: 90,
        price: 180,
        description: 'Contrôle d\'étanchéité du circuit frigorigène, nettoyage filtres et échangeurs, contrôle des pressions et optimisation du rendement.'
      },
      {
        name: 'Installation Poêle à granulés (Pellets)',
        category: 'Bois & Granulés',
        duration_minutes: 180,
        price: 0,
        description: 'Mise en place et fixation du poêle à granulés, raccordement au conduit de fumée, paramétrage électronique et mise à feu test.'
      },
      {
        name: 'Entretien complet & Nettoyage Poêle à granulés',
        category: 'Bois & Granulés',
        duration_minutes: 75,
        price: 150,
        description: 'Démontage et dépoussiérage de la chambre de combustion, nettoyage de l\'extracteur, contrôle de la bougie et des sécurités.'
      },
      {
        name: 'Installation Cuisinière à bois',
        category: 'Bois & Granulés',
        duration_minutes: 240,
        price: 0,
        description: 'Pose de cuisinière à bois traditionnelle, raccordement fumisterie sécurisé, isolation thermique murale conforme normes DTU 24.1.'
      },
      {
        name: 'Ramonage certifié de conduit de cheminée / poêle',
        category: 'Ramonage & Fumisterie',
        duration_minutes: 45,
        price: 85,
        description: 'Ramonage mécanique rotatif par hérisson, test de tirage et délivrance immédiate du certificat officiel de ramonage pour assurance.'
      },
      {
        name: 'Débistrage mécanique de conduit goudronné',
        category: 'Ramonage & Fumisterie',
        duration_minutes: 120,
        price: 280,
        description: 'Élimination du bistre durci à la débistreuse mécanique pour sécuriser le conduit et éviter tout risque d\'incendie.'
      },
      {
        name: 'Dépannage Plomberie & Recherche de fuite d\'eau',
        category: 'Plomberie & Sanitaire',
        duration_minutes: 60,
        price: 95,
        description: 'Recherche et réparation immédiate de fuite d\'eau (cuivre, multicouche, PER, PVC), remplacement robinet d\'arrêt ou vanne générale.'
      },
      {
        name: 'Remplacement Chauffe-eau / Ballon Thermodynamique',
        category: 'Plomberie & Sanitaire',
        duration_minutes: 150,
        price: 0,
        description: 'Dépose de l\'ancien cumulus, fourniture et raccordement d\'un ballon neuf avec groupe de sécurité et raccord diélectrique.'
      },
      {
        name: 'Débouchage canalisations & Réseau sanitaire',
        category: 'Plomberie & Sanitaire',
        duration_minutes: 60,
        price: 110,
        description: 'Débouchage mécanique au furet professionnel ou pompe haute pression pour WC, douche, évier ou colonne principale.'
      },
      {
        name: 'Visite technique préalable & Devis gratuit sur place',
        category: 'Devis & Conseils',
        duration_minutes: 45,
        price: 0,
        description: 'Déplacement d\'un technicien qualifié pour évaluer la faisabilité, les accès, le dimensionnement thermique et établir un devis clair.'
      }
    ],
    teamMembers: [
      {
        name: 'Marc Dubois',
        role: 'Artisan Plombier & Chauffagiste PAC',
        email: 'marc@artisan-plomberie-energies.fr',
        phone: '+33 6 07 72 00 18',
        color: '#0284c7',
        specialties: ['Pompe à Chaleur Air/Eau', 'Dépannage Plomberie & Fuites', 'Chauffe-eau thermodynamique', 'Mise en service RGE']
      },
      {
        name: 'Thomas Martin',
        role: 'Fumiste & Ramoneur Agréé',
        email: 'thomas@artisan-plomberie-energies.fr',
        phone: '+33 6 12 34 56 78',
        color: '#d97706',
        specialties: ['Ramonage certifié assurance', 'Débistrage rotatif', 'Audit de conduit & Tirage', 'Sécurité incendie']
      },
      {
        name: 'Julien Leroy',
        role: 'Installateur Poêles & Cuisinières à bois',
        email: 'julien@artisan-plomberie-energies.fr',
        phone: '+33 6 87 65 43 21',
        color: '#16a34a',
        specialties: ['Poêle à granulés (Pellets)', 'Cuisinière à bois traditionnelle', 'Normes DTU 24.1', 'Entretien annuel & Réglages']
      }
    ],
  },

  // 2. ÉLECTRICITÉ GÉNÉRALE / DOMOTIQUE / PHOTOVOLTAÏQUE / BORNES IRVE
  electrician: {
    id: 'electrician',
    name: 'Électricien Général, Domotique, IRVE & Solaire',
    shortName: 'Électricité & Solaire',
    sector: 'BTP & Second Œuvre',
    badgeEmoji: '⚡',
    description: 'Rénovation électrique aux normes NF C 15-100, bornes de recharge pour véhicules électriques (IRVE), panneaux solaires et dépannage rapide.',
    company: {
      name: 'VoltExpert Électricité & Énergies',
      activity: 'Électricité Générale, Bornes IRVE, Panneaux Solaires & Domotique',
      phone: '+33 6 11 22 33 44',
      email: 'contact@voltexpert-elec.fr',
      address: '28 Rue des Électriciens, 69003 Lyon',
      website: 'https://voltexpert-elec.fr',
      description: 'Entreprise d\'électricité générale qualifiée Qualifelec & IRVE. Conception d\'installations électriques conformes NF C 15-100, pose de bornes de recharge privées et professionnelles, centrales solaires photovoltaïques en autoconsommation et dépannage d\'urgence coupure de courant 24/7.'
    },
    services: [
      {
        name: 'Installation Borne de Recharge Véhicule Électrique (IRVE)',
        category: 'Bornes IRVE & Mobilité',
        duration_minutes: 240,
        price: 0,
        description: 'Pose d\'une borne 7,4 kW ou 22 kW avec disjoncteur différentiel dédié, passage de câbles renforcés et attestation de conformité IRVE.'
      },
      {
        name: 'Rénovation & Remplacement Tableau Électrique',
        category: 'Installation & Normes',
        duration_minutes: 180,
        price: 0,
        description: 'Dépose de l\'ancien tableau à fusibles, fourniture et pose d\'un tableau neuf avec disjoncteurs magnétothermiques et différentiels 30mA.'
      },
      {
        name: 'Dépannage Électrique d\'Urgence (Court-circuit / Panne)',
        category: 'Dépannage d\'Urgence',
        duration_minutes: 60,
        price: 95,
        description: 'Recherche de court-circuit, localisation du défaut d\'isolement, remise sous tension sécurisée et remplacement de disjoncteur défectueux.'
      },
      {
        name: 'Installation Panneaux Solaires Photovoltaïques (Autoconsommation)',
        category: 'Photovoltaïque & Solaire',
        duration_minutes: 480,
        price: 0,
        description: 'Pose des panneaux en toiture, raccordement micro-onduleurs ou onduleur centralisé, coffret de protection AC/DC et mise en service.'
      },
      {
        name: 'Mise en conformité & Audit Consuel',
        category: 'Installation & Normes',
        duration_minutes: 90,
        price: 150,
        description: 'Contrôle complet de la terre, des liaisons équipotentielles, des calibres de protection et délivrance du dossier Consuel.'
      },
      {
        name: 'Pose de Prises, Éclairages LED & Câblage RJ45',
        category: 'Petits Travaux & Éclairage',
        duration_minutes: 90,
        price: 120,
        description: 'Ajout de points lumineux, pose de spots encastrés, prises de courant supplémentaires et coffret de communication réseau.'
      },
      {
        name: 'Installation Domotique & Gestion d\'Énergie Connectée',
        category: 'Domotique & Confort',
        duration_minutes: 150,
        price: 0,
        description: 'Mise en place de modules domotiques pour pilotage smartphone des radiateurs, volets roulants et éclairages.'
      },
      {
        name: 'Visite technique & Étude de faisabilité gratuite',
        category: 'Devis & Conseils',
        duration_minutes: 45,
        price: 0,
        description: 'Déplacement d\'un électricien qualifié pour évaluer la puissance souscrite Linky, la place au tableau et établir un devis précis.'
      }
    ],
    teamMembers: [
      {
        name: 'Alexandre Meyer',
        role: 'Chef Électricien & Spécialiste IRVE',
        email: 'alexandre@voltexpert-elec.fr',
        phone: '+33 6 11 22 33 44',
        color: '#2563eb',
        specialties: ['Bornes de recharge IRVE', 'Rénovation tableau électrique', 'Domotique KNX/Zigbee', 'Dépannage urgent']
      },
      {
        name: 'Romain Garnier',
        role: 'Technicien Photovoltaïque & Réseau',
        email: 'romain@voltexpert-elec.fr',
        phone: '+33 6 99 88 77 66',
        color: '#eab308',
        specialties: ['Panneaux solaires', 'Micro-onduleurs Enphase', 'Câblage tertiaire RJ45', 'Audit Consuel']
      }
    ],
  },

  // 3. SERRURERIE & MÉTALLERIE D'URGENCE / SÉCURITÉ
  locksmith: {
    id: 'locksmith',
    name: 'Serrurerie, Dépannage d\'Urgence & Portes Blindées',
    shortName: 'Serrurerie & Sécurité',
    sector: 'Dépannage & Sécurité',
    badgeEmoji: '🔑',
    description: 'Ouverture de porte claquée sans dégât, remplacement de serrures multipoints A2P, blindage de porte et rideaux métalliques.',
    company: {
      name: 'Serrurerie SécuriFast 24/7',
      activity: 'Serrurerie d\'Urgence, Portes Blindées & Contrôle d\'Accès',
      phone: '+33 6 44 55 66 77',
      email: 'contact@securifast-serrurier.fr',
      address: '15 Boulevard Beaumarchais, 75004 Paris',
      website: 'https://securifast-serrurier.fr',
      description: 'Artisans serruriers agréés assurances. Dépannage express en 30 minutes 24h/24 et 7j/7 pour ouverture de porte sans casse, remplacement de serrures toutes marques certifiées A2P, blindage de portes d\'entrée et rideaux métalliques de commerces.'
    },
    services: [
      {
        name: 'Ouverture de Porte Claquée (Méthode non destructive)',
        category: 'Dépannage Express 24/7',
        duration_minutes: 30,
        price: 89,
        description: 'Ouverture rapide par radio ou bypass sans perçage ni dommage pour la serrure existante.'
      },
      {
        name: 'Ouverture de Porte Verrouillée / Clé cassée',
        category: 'Dépannage Express 24/7',
        duration_minutes: 45,
        price: 130,
        description: 'Extraction du morceau de clé ou fraisage soigné du cylindre, remplacement immédiat pour refermer la porte à clé.'
      },
      {
        name: 'Remplacement de Cylindre / Barillet Haute Sécurité A2P',
        category: 'Changement de Serrure',
        duration_minutes: 45,
        price: 160,
        description: 'Fourniture et pose d\'un cylindre anti-crochetage, anti-perçage et anti-casse livré avec 3 ou 5 clés protégées sous scellé.'
      },
      {
        name: 'Installation de Serrure Multipoints A2P (3 ou 5 points)',
        category: 'Sécurisation & Serrures',
        duration_minutes: 90,
        price: 350,
        description: 'Pose d\'une serrure carénée ou en applique multipoints répondant aux exigences strictes des compagnies d\'assurance.'
      },
      {
        name: 'Blindage de Porte & Pose de Cornières Anti-Pinces',
        category: 'Blindage & Portes',
        duration_minutes: 180,
        price: 0,
        description: 'Fourreautage acier sur mesure de la porte en bois existante, platines de sécurité et cornières anti-intrusion.'
      },
      {
        name: 'Dépannage & Déblocage de Rideau Métallique',
        category: 'Rideaux Métalliques & Volets',
        duration_minutes: 90,
        price: 180,
        description: 'Remise en axe du tablier, remplacement des bobines à ressort ou du moteur tubulaire pour commerces.'
      },
      {
        name: 'Audit de Sécurité & Devis Gratuit sur place',
        category: 'Devis & Conseils',
        duration_minutes: 30,
        price: 0,
        description: 'Analyse des vulnérabilités de vos accès et proposition tarifaire transparente sans engagement.'
      }
    ],
    teamMembers: [
      {
        name: 'David Cohen',
        role: 'Serrurier Dépanneur Express',
        email: 'david@securifast-serrurier.fr',
        phone: '+33 6 44 55 66 77',
        color: '#dc2626',
        specialties: ['Ouverture fine sans casse', 'Urgences de nuit', 'Remplacement cylindre A2P', 'Agréé assurances']
      },
      {
        name: 'Karim Bensaid',
        role: 'Expert Blindage & Métallerie',
        email: 'karim@securifast-serrurier.fr',
        phone: '+33 6 77 88 99 00',
        color: '#475569',
        specialties: ['Portes blindées Picard/Fichet', 'Serrures carénées 5 points', 'Rideaux métalliques', 'Gâches électriques']
      }
    ],
  },

  // 4. CLIMATISATION, FROID & VENTILATION (FRIGORISTE)
  hvac: {
    id: 'hvac',
    name: 'Climatisation, Froid & Pompe à Chaleur Réversible',
    shortName: 'Climatisation & Froid',
    sector: 'BTP & Second Œuvre',
    badgeEmoji: '❄️',
    description: 'Pose de climatisations mono-split et multi-split réversibles, entretien annuel avec désinfection antibactérienne et recharge en fluide frigorigène.',
    company: {
      name: 'ClimArtisan & Froid Solutions',
      activity: 'Climatisation Réversible, Froid Commercial & VMC',
      phone: '+33 6 22 33 44 55',
      email: 'contact@climartisan-froid.fr',
      address: '42 Rue du Froid, 13008 Marseille',
      website: 'https://climartisan-froid.fr',
      description: 'Entreprise frigoriste certifiée manipulation des fluides frigorigènes (Attestation de capacité R32/R410A). Installation, entretien préventif et dépannage de climatisations réversibles Daikin, Mitsubishi, Atlantic et systèmes VMC double flux pour particuliers et professionnels.'
    },
    services: [
      {
        name: 'Installation Climatiseur Mono-Split Réversible',
        category: 'Installation Climatisation',
        duration_minutes: 240,
        price: 0,
        description: 'Pose d\'une unité intérieure et d\'une unité extérieure, tirage sous vide du circuit, liaison frigorifique et mise en route.'
      },
      {
        name: 'Installation Multi-Split (2 à 4 pièces)',
        category: 'Installation Climatisation',
        duration_minutes: 420,
        price: 0,
        description: 'Équipement complet de plusieurs pièces avec passage soigné des goulottes, liaisons frigorifiques et équilibrage thermique.'
      },
      {
        name: 'Entretien Annuel Complet & Désinfection Climatisation',
        category: 'Entretien & Nettoyage',
        duration_minutes: 60,
        price: 130,
        description: 'Dépoussiérage et traitement antibactérien des filtres, nettoyage haute pression de l\'échangeur extérieur et contrôle des pressions.'
      },
      {
        name: 'Dépannage & Recherche de Fuite de Fluide Frigorigène',
        category: 'Dépannage & Réparation',
        duration_minutes: 90,
        price: 180,
        description: 'Test d\'étanchéité sous pression d\'azote, colmatage de fuite, tirage au vide et recharge certifiée R32/R410A.'
      },
      {
        name: 'Installation VMC Simple ou Double Flux',
        category: 'Ventilation & Air Pur',
        duration_minutes: 240,
        price: 0,
        description: 'Pose du caisson d\'extraction, pose des bouches d\'aération hygroréglables et raccordement des gaines isolées.'
      },
      {
        name: 'Visite Technique & Bilan Thermique Gratuit',
        category: 'Devis & Conseils',
        duration_minutes: 45,
        price: 0,
        description: 'Étude des volumes et de l\'exposition de vos pièces pour choisir la puissance optimale (kW) sans surconsommation.'
      }
    ],
    teamMembers: [
      {
        name: 'Nicolas Vasseur',
        role: 'Frigoriste & Chef d\'Équipe Climatisation',
        email: 'nicolas@climartisan-froid.fr',
        phone: '+33 6 22 33 44 55',
        color: '#0284c7',
        specialties: ['Mise en service frigorifique', 'Daikin & Mitsubishi', 'Climatisation gainable', 'Recharge R32']
      },
      {
        name: 'Sébastien Brun',
        role: 'Technicien Entretien & VMC',
        email: 'sebastien@climartisan-froid.fr',
        phone: '+33 6 33 44 55 66',
        color: '#0d9488',
        specialties: ['Désinfection antibactérienne', 'VMC Double flux', 'Diagnostic bruit/panne', 'Remplacement compresseur']
      }
    ],
  },

  // 5. PEINTURE, PLÂTRERIE & RÉNOVATION INTÉRIEURE
  painter_renovation: {
    id: 'painter_renovation',
    name: 'Peinture, Plâtrerie & Rénovation Intérieure',
    shortName: 'Peinture & Rénovation',
    sector: 'BTP & Second Œuvre',
    badgeEmoji: '🎨',
    description: 'Peinture soignée murs et plafonds, ratissage, cloisons Placo, isolation phonique/thermique et rénovation complète clés en main.',
    company: {
      name: 'Harmonie Peinture & Rénovation',
      activity: 'Peinture Décorative, Plâtrerie, Placo & Rénovation',
      phone: '+33 6 33 11 22 33',
      email: 'contact@harmonie-peinture.fr',
      address: '7 Rue des Artisans Peintres, 31000 Toulouse',
      website: 'https://harmonie-peinture.fr',
      description: 'Entreprise artisanale de peinture en bâtiment et finitions intérieures. Ratissage soigné, peinture satinée, mate ou velours éco-labellisée, pose de bandes et cloisons en plaques de plâtre (Placo), revêtements de sol et rénovation intégrale après dégât des eaux.'
    },
    services: [
      {
        name: 'Peinture Murs & Plafonds (par pièce)',
        category: 'Peinture Intérieure',
        duration_minutes: 360,
        price: 0,
        description: 'Lessivage, rebouchage des micro-fissures, impression sous-couche et 2 couches de peinture de finition velours ou mat dépolluante.'
      },
      {
        name: 'Ratissage complet & Enduit de Lissage',
        category: 'Préparation & Plâtrerie',
        duration_minutes: 240,
        price: 0,
        description: 'Application d\'enduit fin en 2 passes croisées, ponçage mécanique à la girafe aspirante pour une planéité parfaite sans poussière.'
      },
      {
        name: 'Pose de Cloison Placo / Séparation de pièce',
        category: 'Plâtrerie & Isolation',
        duration_minutes: 300,
        price: 0,
        description: 'Montage de l\'ossature métallique Stil, insertion de laine minérale isolante, pose des plaques BA13 et bandes calicot jointées.'
      },
      {
        name: 'Remise en état après Dégât des Eaux',
        category: 'Sinistres & Assurances',
        duration_minutes: 180,
        price: 0,
        description: 'Traitement anti-humidité, blocage des auréoles d\'infiltration, réfection des plâtres et peinture conforme au devis assurance.'
      },
      {
        name: 'Pose de Parquet Flottant ou Sol Vinyle',
        category: 'Sols & Finitions',
        duration_minutes: 240,
        price: 0,
        description: 'Pose de sous-couche acoustique, emboîtement des lames de parquet stratifié et découpe minutieuse des plinthes assorties.'
      },
      {
        name: 'Visite Technique, Évaluation Métré & Devis Gratuit',
        category: 'Devis & Conseils',
        duration_minutes: 45,
        price: 0,
        description: 'Déplacement d\'un peintre artisan sur place, prise des cotes précises au télémètre laser et présentation du nuancier de couleurs.'
      }
    ],
    teamMembers: [
      {
        name: 'Guillaume Roussel',
        role: 'Artisan Peintre & Finitions Haut de Gamme',
        email: 'guillaume@harmonie-peinture.fr',
        phone: '+33 6 33 11 22 33',
        color: '#9333ea',
        specialties: ['Peinture velours & laque', 'Nuanciers Farrow & Ball', 'Ratissage parfait', 'Dégâts des eaux']
      },
      {
        name: 'Antoine Lefevre',
        role: 'Plaquiste & Poseur Cloisons',
        email: 'antoine@harmonie-peinture.fr',
        phone: '+33 6 55 66 77 88',
        color: '#f97316',
        specialties: ['Cloisons séparatives BA13', 'Isolation phonique', 'Faux plafonds suspendus', 'Parquet flottant']
      }
    ],
  },

  // 6. ESPACES VERTS, PAYSAGISME & ÉLAGAGE
  landscaper: {
    id: 'landscaper',
    name: 'Paysagiste, Espaces Verts & Élagage',
    shortName: 'Jardins & Paysage',
    sector: 'Habitat & Extérieurs',
    badgeEmoji: '🌿',
    description: 'Tonte de pelouse, taille de haies, élagage grande hauteur sécurisé, débroussaillage et création de terrasses & arrosage automatique.',
    company: {
      name: 'Jardins Verts & Paysages d\'Excellence',
      activity: 'Aménagement Paysager, Entretien d\'Espaces Verts & Élagage',
      phone: '+33 6 55 44 33 22',
      email: 'contact@jardinsverts-paysage.fr',
      address: '10 Route de la Forêt, 33000 Bordeaux',
      website: 'https://jardinsverts-paysage.fr',
      description: 'Paysagistes passionnés et arboristes-grimpeurs certifiés. Entretien ponctuel ou contrats annuels pour particuliers et résidences, taille ornementale de haies, élagage délicat d\'arbres de toutes hauteurs, pose de gazon de placage et création de terrasses bois.'
    },
    services: [
      {
        name: 'Taille de Haies & Arbustes (jusqu\'à 3m)',
        category: 'Taille & Arbustes',
        duration_minutes: 120,
        price: 0,
        description: 'Taille soignée au taille-haie professionnel thermique/batterie, ramassage complet des déchets verts et évacuation en déchetterie.'
      },
      {
        name: 'Tonte & Soin Complet de la Pelouse',
        category: 'Tonte & Entretien',
        duration_minutes: 60,
        price: 65,
        description: 'Tonte propre avec rotofil de finition le long des bordures et massifs, soufflage des allées et évacuation de la tonte.'
      },
      {
        name: 'Élagage Raisonné & Sécurisé de Grand Arbre',
        category: 'Élagage & Abattage',
        duration_minutes: 240,
        price: 0,
        description: 'Grimpe à la corde par arboriste diplômé, taille d\'éclaircie, suppression des branches mortes et sécurisation des abords.'
      },
      {
        name: 'Abattage d\'Arbre Dangereux par Rétention',
        category: 'Élagage & Abattage',
        duration_minutes: 300,
        price: 0,
        description: 'Démontage tronçon par tronçon avec poulies de rétention pour préserver toitures, clôtures et câbles électriques.'
      },
      {
        name: 'Débroussaillage & Nettoyage de Terrain Friche',
        category: 'Nettoyage & Friche',
        duration_minutes: 180,
        price: 0,
        description: 'Fauchage à la débroussailleuse forestière, coupe des ronces et repousses, broyage sur place ou évacuation complète.'
      },
      {
        name: 'Pose de Gazon en Rouleaux & Arrosage Automatique',
        category: 'Création Paysagère',
        duration_minutes: 360,
        price: 0,
        description: 'Préparation du terrain par motobineuse, nivellement, pose des rouleaux de gazon naturel et mise en place du circuit d\'arrosage.'
      },
      {
        name: 'Visite Technique sur Place & Devis Paysager Gratuit',
        category: 'Devis & Conseils',
        duration_minutes: 45,
        price: 0,
        description: 'Visite de votre jardin, estimation du linéaire de haie ou de la hauteur des arbres, et chiffrage transparent.'
      }
    ],
    teamMembers: [
      {
        name: 'Julien Mercier',
        role: 'Paysagiste Concepteur & Chef de Chantier',
        email: 'julien@jardinsverts-paysage.fr',
        phone: '+33 6 55 44 33 22',
        color: '#16a34a',
        specialties: ['Aménagement extérieur', 'Taille de haies ornementales', 'Gazon en rouleau', 'Arrosage automatique']
      },
      {
        name: 'Maxime Fabre',
        role: 'Arboriste Grimpeur & Élagueur Diplômé',
        email: 'maxime@jardinsverts-paysage.fr',
        phone: '+33 6 88 99 00 11',
        color: '#854d0e',
        specialties: ['Élagage grande hauteur', 'Démontage par rétention', 'Dessouchage', 'Sécurité forestière']
      }
    ],
  },

  // 7. GARAGE AUTOMOBILE, MÉCANIQUE & DIAGNOSTIC
  auto_garage: {
    id: 'auto_garage',
    name: 'Garage Automobile, Mécanique & Carrosserie',
    shortName: 'Garage Auto',
    sector: 'Automobile & Mobilité',
    badgeEmoji: '🚗',
    description: 'Révision constructeur préservée, freinage, diagnostic valise électronique multimarque, kit de distribution, embrayage et pneumatiques.',
    company: {
      name: 'Garage AutoMéca Performance',
      activity: 'Mécanique Générale, Diagnostic Électronique & Entretien Toutes Marques',
      phone: '+33 6 66 77 88 99',
      email: 'atelier@automeca-performance.fr',
      address: '5 Rue de la Mécanique, 44000 Nantes',
      website: 'https://automeca-performance.fr',
      description: 'Atelier de mécanique automobile indépendant équipé des dernières valises de diagnostic constructeur. Révisions périodiques avec garantie constructeur préservée, vidanges avec huile normée, remplacement freins, amortisseurs, courroies de distribution et géométrie 3D.'
    },
    services: [
      {
        name: 'Révision Générale & Vidange Moteur (Filtres inclus)',
        category: 'Entretien & Révision',
        duration_minutes: 60,
        price: 149,
        description: 'Vidange huile homologuée constructeur, remplacement filtre à huile, filtre à air, contrôle de 50 points de sécurité et mise à niveau des fluides.'
      },
      {
        name: 'Remplacement Plaquettes & Disques de Frein Avant',
        category: 'Freinage & Sécurité',
        duration_minutes: 90,
        price: 190,
        description: 'Pose de plaquettes et disques neufs de qualité d\'origine, contrôle du liquide de frein et purge si nécessaire.'
      },
      {
        name: 'Diagnostic Électronique Valise & Recherche de Panne',
        category: 'Diagnostic & Électronique',
        duration_minutes: 45,
        price: 69,
        description: 'Lecture des calculateurs, identification des codes défauts (voyant moteur, ABS, airbag), analyse des paramètres en direct et devis réparation.'
      },
      {
        name: 'Remplacement Kit Courroie de Distribution & Pompe à Eau',
        category: 'Grosse Mécanique',
        duration_minutes: 240,
        price: 0,
        description: 'Dépose de la distribution usagée, remplacement courroie, galets tendeurs, pompe à eau neuve et purge du liquide de refroidissement.'
      },
      {
        name: 'Remplacement Embrayage & Volant Moteur',
        category: 'Grosse Mécanique',
        duration_minutes: 300,
        price: 0,
        description: 'Dépose boîte de vitesses, remplacement disque d\'embrayage, mécanisme, butée hydraulique et volant moteur bi-masse.'
      },
      {
        name: 'Montage, Équilibrage Pneumatiques & Géométrie 3D',
        category: 'Pneumatiques & Liaison au Sol',
        duration_minutes: 60,
        price: 80,
        description: 'Montage de 2 pneus neufs, équilibrage dynamique des jantes et réglage du parallélisme au banc laser 3D.'
      },
      {
        name: 'Pré-Contrôle Technique Gratuit',
        category: 'Contrôle Technique',
        duration_minutes: 45,
        price: 0,
        description: 'Vérification complète des organes de sécurité pour s\'assurer que votre véhicule passera le contrôle technique sans contre-visite.'
      }
    ],
    teamMembers: [
      {
        name: 'Damien Vautier',
        role: 'Chef d\'Atelier & Maître Mécanicien',
        email: 'damien@automeca-performance.fr',
        phone: '+33 6 66 77 88 99',
        color: '#dc2626',
        specialties: ['Grosse mécanique (Distribution/Embrayage)', 'Boîtes automatiques & manuelles', 'Moteurs diesel/essence', 'Garantie constructeur']
      },
      {
        name: 'Cédric Morin',
        role: 'Électronicien & Diag Automobile',
        email: 'cedric@automeca-performance.fr',
        phone: '+33 6 12 98 76 54',
        color: '#2563eb',
        specialties: ['Valise diagnostic multimarque', 'Recherche de panne voyant moteur', 'Injection & DPF/FAP', 'Géométrie 3D']
      }
    ],
  },

  // 8. INSTITUT DE BEAUTÉ, COIFFURE & SOINS
  beauty_hair: {
    id: 'beauty_hair',
    name: 'Salon de Coiffure, Institut de Beauté & Soins',
    shortName: 'Coiffure & Esthétique',
    sector: 'Beauté & Bien-être',
    badgeEmoji: '💆',
    description: 'Coupe & brushing stylisé, colorations / balayages personnalisés, soins du visage anti-âge, manucure et épilations douces.',
    company: {
      name: 'L\'Atelier Beauté & Coiffure Styliste',
      activity: 'Coiffure Mixte, Esthétique, Soins du Visage & Onglerie',
      phone: '+33 6 77 66 55 44',
      email: 'contact@latelier-beaute-salon.fr',
      address: '18 Rue de la Paix, 59000 Lille',
      website: 'https://latelier-beaute-salon.fr',
      description: 'Espace moderne dédié à la beauté globale, au soin du cheveu et au bien-être. Équipe d\'artisans coiffeurs visagistes et d\'esthéticiennes diplômées. Prestations sur rendez-vous dans un cadre chaleureux et relaxant.'
    },
    services: [
      {
        name: 'Coupe, Shampoing Traitant & Brushing Femme',
        category: 'Coiffure & Coupe',
        duration_minutes: 45,
        price: 48,
        description: 'Diagnostic capillaire, shampoing relaxant avec massage du cuir chevelu, coupe personnalisée et brushing sculpté.'
      },
      {
        name: 'Balayage Signature, Ombré Hair & Gloss Patine',
        category: 'Coloration & Éclaircissement',
        duration_minutes: 120,
        price: 125,
        description: 'Éclaircissement naturel sur mesure sans abîmer la fibre, patine brillante neutralisante et soin restructurant profond.'
      },
      {
        name: 'Coupe Homme Stylisée & Taille de Barbe au Coupe-Chou',
        category: 'Coiffure & Coupe',
        duration_minutes: 35,
        price: 32,
        description: 'Dégradé américain ou ciseaux, contouring propre de la barbe avec serviette chaude et huile nourrissante.'
      },
      {
        name: 'Soin du Visage Hydratant & Coup d\'Éclat (1h)',
        category: 'Soins Esthétiques Visage',
        duration_minutes: 60,
        price: 75,
        description: 'Démaquillage délicat, gommage enzymatique, vapeur d\'ozone, modelage relaxant aux huiles précieuses et masque repulpant.'
      },
      {
        name: 'Manucure Russe & Pose de Vernis Semi-Permanent',
        category: 'Onglerie & Mains',
        duration_minutes: 60,
        price: 45,
        description: 'Nettoyage minutieux des cuticules à la ponceuse, mise en forme de l\'ongle naturel et pose de vernis longue tenue 3 semaines.'
      },
      {
        name: 'Épilation Complète (Demi-jambes, Maillot, Aisselles)',
        category: 'Épilations Douces',
        duration_minutes: 45,
        price: 52,
        description: 'Cire pelable tiède sans colophane adaptée aux peaux sensibles, huile post-épilatoire apaisante anti-rougeurs.'
      }
    ],
    teamMembers: [
      {
        name: 'Camille Dubois',
        role: 'Coiffeuse Visagiste & Coloriste Spécialiste',
        email: 'camille@latelier-beaute-salon.fr',
        phone: '+33 6 77 66 55 44',
        color: '#ec4899',
        specialties: ['Balayage & Ombré Hair', 'Morpho-coiffure', 'Lissage brésilien', 'Chignons de mariée']
      },
      {
        name: 'Léa Fontaine',
        role: 'Esthéticienne & Praticienne Soins Spa',
        email: 'lea@latelier-beaute-salon.fr',
        phone: '+33 6 43 21 87 65',
        color: '#a855f7',
        specialties: ['Soins du visage personnalisés', 'Onglerie semi-permanente', 'Épilation cire chaude', 'Massage relaxant']
      }
    ],
  },

  // 9. NETTOYAGE PROFESSIONNEL & VITRERIE
  cleaning_services: {
    id: 'cleaning_services',
    name: 'Nettoyage Professionnel, Bureaux & Vitrerie',
    shortName: 'Nettoyage & Propreté',
    sector: 'Services aux Entreprises & Habitat',
    badgeEmoji: '🧼',
    description: 'Nettoyage régulier de bureaux et copropriétés, remise en état fin de chantier, vitrerie grande hauteur et désinfection certifiée.',
    company: {
      name: 'NetPropreté Services 360',
      activity: 'Nettoyage Industriel, Entretien de Bureaux, Vitres & Fin de Chantier',
      phone: '+33 6 88 77 66 55',
      email: 'devis@netproprete360.fr',
      address: '22 Avenue des Entreprises, 67000 Strasbourg',
      website: 'https://netproprete360.fr',
      description: 'Société de nettoyage professionnel pour entreprises, commerces, syndics et particuliers exigeants. Équipes formées aux protocoles d\'hygiène stricts, monobrosses industrielles, injecteurs-extracteurs moquettes et matériel de vitrerie à l\'eau pure.'
    },
    services: [
      {
        name: 'Nettoyage Régulier de Bureaux / Locaux Tertiaires',
        category: 'Bureaux & Copropriétés',
        duration_minutes: 120,
        price: 0,
        description: 'Dépoussiérage et désinfection des postes de travail, vidage des corbeilles, aspiration/lavage des sols et désinfection des sanitaires.'
      },
      {
        name: 'Nettoyage Approfondi Fin de Chantier / Après Travaux',
        category: 'Chantiers & Remise en État',
        duration_minutes: 240,
        price: 0,
        description: 'Élimination des voiles de ciment, grattage des traces de peinture sur vitres et plinthes, aspiration des poussières fines résiduelles.'
      },
      {
        name: 'Lavage de Vitres & Baies Vitrées (Intérieur & Extérieur)',
        category: 'Vitrerie Spécialisée',
        duration_minutes: 90,
        price: 95,
        description: 'Nettoyage à la raclette professionnelle et mouilleur, nettoyage des encadrements et rails coulissants sans traces.'
      },
      {
        name: 'Nettoyage & Shampouinage Moquettes / Sièges par Injection-Extraction',
        category: 'Textiles & Moquettes',
        duration_minutes: 120,
        price: 150,
        description: 'Détachage enzymatique, injection en profondeur d\'une solution désinfectante et extraction simultanée des salissures incrustées.'
      },
      {
        name: 'Décapage & Lustrage des Sols (Thermoplastiques, Carrelages)',
        category: 'Chantiers & Remise en État',
        duration_minutes: 180,
        price: 0,
        description: 'Passage de monobrosse à haute vitesse avec disque abrasif, rinçage neutralisant et pose d\'émulsion protectrice cirante.'
      },
      {
        name: 'Visite Technique sur Site & Devis Personnalisé Gratuit',
        category: 'Devis & Conseils',
        duration_minutes: 45,
        price: 0,
        description: 'Visite des locaux pour évaluer la superficie en m², le cahier des charges et la fréquence d\'intervention souhaitée.'
      }
    ],
    teamMembers: [
      {
        name: 'Mehdi Khelifi',
        role: 'Responsable d\'Exploitation & Devis Entreprises',
        email: 'mehdi@netproprete360.fr',
        phone: '+33 6 88 77 66 55',
        color: '#0284c7',
        specialties: ['Cahier des charges bureaux', 'Remise en état fin de chantier', 'Audit d\'hygiène', 'Contrats annuels']
      },
      {
        name: 'Christophe Renaud',
        role: 'Chef d\'Équipe & Vitrier Spécialiste',
        email: 'christophe@netproprete360.fr',
        phone: '+33 6 11 33 55 77',
        color: '#06b6d4',
        specialties: ['Vitrerie grande hauteur', 'Traitement sols à la monobrosse', 'Injection-extraction moquettes', 'Désinfection']
      }
    ],
  },

  // 10. SERVICES & CONSEIL PME / PROFESSIONS LIBÉRALES
  consulting_services: {
    id: 'consulting_services',
    name: 'Conseil, Informatique, Audit & Services PME',
    shortName: 'Conseil & PME',
    sector: 'Tertiaire & Services',
    badgeEmoji: '💼',
    description: 'Accompagnement de chefs d\'entreprise, audits stratégiques, assistance informatique et gestion de projets sur-mesure.',
    company: {
      name: 'InnovTech Solutions & Conseil',
      activity: 'Conseil, Informatique, Audit & Services PME',
      phone: '+33 1 89 20 30 40',
      email: 'contact@innovtech-pme.fr',
      address: '14 Avenue de la République, 75011 Paris',
      website: 'https://innovtech-pme.fr',
      description: 'Cabinet de conseil et de services pour professionnels et PME. Accompagnement à la transformation digitale, support technique, audit de sécurité et pilotage de projets à haute valeur ajoutée.'
    },
    services: [
      {
        name: 'Échange Découverte & Diagnostic Gratuit (Téléphone ou Visio)',
        category: 'Diagnostic & Cadrage',
        duration_minutes: 30,
        price: 0,
        description: 'Premier contact d\'écoute pour cadrer vos enjeux, identifier les opportunités d\'optimisation et présenter notre méthode.'
      },
      {
        name: 'Rendez-vous Diagnostic Approfondi & Audit Stratégique',
        category: 'Audit & Analyse',
        duration_minutes: 60,
        price: 150,
        description: 'Analyse détaillée des processus actuels, identification des points de friction et plan d\'action priorisé.'
      },
      {
        name: 'Atelier de Cadrage Projet & Cahier des Charges',
        category: 'Projets & Conseil',
        duration_minutes: 120,
        price: 350,
        description: 'Session de travail collaborative pour définir les spécifications fonctionnelles, le planning et les indicateurs de réussite.'
      },
      {
        name: 'Intervention Technique & Support sur Site / Visio',
        category: 'Support & Assistance',
        duration_minutes: 90,
        price: 180,
        description: 'Résolution d\'incidents, configuration d\'outils, paramétrage de flux de travail et accompagnement des équipes.'
      },
      {
        name: 'Point d\'Étape & Revue Mensuelle de Performance',
        category: 'Suivi & Accompagnement',
        duration_minutes: 45,
        price: 0,
        description: 'Bilan périodique des résultats obtenus, ajustements opérationnels et fixation des objectifs du mois à venir.'
      }
    ],
    teamMembers: [
      {
        name: 'Marc Dupont',
        role: 'Directeur Conseil & Stratégie PME',
        email: 'marc.dupont@innovtech-pme.fr',
        phone: '+33 6 12 34 56 78',
        color: '#2563eb',
        specialties: ['Audit d\'entreprise', 'Stratégie de croissance', 'Cadrage de projet', 'Nouveaux partenariats']
      },
      {
        name: 'Sophie Martin',
        role: 'Responsable Déploiement & Projets',
        email: 'sophie.martin@innovtech-pme.fr',
        phone: '+33 6 23 45 67 89',
        color: '#10b981',
        specialties: ['Gestion de projets', 'Accompagnement au changement', 'Optimisation opérationnelle', 'Formation']
      }
    ],
  }
};

/**
 * Générateur dynamique pour n'importe quel métier personnalisé non répertorié.
 * Calcule automatiquement des interventions avec durées adaptées et un prompt IA spécialisé.
 */
export function generateCustomTradeConfig(tradeName: string, tradeDescription?: string): IndustryPreset {
  const cleanTrade = tradeName.trim();
  const desc = tradeDescription?.trim() || `Entreprise artisanale et professionnelle spécialisée en ${cleanTrade}. Prestations soignées, respect des délais et devis clairs.`;

  return {
    id: `custom_${Date.now()}`,
    name: `Entreprise Spécialisée : ${cleanTrade}`,
    shortName: cleanTrade,
    sector: 'Artisanat & Métier sur-mesure',
    badgeEmoji: '⭐',
    description: desc,
    company: {
      name: `Atelier & Services - ${cleanTrade}`,
      activity: cleanTrade,
      phone: '+33 6 00 00 00 00',
      email: 'contact@mon-entreprise-artisan.fr',
      address: 'Adresse de votre entreprise',
      website: 'https://mon-entreprise.fr',
      description: desc
    },
    services: [
      {
        name: `Intervention Standard : ${cleanTrade}`,
        category: 'Prestations Principales',
        duration_minutes: 60,
        price: 80,
        description: `Réalisation d'une prestation courante de ${cleanTrade} selon les règles de l'art.`
      },
      {
        name: `Intervention Approfondie / Travaux Complexes`,
        category: 'Prestations Principales',
        duration_minutes: 180,
        price: 0,
        description: `Travaux techniques complets nécessitant une demi-journée d'intervention spécialisée.`
      },
      {
        name: `Dépannage d'Urgence & Déplacement Express`,
        category: 'Urgences & Dépannages',
        duration_minutes: 45,
        price: 95,
        description: `Intervention prioritaire pour résoudre un problème urgent lié à votre activité de ${cleanTrade}.`
      },
      {
        name: `Entretien & Maintenance Préventive`,
        category: 'Entretien & Suivi',
        duration_minutes: 90,
        price: 120,
        description: `Contrôle périodique, nettoyage ou révision pour garantir la longévité de vos installations.`
      },
      {
        name: `Visite Technique sur Place & Devis Gratuit`,
        category: 'Devis & Conseils',
        duration_minutes: 45,
        price: 0,
        description: `Déplacement chez le client pour évaluer les besoins, mesurer les cotes et établir un devis personnalisé sans engagement.`
      }
    ],
    teamMembers: [
      {
        name: 'Artisan Responsable',
        role: `Spécialiste & Maître Artisan en ${cleanTrade}`,
        email: 'responsable@mon-entreprise.fr',
        phone: '+33 6 00 00 00 00',
        color: '#0284c7',
        specialties: [`Expertise ${cleanTrade}`, 'Gestion de chantier', 'Devis sur place', 'Conseil client']
      }
    ],
  };
}
