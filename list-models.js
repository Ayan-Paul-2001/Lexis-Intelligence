import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '.env') });
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, 'service-account-key.json');

const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.VERTEX_PROJECT_ID,
    location: 'us-central1'
});

async function list() {
    try {
        let result = await ai.models.list();
        fs.writeFileSync('models.json', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error(err);
    }
}

list();
