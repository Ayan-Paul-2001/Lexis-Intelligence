import express from 'express';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

const execFileAsync = promisify(execFile);
dotenv.config();

const router = express.Router();

const isWin = os.platform() === 'win32';

const ensureFfmpegInPath = () => {
  if (process.env.FFMPEG_PATH) {
    const customPath = process.env.FFMPEG_PATH;
    if (fs.existsSync(customPath)) {
      process.env.PATH = `${customPath}${path.delimiter}${process.env.PATH}`;
      return;
    }
  }

  try {
    execFileSync(isWin ? 'where' : 'which', ['ffmpeg']);
    return;
  } catch (e) {
    // Not in PATH
  }

  if (isWin) {
    const home = os.homedir();
    const wingetPackagesDir = path.join(home, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages');
    if (fs.existsSync(wingetPackagesDir)) {
      try {
        const dirs = fs.readdirSync(wingetPackagesDir);
        const ffmpegPkgDir = dirs.find(d => d.startsWith('Gyan.FFmpeg'));
        if (ffmpegPkgDir) {
          const pkgPath = path.join(wingetPackagesDir, ffmpegPkgDir);
          const subdirs = fs.readdirSync(pkgPath);
          const buildDir = subdirs.find(d => d.startsWith('ffmpeg-'));
          if (buildDir) {
            const binPath = path.join(pkgPath, buildDir, 'bin');
            if (fs.existsSync(path.join(binPath, 'ffmpeg.exe'))) {
              process.env.PATH = `${binPath}${path.delimiter}${process.env.PATH}`;
              console.log(`[FFmpeg] Automatically added WinGet FFmpeg path to PATH: ${binPath}`);
              return;
            }
          }
        }
      } catch (err) {
        console.error('[FFmpeg] Error checking winget packages:', err);
      }
    }
  }
};

ensureFfmpegInPath();

const getYtDlpBin = () => {
  return path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', isWin ? 'yt-dlp.exe' : 'yt-dlp');
};

const getVertexConfig = () => {
  const env = process.env;
  if (env.GOOGLE_SA_PRIVATE_KEY && env.GOOGLE_SA_CLIENT_EMAIL) {
    const serviceAccount = {
      type: env.GOOGLE_SA_TYPE || 'service_account',
      project_id: env.GOOGLE_SA_PROJECT_ID || env.VERTEX_PROJECT_ID,
      private_key_id: env.GOOGLE_SA_PRIVATE_KEY_ID,
      private_key: env.GOOGLE_SA_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: env.GOOGLE_SA_CLIENT_EMAIL,
      client_id: env.GOOGLE_SA_CLIENT_ID,
      auth_uri: env.GOOGLE_SA_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: env.GOOGLE_SA_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: env.GOOGLE_SA_AUTH_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: env.GOOGLE_SA_CLIENT_CERT_URL,
      universe_domain: env.GOOGLE_SA_UNIVERSE_DOMAIN || 'googleapis.com',
    };
    const tmpCredPath = path.join(os.tmpdir(), 'lexis-sa-credentials.json');
    fs.writeFileSync(tmpCredPath, JSON.stringify(serviceAccount, null, 2), 'utf-8');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpCredPath;
  }
  
  return env.VERTEX_PROJECT_ID
    ? new GoogleGenAI({
      vertexai: true,
      project: env.VERTEX_PROJECT_ID,
      location: env.VERTEX_LOCATION || 'global',
      httpOptions: { timeout: 600000 }
    })
    : new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: { timeout: 600000 }
    });
};

router.post('/transcribe', async (req, res) => {
  fs.appendFileSync('debug.log', `[${new Date().toISOString()}] /api/transcribe - project: ${process.env.VERTEX_PROJECT_ID}\n`);
  try {
    const ai = getVertexConfig();
    let { base64Audio, mimeType, prompt } = req.body;

    if (base64Audio && base64Audio.length > 5 * 1024 * 1024) {
      let tempInFile = '';
      let tempOutFile = '';
      try {
        const tmpDir = os.tmpdir();
        const tmpId = crypto.randomBytes(8).toString('hex');
        const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mpeg') ? 'mp3' : mimeType.includes('webm') ? 'webm' : 'wav';
        tempInFile = path.join(tmpDir, `lexis-in-${tmpId}.${ext}`);
        tempOutFile = path.join(tmpDir, `lexis-out-${tmpId}.mp3`);
        
        fs.writeFileSync(tempInFile, Buffer.from(base64Audio, 'base64'));

        await execFileAsync('ffmpeg', [
          '-i', tempInFile,
          '-ac', '1',
          '-ar', '16000',
          '-b:a', '16k',
          tempOutFile
        ]);

        const compressedBuffer = fs.readFileSync(tempOutFile);
        base64Audio = compressedBuffer.toString('base64');
        mimeType = 'audio/mp3';
        console.log(`[Compression] Reduced audio size to ${compressedBuffer.length} bytes.`);
      } catch (cmpErr) {
        console.error('Audio compression failed:', cmpErr);
      } finally {
        if (tempInFile && fs.existsSync(tempInFile)) fs.unlinkSync(tempInFile);
        if (tempOutFile && fs.existsSync(tempOutFile)) fs.unlinkSync(tempOutFile);
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { role: 'user', parts: [ { inlineData: { data: base64Audio, mimeType } }, { text: prompt } ] }
      ],
      config: { temperature: 0.1, thinkingConfig: { thinkingBudget: 5000 } }
    });

    res.json({ text: response.text });
  } catch (err) {
    console.error('Vertex AI Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/transcribe-youtube', async (req, res) => {
  req.setTimeout(0);
  res.setTimeout(0);
  fs.appendFileSync('debug.log', `[${new Date().toISOString()}] /api/transcribe-youtube\n`);
  try {
    const ai = getVertexConfig();
    const { youtubeUrl, prompt } = req.body;

    const urlObj = new URL(youtubeUrl);
    const videoId = urlObj.searchParams.get('v');
    const cleanUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : youtubeUrl;

    const tmpDir = os.tmpdir();
    const tmpId = crypto.randomBytes(8).toString('hex');
    const tmpFileTemplate = path.join(tmpDir, `lexis-yt-${tmpId}.%(ext)s`);

    const ytdlpBin = getYtDlpBin();
    execFileSync(ytdlpBin, [
      cleanUrl, '--output', tmpFileTemplate,
      '--format', 'worstaudio[ext=m4a]/worstaudio/best',
      '--no-warnings', '--no-check-certificates', '--no-playlist'
    ], { timeout: 300000 });

    let actualFile = '';
    try {
      const tmpFiles = fs.readdirSync(tmpDir).filter(f => f.startsWith(`lexis-yt-${tmpId}`));
      if (tmpFiles.length === 0) throw new Error('Download failed.');
      actualFile = path.join(tmpDir, tmpFiles[0]);
      let mimeType = 'audio/mp4';

      if (fs.statSync(actualFile).size > 10 * 1024 * 1024) {
        const tempOutFile = actualFile + '-compressed.mp3';
        try {
          await execFileAsync('ffmpeg', [
            '-i', actualFile, '-ac', '1', '-ar', '16000', '-b:a', '16k', tempOutFile
          ]);
          fs.unlinkSync(actualFile);
          actualFile = tempOutFile;
          mimeType = 'audio/mp3';
        } catch (e) {
          console.error('YouTube audio compression failed:', e);
        }
      }

      const buffer = fs.readFileSync(actualFile);
      const base64Audio = buffer.toString('base64');

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { role: 'user', parts: [ { inlineData: { data: base64Audio, mimeType } }, { text: prompt } ] }
        ],
        config: { temperature: 0.1, thinkingConfig: { thinkingBudget: 5000 } }
      });

      res.json({ text: response.text });
    } finally {
      if (actualFile && fs.existsSync(actualFile)) fs.unlinkSync(actualFile);
    }
  } catch (err) {
    console.error('Youtube/Vertex AI Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/convert-yt-mp3', async (req, res) => {
  req.setTimeout(0);
  res.setTimeout(0);
  try {
    const { youtubeUrl } = req.body;
    const urlObj = new URL(youtubeUrl);
    const videoId = urlObj.searchParams.get('v');
    const cleanUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : youtubeUrl;

    const tmpDir = os.tmpdir();
    const tmpId = crypto.randomBytes(8).toString('hex');
    const tmpFileTemplate = path.join(tmpDir, `lexis-mp3-${tmpId}.%(ext)s`);
    const ytdlpBin = getYtDlpBin();

    let title = `youtube_audio_${tmpId}`;
    try {
      const { stdout } = await execFileAsync(ytdlpBin, [
        cleanUrl, '--get-title', '--no-warnings', '--no-check-certificates', '--no-playlist'
      ], { timeout: 0 });
      const titleOut = stdout.trim();
      if (titleOut) title = titleOut.replace(/[^a-zA-Z0-9 _\-]/g, '').trim() || title;
    } catch (e) {
      console.log('Failed to fetch title, using default');
    }

    await execFileAsync(ytdlpBin, [
      cleanUrl, '--output', tmpFileTemplate, '--format', 'bestaudio/best',
      '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0',
      '--no-warnings', '--no-check-certificates', '--no-playlist'
    ], { timeout: 0 });

    const tmpFiles = fs.readdirSync(tmpDir).filter(f => f.startsWith(`lexis-mp3-${tmpId}`) && f.endsWith('.mp3'));
    if (tmpFiles.length === 0) throw new Error('Conversion failed or output missing.');

    const actualFile = path.join(tmpDir, tmpFiles[0]);
    const safeFilename = encodeURIComponent(`${title}.mp3`);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Length', String(fs.statSync(actualFile).size));

    const readStream = fs.createReadStream(actualFile);
    readStream.pipe(res);
    readStream.on('end', () => { try { fs.unlinkSync(actualFile); } catch (_) { } });
    readStream.on('error', (streamErr) => {
      console.error('Stream error:', streamErr.message);
      if (!res.headersSent) res.status(500).json({ error: streamErr.message });
      try { fs.unlinkSync(actualFile); } catch (_) { }
    });
  } catch (err) {
    console.error('Convert Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/save-yt-mp3', async (req, res) => {
  try {
    const { tempId, title } = req.body;
    const tmpDir = os.tmpdir();
    const actualFile = path.join(tmpDir, tempId);

    if (!fs.existsSync(actualFile)) throw new Error('Temp file not found.');

    const filesDir = path.join(process.cwd(), 'Files');
    if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir);

    const destFile = path.join(filesDir, `${title}.mp3`);
    fs.copyFileSync(actualFile, destFile);
    fs.unlinkSync(actualFile);

    res.json({ success: true, savedTo: destFile });
  } catch (err) {
    console.error('Save Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/cancel-yt-mp3', async (req, res) => {
  try {
    const { tempId } = req.body;
    const tmpDir = os.tmpdir();
    const actualFile = path.join(tmpDir, tempId);

    if (fs.existsSync(actualFile)) fs.unlinkSync(actualFile);
    res.json({ success: true });
  } catch (err) {
    console.error('Cancel Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
