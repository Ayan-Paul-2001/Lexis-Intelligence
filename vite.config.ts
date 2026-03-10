import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import youtubedl from 'youtube-dl-exec';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  fs.appendFileSync('debug.log', `[CONFIG LOAD] mode: ${mode}, project: ${env.VERTEX_PROJECT_ID}\n`);

  // Move this to top level so it is available globally as soon as config loads
  if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credPath = env.GOOGLE_APPLICATION_CREDENTIALS.replace(/\\/g, '/');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    fs.appendFileSync('debug.log', `[AUTH] Using credentials from: ${credPath}\n`);
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['Lexis.png', 'favicon.ico'],
        manifest: {
          name: 'Lexis Intelligence',
          short_name: 'Lexis',
          description: 'AI-powered IELTS preparation platform with transcription, listening tests, and more.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'Lexis.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'Lexis.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          categories: ['education', 'productivity'],
          lang: 'en'
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
          // Exclude large static assets from precache — they are handled by runtime CacheFirst instead
          globIgnores: ['**/Lexis.png'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB safety net
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              // Network-first for API routes — always try fresh
              urlPattern: /^\/api\//,
              handler: 'NetworkOnly'
            },
            {
              // Cache-first for static assets (fonts, images)
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'lexis-static-assets',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
                }
              }
            },
            {
              // StaleWhileRevalidate for JS/CSS bundles
              urlPattern: /\.(?:js|css)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'lexis-js-css',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
                }
              }
            }
          ]
        },
        devOptions: {
          enabled: true,
          type: 'module' // Required for Vite's ESM dev server
        }
      }),
      {
        name: 'vertex-ai-api',
        configureServer(server) {
          // Serve the API endpoint for vertex translation
          server.middlewares.use(express.json({ limit: '100mb' }));
          server.middlewares.use('/api/transcribe', async (req: any, res) => {
            const fs = await import('fs');
            fs.default.appendFileSync('debug.log', `[${new Date().toISOString()}] /api/transcribe - project: ${env.VERTEX_PROJECT_ID}\n`);
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end();
              return;
            }
            try {
              // Initialize GenAI — Vertex AI and apiKey are mutually exclusive
              const ai = env.VERTEX_PROJECT_ID
                ? new GoogleGenAI({
                  vertexai: true,
                  project: env.VERTEX_PROJECT_ID,
                  location: env.VERTEX_LOCATION || 'global'
                })
                : new GoogleGenAI({
                  apiKey: env.GEMINI_API_KEY
                });

              const { base64Audio, mimeType, prompt } = req.body;

              // Call Vertex AI using the specified Gemini 3 model (from prompt)
              const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [
                  {
                    role: 'user',
                    parts: [
                      { inlineData: { data: base64Audio, mimeType } },
                      { text: prompt }
                    ]
                  }
                ],
                config: {
                  temperature: 0.1,
                  // Allowed thinking logic for precision
                  thinkingConfig: { thinkingBudget: 5000 }
                }
              });

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ text: response.text }));
            } catch (err: any) {
              console.error('[/api/transcribe] Error:', err.message);
              res.statusCode = 500;
              // Never forward raw SDK errors to the browser — they can contain project IDs, credential paths, and endpoints
              res.end(JSON.stringify({ error: 'Transcription failed. Please try again.' }));
            }
          });

          server.middlewares.use('/api/transcribe-youtube', async (req: any, res) => {
            const fs = await import('fs');
            fs.default.appendFileSync('debug.log', `[${new Date().toISOString()}] /api/transcribe-youtube - project: ${env.VERTEX_PROJECT_ID}\n`);
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end();
              return;
            }
            try {
              // ytdl is now statically imported at the top
              // Vertex AI and apiKey are mutually exclusive — do not pass both
              const ai = env.VERTEX_PROJECT_ID
                ? new GoogleGenAI({
                  vertexai: true,
                  project: env.VERTEX_PROJECT_ID,
                  location: env.VERTEX_LOCATION || 'global'
                })
                : new GoogleGenAI({
                  apiKey: env.GEMINI_API_KEY
                });

              const { youtubeUrl, prompt } = req.body;

              // Extract just the video URL without playlist/radio params
              // that contain '&' which cmd.exe interprets as command separators
              const urlObj = new URL(youtubeUrl);
              const videoId = urlObj.searchParams.get('v');
              const cleanUrl = videoId
                ? `https://www.youtube.com/watch?v=${videoId}`
                : youtubeUrl;

              // Download to a temp file (stdout piping is unreliable on Windows)
              const os = await import('os');
              const fs = await import('fs');
              const crypto = await import('crypto');
              const { execFileSync } = await import('child_process');
              const tmpDir = os.default.tmpdir();
              const tmpId = crypto.default.randomBytes(8).toString('hex');
              const tmpFile = path.join(tmpDir, `lexis-yt-${tmpId}`);
              const tmpFileTemplate = path.join(tmpDir, `lexis-yt-${tmpId}.%(ext)s`);

              // Use execFileSync to bypass cmd.exe shell (avoids & interpretation)
              const ytdlpBin = path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
              execFileSync(ytdlpBin, [
                cleanUrl,
                '--output', tmpFileTemplate,
                '--format', 'bestaudio[ext=m4a]/bestaudio/best',
                '--no-warnings',
                '--no-check-certificates',
                '--no-playlist'
              ], { timeout: 120000 });

              let actualFile = '';

              try {
                // yt-dlp may output with any extension, find the actual file
                const tmpFiles = fs.default.readdirSync(tmpDir).filter(
                  (f: string) => f.startsWith(`lexis-yt-${tmpId}`)
                );
                if (tmpFiles.length === 0) {
                  throw new Error('YouTube audio download failed — no output file found.');
                }
                actualFile = path.join(tmpDir, tmpFiles[0]);

                const buffer = fs.default.readFileSync(actualFile);
                const base64Audio = buffer.toString('base64');
                const mimeType = 'audio/mp4';

                const response = await ai.models.generateContent({
                  model: 'gemini-3-flash-preview',
                  contents: [
                    {
                      role: 'user',
                      parts: [
                        { inlineData: { data: base64Audio, mimeType } },
                        { text: prompt }
                      ]
                    }
                  ],
                  config: {
                    temperature: 0.1,
                    thinkingConfig: { thinkingBudget: 5000 }
                  }
                });

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ text: response.text }));
              } finally {
                // Always cleanup temp file, whether transcription succeeds or fails
                if (actualFile && fs.default.existsSync(actualFile)) {
                  fs.default.unlinkSync(actualFile);
                  console.log(`Cleaned up temp file: ${actualFile}`);
                }
              }
            } catch (err: any) {
              console.error('[/api/transcribe-youtube] Error:', err.message);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'YouTube transcription failed. Please try again.' }));
            }
          });

          server.middlewares.use('/api/convert-yt-mp3', async (req: any, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end();
              return;
            }
            try {
              const { youtubeUrl } = req.body;
              const urlObj = new URL(youtubeUrl);
              const videoId = urlObj.searchParams.get('v');
              const cleanUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : youtubeUrl;

              const os = await import('os');
              const fs = await import('fs');
              const crypto = await import('crypto');
              const { execFile } = await import('child_process');
              const { promisify } = await import('util');
              const execFileAsync = promisify(execFile);

              const tmpDir = os.default.tmpdir();
              const tmpId = crypto.default.randomBytes(8).toString('hex');
              const tmpFileTemplate = path.join(tmpDir, `lexis-mp3-${tmpId}.%(ext)s`);
              const ytdlpBin = path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');

              // Fetch title (no timeout)
              let title = `youtube_audio_${tmpId}`;
              try {
                const { stdout } = await execFileAsync(ytdlpBin, [
                  cleanUrl, '--get-title', '--no-warnings',
                  '--no-check-certificates', '--no-playlist'
                ], { timeout: 0 });
                const titleOut = stdout.trim();
                if (titleOut) title = titleOut.replace(/[^a-zA-Z0-9 _\-]/g, '').trim() || title;
              } catch (e) {
                console.log('Failed to fetch title, using default');
              }

              // Convert to MP3 — no timeout, supports any video length
              await execFileAsync(ytdlpBin, [
                cleanUrl,
                '--output', tmpFileTemplate,
                '--format', 'bestaudio/best',
                '--extract-audio',
                '--audio-format', 'mp3',
                '--audio-quality', '0',
                '--no-warnings',
                '--no-check-certificates',
                '--no-playlist'
              ], { timeout: 0 });

              const tmpFiles = fs.default.readdirSync(tmpDir).filter(
                (f: string) => f.startsWith(`lexis-mp3-${tmpId}`) && f.endsWith('.mp3')
              );
              if (tmpFiles.length === 0) throw new Error('Conversion failed or output missing.');

              const actualFile = path.join(tmpDir, tmpFiles[0]);
              const safeFilename = encodeURIComponent(`${title}.mp3`);

              // Stream the file directly to the browser as a download
              res.setHeader('Content-Type', 'audio/mpeg');
              res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeFilename}`);
              res.setHeader('Content-Length', String(fs.default.statSync(actualFile).size));

              const readStream = fs.default.createReadStream(actualFile);
              readStream.pipe(res);
              readStream.on('end', () => {
                // Clean up temp file after fully streamed
                try { fs.default.unlinkSync(actualFile); } catch (_) { }
              });
              readStream.on('error', (streamErr: Error) => {
                console.error('[/api/convert-yt-mp3] Stream error:', streamErr.message);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Download stream failed. Please try again.' }));
                }
                try { fs.default.unlinkSync(actualFile); } catch (_) { }
              });
              return; // Don't call res.end() — pipe handles it

            } catch (err: any) {
              console.error('[/api/convert-yt-mp3] Error:', err.message);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Conversion failed. Please check the URL and try again.' }));
            }
          });

          server.middlewares.use('/api/save-yt-mp3', async (req: any, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end();
              return;
            }
            try {
              const { tempId, title } = req.body;
              const os = await import('os');
              const fs = await import('fs');
              const tmpDir = os.default.tmpdir();
              const actualFile = path.join(tmpDir, tempId);

              if (!fs.default.existsSync(actualFile)) {
                throw new Error('Temp file not found.');
              }

              const filesDir = path.join(__dirname, 'Files');
              if (!fs.default.existsSync(filesDir)) {
                fs.default.mkdirSync(filesDir);
              }

              const destFile = path.join(filesDir, `${title}.mp3`);
              fs.default.copyFileSync(actualFile, destFile);
              fs.default.unlinkSync(actualFile); // Clean up

              res.setHeader('Content-Type', 'application/json');
              // Never expose server filesystem paths (savedTo) to the browser
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              console.error('[/api/save-yt-mp3] Error:', err.message);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Save failed. Please try again.' }));
            }
          });

          server.middlewares.use('/api/cancel-yt-mp3', async (req: any, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end();
              return;
            }
            try {
              const { tempId } = req.body;
              const os = await import('os');
              const fs = await import('fs');
              const tmpDir = os.default.tmpdir();
              const actualFile = path.join(tmpDir, tempId);

              if (fs.default.existsSync(actualFile)) {
                fs.default.unlinkSync(actualFile);
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              console.error('[/api/cancel-yt-mp3] Error:', err.message);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Cancellation failed.' }));
            }
          });
        }
      }
    ],
    define: {
      // Intentionally empty — no server-side secrets should be injected into the frontend bundle.
      // All API keys and credentials are consumed exclusively in vite.config.ts server middlewares.
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
