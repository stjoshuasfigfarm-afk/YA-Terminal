import { Router } from "express";

const router = Router();
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";

const isKeyReady = (k: string) => k && k.length > 5 && !k.includes("YOUR_");

router.get("/:symbol?", async (req, res) => {
  try {
    const symbol = (req.params.symbol || req.query.symbol as string || "").toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Missing symbol" });
    
    const to = Math.floor(Date.now() / 1000);
    const from = to - (60 * 24 * 60 * 60); // 60 days
    let processed: any[] = [];
    let source = "NONE";

    let yahooSymbol = symbol;
    if (symbol === "VIX") yahooSymbol = "^VIX";

    // 1. Try Finnhub
    if (source === "NONE" && isKeyReady(FINNHUB_KEY)) {
      try {
        const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_KEY}`;
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
      } catch (e) { console.warn("Finnhub fetch failed"); }
    }

    // 2. Try Yahoo Finance
    if (source === "NONE") {
      try {
        const response = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`, {
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
              if (processed.length > 0) source = "YAHOO";
              console.log(`YAHOO fetch success for ${yahooSymbol}, source: ${source}, count: ${processed.length}`);
            } else {
              console.warn(`YAHOO fetch missing prices/timestamps for ${yahooSymbol}`);
            }
          }
        }
      } catch (e) { console.warn("Yahoo fetch failed"); }
    }

    // 3. Fallback to Simulation
    if (source === "NONE") {
      let hash = 0;
      for (let i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
      const seed = Math.abs(hash);
      let price = 50 + (seed % 200);
      for (let i = 0; i < 60; i++) {
        processed.push({
          timestamp: Date.now() - (60 - i) * 24 * 60 * 60 * 1000,
          price: price
        });
        price += (Math.random() - 0.5) * 5;
      }
      source = "SIMULATION";
    }

    res.json({ processed, source });
  } catch (err: any) {
    console.error("History fetch error:", err);
    res.status(500).json({ error: "Failed to fetch historical data", processed: [] });
  }
});

export default router;
