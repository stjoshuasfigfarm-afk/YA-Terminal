import { Router } from "express";
import axios from "axios";

const router = Router();
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";
const TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY || "";

const isKeyReady = (k: string) => k && k.length > 5 && !k.includes("YOUR_");

// Seedable PRNG function to generate stable high-fidelity mock data on refresh
function seedRandom(seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return function() {
    hash = ((hash + 0x7ed55d16) + (hash << 12)) & 0xffffffff;
    hash = ((hash ^ 0xc761c23c) ^ (hash >>> 19)) & 0xffffffff;
    hash = ((hash + 0x165667b1) + (hash << 5)) & 0xffffffff;
    hash = ((hash + 0xd3a2646c) ^ (hash << 9)) & 0xffffffff;
    hash = ((hash + 0xfd7046c5) + (hash << 3)) & 0xffffffff;
    hash = ((hash ^ 0xb55a4f09) ^ (hash >>> 16)) & 0xffffffff;
    return (hash >>> 0) / 4294967296;
  };
}

router.get("/:symbol?", async (req, res) => {
  try {
    const symbol = (req.params.symbol || req.query.symbol as string || "").toUpperCase();
    const timeframe = (req.query.timeframe as string || "1M").toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Missing symbol" });
    
    let processed: any[] = [];
    let source = "NONE";

    let yahooSymbol = symbol;
    if (symbol === "VIX") yahooSymbol = "^VIX";
    else if (symbol === "ARAMCO") yahooSymbol = "2222.SR";
    else if (symbol === "700" || symbol === "TCEHY") yahooSymbol = "0700.HK";
    else if (symbol === "9988" || symbol === "BABA") yahooSymbol = "9988.HK";
    else if (symbol === "005930") yahooSymbol = "005930.KS";
    else if (symbol === "SMC") yahooSymbol = "SMCI";
    else if (symbol === "WTI") yahooSymbol = "CL=F";

    // Standard timeframe configuration mapping
    let yahooRange = "1mo";
    let yahooInterval = "1d";
    
    let finnhubResolution = "D";
    const to = Math.floor(Date.now() / 1000);
    let finnhubFrom = to - (30 * 24 * 60 * 60);

    if (timeframe === "1D") {
      yahooRange = "1d";
      yahooInterval = "5m";
      finnhubFrom = to - (24 * 60 * 60);
      finnhubResolution = "15";
    } else if (timeframe === "1W") {
      yahooRange = "5d";
      yahooInterval = "15m";
      finnhubFrom = to - (7 * 24 * 60 * 60);
      finnhubResolution = "60";
    } else if (timeframe === "1M") {
      yahooRange = "1mo";
      yahooInterval = "1d";
      finnhubFrom = to - (30 * 24 * 60 * 60);
      finnhubResolution = "D";
    } else if (timeframe === "1Y") {
      yahooRange = "1y";
      yahooInterval = "1d";
      finnhubFrom = to - (365 * 24 * 60 * 60);
      finnhubResolution = "D";
    } else if (timeframe === "5Y") {
      yahooRange = "5y";
      yahooInterval = "1wk";
      finnhubFrom = to - (5 * 365 * 24 * 60 * 60);
      finnhubResolution = "W";
    }

    // 1. Try Finnhub (if key present and ready)
    if (source === "NONE" && isKeyReady(FINNHUB_KEY)) {
      try {
        const url = `https://finnhub.io/api/v1/stock/candle?symbol=${yahooSymbol}&resolution=${finnhubResolution}&from=${finnhubFrom}&to=${to}&token=${FINNHUB_KEY}`;
        const response = await axios.get(url, { timeout: 3500 });
        const data = response.data;
        if (data && data.s === 'ok' && Array.isArray(data.t)) {
          processed = data.t.map((t: number, i: number) => ({
            timestamp: t * 1000,
            price: data.c[i]
          })).filter((d: any) => d.price > 0);
          if (processed.length > 0) source = "FINNHUB";
        }
      } catch (e) { 
        // Silent fallback as intended
      }
    }

    // 2. Try Twelve Data API
    if (source === "NONE" && isKeyReady(TWELVE_DATA_KEY)) {
      try {
        let tdInterval = "1day";
        let outputsize = 30;
        if (timeframe === "1D") { tdInterval = "5min"; outputsize = 78; }
        else if (timeframe === "1W") { tdInterval = "15min"; outputsize = 100; }
        else if (timeframe === "1M") { tdInterval = "1day"; outputsize = 30; }
        else if (timeframe === "1Y") { tdInterval = "1day"; outputsize = 365; }
        else if (timeframe === "5Y") { tdInterval = "1week"; outputsize = 260; }

        const url = `https://api.twelvedata.com/time_series?symbol=${yahooSymbol}&interval=${tdInterval}&outputsize=${outputsize}&apikey=${TWELVE_DATA_KEY}`;
        const response = await axios.get(url, { timeout: 4000 });
        const data = response.data;
        if (data && data.values && Array.isArray(data.values)) {
          processed = data.values.map((v: any) => ({
            timestamp: new Date(v.datetime).getTime(),
            price: parseFloat(v.close)
          })).filter((d: any) => d.price > 0).reverse(); // Twelve data is desc by default
          if (processed.length > 0) source = `TWELVE_${timeframe}`;
        }
      } catch (e) {
        // Silent fallback
      }
    }

    // 3. Try Yahoo Finance with timeframe params
    if (source === "NONE") {
      try {
        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${yahooRange}&interval=${yahooInterval}`;
        const response = await axios.get(url, {
          timeout: 5000,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" }
        });
        const data = response.data;
        if (data?.chart?.result?.[0]) {
          const result = data.chart.result[0];
          const timestamps = result.timestamp;
          const quoteData = result.indicators.quote[0];
          const adjData = result.indicators.adjclose ? result.indicators.adjclose[0] : null;
          const prices = quoteData.close || (adjData ? adjData.adjclose : null);
          
          if (timestamps && prices) {
            processed = timestamps.map((t: number, i: number) => ({
              timestamp: t * 1000,
              price: prices[i]
            })).filter((d: any) => d.price != null && d.price > 0);
            if (processed.length > 0) source = `YAHOO_${timeframe}`;
          }
        }
      } catch (e) { 
        // Silent fallback
      }
    }

    // 3. Fallback to High-Fidelity Simulation
    if (source === "NONE") {
      const rand = seedRandom(symbol + "_" + timeframe);
      
      let baseHash = 0;
      for (let i = 0; i < symbol.length; i++) {
        baseHash = symbol.charCodeAt(i) + ((baseHash << 5) - baseHash);
      }
      const seed = Math.abs(baseHash);
      
      const customParams: Record<string, { price: number, drift: number, vol: number }> = {
        "SPCX": { price: 201.80, drift: 0.8, vol: 0.05 }
      };
      
      const cfg = customParams[symbol] || { price: (50 + (seed % 280)), drift: (rand() - 0.48) * 0.4, vol: 0.015 };
      const basePrice = cfg.price;
      
      let pointsCount = 30;
      let intervalMs = 24 * 60 * 60 * 1000;
      let driftFactor = cfg.drift;
      let volFactor = cfg.vol;

      if (timeframe === "1D") {
        pointsCount = 78;
        intervalMs = 5 * 60 * 1000;
        volFactor = 0.003;
      } else if (timeframe === "1W") {
        pointsCount = 120;
        intervalMs = 30 * 60 * 1000;
        volFactor = 0.005;
      } else if (timeframe === "1M") {
        pointsCount = 30;
        intervalMs = 24 * 60 * 60 * 1000;
        volFactor = 0.015;
      } else if (timeframe === "1Y") {
        pointsCount = 365;
        intervalMs = 24 * 60 * 60 * 1000;
        volFactor = 0.022;
        driftFactor = (rand() - 0.46) * 1.5;
      } else if (timeframe === "5Y") {
        pointsCount = 260;
        intervalMs = 7 * 24 * 60 * 60 * 1000;
        volFactor = 0.045;
        driftFactor = (rand() - 0.43) * 6.0;
      }

      let currentPrice = basePrice;
      const now = Date.now();
      const points: any[] = [];
      for (let i = pointsCount - 1; i >= 0; i--) {
        const pointTime = now - (i * intervalMs);
        points.push({
          timestamp: pointTime,
          price: Number(currentPrice.toFixed(2))
        });
        
        const changePercent = (rand() - 0.5) * volFactor + driftFactor / pointsCount;
        currentPrice = currentPrice * (1 + changePercent);
        if (currentPrice < 1.0) currentPrice = 1.0;
      }
      
      processed = points;
      source = `SIMULATION_${timeframe}`;
    }

    res.json({ processed, source });
  } catch (err: any) {
    console.error("History fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch historical data", processed: [] });
  }
});

export default router;
