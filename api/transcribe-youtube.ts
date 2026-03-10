import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { setupGoogleCredentials } from './_auth';
import path from 'path';
import os from 'os';
import fs from 'fs';
import crypto from 'crypto';
import { execFileSync } from 'child_process';

export const maxDuration = 10; // Max allowed on Vercel Hobby plan

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    let actualFile = '';
    try {
        setupGoogleCredentials();

        const ai = process.env.VERTEX_PROJECT_ID
            ? new GoogleGenAI({ vertexai: true, project: process.env.VERTEX_PROJECT_ID, location: process.env.VERTEX_LOCATION || 'global' })
            : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const { youtubeUrl, prompt } = req.body;
        const urlObj = new URL(youtubeUrl);
        const videoId = urlObj.searchParams.get('v');
        const cleanUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : youtubeUrl;

        const tmpDir = os.tmpdir();
        const tmpId = crypto.randomBytes(8).toString('hex');
        const tmpFileTemplate = path.join(tmpDir, `lexis-yt-${tmpId}.%(ext)s`);

        // On Vercel (Linux), youtube-dl-exec uses the Linux yt-dlp binary automatically
        const ytdlpBin = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');

        execFileSync(ytdlpBin, [
            cleanUrl, '--output', tmpFileTemplate,
            '--format', 'bestaudio[ext=m4a]/bestaudio/best',
            '--no-warnings', '--no-check-certificates', '--no-playlist'
        ], { timeout: 8000 }); // 8s limit (leave 2s for Google AI overhead)

        const tmpFiles = fs.readdirSync(tmpDir).filter(f => f.startsWith(`lexis-yt-${tmpId}`));
        if (!tmpFiles.length) throw new Error('Download failed — no output file found.');

        actualFile = path.join(tmpDir, tmpFiles[0]);
        const base64Audio = fs.readFileSync(actualFile).toString('base64');

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ inlineData: { data: base64Audio, mimeType: 'audio/mp4' } }, { text: prompt }] }],
            config: { temperature: 0.1, thinkingConfig: { thinkingBudget: 5000 } }
        });

        res.json({ text: response.text });
    } catch (err: any) {
        console.error('YouTube transcribe error:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        if (actualFile && fs.existsSync(actualFile)) fs.unlinkSync(actualFile);
    }
}
