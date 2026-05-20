import { Router } from "express";

const router = Router();
const FMP_KEY = process.env.FMP_API_KEY || "";
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";
const ITIC_KEY = process.env.ITIC_API_KEY || "";

const isKeyReady = (k: string) => k && k.length > 5 && !k.includes("YOUR_");

router.get("/:symbol?", async (req, res) => {
  try {
    const symbol = (req.params.symbol || req.query.symbol as string || "").toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Missing symbol" });
    
    let data: any = {};
    let source = "NONE";

    // Try FMP
    if (isKeyReady(FMP_KEY)) {
      try {
        const response = await fetch(`https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${FMP_KEY}`);
        const fmpData = await response.json();
        if (fmpData && fmpData[0]) {
          data = fmpData[0];
          source = "FMP";
        }
      } catch (e: any) {
        console.warn("FMP quote fetch failed", e.message);
      }
    }

    // Try Finnhub
    if (source === "NONE" && isKeyReady(FINNHUB_KEY)) {
      try {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`);
        const fhData = await response.json();
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
        console.warn("Finnhub quote fetch failed", e.message);
      }
    }

    // Try ITIC
    if (source === "NONE" && isKeyReady(ITIC_KEY)) {
      try {
        const response = await fetch(`https://api.itick.io/v1/quote?symbol=${symbol}&token=${ITIC_KEY}`);
        if (response.ok) {
          const itkData = await response.json();
          if (itkData && itkData.price) {
            data = {
              price: itkData.price,
              change: itkData.change,
              changesPercentage: itkData.changePercent || 0,
              dayHigh: itkData.high || itkData.price,
              dayLow: itkData.low || itkData.price,
              open: itkData.open || itkData.price,
              previousClose: itkData.prevClose || itkData.price
            };
            source = "ITICK";
          }
        }
      } catch (e: any) {
        console.warn("ITICK quote fetch failed", e.message);
      }
    }

    if (source === "NONE") {
      throw new Error("No valid telemetry source available");
    }

    res.json({
      price: data.price,
      changes: data.change,
      changesPercentage: data.changesPercentage,
      high: data.dayHigh,
      low: data.dayLow,
      open: data.open,
      previousClose: data.previousClose,
      symbol,
      source
    });
  } catch (err: any) {
    const symbol = (req.params.symbol || req.query.symbol as string || "UNKNOWN").toUpperCase();
    const price = 150 + Math.random() * 50;
    res.json({
      price: price,
      changes: (Math.random() - 0.5) * 5,
      changesPercentage: (Math.random() - 0.5) * 2,
      high: price + 2,
      low: price - 2,
      open: price,
      previousClose: price - 1,
      symbol: symbol,
      mock: true,
      error: err.message
    });
  }
});

export default router;
