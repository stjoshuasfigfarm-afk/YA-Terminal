const fs = require('fs');

const content = fs.readFileSync('src/data/companies.ts', 'utf8');
const regex = /symbol:\s*["']([^"']+)["']/g;
const symbols = [];
let match;

while ((match = regex.exec(content)) !== null) {
  symbols.push(match[1]);
}

const counts = {};
const duplicates = [];

symbols.forEach(s => {
  counts[s] = (counts[s] || 0) + 1;
});

Object.keys(counts).forEach(s => {
  if (counts[s] > 1) {
    duplicates.push({ symbol: s, count: counts[s] });
  }
});

console.log(JSON.stringify(duplicates, null, 2));
