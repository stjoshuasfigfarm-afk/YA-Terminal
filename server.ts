import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

const FMP_KEY = process.env.FMP_API_KEY || "";
const MARKETAUX_KEY = process.env.MARKETAUX_API_KEY || "";
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";
const ITICK_KEY = process.env.ITICK_API_KEY || "";
const FINANCIAL_DATA_KEY = process.env.FINANCIAL_DATA_API_KEY || "";

// API Routes
app.get("/api/quote/:symbol", async (req, res) => {
  const symbol = req.params.symbol;
  try {
    // 1. Try Finnhub (Real-time)
    if (FINNHUB_KEY) {
      const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`;
      const response = await fetch(finnhubUrl);
      const data = await response.json();
      if (data && data.c) {
        return res.json({
          price: data.c,
          change: data.d,
          changes: data.dp,
          changesPercentage: data.dp,
          dayLow: data.l,
          dayHigh: data.h,
          open: data.o,
          previousClose: data.pc,
          symbol
        });
      }
    }

    // 2. Try ITICK Fallback
    if (ITICK_KEY) {
      const itickUrl = `https://itick.org/api/v1/quote?symbol=${symbol}&api_token=${ITICK_KEY}`;
      const response = await fetch(itickUrl);
      const data = await response.json();
      if (data && data.price) {
        return res.json({
          price: data.price,
          change: data.change,
          changes: data.changes_percentage,
          symbol
        });
      }
    }

    // 3. Try FMP Fallback
    const fmpResponse = await fetch(`https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${FMP_KEY}`);
    const fmpData = await fmpResponse.json();
    if (fmpData && fmpData[0]) {
      const q = fmpData[0];
      return res.json({
        price: q.price,
        change: q.change,
        changes: q.changesPercentage,
        symbol
      });
    }

    res.json({});
  } catch (err) {
    res.status(500).json({ error: "Telemetry link failure" });
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
    // Return raw news, frontend will process with Gemini
    res.json(data.data || []);
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
  const symbol = req.params.symbol;
  try {
    // 1. Attempt FMP first
    let response = await fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?timeseries=30&apikey=${FMP_KEY}`);
    let data = await response.json();
    
    if (data && data.historical && data.historical.length > 0) {
      return res.json(data);
    }
    
    // 2. Fallback to Finnhub
    if (FINNHUB_KEY) {
      const to = Math.floor(Date.now() / 1000);
      const from = to - (30 * 24 * 60 * 60);
      const finnhubUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_KEY}`;
      
      response = await fetch(finnhubUrl);
      const fhData = await response.json();
      
      if (fhData.s === "ok") {
        const historical = fhData.t.map((timestamp: number, i: number) => ({
          date: new Date(timestamp * 1000).toISOString().split('T')[0],
          close: fhData.c[i]
        }));
        return res.json({ symbol, historical });
      }
    }

    // 3. Fallback to ITICK
    if (ITICK_KEY) {
      const itickUrl = `https://itick.org/api/v1/history?symbol=${symbol}&api_token=${ITICK_KEY}&limit=30`;
      response = await fetch(itickUrl);
      const itickData = await response.json();
      if (itickData && Array.isArray(itickData.history)) {
        return res.json({ 
          symbol, 
          historical: itickData.history.map((h: any) => ({
            date: h.date,
            close: h.close
          }))
        });
      }
    }
    
    res.json({ symbol, historical: [] });
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
