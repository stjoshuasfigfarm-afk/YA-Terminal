import React, { createContext, useState, useEffect, useContext } from 'react';

export interface Company {
  symbol: string;
  name: string;
  sector: string;
  coordinates: [number, number];
  financials?: any;
  partners?: string[];
}

interface CompaniesContextType {
  companies: Company[];
  loading: boolean;
  error: string | null;
}

const CompaniesContext = createContext<CompaniesContextType | undefined>(undefined);

export const CompaniesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Streams the JSON dataset from Vercel's global edge network instantly
    fetch('/data/companies_large.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to stream global ticker block from server assets');
        }
        return response.json();
      })
      .then((data) => {
        setCompanies(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Data warehouse fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <CompaniesContext.Provider value={{ companies, loading, error }}>
      {children}
    </CompaniesContext.Provider>
  );
};

export const useCompanies = () => {
  const context = useContext(CompaniesContext);
  if (!context) {
    throw new Error('useCompanies must be used within a CompaniesProvider');
  }
  return context;
};
