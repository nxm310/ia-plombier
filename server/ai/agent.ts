import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import {
  Contact,
  getMemoriesByContact,
  getMessagesByContact,
  getSetting,
  getAllTeamMembers,
  getAllServices,
  getAppointments,
  saveOrUpdateMemory
} from '../db/queries.js';
import { AI_TOOLS_DECLARATIONS, executeToolCall } from './tools.js';

export interface GenerateResponseOptions {
  contact: Contact;
  incomingText: string;
}

export async function generateAgentReply(options: GenerateResponseOptions): Promise<string> {
  const { contact, incomingText } = options;

  // Récupérer la configuration
  const aiConfig = (await getSetting('ai_config')) || {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    systemPrompt: 'Tu es l\'assistante virtuelle de l\'entreprise.',
    temperature: 0.7
  };

  const companyConfig = (await getSetting('company')) || {
    name: 'Notre Entreprise PME',
    activity: 'Services professionnels',
    phone: '+33 1 00 00 00 00',
    description: 'Services pour professionnels et particuliers.'
  };

  // Récupérer la mémoire à long terme du contact
  const memories = await getMemoriesByContact(contact.id);
  const memoryContext = memories.length > 0
    ? memories.map(m => `- [${m.category}] ${m.key}: ${m.value}`).join('\n')
    : '(Aucune information mémorisée pour ce contact pour le moment)';

  // Récupérer l'équipe
  const teamMembers = await getAllTeamMembers(true);
  const teamContext = teamMembers.map(m =>
    `- ${m.name} (${m.role}) : Spécialités: ${m.specialties.join(', ')}`
  ).join('\n');

  // Récupérer les services
  const services = await getAllServices(true);
  const servicesContext = services.map(s =>
    `- ${s.name} (durée: ${s.duration_minutes} min, tarif: ${s.price > 0 ? s.price + '€' : 'Gratuit'})`
  ).join('\n');

  // Récupérer les rendez-vous existants de ce contact
  const existingApts = await getAppointments({ contactId: contact.id });
  const aptsContext = existingApts.length > 0
    ? existingApts.map(a => `- ${a.title} le ${a.date} de ${a.start_time} à ${a.end_time} avec ${a.team_member_name || 'l\'équipe'} [Statut: ${a.status}]`).join('\n')
    : '(Aucun rendez-vous enregistré pour ce client)';

  // Horodatage actuel
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

  // Construction du Prompt Système complet
  const fullSystemPrompt = `
${aiConfig.systemPrompt}

--- INFORMATIONS SUR L'ENTREPRISE ---
- Nom de l'entreprise : ${companyConfig.name}
- Activité : ${companyConfig.activity}
- Téléphone standard : ${companyConfig.phone}
- Description : ${companyConfig.description}

--- ÉQUIPE & COLLABORATEURS ---
${teamContext}

--- SERVICES PROPOSÉS ---
${servicesContext}

--- CONTEXTE TEMPOREL ---
- Date actuelle : ${dateFormatted} (Format YYYY-MM-DD : ${todayISO})
- Heure actuelle : ${timeFormatted}

--- FICHE CLIENT & MÉMOIRE LONG-TERME ---
- Nom du client : ${contact.name || 'Non renseigné'}
- Numéro WhatsApp : ${contact.phone_number}
- Faits mémorisés sur ce client :
${memoryContext}
- Rendez-vous existants pour ce client :
${aptsContext}

--- INSTRUCTIONS STRICTES ---
1. Parle avec politesse, concision et professionnalisme. Tes messages WhatsApp doivent être clairs, aérés et faciles à lire sur un smartphone.
2. Si le client donne son prénom ou son nom, utilise l'outil "saveClientMemory" pour retenir son nom complet.
3. Si le client mentionne un besoin spécifique (projet, budget, contrainte), enregistre-le avec "saveClientMemory".
4. Pour une prise de rendez-vous :
   - Commence par vérifier la disponibilité avec "getAvailableSlots".
   - Si le client a validé un créneau précis, réserve-le TOUJOURS immédiatement via "bookAppointment".
   - Confirme toujours la date, l'heure et le nom du collaborateur au client.
5. Si le client demande expressément à être appelé par un humain ou que la situation est un litige, utilise "handoverToHuman".
6. Réponds toujours en français sauf si le client s'exprime dans une autre langue.
`.trim();

  // Historique des messages récents
  const pastMessages = await getMessagesByContact(contact.id, 12);

  // Vérifier la clé API
  const geminiKey = aiConfig.geminiApiKey || process.env.GEMINI_API_KEY;
  const openaiKey = aiConfig.openaiApiKey || process.env.OPENAI_API_KEY;

  if (!geminiKey && !openaiKey) {
    // Mode démo / fallback si aucune clé n'est encore configurée dans le dashboard
    return fallbackResponse(incomingText, contact, companyConfig);
  }

  // 1. Exécution via Google Gemini
  if (aiConfig.provider === 'gemini' && geminiKey) {
    try {
      return await runGeminiAgent({
        apiKey: geminiKey,
        modelName: aiConfig.model || 'gemini-2.5-flash',
        systemPrompt: fullSystemPrompt,
        pastMessages,
        incomingText,
        contact
      });
    } catch (err: any) {
      console.error('[AI Agent] Erreur Gemini:', err);
      // En cas d'erreur de quota ou de modèle, essayer OpenAI si configuré
      if (openaiKey) {
        return await runOpenAIAgent({
          apiKey: openaiKey,
          modelName: 'gpt-4o-mini',
          systemPrompt: fullSystemPrompt,
          pastMessages,
          incomingText,
          contact
        });
      }
      return `Merci pour votre message ! Notre équipe (${companyConfig.name}) a bien reçu votre demande et revient vers vous très rapidement.`;
    }
  }

  // 2. Exécution via OpenAI
  if (openaiKey) {
    try {
      return await runOpenAIAgent({
        apiKey: openaiKey,
        modelName: aiConfig.model || 'gpt-4o-mini',
        systemPrompt: fullSystemPrompt,
        pastMessages,
        incomingText,
        contact
      });
    } catch (err: any) {
      console.error('[AI Agent] Erreur OpenAI:', err);
      return `Bonjour ! Nous avons bien reçu votre message. Un membre de notre équipe va prendre contact avec vous.`;
    }
  }

  return fallbackResponse(incomingText, contact, companyConfig);
}

/**
 * Exécution de l'agent avec Google Gemini et Function Calling
 */
async function runGeminiAgent(params: {
  apiKey: string;
  modelName: string;
  systemPrompt: string;
  pastMessages: any[];
  incomingText: string;
  contact: Contact;
}): Promise<string> {
  const genAI = new GoogleGenerativeAI(params.apiKey);

  // Outils Gemini
  const tools: any = [{
    functionDeclarations: AI_TOOLS_DECLARATIONS.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }))
  }];

  const model = genAI.getGenerativeModel({
    model: params.modelName,
    systemInstruction: params.systemPrompt,
    tools
  });

  // Convertir l'historique au format Gemini
  // Règle Gemini : Le premier message doit impérativement avoir role: 'user', et les rôles doivent alterner
  const chatHistory: any[] = [];
  for (const m of params.pastMessages) {
    if (!m.content || !m.content.trim()) continue;
    const role = m.sender_type === 'client' ? 'user' : 'model';
    if (chatHistory.length === 0 && role === 'model') {
      // Ignorer les messages sortants initiaux si le premier message n'est pas client
      continue;
    }
    const last = chatHistory[chatHistory.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n${m.content}`;
    } else {
      chatHistory.push({
        role,
        parts: [{ text: m.content }]
      });
    }
  }

  const chat = model.startChat({
    history: chatHistory
  });

  let response = await chat.sendMessage(params.incomingText);
  let functionCalls = response.response.functionCalls();

  // Boucle d'exécution des outils (jusqu'à 5 itérations pour éviter les boucles infinies)
  let iterations = 0;
  while (functionCalls && functionCalls.length > 0 && iterations < 5) {
    iterations++;
    const functionResponses: any[] = [];

    for (const call of functionCalls) {
      const toolResult = await executeToolCall(call.name, call.args, {
        contactId: params.contact.id,
        contactPhone: params.contact.phone_number
      });

      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: toolResult
        }
      });
    }

    response = await chat.sendMessage(functionResponses);
    functionCalls = response.response.functionCalls();
  }

  return response.response.text();
}

/**
 * Exécution de l'agent avec OpenAI et Tools
 */
async function runOpenAIAgent(params: {
  apiKey: string;
  modelName: string;
  systemPrompt: string;
  pastMessages: any[];
  incomingText: string;
  contact: Contact;
}): Promise<string> {
  const openai = new OpenAI({ apiKey: params.apiKey });

  const openAiTools: any[] = AI_TOOLS_DECLARATIONS.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }
  }));

  const messages: any[] = [
    { role: 'system', content: params.systemPrompt }
  ];

  for (const m of params.pastMessages) {
    messages.push({
      role: m.sender_type === 'client' ? 'user' : 'assistant',
      content: m.content
    });
  }

  messages.push({ role: 'user', content: params.incomingText });

  let runner = await openai.chat.completions.create({
    model: params.modelName,
    messages,
    tools: openAiTools,
    tool_choice: 'auto'
  });

  let iterations = 0;
  while (runner.choices[0].message.tool_calls && iterations < 5) {
    iterations++;
    const assistantMsg = runner.choices[0].message;
    messages.push(assistantMsg);

    if (assistantMsg.tool_calls) {
      for (const toolCall of assistantMsg.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments || '{}');
        const result = await executeToolCall(toolCall.function.name, args, {
          contactId: params.contact.id,
          contactPhone: params.contact.phone_number
        });

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
    }

    runner = await openai.chat.completions.create({
      model: params.modelName,
      messages,
      tools: openAiTools
    });
  }

  return runner.choices[0].message.content || 'Message bien reçu !';
}

/**
 * Réponse de secours intuitive quand aucune clé API LLM n'est encore configurée
 */
function fallbackResponse(text: string, contact: Contact, company: any): string {
  const lower = text.toLowerCase();

  if (lower.includes('bonjour') || lower.includes('salut') || lower.includes('hello')) {
    return `Bonjour ! Bienvenue chez ${company.name}. Je suis votre assistant virtuel disponible 24h/24. Comment puis-je vous aider aujourd'hui ? (Pour prendre un rendez-vous, découvrir nos services ou échanger avec l'équipe).`;
  }

  if (lower.includes('rdv') || lower.includes('rendez-vous') || lower.includes('devis') || lower.includes('dispo')) {
    return `Avec plaisir ! Nous proposons des créneaux d'échange téléphonique ou sur site du lundi au vendredi de 9h à 18h30. Pour réserver, indiquez-moi le jour qui vous conviendrait le mieux !`;
  }

  if (lower.includes('humain') || lower.includes('quelqu\'un') || lower.includes('parler')) {
    return `Bien noté ! Je transfère votre demande à notre équipe. Un de nos collaborateurs va vous répondre très prochainement.`;
  }

  return `Bonjour ! Nous avons bien reçu votre message : "${text}". Notre équipe ${company.name} vous répond sous peu. Vous pouvez également nous indiquer l'objet de votre demande pour préparer au mieux notre échange.`;
}
