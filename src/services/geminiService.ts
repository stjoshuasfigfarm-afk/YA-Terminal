import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;

export function getGemini() {
  if (!ai && apiKey) {
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export interface NewsIntelligence {
  translatedTitle: string;
  summary: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  impact: number; // 0 to 1
}

export async function enrichNews(title: string, description: string): Promise<NewsIntelligence | null> {
  const gemini = getGemini();
  if (!gemini) return null;

  try {
    const prompt = `Analyze this financial news item.
Title: ${title}
Description: ${description}

1. Translate the title and description to professional financial English if they are in another language.
2. Summarize the core impact on the relevant stock in one concise, high-impact sentence.
3. Determine if the sentiment is POSITIVE, NEGATIVE, or NEUTRAL.
4. Rate the market impact from 0.0 to 1.0.

Return the result as JSON.`;

    const result = await gemini.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedTitle: { type: Type.STRING },
            summary: { type: Type.STRING },
            sentiment: { 
              type: Type.STRING,
              enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL']
            },
            impact: { type: Type.NUMBER }
          },
          required: ['translatedTitle', 'summary', 'sentiment', 'impact']
        }
      }
    });

    return JSON.parse(result.text);
  } catch (error) {
    console.error("Gemini enrichment failed:", error);
    return null;
  }
}
