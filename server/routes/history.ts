import { Router } from "express";

const router = Router();
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";

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
        const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${finnhubResolution}&from=${finnhubFrom}&to=${to}&token=${FINNHUB_KEY}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data && data.s === 'ok' && Array.isArray(data.t)) {
            processed = data.t.map((t: number, i: number) => ({
              timestamp: t * 1000,
              price: data.c[i]
            })).filter(d => d.price > 0);
            if (processed.length > 0) source = "FINNHUB";
          }
        }
      } catch (e) { 
        console.warn(`Finnhub history fetch failed for ${symbol}`); 
      }
    }

    // 2. Try Yahoo Finance with timeframe params
    if (source === "NONE") {
      try {
        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${yahooRange}&interval=${yahooInterval}`;
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        if (response.ok) {
          const data = await response.json();
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
              })).filter(d => d.price != null && d.price > 0);
              if (processed.length > 0) source = `YAHOO_${timeframe}`;
              console.log(`YAHOO fetch success for ${yahooSymbol}, timeframe: ${timeframe}, count: ${processed.length}`);
            } else {
              console.warn(`YAHOO fetch missing prices/timestamps for ${yahooSymbol}`);
            }
          }
        }
      } catch (e) { 
        console.warn(`Yahoo history fetch failed for ${yahooSymbol}`); 
      }
    }

    // 3. Fallback to High-Fidelity Simulation (Deterministic per Stock & Timeframe)
    if (source === "NONE") {
      const rand = seedRandom(symbol + "_" + timeframe);
      
      let baseHash = 0;
      for (let i = 0; i < symbol.length; i++) {
        baseHash = symbol.charCodeAt(i) + ((baseHash << 5) - baseHash);
      }
      const seed = Math.abs(baseHash);
      const basePrice = 50 + (seed % 280); // range $50 to $330
      
      let pointsCount = 30;
      let intervalMs = 24 * 60 * 60 * 1000; // 1 day
      let driftFactor = (rand() - 0.48) * 0.4; // subtle custom daily drift
      let volFactor = 0.015; // standard daily stock volatility index

      if (timeframe === "1D") {
        pointsCount = 78; // At 5 mins standard intervals across 6.5 trading hours
        intervalMs = 5 * 60 * 1000;
        volFactor = 0.003; // highly granular, less change per 5m
      } else if (timeframe === "1W") {
        pointsCount = 120; // 5 trading days with 15m intervals
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
        driftFactor = (rand() - 0.46) * 1.5; // larger drift over long horizons
      } else if (timeframe === "5Y") {
        pointsCount = 260; // 52 weeks * 5 years
        intervalMs = 7 * 24 * 60 * 60 * 1000;
        volFactor = 0.045;
        driftFactor = (rand() - 0.43) * 6.0;
      }

      let currentPrice = basePrice;
      const now = Date.now();
      
      // Iterate forward to simulate a beautiful continuous walk ending at the present
      const points: any[] = [];
      for (let i = pointsCount - 1; i >= 0; i--) {
        const pointTime = now - (i * intervalMs);
        points.push({
          timestamp: pointTime,
          price: Number(currentPrice.toFixed(2))
        });
        
        // Random walk step
        const changePercent = (rand() - 0.5) * volFactor + driftFactor / pointsCount;
        currentPrice = currentPrice * (1 + changePercent);
        if (currentPrice < 1.0) currentPrice = 1.0; // floor price limit
      }
      
      processed = points;
      source = `SIMULATION_${timeframe}`;
    }

    res.json({ processed, source });
  } catch (err: any) {
    console.error("History fetch error:", err);
    res.status(500).json({ error: "Failed to fetch historical data", processed: [] });
  }
});

export default router;
