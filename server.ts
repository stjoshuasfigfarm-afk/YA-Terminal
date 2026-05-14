import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
export default app;
const PORT = 3000;

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";

// API Routes
app.get("/api/quote/:symbol", async (req, res) => {
  try {
    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${req.params.symbol.toUpperCase()}&token=${FINNHUB_KEY}`);
    const data = await response.json();
    // Map Finnhub to existing structure: { price, changes, changesPercentage }
    res.json({
      price: data.c,
      changes: data.d,
      changesPercentage: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
      symbol: req.params.symbol.toUpperCase()
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

app.get("/api/profile/:symbol", async (req, res) => {
  try {
    const response = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${req.params.symbol.toUpperCase()}&token=${FINNHUB_KEY}`);
    const data = await response.json();
    // Map Finnhub to existing structure: { mktCap, volAvg, companyName, description }
    res.json({
      mktCap: data.marketCapitalization * 1000000, // Finnhub is in millions
      companyName: data.name,
      industry: data.finnhubIndustry,
      website: data.weburl,
      logo: data.logo,
      currency: data.currency
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.get("/api/news/:symbol", async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const fromDate = lastMonth.toISOString().split('T')[0];
    
    const url = `https://finnhub.io/api/v1/company-news?symbol=${req.params.symbol.toUpperCase()}&from=${fromDate}&to=${today}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    // Map Finnhub news to existing structure: [{ title, description, published_at }]
    const mappedNews = (data || []).slice(0, 5).map((n: any) => ({
      title: n.headline,
      description: n.summary,
      published_at: new Date(n.datetime * 1000).toISOString(),
      url: n.url,
      image: n.image
    }));
    
    res.json(mappedNews);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

app.get("/api/financials/:symbol", async (req, res) => {
  try {
    const response = await fetch(`https://finnhub.io/api/v1/stock/earnings?symbol=${req.params.symbol.toUpperCase()}&token=${FINNHUB_KEY}`);
    const data = await response.json();
    // Map to { date, netIncome } for the histogram
    const mapped = (data || []).map((e: any) => ({
      date: e.period,
      netIncome: e.actual - e.estimate // Using surprise as a proxy for visual
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch financials" });
  }
});

app.get("/api/history/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const to = Math.floor(Date.now() / 1000);
    const from = to - (60 * 24 * 60 * 60); // 60 days of data for better context
    
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.s === 'ok') {
      const historical = data.t.map((t: number, i: number) => ({
        date: new Date(t * 1000).toISOString().split('T')[0],
        close: data.c[i]
      }));
      res.json({ historical });
    } else {
      res.json({ historical: [] });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Intelligence Terminal Server active on port ${PORT}`);
    });
  }
}

startServer();
