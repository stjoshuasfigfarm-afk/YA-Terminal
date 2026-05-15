// api/index.js
// This is the "Engine" layer for the HY Analysts Terminal

export default async function handler(req, res) {
  // Extract the ticker and the endpoint type from the URL
  // Example: /api/profile/AAPL -> type = profile, ticker = AAPL
  const fullPath = req.url.split('?')[0]; // Remove query strings
  const parts = fullPath.split('/').filter(Boolean); // ["api", "profile", "AAPL"]
  
  const type = parts[1]; 
  const ticker = parts[2];

  if (!ticker || !type) {
    return res.status(400).json({ error: 'Missing ticker or endpoint type' });
  }

  // Your FinancialData.net or OANDA API Key (Set this in Vercel Environment Variables)
  const API_KEY = process.env.FINANCIAL_API_KEY;
  
  // Mapping the request to the correct upstream URL
  let targetUrl = '';
  
  switch (type) {
    case 'quote':
      targetUrl = `https://api.financialdata.net/v1/quote/${ticker}?apikey=${API_KEY}`;
      break;
    case 'profile':
      targetUrl = `https://api.financialdata.net/v1/profile/${ticker}?apikey=${API_KEY}`;
      break;
    case 'financials':
      targetUrl = `https://api.financialdata.net/v1/financials/${ticker}?apikey=${API_KEY}`;
      break;
    default:
      return res.status(404).json({ error: 'Endpoint not found' });
  }

  try {
    const response = await fetch(targetUrl);
    const data = await response.json();
    
    // Set headers for low-latency synthesis
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch financial data', details: error.message });
  }
}
