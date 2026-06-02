import React, { createContext, useContext, useState, useEffect } from 'react';
import { Company } from '../data/companies';
import companiesData from '../../public/data/companies_large.json';

const CompaniesContext = createContext<{
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
  loading: boolean;
  tickerLimit: number;
  setTickerLimit: (limit: number) => void;
  totalAvailable: number;
} | undefined>(undefined);

export const CompaniesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawCompanies, setRawCompanies] = useState<Company[]>(companiesData as Company[]);
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
    setRawCompanies(newCos);
  };

  return (
    <CompaniesContext.Provider value={{ 
      companies, 
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
