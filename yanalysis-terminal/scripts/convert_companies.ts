import { COMPANIES } from "../src/data/companies.js";
import * as fs from 'fs';

const largeCompanies = [];
for (let i = 0; i < 20; i++) { 
    largeCompanies.push(...COMPANIES.map(c => ({
        ...c,
        symbol: `${c.symbol}_${i}`
    })));
}

fs.writeFileSync('./public/data/companies_large.json', JSON.stringify(largeCompanies, null, 2));
console.log(`Created large companies file with ${largeCompanies.length} items`);
