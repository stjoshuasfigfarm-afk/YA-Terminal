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
const ALPACA_KEY = process.env.ALPACA_API_KEY || "";
const ALPACA_SECRET = process.env.ALPACA_SECRET_KEY || "";

// API Routes
app.get("/api/quote/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    // 1. Try Alpaca (High-Priority Exchange Direct)
    if (ALPACA_KEY && ALPACA_SECRET) {
      try {
        const alpacaUrl = `https://data.alpaca.markets/v2/stocks/${symbol}/trades/latest`;
        const response = await fetch(alpacaUrl, {
          headers: {
            "APCA-API-KEY-ID": ALPACA_KEY,
            "APCA-API-SECRET-KEY": ALPACA_SECRET
          }
        });
        const data = await response.json();
        if (data && data.trade && data.trade.p) {
          return res.json({
            price: data.trade.p,
            symbol,
            source: "Alpaca"
          });
        }
      } catch (e) { /* Fallback */ }
    }

    // 2. Try Finnhub (Real-time Aggregated)
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
          symbol,
          source: "Finnhub"
        });
      }
    }

    // 3. Try ITICK (High-Frequency Feed)
    if (ITICK_KEY) {
      const itickUrl = `https://itick.org/api/v1/quote?symbol=${symbol}&api_token=${ITICK_KEY}`;
      const response = await fetch(itickUrl);
      const data = await response.json();
      if (data && data.price) {
        return res.json({
          price: data.price,
          change: data.change,
          changes: data.changes_percentage,
          symbol,
          source: "iTick"
        });
      }
    }

    // 4. Try FMP Fallback
    const fmpResponse = await fetch(`https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${FMP_KEY}`);
    const fmpData = await fmpResponse.json();
    if (fmpData && fmpData[0]) {
      const q = fmpData[0];
      return res.json({
        price: q.price,
        change: q.change,
        changes: q.changesPercentage,
        symbol,
        source: "FMP"
      });
    }

    // 5. Ultimate Fallback (FinancialData.net)
    if (FINANCIAL_DATA_KEY) {
      const fdUrl = `https://api.financialdata.net/v1/quote/${symbol}?apikey=${FINANCIAL_DATA_KEY}`;
      const response = await fetch(fdUrl);
      const data = await response.json();
      if (data && data.price) {
        return res.json({ ...data, source: "FinancialData" });
      }
    }

    res.json({ symbol, price: 0, changes: 0 });
  } catch (err) {
    res.status(500).json({ error: "Telemetry link failure" });
  }
});

app.get("/api/profile/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    // 1. Try FMP (Primary for deep profiling)
    const fmpResponse = await fetch(`https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${FMP_KEY}`);
    const fmpData = await fmpResponse.json();
    let profile = fmpData[0] || {};

    // 2. Enrich with Finnhub (Industry & more)
    if (FINNHUB_KEY) {
      try {
        const fhRes = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`);
        const fhData = await fhRes.json();
        profile = {
          ...profile,
          finnhubIndustry: fhData.finnhubIndustry,
          currency: fhData.currency || profile.currency,
          exchange: fhData.exchange || profile.exchange,
          marketCapitalization: fhData.marketCapitalization || profile.mktCap
        };
      } catch (e) { /* Ignore enrich error */ }
    }

    // 3. Fallback to FinancialData.net if empty
    if (!profile.symbol && FINANCIAL_DATA_KEY) {
      const fdRes = await fetch(`https://api.financialdata.net/v1/profile/${symbol}?apikey=${FINANCIAL_DATA_KEY}`);
      const fdData = await fdRes.json();
      profile = fdData || profile;
    }

    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.get("/api/news/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    // 1. Try Marketaux
    const url = `https://api.marketaux.com/v1/news/all?symbols=${symbol}&filter_entities=true&limit=5&api_token=${MARKETAUX_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return res.json(data.data);
    }

    // 2. Fallback to Finnhub News
    if (FINNHUB_KEY) {
      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const fhNewsUrl = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_KEY}`;
      const fhRes = await fetch(fhNewsUrl);
      const fhData = await fhRes.json();
      if (Array.isArray(fhData)) {
        return res.json(fhData.slice(0, 5).map((n: any) => ({
          title: n.headline,
          description: n.summary,
          published_at: new Date(n.datetime * 1000).toISOString(),
          url: n.url,
          source: n.source
        })));
      }
    }

    res.json([]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

app.get("/api/financials/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    // 1. Try FMP
    const response = await fetch(`https://financialmodelingprep.com/api/v3/income-statement/${symbol}?limit=5&apikey=${FMP_KEY}`);
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return res.json(data);
    }

    // 2. Fallback to FinancialData.net
    if (FINANCIAL_DATA_KEY) {
      const fdRes = await fetch(`https://api.financialdata.net/v1/income-statement/${symbol}?apikey=${FINANCIAL_DATA_KEY}`);
      const fdData = await fdRes.json();
      if (Array.isArray(fdData)) return res.json(fdData);
    }

    res.json([]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch financials" });
  }
});

// For Chart Data (Historical Daily)
app.get("/api/history/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
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

app.get("/api/market-cap/:symbol", async (req, res) => {
  const symbol = req.params.symbol;
  try {
    const response = await fetch(`https://financialmodelingprep.com/api/v3/historical-market-capitalization/${symbol}?limit=30&apikey=${FMP_KEY}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch market cap history" });
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
