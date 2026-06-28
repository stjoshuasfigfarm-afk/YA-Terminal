import { Router } from "express";
import { GoogleGenAI } from "@google/genai";

const router = Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const getAiClient = () => {
  return new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

router.post("/", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Missing query" });

  try {
     if (!GEMINI_API_KEY) {
         return res.status(500).json({ error: "API Key missing" });
     }
     const ai = getAiClient();

     let enhancedQuery = query;
     if (String(query).toUpperCase() === "SPY") {
       enhancedQuery = "S&P 500 index OR (CIA OR MI6 OR espionage OR international intelligence agency)";
     }

     const response = await ai.models.generateContent({
       model: "gemini-2.5-flash",
       contents: `Search for the latest news headlines about: ${enhancedQuery}. Return a JSON array of headlines with title and source. CRITICAL: If the query relates to SPY, focus exclusively on the S&P 500 index or international intelligence affairs (CIA, MI6, espionage). Strictly exclude any movie, film, entertainment, pop-culture, or celebrity headlines.`,
       config: {
         responseMimeType: "application/json",
         tools: [{ googleSearch: {} }]
       }
     });
     
     // I need to parse the JSON output of Gemini
     const cleaned = response.text ? response.text.replace(/```json/g, "").replace(/```/g, "").trim() : "[]";
     res.json(JSON.parse(cleaned));
  } catch (err: any) {
    console.error("Live news error:", err);
    res.status(500).json({ error: err.message });
  }
});
export default router;
