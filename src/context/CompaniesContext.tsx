import React, { createContext, useContext, useState, useEffect } from 'react';
import { Company } from '../data/companies';
import companiesData from '../../public/data/companies_large.json';

const CompaniesContext = createContext<{
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
  loading: boolean;
} | undefined>(undefined);

export const CompaniesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>(companiesData as Company[]);
  const [loading, setLoading] = useState(false);

  return (
    <CompaniesContext.Provider value={{ companies, setCompanies, loading }}>
        {children}
    </CompaniesContext.Provider>
  );
};

export const useCompanies = () => {
    const context = useContext(CompaniesContext);
    if (!context) throw new Error('useCompanies must be used within a CompaniesProvider');
    return context;
};
