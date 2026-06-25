import { Company } from "../data/companies";

export interface ParsedQuery {
  raw: string;
  terms: string[];
  countries: string[];
  sectors: string[];
  partners: string[];
  headquarters: string[];
}

export interface SearchMatch {
  company: Company;
  score: number;
  matchedFields: { field: string; value: string }[];
}

/**
 * Parses a query string into structured parameters.
 * Supports syntax like c:USA, sector:Technology, p:TSM, hq:New York
 */
export function parseQuery(queryStr: string): ParsedQuery {
  const countries: string[] = [];
  const sectors: string[] = [];
  const partners: string[] = [];
  const headquarters: string[] = [];
  const terms: string[] = [];

  const s = queryStr.trim();
  if (!s) {
    return { raw: "", terms: [], countries, sectors, partners, headquarters };
  }

  // Tokenize considering potential quoted text (e.g. hq:"San Jose")
  const tokens: string[] = [];
  let currentToken = "";
  let insideQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    if ((char === '"' || char === "'") && (i === 0 || s[i - 1] !== '\\')) {
      if (insideQuotes && char === quoteChar) {
        insideQuotes = false;
        quoteChar = "";
      } else if (!insideQuotes) {
        insideQuotes = true;
        quoteChar = char;
      }
    } else if (char === ' ' && !insideQuotes) {
      if (currentToken) {
        tokens.push(currentToken);
        currentToken = "";
      }
    } else {
      currentToken += char;
    }
  }
  if (currentToken) {
    tokens.push(currentToken);
  }

  for (const token of tokens) {
    const colonIndex = token.indexOf(':');
    if (colonIndex > 0) {
      const key = token.substring(0, colonIndex).toLowerCase();
      // Remove surrounding quotes if any from value
      let value = token.substring(colonIndex + 1);
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      value = value.toLowerCase().trim();

      if (key === 'c' || key === 'country') {
        countries.push(value);
      } else if (key === 's' || key === 'sec' || key === 'sector') {
        sectors.push(value);
      } else if (key === 'p' || key === 'partner' || key === 'partners') {
        partners.push(value);
      } else if (key === 'hq' || key === 'headquarters') {
        headquarters.push(value);
      } else {
        terms.push(token.toLowerCase());
      }
    } else {
      terms.push(token.toLowerCase());
    }
  }

  return {
    raw: queryStr,
    terms,
    countries,
    sectors,
    partners,
    headquarters,
  };
}

/**
 * Simple Levenshtein-like fuzzy match or character sequence match.
 */
function fuzzyMatch(str: string, pattern: string): boolean {
  if (pattern.length > str.length) return false;
  if (pattern.length <= 1) return str.includes(pattern);
  
  let patternIdx = 0;
  for (let strIdx = 0; strIdx < str.length && patternIdx < pattern.length; strIdx++) {
    if (str[strIdx] === pattern[patternIdx]) {
      patternIdx++;
    }
  }
  return patternIdx === pattern.length;
}

/**
 * Searches and scores a company node list based on the parsed query.
 * Excludes non-matches and returns sorted list with matchmaking metadata.
 */
export function searchAndScoreCompanies(companies: Company[], queryStr: string): SearchMatch[] {
  const parsed = parseQuery(queryStr);
  const results: SearchMatch[] = [];

  // If search query is empty, return everything scores = 0
  const isQueryEmpty = !queryStr.trim();
  if (isQueryEmpty) {
    return companies.map(company => ({
      company,
      score: 0,
      matchedFields: []
    }));
  }

  for (const c of companies) {
    let score = 0;
    let excluded = false;
    const matchedFields: { field: string; value: string }[] = [];

    const symbolRaw = (c.symbol || "").toLowerCase();
    const nameRaw = (c.name || "").toLowerCase();
    const sectorRaw = (c.sector || "").toLowerCase();
    const countryRaw = (c.country || "").toLowerCase();
    const hqRaw = (c.headquarters || "").toLowerCase();
    const domainRaw = (c.domain || "").toLowerCase();

    // 1. Tag filtering constraints (AND behavior for specific fields if provided)
    if (parsed.countries.length > 0) {
      const match = parsed.countries.some(country => 
        countryRaw.includes(country)
      );
      if (match) {
        score += 200;
        matchedFields.push({ field: "Country", value: c.country || "" });
      } else {
        excluded = true;
      }
    }

    if (parsed.sectors.length > 0 && !excluded) {
      const match = parsed.sectors.some(sector => 
        sectorRaw.includes(sector)
      );
      if (match) {
        score += 200;
        matchedFields.push({ field: "Sector", value: c.sector || "" });
      } else {
        excluded = true;
      }
    }

    if (parsed.partners.length > 0 && !excluded) {
      const match = parsed.partners.some(pSymbol => {
        // Direct checks
        const matchesDirectPartner = c.partners?.some(p => (p || "").toLowerCase().includes(pSymbol));
        const matchesSelf = symbolRaw === pSymbol;
        return matchesDirectPartner || matchesSelf;
      });
      if (match) {
        score += 300;
        matchedFields.push({ 
          field: "Partners", 
          value: c.partners?.join(", ") || "" 
        });
      } else {
        excluded = true;
      }
    }

    if (parsed.headquarters.length > 0 && !excluded) {
      const match = parsed.headquarters.some(hq => 
        hqRaw.includes(hq)
      );
      if (match) {
        score += 200;
        matchedFields.push({ field: "HQ", value: c.headquarters || "" });
      } else {
        excluded = true;
      }
    }

    // 2. Free text terms filtering (OR behavior among terms, but multiple hits compound score)
    if (parsed.terms.length > 0 && !excluded) {
      let termMatched = false;

      for (const term of parsed.terms) {
        let currentTermMatched = false;

        // Exact Ticker
        if (symbolRaw === term) {
          score += 2000;
          currentTermMatched = true;
          matchedFields.push({ field: "Ticker", value: c.symbol });
        }
        // Ticker Prefix
        else if (symbolRaw.startsWith(term)) {
          score += 1000;
          currentTermMatched = true;
          matchedFields.push({ field: "Ticker Prefix", value: c.symbol });
        }
        // Fuzzy Ticker Match (for small typos or shortcuts)
        else if (fuzzyMatch(symbolRaw, term)) {
          score += 400;
          currentTermMatched = true;
          matchedFields.push({ field: "Ticker (Approx)", value: c.symbol });
        }

        // Name Exact/Prefix
        if (nameRaw === term || nameRaw.startsWith(term)) {
          score += 800;
          currentTermMatched = true;
          matchedFields.push({ field: "Name", value: c.name });
        }
        // Name Substring
        else if (nameRaw.includes(term)) {
          score += 300;
          currentTermMatched = true;
          matchedFields.push({ field: "Name Match", value: c.name });
        }
        // Fuzzy Name Match
        else if (fuzzyMatch(nameRaw, term)) {
          score += 150;
          currentTermMatched = true;
          matchedFields.push({ field: "Name (Approx)", value: c.name });
        }

        // Country Match
        if (countryRaw.includes(term)) {
          score += 150;
          currentTermMatched = true;
          matchedFields.push({ field: "Region", value: c.country || "" });
        }

        // Sector Match
        if (sectorRaw.includes(term)) {
          score += 200;
          currentTermMatched = true;
          matchedFields.push({ field: "Sector", value: c.sector || "" });
        }

        // HQ Match
        if (hqRaw.includes(term)) {
          score += 100;
          currentTermMatched = true;
          matchedFields.push({ field: "Location", value: c.headquarters || "" });
        }

        // Partners
        if (c.partners?.some(p => (p || "").toLowerCase().includes(term))) {
          score += 250;
          currentTermMatched = true;
          matchedFields.push({ field: "Supply Chain Link", value: c.partners.join(", ") });
        }

        // Domain
        if (domainRaw.includes(term)) {
          score += 80;
          currentTermMatched = true;
          matchedFields.push({ field: "Network Domain", value: c.domain || "" });
        }

        if (currentTermMatched) {
          termMatched = true;
        }
      }

      if (!termMatched) {
        excluded = true;
      }
    }

    if (!excluded) {
      results.push({
        company: c,
        score,
        matchedFields
      });
    }
  }

  // Final sort and ranking
  return results.sort((a, b) => b.score - a.score || a.company.symbol.localeCompare(b.company.symbol));
}
