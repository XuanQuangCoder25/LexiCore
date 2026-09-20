import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
if (!apiKey) {
    console.warn('[Gemini] WARNING: GEMINI_API_KEY is not set in .env!');
}

const genAI = new GoogleGenerativeAI(apiKey);

// gemini-3.6-flash
export const geminiFlash = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

export async function callGeminiWithRetry(prompt: string, maxRetries = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await geminiFlash.generateContent(prompt);
            return response.response.text().trim();
        } catch (err: any) {
            const status = err?.status;
            const isRetryable = status === 503 || status === 429;

            if (isRetryable && attempt < maxRetries) {
                const waitMs = Math.pow(2, attempt) * 1000;
                console.log(`[Gemini] Attempt ${attempt}/${maxRetries} got ${status}, retrying in ${waitMs / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, waitMs));
                continue;
            }
            throw err;
        }
    }
    throw new Error('[Gemini] Exhausted all retries');
}
