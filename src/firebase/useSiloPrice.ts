import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./config";

export interface SiloPriceData {
  price: number | null;
  changes: number;
  changesPercentage: number;
  high: number | null;
  low: number | null;
  open: number | null;
  previousClose: number | null;
  marketCap: number | null;
  volume: number | null;
  symbol: string;
  source: string;
  timestamp: string;
}

/**
 * Real-time Firestore subscription hook for live market prices.
 * Instantly updates the UI "Chassis" upon document change.
 * Bypasses all transient client caches and custom debounce hooks.
 */
export function useSiloPrice(symbol: string) {
  const [priceData, setPriceData] = useState<SiloPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!symbol || typeof symbol !== "string") {
      setPriceData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const targetSymbol = symbol.toUpperCase();
    const docRef = doc(db, "silo_prices", targetSymbol);

    // Set up a strict real-time firestore listener with zero cache delays
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const rawData = docSnap.data();
          setPriceData({
            price: typeof rawData.price === "number" ? rawData.price : null,
            changes: typeof rawData.changes === "number" ? rawData.changes : 0,
            changesPercentage: typeof rawData.changesPercentage === "number" ? rawData.changesPercentage : 0,
            high: typeof rawData.high === "number" ? rawData.high : null,
            low: typeof rawData.low === "number" ? rawData.low : null,
            open: typeof rawData.open === "number" ? rawData.open : null,
            previousClose: typeof rawData.previousClose === "number" ? rawData.previousClose : null,
            marketCap: typeof rawData.marketCap === "number" ? rawData.marketCap : null,
            volume: typeof rawData.volume === "number" ? rawData.volume : null,
            symbol: rawData.symbol || targetSymbol,
            source: rawData.source || "UNKNOWN",
            timestamp: rawData.timestamp || new Date().toISOString()
          });
        } else {
          // No fallback to mock data permitted as per strict system regulations.
          setPriceData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`[useSiloPrice] Real-time subscription failed for ${targetSymbol}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [symbol]);

  return { priceData, loading, error };
}
