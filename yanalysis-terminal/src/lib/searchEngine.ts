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
 * Searches and scores a company node list based on the parsed query.
 * Excludes non-matches and returns sorted list with matchmaking metadata.
 */
export function searchAndScoreCompanies(companies: Company[], queryStr: string): SearchMatch[] {
  const parsed = parseQuery(queryStr);
  const results: SearchMatch[] = [];

  // If search query is empty, return everything scores = 0
  if (!queryStr.trim()) {
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

    // 1. Tag filtering constraints (AND behavior for specific fields if provided)
    if (parsed.countries.length > 0) {
      const match = parsed.countries.some(country => 
        c.country?.toLowerCase().includes(country)
      );
      if (match) {
        score += 200;
        matchedFields.push({ field: "Country", value: c.country });
      } else {
        excluded = true;
      }
    }

    if (parsed.sectors.length > 0 && !excluded) {
      const match = parsed.sectors.some(sector => 
        c.sector?.toLowerCase().includes(sector)
      );
      if (match) {
        score += 200;
        matchedFields.push({ field: "Sector", value: c.sector });
      } else {
        excluded = true;
      }
    }

    if (parsed.partners.length > 0 && !excluded) {
      const match = parsed.partners.some(pSymbol => {
        // Direct checks
        const matchesDirectPartner = c.partners?.some(p => p.toLowerCase().includes(pSymbol));
        const matchesSelf = c.symbol.toLowerCase() === pSymbol;
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
        c.headquarters?.toLowerCase().includes(hq)
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

        // Exactly matches symbol (Highest Match)
        if (c.symbol.toLowerCase() === term) {
          score += 1200;
          currentTermMatched = true;
          matchedFields.push({ field: "Ticker Match", value: c.symbol });
        }
        // Starts with symbol
        else if (c.symbol.toLowerCase().startsWith(term)) {
          score += 600;
          currentTermMatched = true;
          matchedFields.push({ field: "Ticker Prefix", value: c.symbol });
        }
        // Contains symbol
        else if (c.symbol.toLowerCase().includes(term)) {
          score += 300;
          currentTermMatched = true;
          matchedFields.push({ field: "Ticker Substring", value: c.symbol });
        }

        // Exactly matches or starts with name
        if (c.name.toLowerCase() === term || c.name.toLowerCase().startsWith(term)) {
          score += 400;
          currentTermMatched = true;
          matchedFields.push({ field: "Name Match", value: c.name });
        }
        // Contains within name
        else if (c.name.toLowerCase().includes(term)) {
          score += 150;
          currentTermMatched = true;
          matchedFields.push({ field: "Name Substring", value: c.name });
        }

        // Contains within country
        if (c.country?.toLowerCase().includes(term)) {
          score += 100;
          currentTermMatched = true;
          matchedFields.push({ field: "Country Match", value: c.country });
        }

        // Contains within sector
        if (c.sector?.toLowerCase().includes(term)) {
          score += 150;
          currentTermMatched = true;
          matchedFields.push({ field: "Sector Match", value: c.sector });
        }

        // Contains within headquarters
        if (c.headquarters?.toLowerCase().includes(term)) {
          score += 100;
          currentTermMatched = true;
          matchedFields.push({ field: "HQ Match", value: c.headquarters || "" });
        }

        // Contains within partner list
        if (c.partners?.some(p => p.toLowerCase().includes(term))) {
          score += 150;
          currentTermMatched = true;
          matchedFields.push({ field: "Partner Vector", value: c.partners.join(", ") });
        }

        // Domain checks
        if (c.domain?.toLowerCase().includes(term)) {
          score += 80;
          currentTermMatched = true;
          matchedFields.push({ field: "Domain Match", value: c.domain });
        }

        if (currentTermMatched) {
          termMatched = true;
        }
      }

      // If text terms are provided but none matched, exclude this node
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

  // Sort by score descending, then symbol alphabetically
  return results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.company.symbol.localeCompare(b.company.symbol);
  });
}
