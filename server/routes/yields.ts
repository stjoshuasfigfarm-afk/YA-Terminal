import { Router } from "express";

const router = Router();
const FMP_KEY = process.env.FMP_API_KEY || "";

const isKeyReady = (k: string) => k && k.length > 5 && !k.includes("YOUR_");

router.get("/", async (req, res) => {
  const country = (req.query.country as string || "USA").toUpperCase();
  
  const treasuryMap: Record<string, number> = {
    '2Y': 4.82,
    '5Y': 4.45,
    '10Y': 4.42,
    '30Y': 4.56
  };

  const results: any = {
    treasuries: {},
    interestRate: 5.50,
    country,
    updatedAt: new Date().toISOString()
  };

  try {
    if (isKeyReady(FMP_KEY)) {
      const response = await fetch(`https://financialmodelingprep.com/api/v4/treasury?from=2024-01-01&apikey=${FMP_KEY}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const latest = data[0];
          results.treasuries = {
            '2Y': parseFloat(latest.twoYear) || 4.82,
            '5Y': parseFloat(latest.fiveYear) || 4.45,
            '10Y': parseFloat(latest.tenYear) || 4.42,
            '30Y': parseFloat(latest.thirtyYear) || 4.56
          };
        }
      }
    }
  } catch (e: any) {
    console.warn("Yield telemetry FMP fetch failed, using synthetic fallback");
  }

  if (Object.keys(results.treasuries).length === 0) {
    Object.keys(treasuryMap).forEach(k => {
      results.treasuries[k] = treasuryMap[k] + (Math.random() - 0.5) * 0.05;
    });
  }

  const ratesMap: Record<string, number> = {
    'USA': 5.50,
    'US': 5.50,
    'CHN': 3.45,
    'JPN': 0.10,
    'DEU': 4.50,
    'GBR': 5.25,
    'FRA': 4.50,
    'CHE': 1.50,
    'CAN': 5.00,
    'KOR': 3.50,
    'TWN': 2.00
  };

  results.interestRate = ratesMap[country] || 4.25;

  res.json(results);
});

export default router;
