import { GoogleGenAI } from '@google/genai';

process.env.GOOGLE_APPLICATION_CREDENTIALS = 'c:\\Users\\ayanp\\OneDrive\\Desktop\\New folder (2)\\AIELTS\\backend\\service-account-key.json';

async function testRegion(location) {
    const ai = new GoogleGenAI({ vertexai: true, project: 'aielts-477206', location });
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
