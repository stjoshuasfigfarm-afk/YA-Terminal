import { COMPANIES } from './src/data/companies';

const symbols = new Set(COMPANIES.map(c => c.symbol));
const missing = [];

COMPANIES.forEach(c => {
  if (c.partners) {
    c.partners.forEach(p => {
      if (!symbols.has(p)) {
        missing.push({ from: c.symbol, missing: p });
      }
    });
  }
});

if (missing.length > 0) {
  console.log('Missing partners:', missing);
} else {
  console.log('All partners exist.');
}
