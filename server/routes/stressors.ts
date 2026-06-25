import express from "express";
import { GoogleGenAI } from "@google/genai";

const router = express.Router();
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

router.post("/", async (req, res) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Generate 5 new, relevant economic or geopolitical stress factors (short uppercase words, like 'LIQUIDITY', 'GEOPOLITICAL'). Return only a JSON array of strings.",
      config: {
        responseMimeType: "application/json",
      },
    });

    const stressors = JSON.parse(response.text || "[]");
    res.json({ stressors });
  } catch (error) {
    console.error("Error generating stressors:", error);
    res.status(500).json({ error: "Failed to generate stressors" });
  }
});

export default router;
