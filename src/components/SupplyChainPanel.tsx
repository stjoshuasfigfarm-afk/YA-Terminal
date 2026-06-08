import React, { useMemo } from 'react';
import { Network, ArrowDown, Activity, Map, Box } from 'lucide-react';
import { COMPANIES, Company } from '../data/companies';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

// Helper to resolve company symbols for nodes - keeping same as SupplyChainModal for consistency
const getCompanySymbolText = (symbol: string) => {
  return symbol.slice(0, 2).toUpperCase();
};

export const SupplyChainPanel = ({ company, onSelectNode }: { company: Company, onSelectNode: (c: Company) => void }) => {
  // Compute Tier 1 and Tier 2 relationships
  const suppliersT1 = useMemo(() => COMPANIES.filter(c => c.partners?.includes(company.symbol)), [company]);
  const customersT1 = useMemo(() => {
    return company.partners ? COMPANIES.filter(c => company.partners!.includes(c.symbol)) : [];
  }, [company]);

  const suppliersT2 = useMemo(() => {
    const symbolsT1 = suppliersT1.map(s => s.symbol);
    return COMPANIES.filter(c => c.partners?.some(p => symbolsT1.includes(p)) && c.symbol !== company.symbol && !symbolsT1.includes(c.symbol));
  }, [suppliersT1, company]);

  const customersT2 = useMemo(() => {
    const symbolsT1 = customersT1.map(c => c.symbol);
    return COMPANIES.filter(c => symbolsT1.some(sT1 => {
      const src = COMPANIES.find(x => x.symbol === sT1);
      return src?.partners?.includes(c.symbol);
    }) && c.symbol !== company.symbol && !symbolsT1.includes(c.symbol));
  }, [customersT1, company]);

  // Determine active commodity theme
  const commodityTheme = useMemo(() => {
    const sector = (company.sector || "").toLowerCase();
    if (sector.includes("semi") || sector.includes("chips")) {
      return {
        name: "Rare Earths & Advanced Silicon Value Chain",
        m1: "Silicon & Rare Earths",
        m2: "Polysilicon Wafers",
        m3: "Die Fabrication",
        m4: "Enterprise AI & Consumers",
        companies: {
          m1: ["ASML", "AMAT", "VALE"],
          m2: ["TSM", "INTC", "SKHYNIX"],
          m3: ["NVDA", "AMD", "SMC"],
          m4: ["AAPL", "MSFT", "GOOGL", "META", "AMZN"]
        }
      };
    } else if (sector.includes("energy") || sector.includes("oil") || sector.includes("gas")) {
      return {
        name: "Petrochemicals & Raw Energy Vectors",
        m1: "Crude Extraction",
        m2: "Drilling Refinement",
        m3: "Cracking & Liquified Gas",
        m4: "Logistics Fleet & EV Recharging",
        companies: {
          m1: ["ARAMCO", "XOM", "CVX"],
          m2: ["SHEL", "TOT", "BP"],
          m3: ["CATL", "XOM", "SMC"],
          m4: ["TSLA", "TM", "UPS", "FDX", "AMZN"]
        }
      };
    } else if (sector.includes("auto") || sector.includes("vehicle") || sector.includes("industrials")) {
      return {
        name: "Lithium-Ion & Carbon-Steel Supply Line",
        m1: "Lithium & Nickel Metallurgy",
        m2: "Anode/Cathode Battery Cells",
        m3: "Chassis Fabrication",
        m4: "Retail Fleet & Distribution",
        companies: {
          m1: ["VALE", "RIO", "BHP"],
          m2: ["CATL", "PANASONIC", "BYD"],
          m3: ["TSLA", "TM", "RIVN"],
          m4: ["AMZN", "UPS", "FDX"]
        }
      };
    } else {
      return {
        name: "Global Macro Commodity & Technology Chain",
        m1: "Basic Chemicals & Metals",
        m2: "Microprocessing Units",
        m3: "System Integrators",
        m4: "Consumer Marketplaces",
        companies: {
          m1: ["VALE", "ASML", "CATL"],
          m2: ["TSM", "NVDA", "INTC"],
          m3: ["AAPL", "SMC", "META", "MSFT"],
          m4: ["AMZN", "LVMH", "NKE", "ADDYY"]
        }
      };
    }
  }, [company]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-900 pb-2 select-none">
        <div className="text-[9px] text-emerald-400 font-mono font-black tracking-widest uppercase">
          LOGISTICS_COCKPIT // STREAM_VECTORS
        </div>
        <div className="flex items-center gap-1.5 bg-black px-1.5 py-0.5 border border-zinc-805">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          <span className="text-[7.5px] text-zinc-500 font-mono tracking-widest uppercase">SCAN_ACTIVE</span>
        </div>
      </div>

      <div className="w-full">
        <div className="flex flex-col gap-4 relative items-stretch w-full">
          {/* Vertical flow trace line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-yellow-500/10 via-emerald-500/30 to-green-500/10 -translate-x-1/2 z-0 opacity-30 pointer-events-none" />

          {/* Tier 2 Suppliers */}
          <div className="flex flex-col gap-2 relative z-10 bg-zinc-950/40 p-2.5 border border-zinc-900 rounded-sm">
            <div className="text-center text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950 px-2 py-1 border border-zinc-900">
              Tier 2 Suppliers
            </div>
            {suppliersT2.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {suppliersT2.slice(0, 4).map(c => (
                  <SupplyChainNode key={`t2-sup-${c.symbol}`} data={c} type="supplier" onClick={() => onSelectNode(c)} />
                ))}
              </div>
            ) : (
              <div className="text-center text-[7.5px] font-mono text-zinc-600 py-1 uppercase">No Tier 2 Suppliers Traceable</div>
            )}
          </div>
          
          <div className="flex justify-center z-10">
            <ArrowDown className="w-3.5 h-3.5 text-zinc-700" />
          </div>

          {/* Tier 1 Suppliers */}
          <div className="flex flex-col gap-2 relative z-10 bg-zinc-950/40 p-2.5 border border-zinc-900 rounded-sm">
            <div className="text-center text-[8px] font-mono font-bold text-yellow-500/70 uppercase tracking-widest bg-zinc-950 px-2 py-1 border border-yellow-500/20">
              Tier 1 Suppliers
            </div>
            {suppliersT1.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {suppliersT1.slice(0, 4).map(c => (
                  <SupplyChainNode key={`t1-sup-${c.symbol}`} data={c} type="supplier" highlight onClick={() => onSelectNode(c)} />
                ))}
              </div>
            ) : (
              <div className="text-center text-[7.5px] font-mono text-zinc-650 py-1 uppercase">No Tier 1 Suppliers Detected</div>
            )}
          </div>

          <div className="flex justify-center z-10">
            <ArrowDown className="w-3.5 h-3.5 text-yellow-500/40" style={{ animationDelay: "150ms" }} />
          </div>

          {/* Focal Company */}
          <div className="flex flex-col relative z-10 shrink-0 bg-zinc-950/40 p-2.5 border border-zinc-900 rounded-sm">
            <div className="text-center text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-widest bg-zinc-950 px-2 py-1 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.1)] mb-2">
              Focal Operator Node
            </div>
            <div 
              className="bg-black border-2 border-emerald-500/80 p-3 flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(16,185,129,0.1)] relative group cursor-pointer" 
              onClick={() => onSelectNode(company)}
            >
              <div className="w-9 h-9 bg-zinc-950 border border-zinc-800 flex items-center justify-center text-[13px] font-black text-emerald-400 group-hover:scale-105 transition-transform overflow-hidden font-mono">
                <span>{company.symbol.slice(0, 2)}</span>
              </div>
              <h3 className="text-[9.5px] font-bold text-zinc-100 tracking-tight leading-none mb-0.5 mt-1.5">{company.name}</h3>
              <div className="text-[7.5px] font-mono text-emerald-500 select-none">{company.symbol}</div>
            </div>
          </div>

          <div className="flex justify-center z-10">
            <ArrowDown className="w-3.5 h-3.5 text-emerald-500/40" style={{ animationDelay: "300ms" }} />
          </div>

          {/* Tier 1 Customers */}
          <div className="flex flex-col gap-2 relative z-10 bg-zinc-950/40 p-2.5 border border-zinc-900 rounded-sm">
            <div className="text-center text-[8px] font-mono font-bold text-green-500/70 uppercase tracking-widest bg-zinc-950 px-2 py-1 border border-green-500/20">
              Tier 1 Customers
            </div>
            {customersT1.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {customersT1.slice(0, 4).map(c => (
                  <SupplyChainNode key={`t1-cust-${c.symbol}`} data={c} type="customer" highlight onClick={() => onSelectNode(c)} />
                ))}
              </div>
            ) : (
              <div className="text-center text-[7.5px] font-mono text-zinc-650 py-1 uppercase">No Tier 1 Customers Detected</div>
            )}
          </div>

          <div className="flex justify-center z-10">
            <ArrowDown className="w-3.5 h-3.5 text-green-500/40" style={{ animationDelay: "450ms" }} />
          </div>

          {/* Tier 2 Customers */}
          <div className="flex flex-col gap-2 relative z-10 bg-zinc-950/40 p-2.5 border border-zinc-900 rounded-sm">
            <div className="text-center text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950 px-2 py-1 border border-zinc-900">
              Tier 2 Customers
            </div>
            {customersT2.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {customersT2.slice(0, 4).map(c => (
                  <SupplyChainNode key={`t2-cust-${c.symbol}`} data={c} type="customer" onClick={() => onSelectNode(c)} />
                ))}
              </div>
            ) : (
              <div className="text-center text-[7.5px] font-mono text-zinc-600 py-1 uppercase">No Tier 2 Customers Traceable</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SupplyChainNode = ({ data, type, highlight = false, onClick }: { data: Company, type: 'supplier' | 'customer', highlight?: boolean, onClick: () => void }) => {
  const colorClass = type === 'supplier' ? 'text-yellow-500 border-yellow-500/20 hover:border-yellow-500/60' : 'text-green-500 border-green-500/20 hover:border-green-500/60';

  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-2 flex items-start gap-2 border transition-all cursor-pointer group shadow-sm bg-black/60 hover:bg-zinc-900",
        colorClass,
        highlight ? "opacity-100 border-zinc-700 font-bold" : "opacity-75 border-zinc-900"
      )}
    >
      <div className={cn(
        "w-7 h-7 shrink-0 flex items-center justify-center font-black text-[9px] border overflow-hidden font-mono",
        highlight 
          ? (type === 'supplier' ? 'bg-yellow-950/40 border-yellow-700/50 text-yellow-450' : 'bg-green-950/40 border-green-700/50 text-green-450') 
          : 'bg-zinc-900 border-zinc-800 text-zinc-500 group-hover:text-zinc-400'
      )}>
        <span>{data.symbol.slice(0, 2)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] font-bold tracking-tight truncate text-zinc-300 group-hover:text-white transition-colors">{data.name}</div>
        <div className="flex items-center gap-1 text-[7px] font-mono text-zinc-500 uppercase">
          <span className="font-bold text-zinc-400">{data.symbol}</span>
          <span>•</span>
          <span className="truncate">{data.sector}</span>
        </div>
      </div>
    </div>
  );
};
