import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { setupGoogleCredentials } from './_auth';

export const maxDuration = 10; // Max allowed on Vercel Hobby plan

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        setupGoogleCredentials();

        const ai = process.env.VERTEX_PROJECT_ID
            ? new GoogleGenAI({ vertexai: true, project: process.env.VERTEX_PROJECT_ID, location: process.env.VERTEX_LOCATION || 'global' })
            : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const { base64Audio, mimeType, prompt } = req.body;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ inlineData: { data: base64Audio, mimeType } }, { text: prompt }] }],
            config: { temperature: 0.1, thinkingConfig: { thinkingBudget: 5000 } }
        });

        res.json({ text: response.text });
    } catch (err: any) {
        console.error('Transcribe error:', err.message);
        res.status(500).json({ error: err.message });
    }
}
