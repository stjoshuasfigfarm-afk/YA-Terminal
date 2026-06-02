import { Router } from "express";
import { COMPANIES, Company } from "../../src/data/companies";

const router = Router();

router.get("/:symbol?", async (req, res) => {
  const symbol = (req.params.symbol || req.query.symbol as string || "AAPL").toUpperCase();
  
  // Locate requested company
  const company = COMPANIES.find(c => c.symbol.toUpperCase() === symbol);
  
  if (!company) {
    // Elegant fallback if ticker does not exist in master list
    const defaultSuppliers = COMPANIES.slice(0, 3);
    const defaultCustomers = COMPANIES.slice(3, 6);
    return res.json({
      source: "RELATIONAL_SYNTHESIS",
      relationships: {
        suppliers: defaultSuppliers,
        customers: defaultCustomers
      }
    });
  }

  // Detect explicit relationships from master list partners property
  // 1. Direct suppliers (companies that list this company's symbol as a partner)
  let suppliers = COMPANIES.filter(c => c.partners && c.partners.includes(company.symbol));
  
  // 2. Direct customers (companies that this company lists as a partner)
  let customers = company.partners 
    ? COMPANIES.filter(c => company.partners!.includes(c.symbol)) 
    : [];

  // Generate deterministic randomized seed to make custom fallbacks consistent for each ticker
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seed = Math.abs(hash);

  const sector = (company.sector || "Technology").toLowerCase();

  // Helper lists to map logical partnerships based on company sector profiles
  const getCategorizedSuppliers = (comp: Company): Company[] => {
    if (sector.includes("semi") || sector.includes("chip") || sector.includes("micro")) {
      // Semiconductor manufacturing relies heavily on equipment, raw minerals, and basic materials
      return COMPANIES.filter(c => ["ASML", "AMAT", "LRCX", "KLAC", "VALE", "RIO", "BHP", "2454.TW"].includes(c.symbol));
    }
    if (sector.includes("tech") || sector.includes("software")) {
      // Software/web tech relies on processors, foundries, hardware systems, and chips
      return COMPANIES.filter(c => ["NVDA", "TSM", "INTC", "AMD", "005930", "AVGO", "ASML", "SMC"].includes(c.symbol));
    }
    if (sector.includes("auto") || sector.includes("vehicle") || sector.includes("transport")) {
      // Automotive relies on batteries, specialized silicon, and structural alloys
      return COMPANIES.filter(c => ["CATL", "NVDA", "VALE", "BHP", "SMC", "TSM", "005930", "PANASONIC"].includes(c.symbol));
    }
    if (sector.includes("energy") || sector.includes("oil") || sector.includes("gas") || sector.includes("materials")) {
      // Heavy resources rely on heavy machinery, transport hubs, and equipment providers
      return COMPANIES.filter(c => ["RIO", "BHP", "VALE", "DHL.DE", "GLEN.L", "AAL.L", "TATASTEEL.NS"].includes(c.symbol));
    }
    if (sector.includes("utility") || sector.includes("financial") || sector.includes("real estate")) {
      // Infrastructure and financial companies use cloud providers, SaaS, and security pipelines
      return COMPANIES.filter(c => ["MSFT", "AMZN", "ORCL", "CRM", "V", "MA", "JPM", "GS"].includes(c.symbol));
    }
    // Default retail/consumer/healthcare raw materials flow
    return COMPANIES.filter(c => ["UPS", "FDX", "AMZN", "UL", "XOM", "SBUX", "DHL.DE"].includes(c.symbol));
  };

  const getCategorizedCustomers = (comp: Company): Company[] => {
    if (sector.includes("semi") || sector.includes("chip") || sector.includes("micro")) {
      // Semiconductor components flow into primary technology designers and consumers
      return COMPANIES.filter(c => ["AAPL", "MSFT", "GOOGL", "META", "TSLA", "SMC", "SONY", "VIC.HM", "FPT.HM"].includes(c.symbol));
    }
    if (sector.includes("tech") || sector.includes("software")) {
      // Advanced networks and SaaS integrate into retail, banking, media, and global enterprises
      return COMPANIES.filter(c => ["AMZN", "WMT", "MCD", "DIS", "NFLX", "JPM", "GS", "HSBC", "AAPL", "MSFT", "BDO.PS"].includes(c.symbol));
    }
    if (sector.includes("auto") || sector.includes("vehicle") || sector.includes("energy") || sector.includes("industrial")) {
      // Heavy equipment, power, and vehicles feed logistics carriers and distributors
      return COMPANIES.filter(c => ["UPS", "FDX", "AMZN", "WMT", "COST", "TSLA", "TM", "EON.DE", "RWE.DE", "ASII.JK"].includes(c.symbol));
    }
    if (sector.includes("basic materials") || sector.includes("materials")) {
      // Physical materials feed fabrication, structural contractors, and automotive
      return COMPANIES.filter(c => ["XOM", "AAPL", "TSM", "TATASTEEL.NS", "GD", "LMT", "LRCX", "AMAT"].includes(c.symbol));
    }
    // Retail networks or global consumers
    return COMPANIES.filter(c => ["WMT", "COST", "AMZN", "MELI", "9983.T", "LVMH", "COTY", "VIC.HM", "ABEV"].includes(c.symbol));
  };

  const logicalSuppliers = getCategorizedSuppliers(company);
  const logicalCustomers = getCategorizedCustomers(company);

  // Merge direct and logical category partnerships
  // Exclude current company from its partners list
  const mergedSuppliers = [...suppliers, ...logicalSuppliers].filter(c => c.symbol !== company.symbol);
  const mergedCustomers = [...customers, ...logicalCustomers].filter(c => c.symbol !== company.symbol);

  // Deduplicate using Map keys
  let deduplicatedSuppliers = Array.from(new Map(mergedSuppliers.map(item => [item.symbol, item])).values());
  let deduplicatedCustomers = Array.from(new Map(mergedCustomers.map(item => [item.symbol, item])).values());

  // Deterministically sort based on randomized seed using symbol data
  const sortedSuppliers = deduplicatedSuppliers.sort((a, b) => {
    const hashA = a.symbol.charCodeAt(0) + (a.symbol.charCodeAt(1) || 0);
    const hashB = b.symbol.charCodeAt(0) + (b.symbol.charCodeAt(1) || 0);
    return ((hashA + seed) % 17) - ((hashB + seed) % 17);
  });

  const sortedCustomers = deduplicatedCustomers.sort((a, b) => {
    const hashA = a.symbol.charCodeAt(0) + (a.symbol.charCodeAt(1) || 0);
    const hashB = b.symbol.charCodeAt(0) + (b.symbol.charCodeAt(1) || 0);
    return ((hashA + seed) % 17) - ((hashB + seed) % 17);
  });

  // Keep a beautiful active panel roster (between 3 and 5 items per category)
  let finalSuppliers = sortedSuppliers.slice(0, Math.max(3, Math.min(sortedSuppliers.length, 5)));
  let finalCustomers = sortedCustomers.slice(0, Math.max(3, Math.min(sortedCustomers.length, 5)));

  // If list size is below 3, pad with neighboring companies to guarantee complete mock terminal data sets
  if (finalSuppliers.length < 3) {
    const backupPeers = COMPANIES.filter(c => c.symbol !== company.symbol && !finalSuppliers.some(s => s.symbol === c.symbol));
    finalSuppliers = [...finalSuppliers, ...backupPeers.slice(0, 3 - finalSuppliers.length)];
  }
  if (finalCustomers.length < 3) {
    const backupPeers = COMPANIES.filter(c => c.symbol !== company.symbol && !finalCustomers.some(cust => cust.symbol === c.symbol));
    finalCustomers = [...finalCustomers, ...backupPeers.slice(0, 3 - finalCustomers.length)];
  }

  res.json({
    source: "RELATIONAL_SYNTHESIS",
    relationships: {
      suppliers: finalSuppliers,
      customers: finalCustomers
    }
  });
});

export default router;
