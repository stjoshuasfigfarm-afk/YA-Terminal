import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { COMPANIES } from "./src/data/companies";

dotenv.config();


import handler from "./api/index.js";

const app = express();
app.use(express.json());
export default app;
const PORT = 3000;

// API Routes
app.all("/api", async (req, res) => {
  // Wrap the serverless handler
  try {
    // Vercel handlers are (req, res) => void | Promise<void>
    // but they expect a slightly different res object if it's purely serverless.
    // However, for Express compatibility in dev, this usually works or needs slight mapping.
    await handler(req, res);
  } catch (err) {
    console.error("API Proxy Error:", err);
    res.status(500).json({ error: "Silo Engine Fault", details: err.message });
  }
});

const FMP_KEY = process.env.FMP_API_KEY || "";
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";

app.get("/api/search", async (req, res) => {
  try {
    const query = (req.query.q as string || "").toUpperCase();
    if (!query) return res.json([]);
    
    if (FMP_KEY && FMP_KEY.length > 5 && !FMP_KEY.includes('YOUR_')) {
      const response = await fetch(`https://financialmodelingprep.com/api/v3/search?query=${query}&limit=10&apikey=${FMP_KEY}`);
      const data = await response.json();
      return res.json(data.map((item: any) => ({
        symbol: item.symbol,
        name: item.name
      })));
    }
    
    // Fallback search
    const mockTickers = [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'MSFT', name: 'Microsoft Corp.' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      { symbol: 'TSLA', name: 'Tesla Inc.' },
      { symbol: 'NVDA', name: 'Nvidia Corp.' }
    ].filter(t => t.symbol.includes(query));
    res.json(mockTickers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/quote/:symbol?", async (req, res) => {
  try {
    const symbol = (req.params.symbol || req.query.symbol as string || "").toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Missing symbol" });
    
    let data: any = {};
    if (FMP_KEY && FMP_KEY.length > 5 && !FMP_KEY.includes('YOUR_')) {
      const response = await fetch(`https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${FMP_KEY}`);
      const fmpData = await response.json();
      if (fmpData && fmpData[0]) {
        data = fmpData[0];
      } else {
        throw new Error("No FMP data");
      }
    } else {
      throw new Error("No valid FMP Key");
    }

    res.json({
      price: data.price,
      changes: data.change,
      changesPercentage: data.changesPercentage,
      high: data.dayHigh,
      low: data.dayLow,
      open: data.open,
      previousClose: data.previousClose,
      symbol
    });
  } catch (err) {
    const symbol = (req.params.symbol || req.query.symbol as string || "UNKNOWN").toUpperCase();
    let base = 150.00;
    if (symbol === 'SPY') base = 739.00;
    if (symbol === 'CL') base = 78.45;
    
    // Add jitter to simulate live market data even in mock mode
    const jitter = (Math.random() - 0.5) * 0.1;
    const price = base + jitter;
    res.json({
      price: Number(price.toFixed(2)),
      changes: Number(((Math.random() - 0.5) * 4.5).toFixed(2)),
      changesPercentage: Number(((Math.random() - 0.5) * 1.8).toFixed(2)),
      high: Number((price + Math.random() * 2).toFixed(2)),
      low: Number((price - Math.random() * 2).toFixed(2)),
      open: Number((price + (Math.random() - 0.5)).toFixed(2)),
      previousClose: Number((price - (Math.random() - 0.5)).toFixed(2)),
      symbol: symbol,
      mock: true,
      error: err.message
    });
  }
});

app.get("/api/profile/:symbol?", async (req, res) => {
  try {
    const symbol = (req.params.symbol || req.query.symbol as string || "").toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Missing symbol" });
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
    const symbol = (req.params.symbol || req.query.symbol as string || "AAPL").toUpperCase();
    const company = COMPANIES.find(c => c.symbol === symbol);
    res.json({
      mktCap: (symbol === 'SPY' ? 500e9 : 150e9) + Math.random() * 10e9,
      companyName: company?.name || symbol,
      industry: company?.sector || "Technology",
      website: "https://terminal.nexus",
      currency: "USD",
      dividend: 0.45 + (Math.random() * 0.5),
      volAvg: 50000000 + Math.floor(Math.random() * 10000000),
      lastAnnualEarnings: 80e9 + Math.random() * 5e9,
      fullTimeEmployees: 154000 + Math.floor(Math.random() * 5000),
      mock: true
    });
  }
});

app.get("/api/news/:symbol?", async (req, res) => {
  try {
    const symbol = (req.params.symbol || req.query.symbol as string || "").toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Missing symbol" });
    const today = new Date().toISOString().split('T')[0];
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const fromDate = lastMonth.toISOString().split('T')[0];
    
    const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${today}&token=${FINNHUB_KEY}`;
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

app.get("/api/financials/:symbol?", async (req, res) => {
  try {
    const symbol = (req.params.symbol || req.query.symbol as string || "").toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Missing symbol" });
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
    res.json([
      { date: "2024-Q1", netIncome: 34.5e9 + (Math.random() * 2e9) },
      { date: "2023-Q4", netIncome: 32.1e9 + (Math.random() * 2e9) },
      { date: "2023-Q3", netIncome: 28.7e9 + (Math.random() * 2e9) },
      { date: "2023-Q2", netIncome: 25.4e9 + (Math.random() * 2e9) },
      { date: "2023-Q1", netIncome: 18.2e9 + (Math.random() * 2e9) },
      { date: "2022-Q4", netIncome: -2.4e9 - (Math.random() * 1e9) }
    ]);
  }
});

app.get("/api/history/:symbol?", async (req, res) => {
  try {
    const symbol = (req.params.symbol || req.query.symbol as string || "UNKNOWN").toUpperCase();
    
    if (!FINNHUB_KEY) {
      // Return mock historical data if no key
      const mockHistorical = [];
      const now = Date.now();
      const base = symbol === 'SPY' ? 739.00 : 150.00;
      let lastPrice = base + Math.random() * 10;
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
    const symbol = (req.params.symbol || req.query.symbol as string || "UNKNOWN").toUpperCase();
    const mockHistorical = [];
    const now = Date.now();
    const base = symbol === 'SPY' ? 739.00 : 150.00;
    let lastPrice = base + (Math.random() - 0.5) * 2;
    for (let i = 60; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const open = lastPrice;
      const close = open + (Math.random() - 0.5) * 2;
      mockHistorical.push({
        time: Math.floor(date.getTime() / 1000) as any,
        open,
        high: Math.max(open, close) + 0.5,
        low: Math.min(open, close) - 0.5,
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
