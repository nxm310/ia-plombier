# Hub PME : Agenda & CRM Collaboratif 🚀

Application web professionnelle et légère de gestion d'agenda, de suivi d'interventions et de CRM pour PME, artisans et équipes terrain :
- **Agenda Collaboratif & Planning Multi-techniciens** : organisation visuelle par jour, semaine ou mois avec code couleur et filtrage.
- **Export Calendrier Universel** : synchronisation en 1 clic vers Google Agenda (web direct) et Apple Calendrier / Outlook (.ics natif).
- **Ordres de Mission Collaborateurs** : page dédiée avec itinéraire GPS (Waze / Google Maps), coordonnées client et déclenchement SMS en 1 tap.
- **Fiches CRM & Historique Clients** : suivi des coordonnées, adresses d'intervention, notes de chantier et documents.
- **Synchronisation Équipe Multi-appareils** : partage d'agenda par code d'équipe et synchronisation Cloud temps réel.
- **100% Autonome** : aucune dépendance externe obligatoire, zéro clé d'API, hébergement local ou cloud instantané.

---

## 🌟 Fonctionnalités Principales

### 1. Agenda & Prise de Rendez-vous Instantanée
- Enregistrement immédiat sans fenêtre bloquante ni étape superflue.
- Détection des disponibilités par collaborateur et prévention des conflits d'horaires.
- Vue calendrier interactive avec codes couleurs par membre de l'équipe et statuts (Confirmé, En attente, Terminé, Annulé).
- Export natif vers **Google Agenda** et téléchargement de fichier **.ics** compatible Apple / iOS, Mac et Outlook.

### 2. Ordres de Mission Terrain
- Chaque rendez-vous génère un lien d'ordre de mission partageable avec le technicien ou sous-traitant.
- Accès direct en 1 clic à l'itinéraire GPS via Google Maps ou Waze.
- Coordonnées client cliquables (appel téléphonique direct et envoi de SMS pré-rempli).

### 3. CRM & Fiches Clients PME
- Centralisation des clients, prospects et contacts professionnels.
- Historique complet des interventions passées et à venir par client.
- Notes techniques, codes d'accès, consignes de sécurité et particularités chantiers.

### 4. Gestion d'Équipe & Plages Horaires
- Fiches collaborateurs personnalisées : spécialités, coordonnées, couleur dédiée.
- Configuration des horaires de travail par jour de la semaine (matin / après-midi).
- Code d'équipe pour synchroniser les plannings en temps réel entre le bureau et les équipes sur le terrain.

---

## 🚀 Démarrage Rapide

### Prérequis
- Node.js (v18+)
- npm ou pnpm

### Installation

```bash
# Installer les dépendances
npm install
```

### Lancement en Mode Développement

```bash
# Lance le serveur backend (port 3001) et le client Vite (port 5173)
npm run dev
```

L'application web est accessible sur :
- 👉 **http://localhost:5173** (Interface de développement avec HMR)  
- 👉 **http://localhost:3001** (Serveur API & Express)

### Compilation pour Production

```bash
npm run build
npm start
```

---

## 🧪 Tests & Qualité

Pour vérifier l'intégrité de la base SQLite et des services d'agenda :

```bash
npm test
```

---

## 📁 Architecture du Code

```
hub-pme/
├── client/                     # Interface Web React 19 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── context/AppContext.tsx   # État global, synchronisation & connectivité
│   │   ├── components/
│   │   │   ├── Sidebar.tsx          # Navigation latérale et statut système
│   │   │   ├── TeamAccessBar.tsx    # Partage et connexion de code d'équipe
│   │   │   └── PatchNotesModal.tsx  # Journal des nouveautés et versions
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx        # Vue d'ensemble, métriques et accès rapide
│   │   │   ├── Appointments.tsx     # Planning interactif, tiroir d'intervention et exports
│   │   │   ├── Team.tsx             # Gestion des intervenants & horaires
│   │   │   ├── Contacts.tsx         # CRM clients & historique
│   │   │   ├── ServicesManager.tsx  # Catalogue des prestations et tarifs
│   │   │   └── Settings.tsx         # Paramètres entreprise et sauvegardes
│   │   └── utils/
│   │       ├── calendar.ts          # Générateurs Google Agenda, ICS & messages
│   │       └── phone.ts             # Formatage téléphonique et SMS
├── server/                     # Backend Node.js / Express / TypeScript
│   ├── index.ts                # Serveur Express, WebSocket & API Health
│   ├── routes/
│   │   └── api.ts              # Endpoints REST (rdv, contacts, équipe, services)
│   ├── db/
│   │   ├── database.ts         # Schéma SQLite (@libsql/client) & initialisation
│   │   └── queries.ts          # Requêtes typées (CRUD complet)
│   └── services/
│       ├── appointments.ts     # Calcul des créneaux disponibles
│       ├── calendar.ts         # Formatage ICS et notifications
│       └── websocket.ts        # Diffusion temps réel
└── data/                       # Base SQLite locale persistante
```
