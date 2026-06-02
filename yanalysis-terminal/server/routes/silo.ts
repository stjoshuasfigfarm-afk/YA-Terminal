import { Router } from "express";
import { db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const router = Router();
const FMP_KEY = process.env.FMP_API_KEY || "";
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";
const ITIC_KEY = process.env.ITIC_API_KEY || "";

const isKeyReady = (k: string) => k && k.length > 5 && !k.includes("YOUR_");

export async function fetchLiveQuote(symbol: string) {
  let data: any = null;
  let source = "NONE";

  // 1. Try Financial Modeling Prep (FMP)
  if (isKeyReady(FMP_KEY)) {
    try {
      const response = await fetch(`https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${FMP_KEY}`);
      if (!response.ok) throw new Error(`FMP API error: ${response.statusText}`);
      const fmpData = await response.json();
      if (fmpData && fmpData[0]) {
        data = fmpData[0];
        source = "FMP";
      }
    } catch (e) {
      // Fallback
    }
  }

  // 2. Try Finnhub
  if (source === "NONE" && isKeyReady(FINNHUB_KEY)) {
    try {
      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`);
      if (!response.ok) throw new Error(`Finnhub API error: ${response.statusText}`);
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
    } catch (e) {
      // Fallback
    }
  }

  // 3. Try ITIC
  if (source === "NONE" && isKeyReady(ITIC_KEY)) {
    try {
      const response = await fetch(`https://api.itick.io/v1/quote?symbol=${symbol}&token=${ITIC_KEY}`);
      if (!response.ok) throw new Error(`ITICK API error: ${response.statusText}`);
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
    } catch (e) {
      // Fallback
    }
  }

  // 4. Try Yahoo Finance
  if (source === "NONE") {
    try {
      const response = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${symbol}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      if (response.ok) {
        const yhData = await response.json();
        if (yhData && yhData.chart && yhData.chart.result && yhData.chart.result[0]) {
          const meta = yhData.chart.result[0].meta;
          const indicators = yhData.chart.result[0].indicators;
          let volume = 0;
          if (indicators && indicators.quote && indicators.quote[0] && indicators.quote[0].volume) {
            const vols = indicators.quote[0].volume;
            volume = vols[vols.length - 1] || 0;
          }
          data = {
            price: meta.regularMarketPrice,
            change: meta.regularMarketPrice - meta.previousClose,
            changesPercentage: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
            dayHigh: meta.regularMarketDayHigh || meta.regularMarketPrice,
            dayLow: meta.regularMarketDayLow || meta.regularMarketPrice,
            open: meta.regularMarketOpen || meta.regularMarketPrice,
            previousClose: meta.previousClose,
            volume: volume,
            marketCap: meta.regularMarketPrice * (meta.sharesOutstanding || 100000000)
          };
          source = "YAHOO";
        }
      }
    } catch (e) {
      // Silent pass
    }
  }

  // 5. Try Firestore Snapshot Fallback (Last Known Real Data)
  if (source === "NONE" || !data) {
    try {
      console.log(`[THE_HARVESTER] All live sources unreachable for ${symbol}. Attempting to retrieve last known silo snapshot.`);
      const docRef = doc(db, "silo_prices", symbol);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const siloData = docSnap.data();
        // Check if it's actual data or an old simulation we want to purge
        if (siloData.source !== "SIMULATION") {
          data = siloData;
          source = "SILO_SNAPSHOT";
        }
      }
    } catch (e) {
      console.warn(`[THE_HARVESTER] Critical Snapshot Retrieval failure for ${symbol}:`, e);
    }
  }

  // Final validation - No data found in APIs or Silo
  if (source === "NONE" || !data) {
    return {
      price: null,
      changes: 0,
      changesPercentage: 0,
      high: null,
      low: null,
      open: null,
      previousClose: null,
      marketCap: null,
      volume: null,
      symbol,
      source: "NONE",
      status: "STALLED",
      timestamp: new Date().toISOString()
    };
  }

  return {
    price: data.price !== undefined && data.price !== null ? data.price : null,
    changes: data.change !== undefined ? data.change : (data.changes || 0),
    changesPercentage: data.changesPercentage !== undefined ? data.changesPercentage : 0,
    high: data.dayHigh !== undefined ? data.dayHigh : (data.high || null),
    low: data.dayLow !== undefined ? data.dayLow : (data.low || null),
    open: data.open !== undefined ? data.open : null,
    previousClose: data.previousClose !== undefined ? data.previousClose : null,
    marketCap: data.marketCap !== undefined ? data.marketCap : null,
    volume: data.volume !== undefined ? data.volume : null,
    symbol,
    source,
    timestamp: new Date().toISOString()
  };
}

router.post("/rehydrate", async (req, res) => {
  try {
    const symbol = (req.body.symbol || req.query.symbol || "").toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: "Symbol required" });
    }

    console.log(`[THE_HARVESTER] Initiating zero-fallback cascading call for: ${symbol}`);
    const liveQuote = await fetchLiveQuote(symbol);

    // Only write to Firestore if we actually found something live (not just returning the previous snapshot or nothing)
    const isValidSource = !["NONE", "SILO_SNAPSHOT"].includes(liveQuote.source);
    
    if (isValidSource) {
      const docRef = doc(db, "silo_prices", symbol);
      await setDoc(docRef, liveQuote);
      console.log(`[THE_HARVESTER] Firestore Silo rehydrated for ${symbol} with live source ${liveQuote.source}`);
    } else {
      console.log(`[THE_HARVESTER] No fresh telemetry secured for ${symbol}. Returning ${liveQuote.source} state.`);
    }

    return res.json({ success: true, payload: liveQuote });
  } catch (err: any) {
    console.error(`[THE_HARVESTER] Rehydration error for ${req.body.symbol}:`, err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
