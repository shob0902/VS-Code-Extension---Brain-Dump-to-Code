import { GoogleGenerativeAI } from '@google/generative-ai';

function stripMarkdownCodeFences(text: string): string {
  const fenceRegex = /^```[a-zA-Z0-9+\-_.]*\n([\s\S]*?)\n```$/m;
  const match = text.match(fenceRegex);
  return match ? match[1].trim() : text.trim();
}

export async function getCodeFromBrainDump(text: string, language: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return '// Set GEMINI_API_KEY in your environment to enable code generation.';
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const preferredModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const fallbackModel = preferredModel === 'gemini-1.5-flash' ? 'gemini-1.5-pro' : 'gemini-1.5-flash';

    const systemInstruction = `You convert natural language into clean, idiomatic ${language} code. Return only runnable code without any surrounding commentary or markdown fences.`;
    const trimmedUser = text.length > 4000 ? `${text.slice(0, 4000)}\n...` : text;
    const prompt = `${systemInstruction}\n\nUser request:\n${trimmedUser}`;

    const parseRetryDelayMs = (msg: string): number | null => {
      const m = msg.match(/retryDelay"\s*:\s*"(\d+)s"/i);
      if (m && m[1]) {
        const secs = parseInt(m[1], 10);
        if (!Number.isNaN(secs)) return Math.min(secs * 1000, 60000);
      }
      return null;
    };

    const generateWithRetry = async (modelName: string): Promise<string> => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.2, maxOutputTokens: 400 }
      });

      const backoffsMs = [1500, 4000, 9000, 20000, 35000];
      let lastErr: unknown;
      for (let attempt = 0; attempt < backoffsMs.length + 1; attempt++) {
        try {
          const result = await model.generateContent(prompt);
          const response = result.response;
          const content = response.text();
          return stripMarkdownCodeFences(content) || '';
        } catch (e) {
          lastErr = e;
          const msg = e instanceof Error ? e.message : String(e);
          const is429 = msg.includes('429') || msg.toLowerCase().includes('quota');
          if (!is429 || attempt === backoffsMs.length) {
            throw e;
          }
          const retryMs = parseRetryDelayMs(msg) ?? backoffsMs[attempt];
          await new Promise((res) => setTimeout(res, retryMs));
        }
      }
      throw lastErr;
    };

    try {
      const primary = await generateWithRetry(preferredModel);
      if (primary) return primary;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const is429 = msg.includes('429') || msg.toLowerCase().includes('quota');
      // Only try fallback model if the error was NOT quota-related
      if (!is429) {
        const secondary = await generateWithRetry(fallbackModel);
        return secondary || '// No code generated.';
      }
      throw e;
    }

    return '// No code generated.';
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return `// Failed to generate code: ${message}`;
  }
}