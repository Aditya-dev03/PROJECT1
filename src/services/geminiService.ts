import { GEMINI_MODEL, GEMINI_API_BASE_URL } from '../constants/aiConfig';

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export const geminiService = {
  getApiKey(): string | undefined {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      if (import.meta.env.VITE_GEMINI_API_KEY) return import.meta.env.VITE_GEMINI_API_KEY;
      if (import.meta.env.EXPO_PUBLIC_GEMINI_API_KEY) return import.meta.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (import.meta.env.GEMINI_API_KEY) return import.meta.env.GEMINI_API_KEY;
    }
    if (typeof process !== 'undefined' && process.env) {
      return process.env.VITE_GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    }
    return undefined;
  },

  /**
   * Helper to execute Gemini generateContent request
   */
  async _callApi(payload: any): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.error('[AI Planner] Gemini configuration error: API key missing');
      console.error(`[AI Planner] Model: ${GEMINI_MODEL}`);
      console.error('[AI Planner] API key: missing');
      throw new Error('Gemini API key is missing. Configure EXPO_PUBLIC_GEMINI_API_KEY.');
    }

    const url = `${GEMINI_API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorBodyText = '';
      try {
        errorBodyText = await response.text();
      } catch (_) {}

      // Sanitize error text to ensure key is never printed
      const safeErrorText = errorBodyText.replace(new RegExp(apiKey, 'g'), '[REDACTED]');

      if (response.status === 401 || response.status === 403 || (response.status === 400 && safeErrorText.includes('API_KEY_INVALID'))) {
        console.error(`[AI Planner] Auth Error (${response.status}):`, safeErrorText);
        throw new Error('Gemini authentication failed. Check EXPO_PUBLIC_GEMINI_API_KEY.');
      }
      if (response.status === 429) {
        console.error(`[AI Planner] Rate Limit Error (${response.status}):`, safeErrorText);
        throw new Error('Gemini rate limit exceeded.');
      }
      if (response.status >= 500) {
        console.error(`[AI Planner] Server Error (${response.status}):`, safeErrorText);
        throw new Error('Gemini service temporarily unavailable.');
      }

      console.error(`[AI Planner] HTTP Error ${response.status}:`, safeErrorText);
      throw new Error(`Gemini API request failed with status ${response.status}: ${safeErrorText}`);
    }

    const data: GeminiResponse = await response.json();

    if (data.error) {
      throw new Error(`Gemini API error ${data.error.code}: ${data.error.message}`);
    }

    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Gemini returned an invalid itinerary response (missing content parts).');
    }

    return candidateText;
  },

  /**
   * Simple connectivity test for Gemini API
   */
  async testConnection(): Promise<boolean> {
    console.log(`[AI Planner] Using Gemini`);
    console.log(`[AI Planner] Model: ${GEMINI_MODEL}`);
    console.log(`[AI Planner] Starting connection test...`);
    try {
      const resultText = await this._callApi({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Respond with exactly: GEMINI_CONNECTION_SUCCESS' }],
          },
        ],
        generationConfig: {
          temperature: 0,
        },
      });

      if (resultText.includes('GEMINI_CONNECTION_SUCCESS')) {
        console.log(`[AI Planner] Test Status: SUCCESS`);
        return true;
      } else {
        console.warn(`[AI Planner] Test Status: UNEXPECTED RESPONSE: ${resultText}`);
        return false;
      }
    } catch (err: any) {
      console.error(`[AI Planner] Gemini generation failed: ${err?.message || err}`);
      return false;
    }
  },

  /**
   * Generate structured JSON output using gemini-3.5-flash-lite
   */
  async generateStructuredJSON(systemInstruction: string, userPrompt: string): Promise<any> {
    console.log(`[AI Planner] Using Gemini`);
    console.log(`[AI Planner] Model: ${GEMINI_MODEL}`);
    console.log(`[AI Planner] Generating itinerary...`);

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };

    try {
      const rawText = await this._callApi(payload);
      console.log(`[AI Planner] Gemini request successful. Parsing structured JSON...`);

      const parsed = JSON.parse(rawText);
      return parsed;
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        console.error('[AI Planner] Gemini generation failed: Malformed JSON response returned.');
        throw new Error('Gemini returned an invalid itinerary response.');
      }
      console.error(`[AI Planner] Gemini generation failed: ${err?.message || err}`);
      throw err;
    }
  },
};
