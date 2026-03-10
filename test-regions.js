import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env so VERTEX_PROJECT_ID and credentials are available
config({ path: path.resolve(__dirname, '.env') });
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, 'service-account-key.json');

async function testRegion(location) {
    const ai = new GoogleGenAI({ vertexai: true, project: process.env.VERTEX_PROJECT_ID, location });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: 'hello',
        });
        console.log(`Success in ${location}:`, response.text);
        return true;
    } catch (err) {
        console.error(`Failed in ${location}: ${err.message}`);
        return false;
    }
}

async function testLocs() {
    const locs = ['us-central1', 'us-east1', 'us-east4', 'us-west1', 'europe-west1', 'global', 'asia-southeast1'];
    for (const loc of locs) {
        const success = await testRegion(loc);
        if (success) break;
    }
}

testLocs();
