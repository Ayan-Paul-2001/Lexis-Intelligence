import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { defineConfig, loadEnv } from 'vite';
import express from 'express';
import apiRouter from './api.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  fs.appendFileSync('debug.log', `[CONFIG LOAD] mode: ${mode}, project: ${env.VERTEX_PROJECT_ID}\n`);

  // Build the service account JSON from individual env vars (no committed key file needed)
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
    // Write to OS temp dir — never inside the project folder
    const tmpCredPath = path.join(os.tmpdir(), 'lexis-sa-credentials.json');
    fs.writeFileSync(tmpCredPath, JSON.stringify(serviceAccount, null, 2), 'utf-8');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpCredPath;
    fs.appendFileSync('debug.log', `[AUTH] Service account credentials written to OS temp: ${tmpCredPath}\n`);
  } else if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Fallback: if someone still provides a file path directly
    const credPath = env.GOOGLE_APPLICATION_CREDENTIALS.replace(/\\/g, '/');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    fs.appendFileSync('debug.log', `[AUTH] Using credentials from: ${credPath}\n`);
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'vertex-ai-api',
        configureServer(server) {
          const app = express();
          app.use(express.json({ limit: '100mb' }));
          app.use('/api', apiRouter);
          server.middlewares.use(app);
        }
      }
    ],
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
