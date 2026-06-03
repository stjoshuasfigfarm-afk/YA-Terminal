import React, { useState, useEffect, useMemo } from "react";
import { Command, Search, Globe, Activity, Terminal, X, Zap } from "lucide-react";
import { Company, COMPANIES } from "../data/companies";
import { searchAndScoreCompanies } from "../lib/searchEngine";
import { motion, AnimatePresence } from "motion/react";

interface CommandPaletteProps {
  onSelect: (company: Company) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onSelect, isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const parsedMatches = useMemo(() => {
    return searchAndScoreCompanies(COMPANIES, query).slice(0, 8);
  }, [query]);

  const filtered = useMemo(() => {
    return parsedMatches.map(m => m.company);
  }, [parsedMatches]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        isOpen ? onClose() : null; // This is handled by parent usually, but good for internal
      }
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        setSelectedIndex(prev => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, filtered, selectedIndex, onSelect, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[5000] flex items-center justify-center p-4"
        >
          <div 
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-xl bg-zinc-950/90 border border-emerald-500/20 shadow-[0_0_80px_rgba(16,185,129,0.15)] overflow-hidden"
          >
            {/* Terminal Header Bar */}
            <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-1.5 flex justify-between items-center">
                <span className="text-[7px] text-emerald-500 font-black tracking-[0.2em] uppercase">Global Asset Search Protocol</span>
                <span className="text-[7px] text-zinc-500 font-mono">SYS.CMD.001</span>
            </div>

            <div className="flex items-center gap-3 p-4 border-b border-zinc-900 bg-zinc-950">
              <Terminal className="w-5 h-5 text-emerald-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="INPUT TARGET IDENTIFIER..."
                className="flex-1 bg-transparent border-none outline-none text-emerald-505 font-mono text-sm placeholder:text-zinc-750 uppercase tracking-widest"
              />
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-[9px] font-sans text-zinc-500">
                <span className="text-[7px]">ESC</span>
              </div>
            </div>

            {/* Dynamic Pro Filters Guidance Header */}
            <div className="bg-black/80 px-4 py-1.5 border-b border-zinc-900 flex flex-wrap gap-2 text-[7.5px] font-mono select-none text-zinc-600">
              <span className="text-zinc-500 font-bold uppercase">PRO INPUT CONTROLLERS:</span>
              <button onClick={() => setQuery(prev => prev ? `${prev.trim()} c:USA` : "c:USA")} className="hover:text-emerald-400 transition-colors uppercase font-mono tracking-tighter">c:USA (Country)</button>
              <span className="text-zinc-800">|</span>
              <button onClick={() => setQuery(prev => prev ? `${prev.trim()} s:Semi` : "s:Semi")} className="hover:text-emerald-400 transition-colors uppercase font-mono tracking-tighter">s:Semi (Sector)</button>
              <span className="text-zinc-800">|</span>
              <button onClick={() => setQuery(prev => prev ? `${prev.trim()} p:NVDA` : "p:NVDA")} className="hover:text-emerald-400 transition-colors uppercase font-mono tracking-tighter">p:NVDA (Supply Chain)</button>
              <span className="text-zinc-800">|</span>
              <button onClick={() => setQuery(prev => prev ? `${prev.trim()} hq:CA` : "hq:CA")} className="hover:text-emerald-400 transition-colors uppercase font-mono tracking-tighter">hq:CA (HQ Location)</button>
            </div>

            <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-black/50 relative">
               {/* Grid lines background */}
               <div className="absolute inset-0 pointer-events-none opacity-20" style={{
                  backgroundImage: 'linear-gradient(to right, #10b981 1px, transparent 1px), linear-gradient(to bottom, #10b981 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }} />
              {filtered.length > 0 ? (
                <div className="p-2 space-y-1 relative z-10">
                  {filtered.map((company, idx) => {
                    const matchDetails = parsedMatches[idx];
                    const score = matchDetails?.score || 0;
                    const matchedFields = matchDetails?.matchedFields || [];

                    return (
                      <div
                        key={`${company.symbol}-${idx}`}
                        onClick={() => {
                          onSelect(company);
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`
                          flex items-center justify-between p-3 cursor-pointer transition-all border
                          ${idx === selectedIndex ? "bg-emerald-500/20 border-emerald-500/40 translate-x-1" : "hover:bg-zinc-900 border-transparent"}
                        `}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`
                            w-8 h-8 flex items-center justify-center font-bold text-[10px] border shrink-0
                            ${idx === selectedIndex ? "bg-emerald-500 text-black border-emerald-400" : "bg-black/50 text-emerald-500/50 border-emerald-500/20"}
                          `}>
                            {company.symbol[0]}
                          </div>
                          <div className="min-w-0">
                            <div className={`text-xs font-mono font-bold tracking-widest uppercase mb-0.5 truncate ${idx === selectedIndex ? "text-emerald-400" : "text-zinc-400"}`}>
                              {company.name}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-zinc-500 font-sans tracking-wide uppercase">
                              <span className="font-mono font-bold text-zinc-400">[{company.symbol}]</span>
                              <span>•</span>
                              <span>SYS.{(company.sector || "UNKNOWN").replace(/\s+/g, '_')}</span>
                              {query.trim() && matchedFields.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-400/90 font-mono text-[7.5px] lowercase bg-emerald-500/5 px-1 border border-emerald-500/15 tracking-tight font-semibold rounded-[1px]">
                                    matched({matchedFields[0].field.toLowerCase()}: "{(matchedFields[0].value || "").substring(0, 16)}")
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {query.trim() && score > 0 && (
                            <span className="text-[7.5px] font-mono font-bold text-zinc-600 bg-black px-1.5 py-0.5 border border-zinc-900 select-none">
                              SCORE: {score}
                            </span>
                          )}
                          {idx === selectedIndex && (
                            <div className="flex items-center gap-2 text-emerald-500">
                              <span className="text-[7px] font-mono tracking-widest uppercase">Engage</span>
                              <Zap className="w-3 h-3 fill-current" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center relative z-10">
                  <Activity className="w-8 h-8 text-zinc-800 mx-auto mb-2 opacity-50" />
                  <div className="text-zinc-600 font-mono tracking-widest text-[10px] uppercase">No targets matched.</div>
                </div>
              )}
            </div>

            <div className="bg-zinc-950 p-2 border-t border-emerald-500/20 flex items-center justify-between font-mono text-[8px] text-emerald-500/60 uppercase tracking-widest">
              <div className="flex gap-4">
                <span className="flex items-center gap-1.5"><kbd className="bg-emerald-500/10 border border-emerald-500/20 px-1 text-emerald-400">↑↓</kbd> VECTOR</span>
                <span className="flex items-center gap-1.5"><kbd className="bg-emerald-500/10 border border-emerald-500/20 px-1 text-emerald-400">↵</kbd> EXECUTE</span>
              </div>
              <div className="flex items-center gap-1">
                 <span className="w-1.5 h-1.5 bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                 UPLINK ACTIVE
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
