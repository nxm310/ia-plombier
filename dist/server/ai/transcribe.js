import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI, { toFile } from 'openai';
import { getSetting } from '../db/queries.js';
/**
 * Retranscrit fidèlement un buffer audio (message vocal WhatsApp) en texte français.
 * Supporte nativement Gemini 2.5/1.5 Flash (multimodal) et OpenAI Whisper.
 */
export async function transcribeAudio(audioBuffer, mimeType = 'audio/ogg') {
    if (!audioBuffer || audioBuffer.length === 0) {
        return '';
    }
    const aiConfig = (await getSetting('ai_config')) || {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        geminiApiKey: process.env.GEMINI_API_KEY || '',
        openaiApiKey: process.env.OPENAI_API_KEY || ''
    };
    const cleanMimeType = mimeType.split(';')[0].trim() || 'audio/ogg';
    // 1. Priorité Gemini (Reconnaissance audio native rapide sans conversion)
    if (aiConfig.provider === 'gemini' || !aiConfig.openaiApiKey) {
        const apiKey = aiConfig.geminiApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('[Transcription] Clé GEMINI_API_KEY manquante pour la retranscription vocale.');
            return '';
        }
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            // Préférer un modèle Flash capable de multimodalité audio
            const modelName = aiConfig.model && aiConfig.model.includes('gemini')
                ? aiConfig.model
                : 'gemini-2.5-flash';
            const model = genAI.getGenerativeModel({ model: modelName });
            const audioPart = {
                inlineData: {
                    data: audioBuffer.toString('base64'),
                    mimeType: cleanMimeType
                }
            };
            const prompt = `Tu es le retranscripteur officiel d'une entreprise.
Écoute ce message vocal WhatsApp d'un client et retranscris-le intégralement et fidèlement en français.
Consignes impératives :
- Renvoie UNIQUEMENT le texte exact prononcé mot à mot.
- N'ajoute AUCUN commentaire, aucune note, aucun guillemet, aucune balise ni formule d'introduction.
- Corrige uniquement les hésitations minimes pour que la phrase soit compréhensible et propre.`;
            const result = await model.generateContent([prompt, audioPart]);
            const text = result.response.text();
            return (text || '').trim();
        }
        catch (err) {
            console.error('[Transcription] Erreur Gemini Audio Transcription:', err);
        }
    }
    // 2. Secours OpenAI Whisper
    if (aiConfig.openaiApiKey || process.env.OPENAI_API_KEY) {
        try {
            const apiKey = aiConfig.openaiApiKey || process.env.OPENAI_API_KEY;
            const openai = new OpenAI({ apiKey });
            const file = await toFile(audioBuffer, 'voice_message.ogg', { type: cleanMimeType });
            const transcription = await openai.audio.transcriptions.create({
                file,
                model: 'whisper-1',
                language: 'fr'
            });
            return (transcription.text || '').trim();
        }
        catch (err) {
            console.error('[Transcription] Erreur OpenAI Whisper Transcription:', err);
        }
    }
    return '';
}
