import React, { createContext, useContext, useState, useCallback } from 'react';
import { Company } from '../data/companies';

interface TerminalContextType {
  selectedStock: Company | null;
  setSelectedStock: (stock: Company | null) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  mapLayers: { hq: boolean; arcs: boolean; heatmap: boolean };
  toggleMapLayer: (layer: string) => void;
  // Global Data State
  marketData: {
    quote: any | null;
    news: any[];
    financials: any[];
    profile: any | null;
    history: any[];
    sentiment: any | null;
    yields: any | null;
    relationships: { suppliers: any[]; customers: any[] };
  };
  setMarketData: (data: Partial<TerminalContextType['marketData']> | ((prev: TerminalContextType['marketData']) => Partial<TerminalContextType['marketData']>)) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export const TerminalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedStock, setSelectedStock] = useState<Company | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mapLayers, setMapLayers] = useState({ hq: true, arcs: true, heatmap: true });
  const [isLoading, setIsLoading] = useState(false);
  
  const [marketData, setMarketDataState] = useState<TerminalContextType['marketData']>({
    quote: null,
    news: [],
    financials: [],
    profile: null,
    history: [],
    sentiment: null,
    yields: null,
    relationships: { suppliers: [], customers: [] }
  });

  const setMarketData = useCallback((data: Partial<TerminalContextType['marketData']> | ((prev: TerminalContextType['marketData']) => Partial<TerminalContextType['marketData']>)) => {
    setMarketDataState(prev => {
      const nextData = typeof data === 'function' ? data(prev) : data;
      return { ...prev, ...nextData };
    });
  }, []);

  const toggleMapLayer = useCallback((layer: string) => {
    setMapLayers(prev => ({ ...prev, [layer]: !prev[layer as keyof typeof prev] }));
  }, []);

  return (
    <TerminalContext.Provider value={{
      selectedStock,
      setSelectedStock,
      isSettingsOpen,
      setIsSettingsOpen,
      mapLayers,
      toggleMapLayer,
      marketData,
      setMarketData,
      isLoading,
      setIsLoading
    }}>
      {children}
    </TerminalContext.Provider>
  );
};

export const useTerminal = () => {
  const context = useContext(TerminalContext);
  if (context === undefined) {
    throw new Error('useTerminal must be used within a TerminalProvider');
  }
  return context;
};
