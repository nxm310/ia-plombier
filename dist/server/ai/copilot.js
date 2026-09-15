import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { getSetting, getAllTeamMembers, getAppointments, getAllContacts, saveCopilotMessage, getCopilotMessages } from '../db/queries.js';
import { sendManualWhatsAppMessage } from '../whatsapp/client.js';
export async function chatWithCopilot(options) {
    const { message } = options;
    // 1. Sauvegarder le message de l'utilisateur
    await saveCopilotMessage('user', message);
    // 2. Configuration IA & Entreprise
    const aiConfig = (await getSetting('ai_config')) || {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        geminiApiKey: process.env.GEMINI_API_KEY || '',
        openaiApiKey: process.env.OPENAI_API_KEY || '',
        systemPrompt: 'Tu es l\'assistante virtuelle Clara.',
        temperature: 0.6
    };
    const companyConfig = (await getSetting('company')) || {
        name: 'Notre Entreprise PME',
        activity: 'Services professionnels',
        phone: '+33 1 00 00 00 00',
        description: 'Services pour professionnels et particuliers.'
    };
    // Contexte temporel
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const timeFormatted = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    const todayISO = now.toISOString().split('T')[0];
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowISO = tomorrowDate.toISOString().split('T')[0];
    // Collaborateurs
    const teamMembers = await getAllTeamMembers();
    const teamSummary = teamMembers.map(m => `- ID ${m.id} : ${m.name} (${m.role}) | Statut : ${m.status || 'actif'} | Tél : ${m.phone || 'Non renseigné'}`).join('\n');
    // Historique récent
    const recentHistory = await getCopilotMessages(10);
    const conversationContext = recentHistory.map(m => `${m.role === 'user' ? 'Gérant' : 'Clara'} : ${m.content}`).join('\n');
    // Déclaration des outils du Copilote
    const COPILOT_TOOLS = [
        {
            name: 'getAgendaSummary',
            description: 'Récupère et résume les rendez-vous planifiés pour une période donnée (aujourd\'hui, demain, cette semaine, ou date précise).',
            parameters: {
                type: 'object',
                properties: {
                    period: {
                        type: 'string',
                        enum: ['today', 'tomorrow', 'this_week', 'custom'],
                        description: 'Période : today (aujourd\'hui), tomorrow (demain), this_week (cette semaine), custom (date personnalisée).'
                    },
                    date: {
                        type: 'string',
                        description: 'Date au format YYYY-MM-DD si period = custom.'
                    }
                },
                required: ['period']
            }
        },
        {
            name: 'getFinancialForecast',
            description: 'Calcule le chiffre d\'affaires prévisionnel et les statistiques financières des rendez-vous et prestations (semaine, mois, aujourd\'hui, demain).',
            parameters: {
                type: 'object',
                properties: {
                    period: {
                        type: 'string',
                        enum: ['today', 'tomorrow', 'this_week', 'this_month'],
                        description: 'Période d\'analyse financière.'
                    }
                },
                required: ['period']
            }
        },
        {
            name: 'sendWhatsAppToTeamMember',
            description: 'Envoie un message WhatsApp direct à un membre de l\'équipe ou collaborateur (ex: Thomas, Nicolas). Trouve automatiquement son numéro.',
            parameters: {
                type: 'object',
                properties: {
                    memberName: {
                        type: 'string',
                        description: 'Prénom ou nom du collaborateur (ex: "Thomas", "Lucas").'
                    },
                    messageText: {
                        type: 'string',
                        description: 'Le message textuel exact à transmettre sur WhatsApp.'
                    }
                },
                required: ['memberName', 'messageText']
            }
        },
        {
            name: 'sendWhatsAppToClient',
            description: 'Envoie un message WhatsApp direct à un client ou prospect.',
            parameters: {
                type: 'object',
                properties: {
                    clientQuery: {
                        type: 'string',
                        description: 'Nom, prénom ou numéro de téléphone du client.'
                    },
                    messageText: {
                        type: 'string',
                        description: 'Le message textuel à lui envoyer.'
                    }
                },
                required: ['clientQuery', 'messageText']
            }
        },
        {
            name: 'getTeamStatus',
            description: 'Donne l\'état des effectifs : qui est actif, en vacances, en arrêt maladie, ou indisponible.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    ];
    // Exécuteur des outils
    let executedActionData = null;
    async function executeCopilotTool(toolName, args) {
        if (toolName === 'getAgendaSummary') {
            let targetStart = todayISO;
            let targetEnd = todayISO;
            if (args.period === 'tomorrow') {
                targetStart = tomorrowISO;
                targetEnd = tomorrowISO;
            }
            else if (args.period === 'this_week') {
                const d = new Date(now);
                const day = d.getDay();
                const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(d.setDate(diffToMonday));
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                targetStart = monday.toISOString().split('T')[0];
                targetEnd = sunday.toISOString().split('T')[0];
            }
            else if (args.period === 'custom' && args.date) {
                targetStart = args.date;
                targetEnd = args.date;
            }
            const apts = await getAppointments({ startDate: targetStart, endDate: targetEnd });
            executedActionData = {
                type: 'agenda_summary',
                period: args.period,
                startDate: targetStart,
                endDate: targetEnd,
                count: apts.length,
                appointments: apts.map(a => ({
                    id: a.id,
                    title: a.title,
                    date: a.date,
                    start_time: a.start_time,
                    end_time: a.end_time,
                    contact_name: a.contact_name || a.contact_phone,
                    team_member_name: a.team_member_name || 'Non assigné',
                    service_name: a.service_name,
                    price: a.service_price || 0,
                    status: a.status
                }))
            };
            return executedActionData;
        }
        if (toolName === 'getFinancialForecast') {
            let start = todayISO;
            let end = todayISO;
            if (args.period === 'tomorrow') {
                start = tomorrowISO;
                end = tomorrowISO;
            }
            else if (args.period === 'this_week') {
                const d = new Date(now);
                const day = d.getDay();
                const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(d.setDate(diffToMonday));
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                start = monday.toISOString().split('T')[0];
                end = sunday.toISOString().split('T')[0];
            }
            else if (args.period === 'this_month') {
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                start = `${year}-${month}-01`;
                const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
                end = `${year}-${month}-${lastDay}`;
            }
            const apts = await getAppointments({ startDate: start, endDate: end });
            let total = 0;
            let confirmed = 0;
            let pending = 0;
            const breakdownByService = {};
            const breakdownByMember = {};
            for (const a of apts) {
                if (a.status === 'cancelled')
                    continue;
                const price = Number(a.service_price || 0);
                total += price;
                if (a.status === 'confirmed')
                    confirmed += price;
                else
                    pending += price;
                const sName = a.service_name || 'Intervention générale';
                if (!breakdownByService[sName])
                    breakdownByService[sName] = { count: 0, total: 0 };
                breakdownByService[sName].count++;
                breakdownByService[sName].total += price;
                const mName = a.team_member_name || 'Équipe';
                if (!breakdownByMember[mName])
                    breakdownByMember[mName] = { count: 0, total: 0 };
                breakdownByMember[mName].count++;
                breakdownByMember[mName].total += price;
            }
            executedActionData = {
                type: 'financial_forecast',
                period: args.period,
                startDate: start,
                endDate: end,
                totalRevenue: total,
                confirmedRevenue: confirmed,
                pendingRevenue: pending,
                appointmentsCount: apts.filter(a => a.status !== 'cancelled').length,
                averageBasket: apts.length > 0 ? Math.round(total / apts.length) : 0,
                breakdownByService,
                breakdownByMember
            };
            return executedActionData;
        }
        if (toolName === 'sendWhatsAppToTeamMember') {
            const q = (args.memberName || '').toLowerCase().trim();
            const allMembers = await getAllTeamMembers();
            const found = allMembers.find(m => m.name.toLowerCase().includes(q) ||
                m.role.toLowerCase().includes(q));
            if (!found) {
                return {
                    success: false,
                    error: `Aucun collaborateur trouvé pour "${args.memberName}". Membres disponibles : ${allMembers.map(m => m.name).join(', ')}`
                };
            }
            if (!found.phone) {
                return {
                    success: false,
                    error: `Le collaborateur ${found.name} n'a pas de numéro de téléphone renseigné.`
                };
            }
            try {
                await sendManualWhatsAppMessage(found.phone, args.messageText);
                executedActionData = {
                    type: 'whatsapp_sent',
                    recipientType: 'collaborator',
                    name: found.name,
                    role: found.role,
                    phone: found.phone,
                    message: args.messageText
                };
                return {
                    success: true,
                    deliveredTo: found.name,
                    phone: found.phone,
                    message: args.messageText
                };
            }
            catch (err) {
                return {
                    success: false,
                    error: `Erreur lors de l'envoi WhatsApp à ${found.name} : ${err.message}`
                };
            }
        }
        if (toolName === 'sendWhatsAppToClient') {
            const q = (args.clientQuery || '').toLowerCase().trim();
            const allContacts = await getAllContacts();
            const found = allContacts.find(c => (c.name && c.name.toLowerCase().includes(q)) ||
                c.phone_number.includes(q));
            if (!found) {
                return {
                    success: false,
                    error: `Aucun contact trouvé pour "${args.clientQuery}".`
                };
            }
            try {
                await sendManualWhatsAppMessage(found.phone_number, args.messageText, found.id);
                executedActionData = {
                    type: 'whatsapp_sent',
                    recipientType: 'client',
                    name: found.name || found.phone_number,
                    phone: found.phone_number,
                    message: args.messageText
                };
                return {
                    success: true,
                    deliveredTo: found.name || found.phone_number,
                    phone: found.phone_number,
                    message: args.messageText
                };
            }
            catch (err) {
                return {
                    success: false,
                    error: `Erreur lors de l'envoi WhatsApp au client : ${err.message}`
                };
            }
        }
        if (toolName === 'getTeamStatus') {
            const allMembers = await getAllTeamMembers();
            executedActionData = {
                type: 'team_status',
                members: allMembers.map(m => ({
                    id: m.id,
                    name: m.name,
                    role: m.role,
                    status: m.status || 'active',
                    phone: m.phone
                }))
            };
            return executedActionData;
        }
        return { error: 'Outil inconnu' };
    }
    // Construction du Prompt Système Exécutif
    const copilotSystemPrompt = `Tu es Clara, le Copilote Exécutif IA et Bras Droit opérationnel du GÉRANT de l'entreprise "${companyConfig.name}".
Tu t'adresses DIRECTEMENT au Dirigeant de la PME.

INFORMATIONS ENTREPRISE :
- Entreprise : ${companyConfig.name} (${companyConfig.activity})
- Téléphone standard : ${companyConfig.phone}

DATE ET HEURE ACTUELLES :
- Aujourd'hui : ${dateFormatted} (Format ISO : ${todayISO})
- Demain : ${tomorrowISO}
- Heure : ${timeFormatted}

EFFECTIF & ÉQUIPE ACTUELLE :
${teamSummary}

TON RÔLE & DIRECTIVES :
1. Tu es son assistante de direction autonome : proactive, efficace, claire et précise.
2. Si le gérant te demande un résumé d'agenda (demain, aujourd'hui, semaine), appelle obligatoirement "getAgendaSummary" et donne une vue limpide avec les horaires, clients et techniciens.
3. Si le gérant te demande le chiffre d'affaires prévisionnel ou les performances financières, appelle l'outil "getFinancialForecast" et donne le montant total en euros, le panier moyen et les prestations prévues.
4. Si le gérant te demande de contacter un collaborateur (ex: "Envoie un message à Thomas pour lui dire qu'on a du retard"), appelle sans hésiter "sendWhatsAppToTeamMember".
5. Si le gérant te demande de contacter un client, utilise "sendWhatsAppToClient".
6. Réponds avec élégance, des puces bien aérées, des emojis pertinents et confirme toujours avec précision les actions concrètes que tu as effectuées.`;
    // Exécution avec Gemini (ou fallback OpenAI)
    const geminiApiKey = aiConfig.geminiApiKey || process.env.GEMINI_API_KEY;
    let finalReply = '';
    if (geminiApiKey) {
        try {
            const genAI = new GoogleGenerativeAI(geminiApiKey);
            const modelName = aiConfig.model && aiConfig.model.includes('gemini')
                ? aiConfig.model
                : 'gemini-2.5-flash';
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: copilotSystemPrompt,
                tools: [{ functionDeclarations: COPILOT_TOOLS }]
            });
            const chat = model.startChat({
                history: recentHistory.slice(-6).map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.content }]
                }))
            });
            let response = await chat.sendMessage(message);
            let functionCalls = response.response.functionCalls();
            // Boucle d'exécution des outils
            let toolLoopCount = 0;
            while (functionCalls && functionCalls.length > 0 && toolLoopCount < 3) {
                toolLoopCount++;
                const functionResponses = [];
                for (const call of functionCalls) {
                    const result = await executeCopilotTool(call.name, call.args);
                    functionResponses.push({
                        functionResponse: {
                            name: call.name,
                            response: { result }
                        }
                    });
                }
                response = await chat.sendMessage(functionResponses);
                functionCalls = response.response.functionCalls();
            }
            finalReply = response.response.text();
        }
        catch (err) {
            console.error('[Copilot] Erreur Gemini Copilot:', err);
        }
    }
    // Fallback si Gemini indisponible ou erreur
    if (!finalReply) {
        if (aiConfig.openaiApiKey || process.env.OPENAI_API_KEY) {
            try {
                const openai = new OpenAI({ apiKey: aiConfig.openaiApiKey || process.env.OPENAI_API_KEY });
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: copilotSystemPrompt },
                        ...recentHistory.slice(-6).map(m => ({
                            role: m.role === 'user' ? 'user' : 'assistant',
                            content: m.content
                        })),
                        { role: 'user', content: message }
                    ]
                });
                finalReply = completion.choices[0]?.message?.content || '';
            }
            catch (e) {
                console.error('[Copilot] Erreur OpenAI Copilot fallback:', e);
            }
        }
    }
    if (!finalReply) {
        finalReply = "Je suis désolée, j'ai rencontré une difficulté lors du traitement de votre demande. Veuillez vérifier la connexion ou la configuration de la clé IA.";
    }
    // 3. Sauvegarder la réponse de l'assistant
    await saveCopilotMessage('assistant', finalReply, executedActionData);
    return {
        reply: finalReply,
        actionData: executedActionData
    };
}
