import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config();

const app = express();
const port = process.env.PORT || 3001;

// Increased limits for large audio files
app.use(cors());
app.use(express.json({ limit: '100mb' }));

const execFileAsync = promisify(execFile);

/**
 * Setup Google Credentials from JSON env var
 */
function setupGoogleCredentials() {
    const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!json) {
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return;
        throw new Error('No Google credentials found.');
    }
    const tmpPath = path.join(os.tmpdir(), 'gcp-service-account.json');
    fs.writeFileSync(tmpPath, json, 'utf8');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
}

// 1. Audio File Transcription
app.post('/api/transcribe', async (req, res) => {
    try {
        setupGoogleCredentials();
        const { base64Audio, mimeType, prompt } = req.body;

        const ai = process.env.VERTEX_PROJECT_ID
            ? new GoogleGenAI({ vertexai: true, project: process.env.VERTEX_PROJECT_ID, location: process.env.VERTEX_LOCATION || 'global' })
            : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ inlineData: { data: base64Audio, mimeType } }, { text: prompt }] }],
            config: { temperature: 0.1, thinkingConfig: { thinkingBudget: 5000 } }
        });

        res.json({ text: response.text });
    } catch (err) {
        console.error('Transcribe Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. YouTube Transcription
app.post('/api/transcribe-youtube', async (req, res) => {
    let actualFile = '';
    try {
        setupGoogleCredentials();
        const { youtubeUrl, prompt } = req.body;

        const tmpId = crypto.randomBytes(8).toString('hex');
        const tmpFileTemplate = path.join(os.tmpdir(), `lexis-yt-${tmpId}.%(ext)s`);

        // Use system yt-dlp (installed via Docker)
        execFileSync('yt-dlp', [
            youtubeUrl, '--output', tmpFileTemplate,
            '--format', 'bestaudio[ext=m4a]/bestaudio/best',
            '--no-warnings', '--no-check-certificates', '--no-playlist'
        ]);

        const tmpFiles = fs.readdirSync(os.tmpdir()).filter(f => f.startsWith(`lexis-yt-${tmpId}`));
        if (!tmpFiles.length) throw new Error('Download failed.');

        actualFile = path.join(os.tmpdir(), tmpFiles[0]);
        const base64Audio = fs.readFileSync(actualFile).toString('base64');

        const ai = process.env.VERTEX_PROJECT_ID
            ? new GoogleGenAI({ vertexai: true, project: process.env.VERTEX_PROJECT_ID, location: process.env.VERTEX_LOCATION || 'global' })
            : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ inlineData: { data: base64Audio, mimeType: 'audio/mp4' } }, { text: prompt }] }],
            config: { temperature: 0.1, thinkingConfig: { thinkingBudget: 5000 } }
        });

        res.json({ text: response.text });
    } catch (err) {
        console.error('YT Transcribe Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (actualFile && fs.existsSync(actualFile)) fs.unlinkSync(actualFile);
    }
});

// 3. YouTube to MP3 Converter (Streaming)
app.post('/api/convert-yt-mp3', async (req, res) => {
    let actualFile = '';
    try {
        const { youtubeUrl } = req.body;
        const tmpId = crypto.randomBytes(8).toString('hex');
        const tmpFileTemplate = path.join(os.tmpdir(), `lexis-mp3-${tmpId}.%(ext)s`);

        // Get title
        let title = `youtube_audio_${tmpId}`;
        try {
            const { stdout } = await execFileAsync('yt-dlp', [youtubeUrl, '--get-title', '--no-playlist']);
            title = stdout.trim().replace(/[^a-zA-Z0-9 _\-]/g, '') || title;
        } catch (e) { }

        // Extract MP3 using yt-dlp and ffmpeg (installed via Docker)
        await execFileAsync('yt-dlp', [
            youtubeUrl, '--output', tmpFileTemplate,
            '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0',
            '--no-playlist'
        ]);

        const tmpFiles = fs.readdirSync(os.tmpdir()).filter(f => f.startsWith(`lexis-mp3-${tmpId}`) && f.endsWith('.mp3'));
        if (!tmpFiles.length) throw new Error('MP3 conversion failed.');

        actualFile = path.join(os.tmpdir(), tmpFiles[0]);
        const size = fs.statSync(actualFile).size;

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.mp3"`);
        res.setHeader('Content-Length', size);

        const stream = fs.createReadStream(actualFile);
        stream.pipe(res);
        stream.on('end', () => fs.unlinkSync(actualFile));
    } catch (err) {
        console.error('MP3 Conversion Error:', err);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => console.log(`Backend listening on port ${port}`));
