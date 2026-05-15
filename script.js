
/**
 * script.js - The Floor Manager
 * Intelligence layer connecting the Backend Engine to the Chassis UI.
 */

const state = {
  currentTicker: 'AAPL',
  core: null,
  logistics: null,
  macro: [],
};

/**
 * Terminal Log Visualizer
 */
function logToTerminal(msg, type = 'INFO') {
  const el = document.getElementById('terminal-log');
  const timestamp = new Date().toLocaleTimeString([], { hour12: false });
  const entry = document.createElement('div');
  entry.className = type === 'ERROR' ? 'text-red-500' : type === 'WARN' ? 'text-yellow-500' : 'text-green-900';
  entry.innerHTML = `[${timestamp}] [${type}] ${msg}`;
  el.prepend(entry);
}

/**
 * Core Financial Telemetry
 */
export async function fetchTerminalCore(ticker) {
  try {
    logToTerminal(`INITIATING_UPLINK :: ${ticker}`, 'SYSTEM');
    const res = await fetch(`/api?service=core&symbol=${ticker}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`HTTP_${res.status}: ${errorData.message || errorData.error || 'UNKNOWN_ERROR'}`);
    }
    const data = await res.json();
    state.core = data;
    
    if (data.source === 'MOCK_EMERGENCY') {
      logToTerminal(`TELEMETRY_BLACKOUT :: FALLBACK_ENGAGED`, 'WARN');
      if (data.status) logToTerminal(`SETUP_HINT :: ${data.status}`, 'ERROR');
    } else {
      logToTerminal(`TELEMETRY_SOURCE_LOCKED :: ${data.source}`, 'INFO');
    }
    
    renderPriceFeed();
    return data;
  } catch (err) {
    logToTerminal(`UPLINK_FAILURE :: ${err.message}`, 'ERROR');
    console.error('[Terminal Core Error]', err);
    document.getElementById('price-feed').innerHTML = `<div class="text-red-500 font-mono text-xs">SILO_FAULT: ${err.message}</div>`;
  }
}

/**
 * Logistics and Macro Intelligence
 */
export async function fetchLogistics(ticker) {
  try {
    const [logistics, macro, regulatory] = await Promise.all([
      fetch(`/api?service=logistics&symbol=${ticker}`).then(r => r.json()),
      fetch(`/api?service=macro&symbol=${ticker}`).then(r => r.json()),
      fetch(`/api?service=regulatory&symbol=${ticker}`).then(r => r.json())
    ]);
    
    state.logistics = logistics;
    state.macro = macro.data || [];
    state.regulatory = regulatory;
    
    renderLaborStats();
    renderMacroCorridor();
    renderRegulatorySynthesis();
    updateTopologyMap();
  } catch (err) {
    console.warn('[Logistics Error]', err);
  }
}

/**
 * Regulatory Synthesis Visualizer
 */
function renderRegulatorySynthesis() {
  const el = document.getElementById('regulatory-synthesis');
  if (!state.regulatory || !state.regulatory.phases) return;

  const phases = state.regulatory.phases;
  const colors = {
    COMPLIANT: 'bg-green-900/50 text-green-400 border-green-700',
    PASS: 'bg-green-900/50 text-green-400 border-green-700',
    UNDER_REVIEW: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
    PENDING: 'bg-gray-800 text-gray-500 border-gray-700'
  };

  el.innerHTML = Object.entries(phases).map(([key, status]) => `
    <div class="h-12 flex flex-col items-center justify-center text-[8px] font-mono border ${colors[status] || 'bg-gray-900'}">
      <span class="opacity-50">PH_${key}</span>
      <span class="font-bold">${status}</span>
    </div>
  `).join('');
}

/**
 * Topology Visualizer
 */
function updateTopologyMap() {
  const mapEl = document.getElementById('topology-map');
  if (!state.logistics || !state.logistics.hq) {
    mapEl.innerHTML = "TOPOLOGY_DATA_WAITING...";
    return;
  }
  
  const { city, country } = state.logistics.hq;
  mapEl.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full border-2 border-dashed border-cyan-900/50 rounded p-4">
      <div class="text-xs text-cyan-500 font-mono mb-2">HQ_COORDINATES_LOCKED</div>
      <div class="text-2xl font-bold tracking-tighter text-white">${city}, ${country}</div>
      <div class="text-[10px] text-cyan-700 mt-4 font-mono">SECTOR: ${state.logistics.sector}</div>
    </div>
  `;
}

function renderPriceFeed() {
  const el = document.getElementById('price-feed');
  const { price, change, source, symbol } = state.core || {};
  
  if (!price) {
    el.innerHTML = '<span class="animate-pulse">SYNCHRONIZING...</span>';
    return;
  }

  const isUp = change >= 0;
  el.innerHTML = `
    <div class="flex flex-col">
      <div class="flex items-baseline justify-between">
        <span class="text-4xl font-mono font-black tracking-tighter ${isUp ? 'text-green-400' : 'text-red-400'}">
          ${Number(price).toFixed(2)}
        </span>
        <span class="text-xs font-mono text-cyan-600">${source}</span>
      </div>
      <div class="flex justify-between mt-1">
         <span class="text-xs font-mono ${isUp ? 'text-green-600' : 'text-red-600'}">
          ${isUp ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}
         </span>
         <span class="text-[10px] text-gray-500 uppercase">${symbol} // REAL_TIME</span>
      </div>
    </div>
  `;
}

function renderLaborStats() {
  const el = document.getElementById('labor-stats');
  if (!state.logistics) return;
  
  const emp = state.logistics.employees;
  el.innerHTML = `
    <div class="p-2 border-l-2 border-cyan-500 bg-cyan-950/20">
      <div class="text-[10px] text-cyan-500 font-mono uppercase">Full-Time Logistics</div>
      <div class="text-xl font-bold text-white">${typeof emp === 'number' ? emp.toLocaleString() : emp}</div>
    </div>
  `;
}

function renderMacroCorridor() {
  const el = document.getElementById('macro-corridor');
  if (!state.macro.length) {
    el.innerHTML = '<div class="text-xs text-gray-600">NO_MACRO_EVENTS_DETECTED</div>';
    return;
  }
  
  el.innerHTML = state.macro.map(item => `
    <div class="mb-3 border-b border-gray-800 pb-2">
      <div class="text-[9px] text-cyan-600 font-mono">${new Date(item.published_at).toLocaleDateString()}</div>
      <div class="text-xs text-gray-300 font-medium leading-tight">${item.title}</div>
    </div>
  `).join('');
}

// Global hook for the Chassis
window.initTerminal = (ticker) => {
  state.currentTicker = ticker;
  fetchTerminalCore(ticker);
  fetchLogistics(ticker);
};

// Initial boot
document.addEventListener('DOMContentLoaded', () => {
  window.initTerminal('AAPL');
});
