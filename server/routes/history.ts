import { Router } from "express";

const router = Router();
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";

const isKeyReady = (k: string) => k && k.length > 5 && !k.includes("YOUR_");

router.get("/:symbol?", async (req, res) => {
  try {
    const symbol = (req.params.symbol || req.query.symbol as string || "").toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Missing symbol" });
    
    if (!isKeyReady(FINNHUB_KEY)) {
      throw new Error("Finnhub key missing");
    }

    const to = Math.floor(Date.now() / 1000);
    const from = to - (60 * 24 * 60 * 60); // 60 days
    
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.s === 'ok' && Array.isArray(data.t)) {
      const historical = data.t.map((t: number, i: number) => ({
        time: t,
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i]
      }));
      return res.json({ historical });
    } else {
      throw new Error("Invalid candlestick response status: " + (data?.s || "empty"));
    }
  } catch (err: any) {
    const mockHistorical = [];
    const now = Date.now();
    let lastPrice = 150 + Math.random() * 50;
    for (let i = 60; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const open = lastPrice;
      const close = open + (Math.random() - 0.5) * 20;
      mockHistorical.push({
        time: Math.floor(date.getTime() / 1000),
        open,
        high: Math.max(open, close) + 5,
        low: Math.min(open, close) - 5,
        close,
        volume: Math.floor(Math.random() * 1000000)
      });
      lastPrice = close;
    }
    res.json({ historical: mockHistorical, mock: true, error: err.message });
  }
});

export default router;
