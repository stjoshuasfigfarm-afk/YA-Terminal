import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

const FMP_KEY = process.env.FMP_API_KEY || "";
const MARKETAUX_KEY = process.env.MARKETAUX_API_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

// AI Intelligence Agent for News
async function processIntelligence(newsItems: any[]) {
  if (!GEMINI_KEY) return newsItems;
  
  const prompt = `
    You are a high-level intelligence analyst. 
    Analyze the following news headlines and summaries.
    1. Detect the source language.
    2. Translate to professional English if needed.
    3. Summarize into a concise "Neural Link" headline (max 80 chars) and a summary (max 200 chars).
    
    Return a JSON array of objects: [{ "translatedTitle": string, "translatedSummary": string, "originalLanguage": string }]
    
    News to process:
    ${newsItems.map((n, i) => `${i+1}. TITLE: ${n.title} | SUMMARY: ${n.description}`).join("\n")}
  `;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const processed = JSON.parse(result.text || "[]");
    return newsItems.map((item, i) => ({
      ...item,
      intelligence: processed[i] || { 
        translatedTitle: item.title, 
        translatedSummary: item.description, 
        originalLanguage: "unknown" 
      }
    }));
  } catch (error) {
    console.error("AI Intelligence Error:", error);
    return newsItems.map(item => ({
      ...item,
      intelligence: { translatedTitle: item.title, translatedSummary: item.description, originalLanguage: "fallback" }
    }));
  }
}

// API Routes
app.get("/api/quote/:symbol", async (req, res) => {
  try {
    const response = await fetch(`https://financialmodelingprep.com/api/v3/quote/${req.params.symbol}?apikey=${FMP_KEY}`);
    const data = await response.json();
    res.json(data[0] || {});
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

app.get("/api/profile/:symbol", async (req, res) => {
  try {
    const response = await fetch(`https://financialmodelingprep.com/api/v3/profile/${req.params.symbol}?apikey=${FMP_KEY}`);
    const data = await response.json();
    res.json(data[0] || {});
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.get("/api/news/:symbol", async (req, res) => {
  try {
    const url = `https://api.marketaux.com/v1/news/all?symbols=${req.params.symbol}&filter_entities=true&limit=3&api_token=${MARKETAUX_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    const processedNews = await processIntelligence(data.data || []);
    res.json(processedNews);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

app.get("/api/financials/:symbol", async (req, res) => {
  try {
    const response = await fetch(`https://financialmodelingprep.com/api/v3/income-statement/${req.params.symbol}?limit=5&apikey=${FMP_KEY}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch financials" });
  }
});

// For Chart Data (Historical Daily)
app.get("/api/history/:symbol", async (req, res) => {
  try {
    const response = await fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/${req.params.symbol}?timeseries=30&apikey=${FMP_KEY}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Intelligence Terminal Server active on port ${PORT}`);
  });
}

startServer();
