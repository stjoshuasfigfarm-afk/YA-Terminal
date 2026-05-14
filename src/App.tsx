import { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { SearchSidebar } from "./components/SearchSidebar";
import { MapLayer } from "./components/MapLayer";
import { IntelligenceSidebar } from "./components/IntelligenceSidebar";
import { COMPANIES, Company } from "./data/companies";

export default function App() {
  const [selectedStock, setSelectedStock] = useState<Company | null>(null);
  const [isAutopilot, setIsAutopilot] = useState(false);
  
  // Data State
  const [quote, setQuote] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async (symbol: string) => {
    setIsLoading(true);
    try {
      const [q, n, p, f, h] = await Promise.all([
        fetch(`/api/quote/${symbol}`).then(res => res.json()),
        fetch(`/api/news/${symbol}`).then(res => res.json()),
        fetch(`/api/profile/${symbol}`).then(res => res.json()),
        fetch(`/api/financials/${symbol}`).then(res => res.json()),
        fetch(`/api/history/${symbol}`).then(res => res.json()),
      ]);
      
      setQuote(q);
      setNews(n);
      setProfile(p);
      setFinancials(f);
      setHistory(h?.historical || []);
    } catch (err) {
      console.error("Data synchronization failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectNode = (company: Company) => {
    setSelectedStock(company);
    fetchData(company.symbol);
    if (isAutopilot) setIsAutopilot(false); // Disable autopilot on manual selection
  };

  // Autopilot Logic
  useEffect(() => {
    let timer: any;
    if (isAutopilot) {
      const cycle = () => {
        const randomIndex = Math.floor(Math.random() * COMPANIES.length);
        const nextCompany = COMPANIES[randomIndex];
        setSelectedStock(nextCompany);
        fetchData(nextCompany.symbol);
      };

      // Run once immediately
      cycle();
      
      timer = setInterval(cycle, 45000); // 45 seconds per cycle
    }

    return () => clearInterval(timer);
  }, [isAutopilot, fetchData]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black text-zinc-300 font-sans border-4 border-zinc-900 selection:bg-[#22ab94] selection:text-black">
      <Header selectedStock={quote} />
      
      <main className="flex-1 flex overflow-hidden">
        <SearchSidebar 
          onSelect={handleSelectNode} 
          selectedSymbol={selectedStock?.symbol}
          isAutopilot={isAutopilot}
          toggleAutopilot={() => setIsAutopilot(!isAutopilot)}
        />
        
        <MapLayer 
          selectedStock={selectedStock} 
          onSelectNode={handleSelectNode}
          intelligenceFeed={news}
        />
        
        <IntelligenceSidebar 
          selectedStock={selectedStock}
          news={news}
          financials={financials}
          profile={profile}
          history={history}
        />
      </main>

      <footer className="h-6 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between px-3 text-[9px] font-mono text-zinc-600 z-30">
        <div className="flex space-x-4">
          <div className="flex items-center gap-1.5">
             <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
             <span>SYSTEM: OPTIMAL</span>
          </div>
          <span>LATENCY: 12ms</span>
          <span>NODE_ID: {selectedStock?.symbol || "HUB-01"}</span>
        </div>
        <div className="text-[#22ab94] font-bold">
          LAST_SYNC: {new Date().toISOString().replace('T', ' ').split('.')[0]} UTC
        </div>
      </footer>

      {isLoading && (
         <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
            <div className="border border-[#22ab94] p-4 bg-black flex items-center gap-4 shadow-[0_0_30px_rgba(34,171,148,0.2)]">
               <div className="w-8 h-8 border-2 border-[#22ab94] border-t-transparent rounded-full animate-spin" />
               <div className="font-mono text-[#22ab94] text-[10px] font-bold animate-pulse tracking-[0.3em] uppercase">Intercepting_Data_Stream...</div>
            </div>
         </div>
      )}
    </div>
  );
}
