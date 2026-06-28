import { Router } from "express";
import axios from "axios";

const router = Router();
const FMP_KEY = process.env.FMP_API_KEY || "";
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";
const ITIC_KEY = process.env.ITIC_API_KEY || "";
const TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY || "";

const isKeyReady = (k: string) => k && k.length > 5 && !k.includes("YOUR_");

// Simple in-memory cache to prevent hitting rate limits
const quoteCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 10000; // 10 seconds

async function fetchQuoteDetail(symbol: string) {
  const now = Date.now();
  const cached = quoteCache.get(symbol);
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  let data: any = {};
  let source = "NONE";

  let querySymbol = symbol;
  if (symbol === "ARAMCO") querySymbol = "2222.SR";
  else if (symbol === "700" || symbol === "TCEHY") querySymbol = "0700.HK";
  else if (symbol === "9988" || symbol === "BABA") querySymbol = "9988.HK";
  else if (symbol === "005930") querySymbol = "005930.KS";
  else if (symbol === "SMC") querySymbol = "SMCI";
  else if (symbol === "WTI") querySymbol = "CL=F";

  // Try FMP
  if (isKeyReady(FMP_KEY)) {
    try {
      const response = await axios.get(`https://financialmodelingprep.com/api/v3/quote/${querySymbol}?apikey=${FMP_KEY}`, { timeout: 3000 });
      if (response.data && response.data[0]) {
        data = response.data[0];
        source = "FMP";
      }
    } catch (e: any) {
      // suppress
    }
  }

  // Try Finnhub
  if (source === "NONE" && isKeyReady(FINNHUB_KEY)) {
    try {
      const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${querySymbol}&token=${FINNHUB_KEY}`, { timeout: 3000 });
      const fhData = response.data;
      if (fhData && fhData.c) {
        data = {
          price: fhData.c,
          change: fhData.d,
          changesPercentage: fhData.dp,
          dayHigh: fhData.h,
          dayLow: fhData.l,
          open: fhData.o,
          previousClose: fhData.pc
        };
        source = "FINNHUB";
      }
    } catch (e: any) {
      // suppress
    }
  }

  // Try Twelve Data
  if (source === "NONE" && isKeyReady(TWELVE_DATA_KEY)) {
    try {
      const response = await axios.get(`https://api.twelvedata.com/quote?symbol=${querySymbol}&apikey=${TWELVE_DATA_KEY}`, { timeout: 3000 });
      const tdData = response.data;
      if (tdData && tdData.close) {
        data = {
          price: parseFloat(tdData.close),
          change: parseFloat(tdData.change),
          changesPercentage: parseFloat(tdData.percent_change),
          dayHigh: parseFloat(tdData.high),
          dayLow: parseFloat(tdData.low),
          open: parseFloat(tdData.open),
          previousClose: parseFloat(tdData.previous_close)
        };
        source = "TWELVE_DATA";
      }
    } catch (e: any) {
      // suppress
    }
  }

  // Try Yahoo Finance fallback
  if (source === "NONE") {
    try {
      const response = await axios.get(`https://query2.finance.yahoo.com/v8/finance/chart/${querySymbol}`, {
        timeout: 4000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      
      const yhData = response.data;
      if (yhData && yhData.chart && yhData.chart.result && yhData.chart.result[0]) {
        const meta = yhData.chart.result[0].meta;
        data = {
          price: meta.regularMarketPrice,
          change: meta.regularMarketPrice - meta.previousClose,
          changesPercentage: ((meta.regularMarketPrice - meta.previousClose) / (meta.previousClose || 1)) * 100,
          dayHigh: meta.regularMarketDayHigh || meta.regularMarketPrice,
          dayLow: meta.regularMarketDayLow || meta.regularMarketPrice,
          open: meta.regularMarketOpen || meta.regularMarketPrice,
          previousClose: meta.previousClose
        };
        source = "YAHOO";
      }
    } catch (e: any) {
      // silent fail
    }
  }

  // Final simulation fallback
  if (source === "NONE") {
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    const seed = Math.abs(hash);
    
    const params: Record<string, { price: number, drift: number, vol: number }> = {
      "SPCX": { price: 201.80, drift: 0.8, vol: 5 }
    };
    
    const config = params[symbol] || { price: (45 + (seed % 280)), drift: 0.4, vol: 2 };
    
    const basePrice = config.price;
    const change = ((seed % 100) / 10 - 5) * config.drift;
    const previousClose = basePrice - change;
    const changesPercentage = (change / (previousClose || 1)) * 100;

    data = {
      price: basePrice,
      change: change,
      changesPercentage: changesPercentage,
      dayHigh: basePrice + config.vol,
      dayLow: basePrice - config.vol,
      open: previousClose + 0.1,
      previousClose: previousClose
    };
    source = "SIMULATION";
  }

  const result = {
    price: data.price || 0,
    changes: data.change || 0,
    changesPercentage: data.changesPercentage || 0,
    high: data.dayHigh || data.price || 0,
    low: data.dayLow || data.price || 0,
    open: data.open || data.price || 0,
    previousClose: data.previousClose || 0,
    symbol,
    source
  };

  if (symbol === "WTI" && (result.price === null || result.price < 10)) {
    console.warn(`[QUOTE_DETAIL] Correcting low/stale WTI price: ${result.price}`);
    result.price = 74.50;
    result.changes = 0.55;
    result.changesPercentage = 0.74;
    result.high = 75.20;
    result.low = 73.80;
    result.open = 73.95;
    result.previousClose = 73.95;
    result.source = "CORRECTED_BACKEND";
  }

  quoteCache.set(symbol, { data: result, timestamp: Date.now() });
  return result;
}

router.get("/:symbol?", async (req, res) => {
  try {
    const symbolsQuery = req.query.symbols as string;
    if (symbolsQuery) {
      const symbolsList = symbolsQuery.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
      
      // Batch symbols to avoid blowing up outbound connection limits 
      // although 15 is small, we process them in parallel with a concurrency limit if needed,
      // but let's keep it simple with Promise.all for now since it's only 15.
      const results = await Promise.all(symbolsList.map(async (sym) => {
        try {
          return await fetchQuoteDetail(sym);
        } catch (e) {
          return { symbol: sym, price: 0, changes: 0, error: true };
        }
      }));
      return res.json(results);
    }

    const symbol = (req.params.symbol || req.query.symbol as string || "").toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Missing symbol" });
    
    const dataResponse = await fetchQuoteDetail(symbol);
    res.json(dataResponse);
  } catch (err: any) {
    console.error("Quote route error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
