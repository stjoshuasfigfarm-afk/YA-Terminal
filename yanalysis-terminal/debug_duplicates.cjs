const fs = require('fs');
const content = fs.readFileSync('src/data/companies.ts', 'utf8');

// Regex to find symbol: "SYMBOL"
const regex = /symbol:\s*"([^"]+)"/g;
const symbols = [];
let match;

while ((match = regex.exec(content)) !== null) {
    symbols.push({ symbol: match[1], line: content.substring(0, match.index).split('\n').length });
}

const counts = {};
symbols.forEach(s => {
    if (!counts[s.symbol]) counts[s.symbol] = [];
    counts[s.symbol].push(s.line);
});

const duplicates = Object.entries(counts).filter(([sym, lines]) => lines.length > 1);

if (duplicates.length === 0) {
    console.log("No duplicates found by symbol property.");
} else {
    console.log("Found duplicates:");
    duplicates.forEach(([sym, lines]) => {
        console.log(`${sym} is defined on lines: ${lines.join(', ')}`);
    });
}
