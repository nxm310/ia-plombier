import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export async function generateCopilotReply(incomingText: string, senderName?: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const openaiKey = process.env.OPENAI_API_KEY || '';

  const systemInstruction = `Tu es Clara, l'assistante IA professionnelle et chaleureuse d'une entreprise artisanale de plomberie, chauffage et dépannage rapide (PME).
Ton rôle est de répondre aux clients sur WhatsApp avec courtoisie, réactivité et efficacité.
Règles :
1. Salue le client par son prénom si disponible (${senderName || 'Client'}).
2. Si le client a une urgence (fuite d'eau, panne de chaudière, canalisation bouchée), rassure-le immédiatement, demande son adresse exacte et indique qu'un technicien peut intervenir très rapidement.
3. Si le client demande un devis ou un rendez-vous, demande le type de prestation souhaité et ses disponibilités.
4. Reste concis (maximum 2 à 3 phrases) pour un échange WhatsApp fluide et naturel.`;

  // 1. Essai avec Google Gemini (rapide et gratuit)
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction
      });
      const result = await model.generateContent(incomingText);
      const reply = result.response.text();
      if (reply && reply.trim()) {
        return reply.trim();
      }
    } catch (err) {
      console.warn('[AI] Erreur Gemini, bascule sur OpenAI:', err);
    }
  }

  // 2. Essai avec OpenAI
  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: incomingText }
        ],
        temperature: 0.7,
        max_tokens: 250
      });
      const reply = completion.choices[0]?.message?.content;
      if (reply && reply.trim()) {
        return reply.trim();
      }
    } catch (err) {
      console.warn('[AI] Erreur OpenAI:', err);
    }
  }

  // 3. Réponse intelligente de secours par défaut si aucune clé API n'est encore configurée
  const lower = incomingText.toLowerCase();
  const greeting = senderName ? `Bonjour ${senderName}` : 'Bonjour';

  if (lower.includes('fuite') || lower.includes('urgence') || lower.includes('inondation') || lower.includes('panne') || lower.includes('eau')) {
    return `${greeting} ! Bien reçu pour votre urgence. Pour que notre technicien puisse intervenir au plus vite, pouvez-vous nous indiquer votre adresse complète et si la vanne d'arrêt générale est accessible ?`;
  }

  if (lower.includes('rendez-vous') || lower.includes('rdv') || lower.includes('devis') || lower.includes('dispo')) {
    return `${greeting} ! C'est bien noté pour votre demande. Un artisan de notre équipe est disponible cette semaine. Quel jour et créneau horaire vous conviendraient le mieux ?`;
  }

  return `${greeting} ! Merci pour votre message. Nous avons bien pris en compte votre demande et notre équipe technique revient vers vous dans les plus brefs délais.`;
}
