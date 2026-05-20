import { Router } from "express";
import { GoogleGenAI } from "@google/genai";

const router = Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const isKeyReady = (k: string) => k && k.length > 5 && !k.includes("YOUR_");

let aiClient: GoogleGenAI | null = null;
const getAiClient = () => {
  if (!aiClient && isKeyReady(GEMINI_API_KEY)) {
    aiClient = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
};

// Retry helper for robustness
async function withRetry<T>(fn: (attempt: number) => Promise<T>, maxRetries = 3, delayMs = 2000): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn(i);
    } catch (err: any) {
      lastErr = err;
      const message = (err.message || "").toLowerCase();
      const status = err.status || err.code || 500;
      
      // If resource exhausted (quota), throw immediately to let client know
      if (message.includes("quota") || message.includes("resource_exhausted") || status === 429) {
        throw new Error("QUOTA_EXHAUSTED");
      }
      
      console.warn(`[AI_RETRY] Attempt ${i + 1} failed. Retrying in ${delayMs * Math.pow(2, i)}ms...`, err);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }
  throw lastErr;
}

// 1. POST /api/ai/enrich-news
router.post("/enrich-news", async (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Invalid input data: array expected" });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({ error: "AI_LINK_DISCONNECTED", message: "Gemini API key missing or invalid." });
    }

    const results = await withRetry(async () => {
      const prompt = `
        Analyze these news headlines/summaries.
        Translate to professional English if needed.
        Summarize into a concise "Neural Link" headline (max 80 chars).
        Return JSON array: [{ "translatedTitle": string }]
        
        News Table:
        ${data.map((n: any, i: number) => `${i+1}. TITLE: ${n.title} | SUMMARY: ${n.description}`).join("\n")}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || "[]";
      return JSON.parse(responseText);
    });

    res.json(results);
  } catch (err: any) {
    console.error("News enrichment error:", err.message);
    if (err.message === "QUOTA_EXHAUSTED") {
      return res.status(429).json({ error: "AI_QUOTA_EXHAUSTED", message: "Gemini API quota exhausted. Fallback titles used." });
    }
    res.status(500).json({ error: "AI_SERVICE_ERROR", message: err.message });
  }
});

// 2. POST /api/ai/briefing
router.post("/briefing", async (req, res) => {
  try {
    const { symbol, data } = req.body;
    if (!symbol) return res.status(400).json({ error: "Missing symbol" });

    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({ error: "AI_LINK_DISCONNECTED", message: "Gemini API key missing or invalid." });
    }

    const results = await withRetry(async () => {
      const prompt = `
        You are a strategic intelligence officer for a multi-national investment firm.
        Generate a highly concise, tactical "Intelligence Brief" for the company: ${symbol}. 
        Use a technical, cyberpunk Terminal aesthetic (e.g., using terms like Nodes, Silos, Uplink, Vulnerabilities).
        
        Focus on 3 areas:
        1. Strategic Positioning (Current market dominance or threat)
        2. Supply Chain Integrity (Recent disruptions or key partners)
        3. Intelligence Alpha (A non-obvious tactical insight)

        Format: Keep it under 200 words total. Use short, punchy bullet points.
        Current Context Data: ${JSON.stringify(data)}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      return { briefing: response.text || "" };
    });

    res.json(results);
  } catch (err: any) {
    console.error("Briefing generation error:", err.message);
    if (err.message === "QUOTA_EXHAUSTED") {
      return res.status(429).json({ error: "AI_QUOTA_EXHAUSTED", message: "Gemini API quota exhausted." });
    }
    res.status(500).json({ error: "AI_SERVICE_ERROR", message: err.message });
  }
});

// 3. POST /api/ai/sentiment
router.post("/sentiment", async (req, res) => {
  try {
    const { symbol, data } = req.body;
    if (!symbol) return res.status(400).json({ error: "Missing symbol" });

    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({ error: "AI_LINK_DISCONNECTED", message: "Gemini API key missing or invalid." });
    }

    const results = await withRetry(async () => {
      const prompt = `
        Analyze the overall market sentiment for ${symbol} based on this data: ${JSON.stringify(data)}.
        Return a JSON object with:
        - score: number between -1 (extremely bearish/dangerous) and 1 (extremely bullish/stable)
        - label: string (e.g., "NEURAL_STABLE", "VOLATILE_OUTFLOW", "BULLISH_SIGNAL")
        - reason: string (max 10 words)
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || "{}";
      return JSON.parse(responseText);
    });

    res.json(results);
  } catch (err: any) {
    console.error("Sentiment generation error:", err.message);
    if (err.message === "QUOTA_EXHAUSTED") {
      return res.status(429).json({ error: "AI_QUOTA_EXHAUSTED", message: "Gemini API quota exhausted." });
    }
    res.status(500).json({ error: "AI_SERVICE_ERROR", message: err.message });
  }
});

export default router;
