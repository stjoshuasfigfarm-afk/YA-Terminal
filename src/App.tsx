import { useState, useEffect, useCallback } from "react";
import { GoogleGenAI } from "@google/genai";
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
  const [mktCapHistory, setMktCapHistory] = useState<any[]>([]);
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
        As a neural intelligence relay, process the following market news stream.
        1. DECRYPT: Translate foreign indices or non-English content to professional Financial English.
        2. SYNOPSIS: Summarize each item into a high-impact, cyber-terminal style "INTELLIGENCE_LINK" (max 85 chars).
        3. CODE: Format the output as a valid JSON array of objects.
        
        NEWS_STREAM:
        ${rawNews.map((n: any, i: number) => `NODE_${i+1}: TITLE="${n.title}" | DETAIL="${n.description}"`).join("\n")}
        
        OUTPUT_FORMAT:
        [ { "translatedTitle": "ENCRYPTED_SYNOPSIS_STRING" } ]
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                translatedTitle: { type: "STRING" }
              },
              required: ["translatedTitle"]
            }
          }
        }
      });

      const processed = JSON.parse(result.text || "[]");
      const enriched = rawNews.map((item, i) => ({
        ...item,
        intelligence: processed[i] || { translatedTitle: item.title }
      }));
      setNews(enriched);
    } catch (error) {
      console.error("AI Enrichment failed:", error);
    } finally {
      setIsAiProcessing(false);
    }
  }, []);

  const fetchData = useCallback(async (symbol: string) => {
    if (!symbol) return;
    setIsLoading(true);
    
    try {
      const [q, n, p, f, h, m] = await Promise.all([
        fetch(`/api/quote/${symbol}`).then(res => res.json()).catch(() => ({})),
        fetch(`/api/news/${symbol}`).then(res => res.json()).catch(() => ([])),
        fetch(`/api/profile/${symbol}`).then(res => res.json()).catch(() => ({})),
        fetch(`/api/financials/${symbol}`).then(res => res.json()).catch(() => ([])),
        fetch(`/api/history/${symbol}`).then(res => res.json()).catch(() => ({ historical: [] })),
        fetch(`/api/market-cap/${symbol}`).then(res => res.json()).catch(() => ([])),
      ]);
      
      setQuote(q && !q.error ? q : null);
      setNews(Array.isArray(n) ? n : []);
      setProfile(p && !p.error ? p : null);
      setFinancials(Array.isArray(f) ? f : []);
      setHistory(h && Array.isArray(h.historical) ? h.historical : []);
      setMktCapHistory(Array.isArray(m) ? m : []);
      
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
      const defaultCompany = COMPANIES.find(c => c.symbol === "AAPL") || COMPANIES[0];
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

  const handleSelectNode = useCallback((company: Company) => {
    setSelectedStock(company);
    fetchData(company.symbol);
    if (isAutopilot) setIsAutopilot(false);
  }, [isAutopilot, fetchData]);


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
      <Header quote={quote} />
      
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
          quote={quote}
          profile={profile}
        />

        <IntelligenceSidebar 
          selectedStock={selectedStock}
          news={news}
          financials={financials}
          profile={profile}
          quote={quote}
          history={history}
          mktCapHistory={mktCapHistory}
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
