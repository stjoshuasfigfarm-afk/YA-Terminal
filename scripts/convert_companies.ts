import { COMPANIES } from "../src/data/companies.js";
import * as fs from 'fs';

// Clean, deduplicate and sort companies alphabetically by symbol name
const uniqueCompanies = Array.from(new Map(COMPANIES.map(c => [c.symbol.trim().toUpperCase(), c])).values())
    .sort((a, b) => a.symbol.localeCompare(b.symbol));

fs.writeFileSync('./public/data/companies_large.json', JSON.stringify(uniqueCompanies, null, 2));
console.log(`Created clean large companies file with ${uniqueCompanies.length} unique items`);

