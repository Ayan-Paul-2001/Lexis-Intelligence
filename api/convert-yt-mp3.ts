import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import os from 'os';
import fs from 'fs';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

export const maxDuration = 10;

const execFileAsync = promisify(execFile);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    let actualFile = '';
    try {
        const { youtubeUrl } = req.body;
        const urlObj = new URL(youtubeUrl);
        const videoId = urlObj.searchParams.get('v');
        const cleanUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : youtubeUrl;

        const tmpDir = os.tmpdir();
        const tmpId = crypto.randomBytes(8).toString('hex');
        const tmpFileTemplate = path.join(tmpDir, `lexis-mp3-${tmpId}.%(ext)s`);
        const ytdlpBin = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');

        let title = `youtube_audio_${tmpId}`;
        try {
            const { stdout } = await execFileAsync(ytdlpBin, [cleanUrl, '--get-title', '--no-warnings', '--no-check-certificates', '--no-playlist'], { timeout: 15000 });
            const t = stdout.trim();
            if (t) title = t.replace(/[^a-zA-Z0-9 _\-]/g, '').trim() || title;
        } catch (_) { }

        await execFileAsync(ytdlpBin, [
            cleanUrl, '--output', tmpFileTemplate,
            '--format', 'bestaudio/best', '--extract-audio',
            '--audio-format', 'mp3', '--audio-quality', '0',
            '--no-warnings', '--no-check-certificates', '--no-playlist'
        ], { timeout: 8000 });

        const tmpFiles = fs.readdirSync(tmpDir).filter(f => f.startsWith(`lexis-mp3-${tmpId}`) && f.endsWith('.mp3'));
        if (!tmpFiles.length) throw new Error('Conversion failed — no output file found.');

        actualFile = path.join(tmpDir, tmpFiles[0]);
        const safeFilename = encodeURIComponent(`${title}.mp3`);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeFilename}`);
        res.setHeader('Content-Length', String(fs.statSync(actualFile).size));

        const stream = fs.createReadStream(actualFile);
        stream.pipe(res);
        stream.on('end', () => { try { fs.unlinkSync(actualFile); } catch (_) { } });
        stream.on('error', (e) => {
            if (!res.headersSent) res.status(500).json({ error: e.message });
            try { fs.unlinkSync(actualFile); } catch (_) { }
        });
    } catch (err: any) {
        console.error('Convert error:', err.message);
        if (!res.headersSent) res.status(500).json({ error: err.message });
        if (actualFile && fs.existsSync(actualFile)) fs.unlinkSync(actualFile);
    }
}
