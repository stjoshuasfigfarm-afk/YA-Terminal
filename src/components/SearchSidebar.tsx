import React, { useState } from "react";
import { Search, Compass, RefreshCcw, Layers } from "lucide-react";
import { COMPANIES, Company } from "../data/companies";
import { cn } from "../lib/utils";

interface SearchSidebarProps {
  onSelect: (company: Company) => void;
  selectedSymbol?: string;
  isAutopilot: boolean;
  toggleAutopilot: () => void;
}

export const SearchSidebar: React.FC<SearchSidebarProps> = ({ 
  onSelect, 
  selectedSymbol, 
  isAutopilot, 
  toggleAutopilot 
}) => {
  const [query, setQuery] = useState("");

  const filtered = COMPANIES.filter(c => 
    c.symbol.toLowerCase().includes(query.toLowerCase()) || 
    c.name.toLowerCase().includes(query.toLowerCase())
  ).sort((a, b) => {
    // Exact symbol matches first
    const aSym = a.symbol.toLowerCase() === query.toLowerCase();
    const bSym = b.symbol.toLowerCase() === query.toLowerCase();
    if (aSym && !bSym) return -1;
    if (!aSym && bSym) return 1;
    return 0;
  });

  return (
    <aside className="w-44 h-full border-r border-zinc-800 flex flex-col bg-zinc-950 z-20 shrink-0">
      <div className="p-1 px-2 border-b border-zinc-800 bg-black">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH_SYMBOLS_"
          className="w-full bg-black border border-zinc-700 px-2 py-0.5 text-[9px] font-mono outline-none focus:border-white text-white"
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-2 py-1 bg-zinc-900/50 border-b border-zinc-800 text-[8px] font-mono text-white font-bold tracking-widest uppercase transition-colors hover:bg-zinc-800 cursor-default">
          Global_Registry
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-zinc-900 font-mono text-[9px]">
          {filtered.map((company) => (
            <div
              key={company.symbol}
              onClick={() => onSelect(company)}
              className={cn(
                "px-2 py-1.5 hover:bg-zinc-900/40 cursor-pointer flex justify-between group transition-all",
                selectedSymbol === company.symbol ? "bg-zinc-800 text-white border-l-2 border-white shadow-[inset_1px_0_0_white]" : "text-zinc-500 hover:border-l-2 hover:border-zinc-700"
              )}
            >
              <span className={cn(selectedSymbol === company.symbol ? "text-white" : "group-hover:text-white")}>
                {company.symbol}
              </span>
              <span className="text-zinc-700 uppercase text-[8px] translate-y-0.5">{company.sector.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

    </aside>
  );
};
