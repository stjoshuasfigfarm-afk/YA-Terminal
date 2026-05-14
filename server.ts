import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { COMPANIES } from "./src/data/companies";

dotenv.config();

const app = express();
export default app;
const PORT = 3000;

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";

// API Routes
app.get("/api/quote/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    if (!FINNHUB_KEY) throw new Error("No Key");
    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`);
    const data = await response.json();
    res.json({
      price: data.c,
      changes: data.d,
      changesPercentage: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
      symbol
    });
  } catch (err) {
    const price = Math.random() * 200 + 100;
    res.json({
      price: price,
      changes: (Math.random() - 0.5) * 5,
      changesPercentage: (Math.random() - 0.5) * 2,
      high: price + 2,
      low: price - 2,
      open: price,
      previousClose: price - 1,
      symbol: req.params.symbol.toUpperCase(),
      mock: true
    });
  }
});

app.get("/api/profile/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    if (!FINNHUB_KEY) throw new Error("No Key");
    const response = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`);
    const data = await response.json();
    res.json({
      mktCap: data.marketCapitalization * 1000000,
      companyName: data.name,
      industry: data.finnhubIndustry,
      website: data.weburl,
      logo: data.logo,
      currency: data.currency
    });
  } catch (err) {
    res.json({
      mktCap: 1500000000000 + Math.random() * 1000000000,
      companyName: COMPANIES.find(c => c.symbol === req.params.symbol.toUpperCase())?.name || req.params.symbol.toUpperCase(),
      industry: "Technology",
      website: "https://example.com",
      currency: "USD",
      mock: true
    });
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
    const symbol = req.params.symbol.toUpperCase();
    if (!FINNHUB_KEY) throw new Error("No Key");
    const response = await fetch(`https://finnhub.io/api/v1/stock/earnings?symbol=${symbol}&token=${FINNHUB_KEY}`);
    const data = await response.json();
    // Map to { date, netIncome } for the histogram
    const mapped = (data || []).map((e: any) => ({
      date: e.period,
      netIncome: e.actual - e.estimate // Using surprise as a proxy for visual
    }));
    res.json(mapped);
  } catch (err) {
    const mockFinancials = [];
    for (let i = 4; i >= 1; i--) {
      mockFinancials.push({
        date: `2023-Q${i}`,
        netIncome: (Math.random() - 0.2) * 5 // Mock surprise/velocity
      });
    }
    res.json(mockFinancials);
  }
});

app.get("/api/history/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    
    if (!FINNHUB_KEY) {
      // Return mock historical data if no key
      const mockHistorical = [];
      const now = Date.now();
      let lastPrice = Math.random() * 100 + 150;
      for (let i = 60; i >= 0; i--) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000);
        const open = lastPrice;
        const close = open + (Math.random() - 0.5) * 10;
        const high = Math.max(open, close) + Math.random() * 5;
        const low = Math.min(open, close) - Math.random() * 5;
        const volume = Math.floor(Math.random() * 1000000) + 100000;
        
        mockHistorical.push({
          time: Math.floor(date.getTime() / 1000) as any,
          open,
          high,
          low,
          close,
          volume
        });
        lastPrice = close;
      }
      return res.json({ historical: mockHistorical });
    }

    const to = Math.floor(Date.now() / 1000);
    const from = to - (60 * 24 * 60 * 60); // 60 days
    
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.s === 'ok') {
      const historical = data.t.map((t: number, i: number) => ({
        time: t,
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i]
      }));
      res.json({ historical });
    } else {
      throw new Error("Finnhub error");
    }
  } catch (err) {
    const mockHistorical = [];
    const now = Date.now();
    let lastPrice = 150 + Math.random() * 50;
    for (let i = 60; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const open = lastPrice;
      const close = open + (Math.random() - 0.5) * 20;
      mockHistorical.push({
        time: Math.floor(date.getTime() / 1000) as any,
        open,
        high: Math.max(open, close) + 5,
        low: Math.min(open, close) - 5,
        close,
        volume: Math.floor(Math.random() * 1000000)
      });
      lastPrice = close;
    }
    res.json({ historical: mockHistorical });
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
