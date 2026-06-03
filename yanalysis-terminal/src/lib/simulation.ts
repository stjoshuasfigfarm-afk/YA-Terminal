import { COMPANIES } from "../data/companies";

// Realistic May 2026 baselines - Reset to 0 for clean start
const BASE_PRICES: Record<string, number> = {
  "SPY": 0,
  "AAPL": 0,
  "NVDA": 0,
  "MSFT": 0,
  "TSLA": 0,
  "JPM": 0,
  "TLT": 0,
};

const YIELD_BASES: Record<string, number> = {
  "US2Y": 4.80,
  "US10Y": 4.44,
};

// Simulation State
const currentPrices: Record<string, number> = { ...BASE_PRICES };
const currentYields: Record<string, number> = { ...YIELD_BASES };
const lastLiveUpdateTimestamp: Record<string, number> = {};

// Synchronization Layer
export const syncLivePrice = (symbol: string, price: number) => {
  currentPrices[symbol] = price;
  lastLiveUpdateTimestamp[symbol] = Date.now();
};

export const startGlobalDataSimulation = (
  setQuote: (q: any) => void,
  setAllMarketData: (data: any) => void
) => {
  console.log("Starting Quantitative Hybrid Simulation Engine...");

  const intervalId = setInterval(() => {
    const now = Date.now();

    // 1. Conditional Hybrid Mutation
    Object.keys(currentPrices).forEach((symbol) => {
      const lastLiveTick = lastLiveUpdateTimestamp[symbol] || 0;
      
      // Heartbeat Check: Live feed latency threshold (6 seconds)
      if (now - lastLiveTick > 6000) {
        // Fallback: Random-walk Brownian motion simulation
        currentPrices[symbol] = currentPrices[symbol] * (1 + (Math.random() - 0.5) * 0.0005);
      }
    });

    Object.keys(currentYields).forEach((symbol) => {
       const lastLiveTick = lastLiveUpdateTimestamp[symbol] || 0;
       if (now - lastLiveTick > 6000) {
         currentYields[symbol] = currentYields[symbol] + (Math.random() - 0.5) * 0.001;
       }
    });

    // 2. Dispatch Updated Market State
    const updatedData = { ...currentPrices, ...currentYields };
    setAllMarketData(updatedData);

    setQuote((prev: any) => {
      if (!prev) return null;
      return {
        ...prev,
        price: currentPrices[prev.symbol] || prev.price,
      };
    });
  }, 3000);

  return intervalId;
};
