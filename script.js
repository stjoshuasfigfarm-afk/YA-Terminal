
/**
 * script.js - The Floor Manager
 * Intelligence layer connecting the Backend Engine to the Chassis UI.
 */

const state = {
  currentTicker: 'AAPL',
  core: null,
  logistics: null,
  macro: [],
  map: null,
  mapMarker: null,
  newsCycleIndex: 0,
  newsCycleInterval: null,
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
 * Topology Visualizer (Leaflet implementation)
 */
function updateTopologyMap() {
  const mapEl = document.getElementById('topology-map');
  if (!mapEl) return;
  
  // Initialize map if not exists
  if (!state.map) {
    state.map = L.map('topology-map', {
      zoomControl: false,
      attributionControl: false
    }).setView([20, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(state.map);
    
    // Add custom style for popup
    const style = document.createElement('style');
    style.innerHTML = `
      .leaflet-popup-content-wrapper, .leaflet-popup-tip {
        background: #000 !important;
        border: 1px solid #164e63 !important;
        color: #06b6d4 !important;
        border-radius: 0 !important;
      }
    `;
    document.head.appendChild(style);
  }

  if (!state.logistics || !state.logistics.hq || state.logistics.hq.city === 'N/A' || state.logistics.hq.city === 'KEY_MISSING') {
    return;
  }
  
  const { city, country } = state.logistics.hq;
  
  // Since we don't have a geocoder, we'll just show a marker at a "symbolic" location
  const hubs = {
    'Cupertino': [37.3229, -122.0322],
    'Mountain View': [37.3861, -122.0839],
    'Redmond': [47.6740, -122.1215],
    'Seattle': [47.6062, -122.3321],
    'New York': [40.7128, -74.0060],
    'San Francisco': [37.7749, -122.4194],
    'Seoul': [37.5665, 126.9780],
    'Austin': [30.2672, -97.7431],
    'Palo Alto': [37.4419, -122.1430]
  };

  const coords = hubs[city] || [34.0522, -118.2437]; // Default to LA for unknown
  
  logToTerminal(`LOCATING_HQ :: ${city}, ${country}`, 'SYSTEM');
  
  state.map.flyTo(coords, 8, {
    duration: 2
  });

  if (state.mapMarker) state.mapMarker.remove();
  
  state.mapMarker = L.circleMarker(coords, {
    radius: 8,
    fillColor: "#06b6d4",
    color: "#06b6d4",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.4
  }).addTo(state.map)
    .bindPopup(`<div class="font-mono text-[9px] uppercase">HQ: ${city}<br>STATUS: COMPLIANT</div>`)
    .openPopup();
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
    <div class="mb-3 border-b border-gray-800 pb-2 cursor-pointer hover:bg-cyan-950/20 px-1 transition-colors" onclick="window.initTerminal('${item.entities?.[0]?.symbol || state.currentTicker}')">
      <div class="text-[9px] text-cyan-600 font-mono">${new Date(item.published_at).toLocaleDateString()}</div>
      <div class="text-xs text-gray-300 font-medium leading-tight">${item.title}</div>
    </div>
  `).join('');
}

/**
 * News Cycle Logic
 */
window.toggleNewsCycle = () => {
  const overlay = document.getElementById('news-overlay');
  const indicator = document.getElementById('cycle-indicator');
  
  if (state.newsCycleInterval) {
    clearInterval(state.newsCycleInterval);
    state.newsCycleInterval = null;
    overlay.classList.add('hidden');
    indicator.classList.add('hidden');
    if (state.mapMarker) state.mapMarker.closePopup();
    logToTerminal('NEWS_CYCLE_TERMINATED', 'WARN');
    // Snap back to HQ if available
    updateTopologyMap();
    return;
  }

  if (state.macro.length === 0) {
    logToTerminal('NEWS_CYCLE_ERROR :: NO_DATA', 'ERROR');
    return;
  }

  overlay.classList.remove('hidden');
  indicator.classList.remove('hidden');
  logToTerminal('NEWS_CYCLE_ENGAGED :: 30S_ROTATION', 'INFO');

  const globalHubs = [
    { city: 'London', coords: [51.5074, -0.1278] },
    { city: 'Tokyo', coords: [35.6762, 139.6503] },
    { city: 'New York', coords: [40.7128, -74.0060] },
    { city: 'Frankfurt', coords: [50.1109, 8.6821] },
    { city: 'Hong Kong', coords: [22.3193, 114.1694] },
    { city: 'Singapore', coords: [1.3521, 103.8198] },
    { city: 'Shanghai', coords: [31.2304, 121.4737] },
    { city: 'Paris', coords: [48.8566, 2.3522] },
    { city: 'Sydney', coords: [-33.8688, 151.2093] },
    { city: 'San Francisco', coords: [37.7749, -122.4194] }
  ];

  const rotate = () => {
    const item = state.macro[state.newsCycleIndex];
    if (!item) return;

    // Pick a hub for visual impact (derived from entities if we wanted to be fancy, but simple random hub looks cooler)
    const hub = globalHubs[state.newsCycleIndex % globalHubs.length];
    
    overlay.innerHTML = `
      <div class="flex flex-col gap-1">
        <div class="flex justify-between items-center text-[8px] font-mono text-cyan-500 uppercase">
          <span>Macro_Bulletin // ${hub.city} // ${new Date(item.published_at).toLocaleTimeString()}</span>
          <span class="bg-cyan-900 px-1">${state.newsCycleIndex + 1}/${state.macro.length}</span>
        </div>
        <div class="text-[11px] text-white font-bold leading-tight line-clamp-2">${item.title}</div>
      </div>
    `;

    if (state.map) {
      state.map.flyTo(hub.coords, 6, { duration: 3 });
      
      if (state.mapMarker) state.mapMarker.remove();
      
      state.mapMarker = L.circleMarker(hub.coords, {
        radius: 12,
        fillColor: "#06b6d4",
        color: "#06b6d4",
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.2
      }).addTo(state.map)
        .bindPopup(`
          <div class="font-mono text-[10px] w-48">
            <div class="text-cyan-500 font-bold mb-1 underline uppercase">${hub.city} SILO</div>
            <div class="text-white">${item.title}</div>
            <div class="text-[8px] mt-2 text-cyan-800 italic">SOURCE: MARKETAUX</div>
          </div>
        `, { closeButton: false })
        .openPopup();
    }

    state.newsCycleIndex = (state.newsCycleIndex + 1) % state.macro.length;
  };

  rotate();
  state.newsCycleInterval = setInterval(rotate, 30000);
};

/**
 * Ticker Dropdown Search Logic
 */
async function searchTickers(query) {
  const dropdown = document.getElementById('ticker-dropdown');
  if (!query || query.length < 1) {
    dropdown.classList.add('hidden');
    return;
  }

  try {
    const res = await fetch(`/api/search?q=${query}`);
    const matches = await res.json();
    
    if (matches && matches.length > 0) {
      dropdown.innerHTML = matches.map(m => `
        <div onclick="window.selectTicker('${m.symbol}')" class="px-3 py-2 text-[10px] text-cyan-400 font-mono hover:bg-cyan-950 cursor-pointer border-b border-gray-900 transition-colors flex justify-between">
          <span>${m.symbol} // SILO</span>
          <span class="text-gray-600 truncate ml-2">${m.name}</span>
        </div>
      `).join('');
      dropdown.classList.remove('hidden');
    } else {
      dropdown.classList.add('hidden');
    }
  } catch (err) {
    console.error('Search error', err);
  }
}

window.selectTicker = (ticker) => {
  const input = document.getElementById('symbol-input');
  input.value = ticker;
  document.getElementById('ticker-dropdown').classList.add('hidden');
  window.initTerminal(ticker);
};

// Global hook for the Chassis
window.initTerminal = (ticker) => {
  if (!ticker) return;
  ticker = ticker.toUpperCase();
  state.currentTicker = ticker;
  
  // Reset news cycle for new ticker
  if (state.newsCycleInterval) window.toggleNewsCycle();
  
  fetchTerminalCore(ticker);
  fetchLogistics(ticker);
};

// Initial boot
document.addEventListener('DOMContentLoaded', () => {
  window.initTerminal('AAPL');

  const symbolInput = document.getElementById('symbol-input');
  
  // Keyup for live suggestions
  symbolInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      // User requested Enter to bring up the list
      searchTickers(symbolInput.value);
    } else {
      // Also search while typing for better UX
      searchTickers(symbolInput.value);
    }
  });

  // Handle focus for dropdown
  symbolInput.addEventListener('focus', () => {
    if (symbolInput.value) searchTickers(symbolInput.value);
  });

  // Hide dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#symbol-input') && !e.target.closest('#ticker-dropdown')) {
      document.getElementById('ticker-dropdown').classList.add('hidden');
    }
  });
});
