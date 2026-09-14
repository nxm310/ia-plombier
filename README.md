# Assistant IA WhatsApp 24/7 pour PME 🚀

Application web complète de gestion d'un agent intelligent disponible **24h/24 et 7j/7 sur WhatsApp** pour PME et petites équipes :
- **Mémoire continue** de l'ensemble des conversations, besoins et préférences clients.
- **Moteur de prise de rendez-vous automatique** sans conflit d'agenda.
- **Gestion multi-collaborateurs** avec plages horaires personnalisées et routage intelligent.
- **Prise de main humaine ("Human Takeover")** instantanée depuis le tableau de bord.
- **Connexion WhatsApp par QR Code** direct depuis l'interface web (sans formalité Meta obligatoire).

---

## 🌟 Fonctionnalités

### 1. Agent IA WhatsApp 24/7
- Accueille vos prospects et clients à toute heure du jour et de la nuit.
- Répond aux questions sur les prestations, tarifs et coordonnées de l'entreprise.
- Supporte **Google Gemini** (Gemini 2.5 Flash / Pro) et **OpenAI** (GPT-4o, GPT-4o-mini).
- Mode démo interactif intégré dans le tableau de bord pour simuler des conversations sans téléphone.

### 2. Mémoire Continue & Fiches CRM
- Sauvegarde locale intégrale dans SQLite de chaque message entrant et sortant.
- Extraction automatique des faits clés du client (prénom, nom, budget, contraintes, type de projet).
- Injection automatique des faits mémorisés dans les prompts pour personnaliser chaque réponse.

### 3. Prise de Rendez-vous Intelligente
- Calcul des créneaux libres en temps réel selon les horaires de chaque collaborateur.
- Détection des conflits : un créneau réservé est immédiatement bloqué pour éviter toute double réservation.
- Rappels de rendez-vous automatiques envoyés sur WhatsApp avant l'heure prévue.
- Calendrier interactif avec filtrage par collaborateur et statut (Confirmé, En attente, Terminé, Annulé).

### 4. Gestion Multi-Collaborateurs pour PME
- Fiches de collaborateurs avec rôle, spécialités reconnues par l'IA et code couleur.
- Configuration précise des horaires d'ouverture par jour de la semaine (matin / après-midi).
- L'IA oriente automatiquement le rendez-vous vers le bon membre de l'équipe selon la demande du client.

### 5. Prise de Main Humaine & Live Chat
- Basculez en 1 clic l'auto-répondeur IA sur **Suspendu** pour répondre manuellement au client sans interférence de l'agent.
- Visualisez les messages en direct grâce au WebSocket temps réel.

---

## 🚀 Démarrage Rapide

### Prérequis
- Node.js (v18+)
- npm ou pnpm

### Installation

```bash
# Cloner le projet et installer les dépendances
npm install
```

### Configuration (Optionnel)
Un fichier `.env` est préconfiguré à la racine. Vous pouvez renseigner vos clés d'API (Gemini ou OpenAI) directement dans le fichier `.env` ou depuis la page **Paramètres** de l'application web :

```env
PORT=3001
GEMINI_API_KEY=votre_cle_gemini
OPENAI_API_KEY=votre_cle_openai
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash
```

### Lancement en Mode Développement

```bash
# Lance le serveur backend (3001) et l'interface Vite (5173) en simultané
npm run dev
```

L'application web est accessible sur :
👉 **http://localhost:5173** (avec rechargement à chaud Vite)  
ou directement sur le serveur Express :  
👉 **http://localhost:3001**

---

## 📱 Comment Connecter WhatsApp ?

1. Rendez-vous sur l'onglet **Connexion WhatsApp** dans l'application web.
2. Ouvrez l'application **WhatsApp** sur votre smartphone.
3. Allez dans **Réglages** &gt; **Appareils connectés** &gt; **Connecter un appareil**.
4. Scannez le **QR Code** affiché sur votre écran d'ordinateur.
5. Votre session est sauvegardée localement dans le dossier `data/` : votre agent est désormais actif 24h/24 !

---

## 🧪 Lancement des Tests

Pour vérifier l'intégrité de la base SQLite, du moteur d'agenda et des outils IA :

```bash
npm test # ou : npx tsx tests/test-suite.ts
```

---

## 📁 Architecture du Code

```
assistant-whatsapp/
├── client/                     # Interface Web React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── context/AppContext.tsx   # WebSocket temps réel & état global
│   │   ├── components/Sidebar.tsx   # Navigation & indicateur d'état WhatsApp
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx        # KPIs, simulateur & synthèse
│   │   │   ├── Conversations.tsx    # Live chat & prise de main humaine
│   │   │   ├── Appointments.tsx     # Gestion des rendez-vous & calendrier
│   │   │   ├── Team.tsx             # Gestion de l'équipe & horaires
│   │   │   ├── Contacts.tsx         # CRM & faits mémorisés par l'IA
│   │   │   ├── WhatsAppConnect.tsx  # Scanner QR Code WhatsApp
│   │   │   └── Settings.tsx         # Configuration PME & clés LLM
├── server/                     # Serveur Backend Node.js / Express / Baileys
│   ├── index.ts                # Serveur Express & WebSocket
│   ├── db/
│   │   ├── database.ts         # Connexion SQLite (@libsql/client) & données initiales
│   │   └── queries.ts          # Requêtes typées (contacts, messages, rdv, team)
│   ├── whatsapp/
│   │   └── client.ts           # Client Baileys (QR code, réceptions & envois)
│   ├── ai/
│   │   ├── agent.ts            # Orchestrateur IA multi-fournisseur (Gemini / OpenAI)
│   │   └── tools.ts            # Outils IA (créneaux, réservations, mémorisation)
│   └── services/
│       ├── appointments.ts     # Moteur de créneaux & conflits horaires
│       └── reminders.ts        # Service de rappels automatiques WhatsApp
├── tests/
│   └── test-suite.ts           # Suite de tests automatisée
└── data/                       # Base SQLite locale et session WhatsApp persistante
```
