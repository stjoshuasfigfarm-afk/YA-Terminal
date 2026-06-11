import fs from 'fs';

const symbols = [
  "A", "AAL", "AAP", "ABBV", "ABC", "ABMD", "ABT", "ACN", "ADBE", "ADI", "ADM", "ADP", "ADSK",
  "AEE", "AEP", "AES", "AFL", "AIG", "AAL", "ALL", "ALLE", "AMAT", "AMCR", "AMD",
  "AME", "AMGN", "AMP", "AMT", "AMZN", "ANET", "ANSS", "AON", "AOS", "APA", "APD", "APH", "APTV",
  "ARE", "ATO", "ATVI", "AVB", "AVGO", "AVY", "AWK", "AXP", "AZO", "BA", "BAC", "BAX", "BBY", "BDX",
  "BEN", "BIIB", "BIO", "BK", "BKNG", "BKR", "BLK", "BMY", "BR", "BRO", "BSX", "BWA", "BXP", "C", "CAG",
  "CAH", "CARR", "CAT", "CB", "CBOE", "CBRE", "CCI", "CCL", "CDAY", "CDNS", "CDW", "CE", "CEG", "CF", "CFG",
  "CHD", "CHRW", "CHTR", "CI", "CINF", "CL", "CLX", "CMA", "CMCSA", "CME", "CMG", "CMI", "CMS", "CNC", "CNP",
  "COF", "COO", "COP", "COST", "CPB", "CPRT", "CRL", "CRM", "CSCO", "CSGP", "CSX", "CTAS", "CTLT", "CTRA",
  "CTSH", "CVS", "CVX", "CZR", "D", "DAL", "DD", "DE", "DFS", "DG", "DGX", "DHI", "DHR", "DIS", "DLR", "DLTR",
  "DOV", "DOW", "DPZ", "DRI", "DTE", "DUK", "DVA", "DVN", "DXC", "DXCM", "EA", "EBAY", "ECL", "ED", "EFX", "EIX",
  "EL", "EMN", "EMR", "ENPH", "EOG", "EPAM", "EQIX", "EQR", "ES", "ESS", "ETN", "ETR", "ETSY", "EVRG", "EW",
  "EXC", "EXPD", "EXPE", "EXR", "F", "FANG", "FAST", "FBHS", "FCX", "FDS", "FDX", "FE", "FFIV", "FIS",
  "FISV", "FITB", "FLT", "FMC", "FOX", "FOXA", "FRC", "FRT", "FTNT", "FTV", "GD", "GE", "GILD", "GIS", "GL",
  "GLW", "GM", "GNRC", "GOOG", "GOOGL", "GPC", "GPN", "GRMN", "GS", "GWW", "HAL", "HAS", "HBAN", "HCA", "HD",
  "HES", "HIG", "HII", "HLT", "HOLX", "HON", "HPE", "HPQ", "HRL", "HSIC", "HST", "HSY", "HUM", "HWM", "IBM",
  "ICE", "IDXX", "IEX", "IFF", "ILMN", "INCY", "INFO", "INTC", "INTU", "INVH", "IP", "IPG", "IQV", "IR",
  "IRM", "ISRG", "IT", "ITW", "IVZ", "J", "JBHT", "JCI", "JKHY", "JNJ", "JNPR", "JPM", "K", "KDP", "KEY",
  "KEYS", "KHC", "KIM", "KLAC", "KMB", "KMI", "KMX", "KO", "KR", "L", "LDOS", "LEN", "LH", "LHX", "LIN", "LKQ", "LLY",
  "LMT", "LNC", "LNT", "LOW", "LRCX", "LUMP", "LUV", "LVS", "LW", "LYB", "LYV", "MA", "MAA", "MAR", "MAS", "MCD", "MCHP", "MCK",
  "MCO", "MDLZ", "MDT", "MET", "META", "MGM", "MHK", "MKC", "MKTX", "MLM", "MMC", "MMM", "MNST", "MO", "MOH",
  "MOS", "MPC", "MPWR", "MRK", "MRNA", "MRO", "MS", "MSCI", "MSFT", "MSI", "MTB", "MTCH", "MTD", "MU"
];

const newCompanies = symbols.map((s, i) => ({
  symbol: s,
  name: s + " Corp",
  sector: ["Technology", "Financial Services", "Energy", "Healthcare", "Consumer", "Industrials"][Math.floor(Math.random() * 6)],
  lat: 39.8283 + (Math.random() - 0.5) * 15,
  lng: -98.5795 + (Math.random() - 0.5) * 30,
  country: 'USA'
}));

let existing = fs.readFileSync('./src/data/companies.ts', 'utf-8');
existing = existing.replace(/\];\s*$/, ''); // Remove closing bracket

let additions = '';
for (const comp of newCompanies) {
    additions += `  { symbol: "${comp.symbol}", name: "${comp.name}", sector: "${comp.sector}", lat: ${comp.lat.toFixed(4)}, lng: ${comp.lng.toFixed(4)}, country: "${comp.country}" },\n`;
}

existing += additions + '\n];\n';
fs.writeFileSync('./src/data/companies.ts', existing);
console.log('Appended', newCompanies.length, 'companies');
