import React, { useState } from "react";
import { Search, Compass, RefreshCcw, Layers } from "lucide-react";
import { COMPANIES, Company } from "../data/companies";
import { cn } from "../lib/utils";

interface SearchSidebarProps {
  onSelect: (company: Company) => void;
  selectedSymbol?: string;
  isNewsCycling: boolean;
  toggleNewsCycling: () => void;
}

export const SearchSidebar: React.FC<SearchSidebarProps> = ({ 
  onSelect, 
  selectedSymbol, 
  isNewsCycling, 
  toggleNewsCycling 
}) => {
  const [query, setQuery] = useState("");

  const filtered = COMPANIES.filter(c => {
    return c.symbol.toLowerCase().includes(query.toLowerCase()) || 
      c.name.toLowerCase().includes(query.toLowerCase());
  }).sort((a, b) => {
    const aIsETF = ['SPY', 'QQQ'].includes(a.symbol);
    const bIsETF = ['SPY', 'QQQ'].includes(b.symbol);
    if (aIsETF && !bIsETF) return -1;
    if (!aIsETF && bIsETF) return 1;
    
    // Exact symbol matches first
    const aSym = a.symbol.toLowerCase() === query.toLowerCase();
    const bSym = b.symbol.toLowerCase() === query.toLowerCase();
    if (aSym && !bSym) return -1;
    if (!aSym && bSym) return 1;
    return 0;
  });

  const displayedCompanies = filtered;

  return (
    <aside className="w-[240px] border-r border-zinc-800 flex flex-col bg-zinc-950 z-20 shrink-0">
      <div className="flex border-b border-zinc-800 h-[29px]">
        <div 
          className="flex-1 py-1.5 text-[9px] font-mono uppercase tracking-widest bg-emerald-900/20 text-emerald-500 flex items-center justify-center border-r border-zinc-800"
        >Equities</div>
        <button 
          onClick={toggleNewsCycling}
          className={cn("flex-1 py-1.5 text-[9px] font-mono uppercase tracking-widest", isNewsCycling ? "bg-emerald-500 text-black font-bold" : "text-zinc-600 hover:text-zinc-400")}
        >News</button>
      </div>
      <div className="p-2 px-3 border-b border-zinc-800 bg-black">
        <div className="text-[10px] text-emerald-700 font-mono mb-2 uppercase tracking-widest">Global_Registry // Assets</div>
        <div className="relative group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH_SYMBOLS_"
            className="w-full bg-emerald-950/10 border border-zinc-800 px-3 py-1.5 text-[10px] font-mono outline-none focus:border-emerald-500 text-white placeholder:text-zinc-700 transition-all"
          />
          <Search className="absolute right-3 top-2 w-3.5 h-3.5 text-zinc-700 group-focus-within:text-emerald-500" />
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-3 py-2 bg-zinc-900/50 border-b border-zinc-800 text-[9px] font-mono text-zinc-500 font-bold tracking-widest uppercase flex justify-between items-center">
          <span>Target_Set</span>
          <span className="text-[7px] text-emerald-900">v4.2.0</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-zinc-900/50 font-mono text-[10px]">
          {displayedCompanies.map((company) => (
            <div
              key={company.symbol}
              onClick={() => onSelect(company)}
              className={cn(
                "px-3 py-2 hover:bg-emerald-900/10 cursor-pointer flex justify-between group transition-all",
                selectedSymbol === company.symbol ? "bg-emerald-900/20 text-white border-l-2 border-emerald-500" : "text-zinc-500"
              )}
            >
              <div className="flex flex-col">
                <span className={cn("font-bold tracking-tight", selectedSymbol === company.symbol ? "text-emerald-400" : "group-hover:text-white")}>
                  {company.symbol}
                </span>
                <span className="text-[8px] text-zinc-700 uppercase truncate max-w-[150px]">{company.name}</span>
              </div>
              <div className="flex flex-col items-end justify-center">
                 <span className="text-zinc-800 uppercase text-[8px] tracking-tighter">{company.sector.split(' ')[0]}</span>
                 {selectedSymbol === company.symbol && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
