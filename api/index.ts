import app from "../server";
export default app;
export default async function handler(req, res) {
  const { type, ticker } = req.query;
  const API_KEY = process.env.FMP_API_KEY; // Use the key from your docs
  const BASE = "https://financialmodelingprep.com/stable";

  let endpoint = "";

  switch (type) {
    case 'terminal-core': 
      // Comprehensive data for the main dashboard view
      endpoint = `${BASE}/quote/${ticker}?apikey=${API_KEY}`;
      break;
    case 'logistics-map':
      // Great for your "Topology Map" to show company HQ/Sector
      endpoint = `${BASE}/profile?symbol=${ticker}&apikey=${API_KEY}`;
      break;
    case 'labor-data':
      // Perfect for your employment data & financials focus
      endpoint = `${BASE}/employee-count?symbol=${ticker}&apikey=${API_KEY}`;
      break;
    case 'technical':
      // 10Y performance and price fluctuations
      endpoint = `${BASE}/stock-price-change?symbol=${ticker}&apikey=${API_KEY}`;
      break;
    default:
      return res.status(400).json({ error: "Invalid type" });
  }

  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    // FMP returns arrays; send the first object for cleaner frontend logic
    res.status(200).json(Array.isArray(data) ? data[0] : data);
  } catch (err) {
    res.status(500).json({ error: "Harvester Failed", details: err.message });
  }
}
