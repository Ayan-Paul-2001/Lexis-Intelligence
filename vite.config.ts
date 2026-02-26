import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import youtubedl from 'youtube-dl-exec';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'vertex-ai-api',
        configureServer(server) {
          // Serve the API endpoint for vertex translation
          server.middlewares.use(express.json({ limit: '100mb' }));
          server.middlewares.use('/api/transcribe', async (req: any, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end();
              return;
            }
            try {
              // Apply Vertex AI service account credentials from env if present
              if (env.GOOGLE_APPLICATION_CREDENTIALS) {
                process.env.GOOGLE_APPLICATION_CREDENTIALS = env.GOOGLE_APPLICATION_CREDENTIALS;
              }

              // Initialize GenAI dynamically based on provided env credentials
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
              console.error('Vertex AI Error:', err.message);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });

          server.middlewares.use('/api/transcribe-youtube', async (req: any, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end();
              return;
            }
            try {
              if (env.GOOGLE_APPLICATION_CREDENTIALS) {
                process.env.GOOGLE_APPLICATION_CREDENTIALS = env.GOOGLE_APPLICATION_CREDENTIALS;
              }

              // ytdl is now statically imported at the top

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
              console.error('Youtube/Vertex AI Error:', err.message);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
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
