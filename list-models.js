import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

process.env.GOOGLE_APPLICATION_CREDENTIALS = 'c:\\Users\\ayanp\\OneDrive\\Desktop\\New folder (2)\\AIELTS\\backend\\service-account-key.json';

const ai = new GoogleGenAI({
    vertexai: true,
    project: 'aielts-477206',
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
