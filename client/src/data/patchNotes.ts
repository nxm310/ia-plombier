export interface PatchFeature {
  icon: string;
  title: string;
  desc: string;
  badge?: string;
}

export interface PatchVersion {
  version: string;
  codename: string;
  date: string;
  highlight: string;
  isLatest?: boolean;
  features: PatchFeature[];
  improvements: {
    icon: string;
    title: string;
    desc: string;
  }[];
  fixes: {
    title: string;
    desc: string;
  }[];
}

export const CURRENT_PATCH_VERSION = '3.3.0';

export const PATCH_HISTORY: PatchVersion[] = [
  {
    version: '3.3.0',
    codename: 'Hub PME WhatsApp Direct & Retrait Intégral de l\'IA',
    date: '16 Septembre 2026',
    highlight: 'Pivot de l\'application vers un Hub WhatsApp Direct et Agenda Collaborateur pur : suppression totale de l\'intelligence artificielle (Gemini, copilotes, répondeurs auto) pour un contrôle 100% humain, direct et ultra-fiable.',
    isLatest: true,
    features: [
      {
        icon: '📱',
        title: 'Messagerie WhatsApp 100% Directe & Humaine',
        desc: 'Tous les messages entrants arrivent en temps réel dans Conversations Live sans aucune interférence d\'agent automatique. Réponses immédiates sous la signature de votre entreprise.',
        badge: 'Direct'
      },
      {
        icon: '📋',
        title: 'Fiches Techniques & Notes Clients Dédiées',
        desc: 'Remplacement de la mémoire IA par une gestion claire et directe des notes clients, accès chantiers, consignes et historiques d\'interventions.',
        badge: 'CRM'
      },
      {
        icon: '⚡',
        title: 'Application Allégée & Zéro Clé API Requise',
        desc: 'Suppression complète du SDK Google Gemini, du copilote gérant et des configurations de modèles. L\'application fonctionne immédiatement sans clé d\'API ni coût d\'inférence.',
        badge: 'Performance'
      }
    ],
    improvements: [
      {
        icon: '💼',
        title: 'Interface Unifiée Hub PME',
        desc: 'Nouvelle identité visuelle professionnelle sans badges d\'agents IA : focus sur l\'agenda, la gestion d\'équipe et la satisfaction client.',
      },
      {
        icon: '🚀',
        title: 'Envoi Rapide WhatsApp Direct',
        desc: 'Nouveau module d\'envoi rapide WhatsApp avec modèles de messages préformatés sur le tableau de bord.',
      }
    ],
    fixes: [
      {
        title: 'Suppression de toutes les bascules IA',
        desc: 'Retrait des boutons IA Active / Humain dans les conversations, contacts et gestionnaire CRM.',
      },
      {
        title: 'Élimination des erreurs de quota ou de clé API',
        desc: 'Plus aucun risque de blocage ou d\'erreur liée aux clés Google AI Studio ou OpenAI.',
      }
    ]
  },
  {
    version: '3.2.1',
    codename: 'Rétablissement de l\'Onglet Conversations Live & Navigation Mobile Fluide',
    date: '16 Septembre 2026',
    highlight: 'Rétablissement complet de l\'onglet Conversations Live : barre de navigation permanente sur smartphone, sélection automatique sécurisée des contacts sans blocage et bouton de retour systématique',
    isLatest: false,
    features: [
      {
        icon: '💬',
        title: 'Onglet Conversations Live Toujours Opérationnel',
        desc: 'Sécurisation du chargement des discussions WhatsApp, auto-sélection instantanée du contact valide et protection absolue contre les écrans blancs ou blocages infinis.',
        badge: 'Correctif Live'
      },
      {
        icon: '🧭',
        title: 'Barre de Navigation Mobile Permanente',
        desc: 'La barre d\'onglets inférieure reste toujours visible et accessible sur smartphone pour basculer à tout instant entre le Chat, l\'Agenda, les Clients et l\'Aperçu.',
        badge: 'Navigation'
      },
      {
        icon: '↩️',
        title: 'Bouton Retour Systématique vers la Liste des Conversations',
        desc: 'Un bouton retour dédié permet de revenir en un instant à la liste de toutes les conversations WhatsApp depuis n\'importe quel fil de discussion sur mobile.',
        badge: 'Ergonomie'
      }
    ],
    improvements: [
      {
        icon: '🛡️',
        title: 'Robustesse des requêtes API',
        desc: 'Vérification stricte de la conformité des tableaux de messages et mémoires afin d\'éviter toute erreur d\'exécution.',
      },
      {
        icon: '⚡',
        title: 'Bascule fluide Liste / Chat',
        desc: 'Transition sans friction entre l\'arborescence des clients et le panneau de réponse WhatsApp.',
      }
    ],
    fixes: [
      {
        title: 'Déblocage de l\'affichage de discussion',
        desc: 'Correction de la synchronisation de l\'ID de contact empêchant la vue de rester bloquée sur un chargement indéfini.',
      }
    ]
  },
  {
    version: '3.2.0',
    codename: 'Boutons Agenda Épurés & Suppression Page Client',
    date: '16 Septembre 2026',
    highlight: 'Boutons d\'ajout d\'agenda Google & Apple stylisés et cliquables dans les bulles de discussion comme dans l\'agenda, suppression définitive de la section « Ouvrir page client » et allégement des messages',
    isLatest: false,
    features: [
      {
        icon: '📲',
        title: 'Boutons Cliquables Google & Apple dans le Chat',
        desc: 'Les messages bleus de confirmation de rendez-vous affichent désormais des boutons visuels cliquables (« 📅 Google Agenda » et « 🍏 Apple Calendrier ») identiques à la fenêtre de l\'agenda, masquant les URL techniques brutes.',
        badge: 'Expérience Client'
      },
      {
        icon: '🧹',
        title: 'Suppression Définitive de la Section « Ouvrir page client »',
        desc: 'Retrait total de la mention et du lien « Ouvrir page client » dans les messages de notification WhatsApp ainsi que dans l\'historique des conversations.',
        badge: 'Allégement'
      },
      {
        icon: '⚡',
        title: 'Ajout Instantané 1-Clic à l\'Agenda',
        desc: 'En un clic sur mobile ou desktop, le client ou l\'artisan ouvre Google Agenda ou télécharge directement le fichier .ics Apple Calendrier sans encombrement visuel.',
        badge: 'Calendrier'
      }
    ],
    improvements: [
      {
        icon: '✨',
        title: 'Mise en page épurée des confirmations d\'intervention',
        desc: 'Le corps du message met en valeur les informations clés (Prestation, Intervenant, Date, Heure) dans un format aéré et professionnel.'
      },
      {
        icon: '🌐',
        title: 'Compatibilité Mobile & Multi-Appareils',
        desc: 'Fonctionnement des boutons garanti en local, sur mobile et via la passerelle distante sécurisée.'
      }
    ],
    fixes: [
      {
        title: 'Nettoyage des messages volumineux',
        desc: 'Suppression des flèches et URLs brutes redondantes au profit d\'une carte d\'action moderne et réactive.'
      }
    ]
  },
  {
    version: '3.1.0',
    codename: 'Tuiles Équipe Respirantes, Voyant Gemini & Liaison WhatsApp Directe',
    date: '15 Septembre 2026',
    highlight: 'Affichage complet du prénom et nom sans coupure, sélecteur de statut dédié, voyant vert API Gemini en direct, fermeture fluide des fiches clients et liaison WhatsApp sécurisée',
    isLatest: false,
    features: [
      {
        icon: '👥',
        title: 'Tuiles Collaborateurs Respirantes & Noms Complets',
        desc: 'Le prénom et le nom de famille des équipiers s\'affichent désormais en intégralité sans coupure ni troncature sur toutes les tuiles de l\'Équipe et des Paramètres.',
        badge: 'Équipe & RH'
      },
      {
        icon: '🏷️',
        title: 'Sélecteur de Statut Dédié sur Chaque Tuile',
        desc: 'Le menu de statut (Actif, Vacances, Malade, Autre) dispose de sa propre rangée dédiée sous le nom, éliminant tout chevauchement et facilitant le changement d\'état en 1 clic.',
        badge: 'Ergonomie'
      },
      {
        icon: '🟢',
        title: 'Test & Voyant Vert de l\'API Google Gemini',
        desc: 'Bouton « Vérifier » instantané dans les Réglages IA et voyant vert permanent dans la barre latérale confirmant que l\'intelligence artificielle est 100% opérationnelle.',
        badge: 'IA & Diagnostic'
      },
      {
        icon: '📇',
        title: 'Fermeture Fluide de la Fiche Client & CRM',
        desc: 'L\'accès à l\'onglet Clients ouvre directement la vue globale des tuiles. Les fiches clients se ferment en 1 clic sur la croix ou en cliquant à côté dans l\'application.',
        badge: 'Navigation'
      }
    ],
    improvements: [
      {
        icon: '🎨',
        title: 'Bandeau Couleur & Pastille Lumineuse sur Avatar',
        desc: 'Chaque carte équipier affiche sa couleur thématique en bandeau supérieur et une pastille d\'état sur l\'avatar (🟢 Actif, 🏖️ Congés, 🤒 Arrêt, ⚪ Autre).'
      },
      {
        icon: '📲',
        title: 'Passerelle WhatsApp HTTPS Sécurisée',
        desc: 'Affichage direct du QR Code de synchronisation sur l\'application web depuis n\'importe quel appareil (ordinateur, iPhone) sans message bloquant.'
      },
      {
        icon: '📅',
        title: 'Agenda & Rendez-vous 100% Résilients',
        desc: 'Validation instantanée des rendez-vous sans blocage réseau, avec envoi en 1 clic des confirmations clients et ordres de mission équipiers par WhatsApp.'
      }
    ],
    fixes: [
      {
        title: 'Troncature des Noms de Famille Masqués',
        desc: 'Suppression des contraintes CSS qui masquaient le nom de famille derrière le sélecteur de disponibilité.'
      },
      {
        title: 'Erreur Serveur (405) lors de la Création de RDV',
        desc: 'Prise en charge de la persistance locale continue avec synchronisation automatique pour sécuriser chaque rendez-vous saisi.'
      },
      {
        title: 'Chargement en Boucle du QR Code WhatsApp',
        desc: 'Rétablissement de la passerelle directe vers le moteur de session WhatsApp pour éliminer le sablier infini.'
      }
    ]
  },
  {
    version: '3.0.0',
    codename: 'Copilote IA Gérant & Messages Vocaux WhatsApp',
    date: '14 Septembre 2026',
    highlight: 'Chat interne direct avec Clara pour piloter vos opérations, agendas et équipes, et compréhension automatique des messages vocaux clients',
    isLatest: false,
    features: [
      {
        icon: '✨',
        title: 'Copilote IA Exécutif pour le Gérant',
        desc: 'Un onglet interne dédié pour dialoguer avec Clara : résumé d\'agenda ("Clara, résume-moi la journée de demain"), calcul du CA prévisionnel de la semaine et statuts des effectifs.',
        badge: 'Nouveau'
      },
      {
        icon: '📲',
        title: 'Envoi d\'Ordres & Messages WhatsApp aux Équipes',
        desc: 'Demandez à Clara en langage naturel : "Envoie un message à Thomas pour lui dire qu\'on a du retard". Clara trouve le numéro et expédie le WhatsApp instantanément.',
        badge: 'Productivité'
      },
      {
        icon: '🎙️',
        title: 'Compréhension & Retranscription des Vocaux WhatsApp',
        desc: 'Téléchargement automatique des messages vocaux WhatsApp clients, retranscription mot à mot haute fidélité par Gemini multimodal et réponse autonome de Clara sans avoir à écouter l\'audio.',
        badge: 'IA Multimodale'
      },
      {
        icon: '🎧',
        title: 'Lecteur Audio Intégré & Badge Retranscription',
        desc: 'Chaque message vocal dans le fil de conversation intègre un lecteur audio HTML5 compact et un bloc de retranscription textuelle claire.',
        badge: 'Ergonomie'
      }
    ],
    improvements: [
      {
        icon: '💰',
        title: 'Calcul Automatique du CA Prévisionnel',
        desc: 'Agrégation en temps réel des tarifs de services programmés, panier moyen et ventilation par technicien.'
      },
      {
        icon: '🛡️',
        title: 'Résilience Continue 24/7',
        desc: 'Interception globale des fermetures temporaires de socket Signal pour garantir un fonctionnement ininterrompu.'
      }
    ],
    fixes: [
      {
        title: 'Renégociation E2EE des Messages',
        desc: 'Cache mémoire LRU des messages émis et implémentation du gestionnaire de clés getMessage pour éviter tout blocage en attente de message.'
      }
    ]
  },
  {
    version: '2.9.0',
    codename: 'Ouverture Directe du Fil de Chat sur Smartphone',
    date: '14 Septembre 2026',
    highlight: 'Sur écran mobile étroit, cliquer sur une conversation récente dans la vue d\'ensemble ouvre directement le fil de messages avec les bulles',
    isLatest: false,
    features: [
      {
        icon: '📱',
        title: 'Accès Direct aux Bulles de Discussion',
        desc: 'Sur smartphone, le clic sur une conversation récente depuis l\'accueil ouvre immédiatement le fil de discussion complet au lieu de la liste des contacts.',
        badge: 'Expérience Mobile'
      },
      {
        icon: '💬',
        title: 'Navigation Fluide & Bouton Retour',
        desc: 'Animation fluide slide-in lors de l\'ouverture du chat et bouton retour fléché en haut à gauche pour revenir à la liste complète des conversations.',
        badge: 'Ergonomie'
      },
      {
        icon: '⚡',
        title: 'Chargement Réactif Instantané',
        desc: 'Indicateur de chargement dédié et scroll automatique vers les derniers messages reçus ou envoyés.',
        badge: 'Temps Réel'
      }
    ],
    improvements: [
      {
        icon: '🔔',
        title: 'Ouverture Directe depuis les Notifications',
        desc: 'Le bouton « Ouvrir la conversation » des notifications toasts bascule également directement sur les bulles sur smartphone.'
      },
      {
        icon: '🧭',
        title: 'Bouton Chat de Navigation Mobile Dédié',
        desc: 'Le bouton « Chat » de la barre de navigation basse continue d\'afficher la liste des conversations pour une vue globale.'
      }
    ],
    fixes: [
      {
        title: 'Persistance de la vue active',
        desc: 'Correction de la réinitialisation intempestive de la vue mobile lors du changement d\'onglet.'
      }
    ]
  },
  {
    version: '2.8.0',
    codename: 'Statuts Disponibilité Collaborateurs & Tuiles RH',
    date: '14 Septembre 2026',
    highlight: 'Choix direct du statut sur les tuiles collaborateurs (Actif, Vacances, Malade, Autre), filtrage rapide par état et synchronisation intelligente de la disponibilité agenda',
    isLatest: false,
    features: [
      {
        icon: '🟢',
        title: 'Statuts Multiples Directement sur les Tuiles',
        desc: 'Basculez l\'état d\'un collaborateur en 1 clic direct depuis sa tuile entre Actif, En vacances, Malade ou Autre sans avoir à ouvrir le formulaire complet.',
        badge: 'Équipe & RH'
      },
      {
        icon: '🔍',
        title: 'Filtres de Disponibilité dans l\'Équipe',
        desc: 'Onglets de filtrage rapide (Tous, Actifs, Vacances, Malade, Autre) avec décompte en direct pour visualiser immédiatement qui est sur le terrain ou indisponible.',
        badge: 'Gestion d\'Équipe'
      },
      {
        icon: '📅',
        title: 'Prise en Compte dans l\'Agenda & Créneaux IA',
        desc: 'Les collaborateurs en vacances, malades ou indisponibles sont signalés par des badges dédiés dans l\'agenda et automatiquement écartés des créneaux de prise de rendez-vous.',
        badge: 'Agenda & Planning'
      }
    ],
    improvements: [
      {
        icon: '🎨',
        title: 'Badges de Couleurs Harmonisés',
        desc: 'Vert émeraude pour Actif, Ambre chaleureux pour Vacances, Rose doux pour Malade et Violet pour Autre afin d\'identifier la situation d\'un coup d\'œil.'
      },
      {
        icon: '⚙️',
        title: 'Sélecteur de Statut dans les Paramètres PME',
        desc: 'Le statut est également modifiable directement depuis l\'onglet Paramètres IA & PME dans la section des postes et collaborateurs.'
      }
    ],
    fixes: [
      {
        title: 'Synchronisation automatique is_active',
        desc: 'Le statut actif met automatiquement à jour la disponibilité générale et les créneaux pour garantir l\'absence de conflits de planning.'
      }
    ]
  },
  {
    version: '2.7.0',
    codename: 'Édition Directe CRM & Agendas Rapides WhatsApp',
    date: '14 Septembre 2026',
    highlight: 'Bouton crayon pour modifier directement les clients depuis leurs tuiles CRM et présentation identique des boutons calendrier dans WhatsApp client',
    isLatest: false,
    features: [
      {
        icon: '✏️',
        title: 'Bouton Crayon sur les Tuiles CRM',
        desc: 'Modifiez instantanément un client ou prospect directement depuis sa tuile (nom, entreprise, WhatsApp, email, statut, tags, notes) sans ouvrir le panneau complet.',
        badge: 'CRM & Tuiles'
      },
      {
        icon: '📅',
        title: 'Présentation Agendas WhatsApp Identique',
        desc: 'Le message WhatsApp reçu par le client présente désormais les 3 boutons cliquables Google Agenda, Apple Calendrier et Espace Client avec la même mise en page que la fenêtre de l\'agenda.',
        badge: 'Expérience Client'
      },
      {
        icon: '⚡',
        title: 'Sauvegarde Instantanée & Temps Réel',
        desc: 'Toute modification enregistrée sur une tuile met à jour immédiatement la liste des clients et les fiches ouvertes sans nécessiter de rechargement.',
        badge: 'Performances'
      }
    ],
    improvements: [
      {
        icon: '🎯',
        title: 'Boutons d\'action groupés sur les tuiles',
        desc: 'Chaque tuile CRM dispose désormais du bouton d\'édition rapide (crayon) et de suppression (corbeille) accessibles en 1 clic.'
      },
      {
        icon: '📱',
        title: 'Optimisation Ergonomie Mobile CRM',
        desc: 'Les icônes d\'actions directes restent visibles et confortablement cliquables sur mobile et tablette.'
      }
    ],
    fixes: [
      {
        title: 'Propagation des clics sécurisée',
        desc: 'Le clic sur le bouton crayon ou la corbeille n\'ouvre plus involontairement le tiroir latéral 360° du client.'
      }
    ]
  },
  {
    version: '2.6.0',
    codename: 'Ordre de Mission WhatsApp & Validation 1-Clic',
    date: '14 Septembre 2026',
    highlight: 'Notification automatique d\'ordre de mission aux collaborateurs sur WhatsApp, validation en 1 clic sur mobile et suivi en direct sur l\'agenda',
    isLatest: false,
    features: [
      {
        icon: '🛠️',
        title: 'Ordre de Mission WhatsApp Collaborateur',
        desc: 'Envoi automatique d\'un récapitulatif complet d\'intervention avec coordonnées client, consignes et documents joints sur le WhatsApp de l\'équipier assigné.',
        badge: 'Équipe & Terrain'
      },
      {
        icon: '✅',
        title: 'Page Mission Mobile avec Validation 1-Clic',
        desc: 'Lien direct et sécurisé permettant au collaborateur de valider sa mission en un clic, d\'appeler le client ou de signaler une indisponibilité.',
        badge: 'Accès Smartphone'
      },
      {
        icon: '📅',
        title: 'Synchronisation Agenda Personnel Collaborateur',
        desc: 'Boutons directs Google Agenda et Apple Calendrier pour que le technicien ajoute l\'intervention à son planning personnel en un tap.',
        badge: 'Calendrier'
      }
    ],
    improvements: [
      {
        icon: '🏷️',
        title: 'Pastilles de Statut Collaborateur en Direct',
        desc: 'Badges clairs sur l\'agenda grille et liste (✓ Validé, ⏳ Attente, ✕ Refusé) pour connaître la disponibilité des équipes d\'un seul coup d\'œil.'
      },
      {
        icon: '📲',
        title: 'Bouton de Relance WhatsApp Dédié',
        desc: 'Possibilité de renvoyer l\'ordre de mission au technicien à tout moment depuis la fiche d\'intervention.'
      }
    ],
    fixes: [
      {
        title: 'Validation manuelle rapide',
        desc: 'Le gérant peut également marquer manuellement la mission comme acceptée directement depuis le tableau de bord.'
      }
    ]
  },
  {
    version: '2.5.0',
    codename: 'Suppression Directe CRM & Notes de Version',
    date: '14 Septembre 2026',
    highlight: 'Suppression directe des clients & prospects sur les tuiles CRM et affichage automatique des nouveautés au démarrage',
    features: [
      {
        icon: '🗑️',
        title: 'Suppression Directe sur Tuiles CRM',
        desc: 'Supprimez un prospect ou un client en 1 clic direct depuis sa tuile dans l\'onglet CRM sans avoir à ouvrir le tiroir 360°.',
        badge: 'Action Rapide CRM'
      },
      {
        icon: '✨',
        title: 'Notes de Version au Démarrage',
        desc: 'Affichage automatique à chaque mise à jour pour découvrir instantanément les nouvelles fonctionnalités dès l\'ouverture de l\'application.',
        badge: 'Nouveautés'
      }
    ],
    improvements: [
      {
        icon: '📌',
        title: 'Accès Permanent depuis le Menu',
        desc: 'Un bouton dédié dans la barre latérale permet de revoir l\'ensemble des nouveautés et l\'historique à tout moment.'
      },
      {
        icon: '🎯',
        title: 'Mémorisation Intelligente de Version',
        desc: 'La notification ne s\'affiche automatiquement que lorsqu\'une nouvelle mise à jour est réellement déployée.'
      }
    ],
    fixes: [
      {
        title: 'Confirmation de suppression sécurisée',
        desc: 'Boîte de dialogue précisant explicitement le nom du client avant suppression définitive de ses données et messages.'
      }
    ]
  },
  {
    version: '2.4.0',
    codename: 'Agenda Continu & Unification Client',
    date: '14 Septembre 2026',
    highlight: 'Agenda continu en grand rectangle unifié, persistance totale des fiches clients et fiabilisation des notifications WhatsApp',
    features: [
      {
        icon: '📅',
        title: 'Grand Rectangle Continu Multi-Heures',
        desc: 'Les interventions de 4 heures ou d\'une journée entière forment un seul grand rectangle continu fluide sans répétition horaire.',
        badge: 'Agenda Pro'
      },
      {
        icon: '💾',
        title: 'Persistance Fiches Clients',
        desc: 'Sauvegarde instantanée et durable des coordonnées, téléphone, entreprise, notes et statuts via la nouvelle route PATCH.',
        badge: 'Persistance SQLite'
      },
      {
        icon: '🛡️',
        title: 'Unification Téléphonique Anti-Doublons',
        desc: 'Algorithme universel reliant automatiquement tous les formats (06..., +33..., 33...) au bon client sans scinder les messages.',
        badge: 'Moteur WhatsApp'
      }
    ],
    improvements: [
      {
        icon: '🔗',
        title: 'Lien Direct "Prendre un RDV"',
        desc: 'Ouvre directement le formulaire d\'agenda avec le client déjà présélectionné depuis sa fiche CRM 360°.'
      },
      {
        icon: '⚠️',
        title: 'Bannière des interventions non assignées',
        desc: 'Alerte visuelle en haut de grille permettant de répartir en un clic les interventions en attente de collaborateur.'
      }
    ],
    fixes: [
      {
        title: 'Correction de la route PATCH /api/contacts',
        desc: 'Résolution définitive de l\'erreur 404 lors de la validation des modifications de fiches clients.'
      },
      {
        title: 'Attribution du message de confirmation au bon client',
        desc: 'Envoi direct avec ID contact explicite évitant la création de contacts fantômes sans nom.'
      }
    ]
  },
  {
    version: '2.3.0',
    codename: 'Journée Entière & Synchronisation Agenda',
    date: '14 Septembre 2026',
    highlight: 'Mode Journée Entière, synchronisation 1-clic Google/Apple Agenda sans adresse brute et pièces jointes PDF',
    features: [
      {
        icon: '☀️',
        title: 'Rendez-vous Journée Entière',
        desc: 'Bouton "Journée entière" (08:00 - 18:00) avec badge solaire et tarification forfaitaire adaptée.',
        badge: 'Chantiers'
      },
      {
        icon: '📄',
        title: 'Pièces Jointes PDF & Devis',
        desc: 'Associez des devis, plans techniques et factures PDF aux interventions avec prévisualisation immédiate.',
        badge: 'Documents'
      },
      {
        icon: '📲',
        title: 'Page Client Épurée & Boutons Agenda 1-Clic',
        desc: 'Lien client élégant avec boutons cliquables Google Agenda & Apple Calendrier sans affichage d\'adresse brute.',
        badge: 'Expérience Client'
      }
    ],
    improvements: [
      {
        icon: '📥',
        title: 'Fichiers téléchargeables',
        desc: 'Les clients peuvent consulter directement les documents PDF joints depuis leur lien WhatsApp.'
      }
    ],
    fixes: [
      {
        title: 'Masquage des URLs brutes dans WhatsApp',
        desc: 'Remplacement des longs liens texte par une interface d\'accueil dédiée et soignée.'
      }
    ]
  },
  {
    version: '2.2.0',
    codename: 'Profil Entreprise & Multi-Métiers',
    date: '14 Septembre 2026',
    highlight: 'Profil d\'entreprise personnalisable pour tout corps de métier (Plomberie, PAC, Poêle à bois, Ramonage...)',
    features: [
      {
        icon: '🔧',
        title: 'Gestionnaire de Prestations & Métiers',
        desc: 'Créez vos propres services, durées, tarifs et catégories adaptés à votre spécialité artisanale.',
        badge: 'Paramètres PME'
      },
      {
        icon: '👥',
        title: 'Collaborateurs & Spécialités',
        desc: 'Attribuez des compétences techniques et des codes couleurs distincts à chaque membre de l\'équipe.',
        badge: 'Équipe'
      }
    ],
    improvements: [
      {
        icon: '🤖',
        title: 'IA adaptative selon le métier',
        desc: 'L\'assistant WhatsApp répond en utilisant le catalogue et la terminologie propre à votre entreprise.'
      }
    ],
    fixes: [
      {
        title: 'Durée par défaut synchronisée',
        desc: 'La durée d\'une intervention s\'ajuste automatiquement dès sélection de la prestation.'
      }
    ]
  },
  {
    version: '2.1.0',
    codename: 'Envoi de Fichiers & Chat en Direct',
    date: '14 Septembre 2026',
    highlight: 'Bouton "+" d\'envoi de fichiers dans le chat et synchronisation en direct des messages humains',
    features: [
      {
        icon: '📎',
        title: 'Envoi Multi-Formats dans le Chat',
        desc: 'Bouton "+" pour expédier devis PDF, classeurs Excel, documents Word et photos aux clients.',
        badge: 'Messagerie'
      },
      {
        icon: '👁️',
        title: 'Affichage des Messages Humains en Direct',
        desc: 'Visualisation immédiate des messages envoyés depuis l\'app ou le téléphone portable dans le fil de discussion.',
        badge: 'Fil en direct'
      }
    ],
    improvements: [
      {
        icon: '💬',
        title: 'Bulles différenciées',
        desc: 'Distinction claire entre les messages générés par l\'IA (🤖) et ceux envoyés par l\'humain (👤).'
      }
    ],
    fixes: [
      {
        title: 'Anti-duplication des messages',
        desc: 'Évite l\'écho lors de l\'envoi simultané depuis l\'application web et l\'application mobile WhatsApp.'
      }
    ]
  },
  {
    version: '2.0.0',
    codename: 'Refonte Mobile & Fiches CRM 360°',
    date: '14 Septembre 2026',
    highlight: 'Refonte complète pour ordinateurs, tablettes et smartphones + Fiche Client 360°',
    features: [
      {
        icon: '📱',
        title: 'Design 100% Responsive',
        desc: 'Utilisable sur smartphone sur chantier, tablette en intervention ou grand écran au bureau.',
        badge: 'Multi-Écrans'
      },
      {
        icon: '📇',
        title: 'Fiche Client 360° Dédiée',
        desc: 'Tiroir complet avec coordonnées, mémoires IA, historique des conversations et rendez-vous.',
        badge: 'CRM 360°'
      }
    ],
    improvements: [
      {
        icon: '⚡',
        title: 'Menu mobile coulissant',
        desc: 'Navigation fluide avec tiroir latéral optimisé pour écran tactile.'
      }
    ],
    fixes: [
      {
        title: 'Adaptation automatique des colonnes',
        desc: 'Défilement horizontal doux sur l\'agenda pour une lisibilité parfaite sur mobile.'
      }
    ]
  }
];
