import { useState, useEffect, useCallback } from "react";
import { GoogleGenAI } from "@google/genai";
import { Header } from "./components/Header";
import { SearchSidebar } from "./components/SearchSidebar";
import { MapLayer } from "./components/MapLayer";
import { IntelligenceSidebar } from "./components/IntelligenceSidebar";
import { COMPANIES, Company } from "./data/companies";

export default function App() {
  const [selectedStock, setSelectedStock] = useState<Company | null>(null);
  const [mapFocusStock, setMapFocusStock] = useState<Company | null>(null);
  const [isAutopilot, setIsAutopilot] = useState(false);
  
  // Data State
  const [quote, setQuote] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [focusNews, setFocusNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const enrichNews = useCallback(async (rawNews: any[]) => {
    if (!rawNews || rawNews.length === 0) return;
    
    setIsAiProcessing(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return;

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Analyze these news headlines/summaries.
        Translate to professional English if needed.
        Summarize into a concise "Neural Link" headline (max 80 chars).
        Return JSON array: [{ "translatedTitle": string }]
        News:
        ${rawNews.map((n: any, i: number) => `${i+1}. TITLE: ${n.title} | SUMMARY: ${n.description}`).join("\n")}
      `;

      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash", // Use 1.5 flash for better reliability
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });

      const text = result.response.text();
      const processed = JSON.parse(text || "[]");
      const enriched = rawNews.map((item, i) => ({
        ...item,
        intelligence: processed[i] || { translatedTitle: item.title }
      }));
      setNews(enriched);
    } catch (error: any) {
      console.error("AI Enrichment failed:", error);
      // Check for quota error
      if (error?.message?.includes("429") || error?.message?.includes("quota") || error?.status === 429) {
        console.warn("AI Quota exhausted. Falling back to raw telemetry.");
      }
    } finally {
      setIsAiProcessing(false);
    }
  }, []);

  const fetchData = useCallback(async (symbol: string) => {
    if (!symbol) return;
    setIsLoading(true);
    
    try {
      const [q, n, p, f, h] = await Promise.all([
        fetch(`/api/quote/${symbol}`).then(res => res.json()).catch(() => ({})),
        fetch(`/api/news/${symbol}`).then(res => res.json()).catch(() => ([])),
        fetch(`/api/profile/${symbol}`).then(res => res.json()).catch(() => ({})),
        fetch(`/api/financials/${symbol}`).then(res => res.json()).catch(() => ([])),
        fetch(`/api/history/${symbol}`).then(res => res.json()).catch(() => ({ historical: [] })),
      ]);
      
      setQuote(q);
      setNews(n);
      setProfile(p);
      setFinancials(f);
      setHistory(h?.historical || []);
      
      if (n && n.length > 0) {
        enrichNews(n);
      }
    } catch (err) {
      console.error("Critical telemetry synchronization failure:", err);
    } finally {
      setIsLoading(false);
    }
  }, [enrichNews]);

  // Initial Load Guard
  useEffect(() => {
    if (!selectedStock && COMPANIES.length > 0) {
      const defaultCompany = COMPANIES[0];
      setSelectedStock(defaultCompany);
      fetchData(defaultCompany.symbol);
    }
  }, [fetchData, selectedStock]);

  // Live Telemetry Polling (Every 15s)
  useEffect(() => {
    if (!selectedStock) return;

    const pollInterval = setInterval(async () => {
      try {
        const [qRes, pRes] = await Promise.all([
          fetch(`/api/quote/${selectedStock.symbol}`).then(res => res.json()),
          fetch(`/api/profile/${selectedStock.symbol}`).then(res => res.json())
        ]);
        setQuote(qRes);
        setProfile(pRes);
      } catch (e) {
        console.warn("Telemetry polling drift detected.", e);
      }
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [selectedStock]);

  // Focus News Sync
  useEffect(() => {
    if (!mapFocusStock) {
      setFocusNews([]);
      return;
    }
    
    // Only fetch if different from selectedStock or if news is empty
    const fetchFocusNews = async () => {
      try {
        const res = await fetch(`/api/news/${mapFocusStock.symbol}`);
        const n = await res.json();
        setFocusNews(n);
      } catch (e) {
        console.error("Map focus news sync failure", e);
      }
    };
    fetchFocusNews();
  }, [mapFocusStock]);

  const handleSelectNode = useCallback((company: Company) => {
    setSelectedStock(company);
    setMapFocusStock(company);
    fetchData(company.symbol);
    if (isAutopilot) setIsAutopilot(false);
  }, [isAutopilot, fetchData]);


  // Intelligence Stream Cycle (Neural Stream)
  useEffect(() => {
    let timer: any;
    if (isAutopilot) {
      const cycle = () => {
        const randomIndex = Math.floor(Math.random() * COMPANIES.length);
        const nextCompany = COMPANIES[randomIndex];
        setMapFocusStock(nextCompany);
      };

      // Run once immediately
      cycle();
      
      timer = setInterval(cycle, 30000); // 30 seconds per cycle
    }

    return () => clearInterval(timer);
  }, [isAutopilot]);

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
          focusStock={mapFocusStock}
          onSelectNode={handleSelectNode}
          intelligenceFeed={focusNews.length > 0 ? focusNews : news}
          isIntelligenceStream={isAutopilot}
          toggleIntelligenceStream={() => setIsAutopilot(!isAutopilot)}
        />

        <IntelligenceSidebar 
          selectedStock={selectedStock}
          quote={quote}
          news={news}
          financials={financials}
          profile={profile}
          history={history}
          isAiProcessing={isAiProcessing}
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
