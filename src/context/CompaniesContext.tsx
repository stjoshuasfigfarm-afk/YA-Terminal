import React, { createContext, useContext, useState, useEffect } from 'react';
import { Company } from '../data/companies';
import companiesData from '../../public/data/companies_large.json';

const CompaniesContext = createContext<{
  companies: Company[];
  allCompanies: Company[];
  setCompanies: (companies: Company[]) => void;
  loading: boolean;
  tickerLimit: number;
  setTerminalLimit?: (limit: number) => void; // backwards compat if any
  setTickerLimit: (limit: number) => void;
  totalAvailable: number;
} | undefined>(undefined);

const deduplicateCompanies = (list: Company[]): Company[] => {
  if (!Array.isArray(list)) return [];
  const map = new Map<string, Company>();
  list.forEach((item) => {
    if (!item) return;
    const rawKey = item.symbol || (item as any).ticker;
    if (rawKey) {
      // Clean indices or database suffixes like "SPY_ 12" or "SPY_0" down to just "SPY"
      const cleanKey = String(rawKey).split('_')[0].trim().toUpperCase();
      if (cleanKey) {
        // Shallow copy and update both symbol and ticker to enforce standardized lookup
        const cleanedItem = {
          ...item,
          symbol: cleanKey,
          ticker: cleanKey
        };
        map.set(cleanKey, cleanedItem);
      }
    }
  });
  
  const result = Array.from(map.values());
  
  // Prioritize and hoist critical, highly targeted benchmark tickers so they are never gated out by Density Limits
  const prioritizedSymbols = ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSM", "ASML", "TSLA", "AMZN", "META", "GOOGL"];
  const prioritized: Company[] = [];
  const other: Company[] = [];
  
  result.forEach(c => {
    if (prioritizedSymbols.includes(c.symbol)) {
      prioritized.push(c);
    } else {
      other.push(c);
    }
  });
  
  prioritized.sort((a, b) => prioritizedSymbols.indexOf(a.symbol) - prioritizedSymbols.indexOf(b.symbol));
  return [...prioritized, ...other];
};

export const CompaniesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawCompanies, setRawCompanies] = useState<Company[]>(() => {
    return deduplicateCompanies(companiesData as Company[]);
  });
  const [loading, setLoading] = useState(false);
  const [tickerLimit, setTickerLimitState] = useState<number>(() => {
    const saved = localStorage.getItem('system_ticker_limit');
    return saved ? parseInt(saved, 10) : 250; // Default threshold of 250 tickers
  });

  const setTickerLimit = (limit: number) => {
    setTickerLimitState(limit);
    localStorage.setItem('system_ticker_limit', limit.toString());
  };

  const companies = React.useMemo(() => {
    if (tickerLimit <= 0) return rawCompanies;
    return rawCompanies.slice(0, tickerLimit);
  }, [rawCompanies, tickerLimit]);

  const setCompanies = (newCos: Company[]) => {
    setRawCompanies(deduplicateCompanies(newCos));
  };

  return (
    <CompaniesContext.Provider value={{ 
      companies, 
      allCompanies: rawCompanies,
      setCompanies, 
      loading, 
      tickerLimit, 
      setTickerLimit, 
      totalAvailable: rawCompanies.length 
    }}>
        {children}
    </CompaniesContext.Provider>
  );
};

export const useCompanies = () => {
    const context = useContext(CompaniesContext);
    if (!context) throw new Error('useCompanies must be used within a CompaniesProvider');
    return context;
};
