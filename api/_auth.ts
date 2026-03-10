// api/_auth.ts
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * On Vercel: writes the service account JSON from env var to /tmp,
 * sets GOOGLE_APPLICATION_CREDENTIALS to that path, and returns it.
 * On local dev: uses the existing file path from GOOGLE_APPLICATION_CREDENTIALS.
 */
export function setupGoogleCredentials(): string {
    // Already a valid file path (local dev)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS &&
        !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        return process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }

    const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!json) throw new Error('No Google credentials found in environment.');

    const tmpPath = path.join(os.tmpdir(), 'gcp-service-account.json');
    fs.writeFileSync(tmpPath, json, 'utf8');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
    return tmpPath;
}
