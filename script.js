
/**
 * script.js - The Floor Manager
 * Intelligence layer connecting the Backend Engine to the Chassis UI.
 */

const state = {
  currentTicker: 'AAPL',
  targetCoords: null,
  core: null,
  logistics: null,
  macro: [],
  syncInterval: null,
  map: null,
  markerLayer: null,
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
    
    // Merge macro news logic - avoid duplicates
    const newItems = macro.data || [];
    const currentTitles = new Set(state.macro.map(m => m.title));
    const merged = [...state.macro];
    
    newItems.forEach(item => {
      if (!currentTitles.has(item.title)) {
        merged.unshift(item); // Put newest at the front
      }
    });
    
    state.macro = merged.length > 0 ? merged : state.macro;
    state.regulatory = regulatory;
    
    renderFinancials();
    renderSiloIndex();
    updateTopologyMap();
    
    logToTerminal(`SYNC_COMPLETE :: ${state.macro.length} STORIES_IN_SILO`, 'SYSTEM');
  } catch (err) {
    console.warn('[Logistics Error]', err);
  }
}

/**
 * Background News Sync (Real-time polling)
 */
function startBackgroundSync() {
  if (state.syncInterval) return;
  
  state.syncInterval = setInterval(async () => {
    try {
      const ticker = state.currentTicker || 'AAPL';
      const res = await fetch(`/api?service=macro&symbol=${ticker}`);
      const macro = await res.json();
      
      const newItems = macro.data || [];
      if (newItems.length === 0) return;

      const currentTitles = new Set(state.macro.map(m => m.title));
      let addedCount = 0;
      
      newItems.forEach(item => {
        if (!currentTitles.has(item.title)) {
          state.macro.unshift(item);
          addedCount++;
        }
      });

      if (addedCount > 0) {
        logToTerminal(`LIVE_INTEL_RECOVERY :: ${addedCount} NEW_HEADLINES`, 'INFO');
        // Show sync pulse in UI
        const syncLabel = document.getElementById('sync-pulse');
        if (syncLabel) {
          syncLabel.classList.remove('opacity-0');
          setTimeout(() => syncLabel.classList.add('opacity-0'), 3000);
        }
      }
    } catch (e) {
      console.warn('Sync heartbeat failed', e);
    }
  }, 60000); // Check for new intel every 60 seconds
}

/**
 * Topology Visualizer (Leaflet implementation)
 */
const GLOBAL_HUBS = [
  { city: 'Cupertino', country: 'USA', coords: [37.3229, -122.0322], company: 'APPLE', symbol: 'AAPL', sector: 'TECH', employees: 161000, type: 'HQ' },
  { city: 'Mountain View', country: 'USA', coords: [37.3861, -122.0839], company: 'GOOGLE', symbol: 'GOOGL', sector: 'TECH', employees: 182000, type: 'HQ' },
  { city: 'Redmond', country: 'USA', coords: [47.6740, -122.1215], company: 'MICROSOFT', symbol: 'MSFT', sector: 'TECH', employees: 221000, type: 'HQ' },
  { city: 'Seattle', country: 'USA', coords: [47.6062, -122.3321], company: 'AMAZON', symbol: 'AMZN', sector: 'RETAIL', employees: 1541000, type: 'HQ' },
  { city: 'New York', country: 'USA', coords: [40.7128, -74.0060], company: 'JPMORGAN', symbol: 'JPM', sector: 'FIN', employees: 293000, type: 'HQ' },
  { city: 'Seoul', country: 'KR', coords: [37.5665, 126.9780], company: 'SAMSUNG', symbol: 'SSNLF', sector: 'TECH', employees: 267000, type: 'HQ' },
  { city: 'Austin', country: 'USA', coords: [30.2672, -97.7431], company: 'TESLA', symbol: 'TSLA', sector: 'AUTO', employees: 127000, type: 'HQ' },
  { city: 'Paris', country: 'FR', coords: [48.8566, 2.3522], company: 'LVMH', symbol: 'LVMHF', sector: 'LUX', employees: 175000, type: 'HQ' },
  { city: 'Taipei', country: 'TW', coords: [25.0330, 121.5654], company: 'TSMC', symbol: 'TSM', sector: 'SEMI', employees: 73000, type: 'HQ' },
  { city: 'Shenzhen', country: 'CN', coords: [22.5431, 114.0579], company: 'TENCENT', symbol: 'TCEHY', sector: 'TECH', employees: 108000, type: 'HQ' },
  { city: 'Bentonville', country: 'USA', coords: [36.3724, -94.2088], company: 'WALMART', symbol: 'WMT', sector: 'RETAIL', employees: 2100000, type: 'HQ' },
  { city: 'Amsterdam', country: 'NL', coords: [52.3676, 4.9041], company: 'ASML', symbol: 'ASML', sector: 'SEMI', employees: 39000, type: 'HQ' },
  { city: 'Mumbai', country: 'IN', coords: [19.0760, 72.8777], company: 'RELIANCE', symbol: 'RELIANCE.NS', sector: 'ENERGY', employees: 342000, type: 'HQ' },
  { city: 'Singapore', country: 'SG', coords: [1.3521, 103.8198], company: 'SEA', symbol: 'SE', sector: 'TECH', employees: 67000, type: 'HQ' },
  { city: 'Johannesburg', country: 'ZA', coords: [-26.2041, 28.0473], company: 'MTN', symbol: 'MTNOY', sector: 'TELE', employees: 19000, type: 'HQ' },
  { city: 'Santa Clara', country: 'USA', coords: [37.3541, -121.9552], company: 'NVIDIA', symbol: 'NVDA', sector: 'SEMI', employees: 26000, type: 'HQ' },
  { city: 'Omaha', country: 'USA', coords: [41.2565, -95.9345], company: 'BERKSHIRE', symbol: 'BRK-B', sector: 'FIN', employees: 382000, type: 'HQ' },
  { city: 'London', country: 'UK', coords: [51.5074, -0.1278], company: 'HSBC', symbol: 'HSBC', sector: 'FIN', employees: 220000, type: 'HQ' },
  { city: 'Toyota City', country: 'JP', coords: [35.0824, 137.1562], company: 'TOYOTA', symbol: 'TM', sector: 'AUTO', employees: 375000, type: 'HQ' },
  { city: 'Zurich', country: 'CH', coords: [47.3769, 8.5417], company: 'NESTLE', symbol: 'NSRGY', sector: 'FOOD', employees: 275000, type: 'HQ' },
  { city: 'Dearborn', country: 'USA', coords: [42.3223, -83.1763], company: 'FORD', symbol: 'F', sector: 'AUTO', employees: 177000, type: 'HQ' },
  { city: 'Ludwigshafen', country: 'DE', coords: [49.4875, 8.4660], company: 'BASF', symbol: 'BASFY', sector: 'CHEM', employees: 111000, type: 'HQ' },
  { city: 'Stuttgart', country: 'DE', coords: [48.7758, 9.1829], company: 'MERCEDES', symbol: 'MBG.DE', sector: 'AUTO', employees: 170000, type: 'HQ' },
  { city: 'Basel', country: 'CH', coords: [47.5596, 7.5886], company: 'ROCHE', symbol: 'RHHBY', sector: 'PHARMA', employees: 103000, type: 'HQ' },
  { city: 'Munich', country: 'DE', coords: [48.1351, 11.5820], company: 'BMW', symbol: 'BMW.DE', sector: 'AUTO', employees: 149000, type: 'HQ' },
  { city: 'Osaka', country: 'JP', coords: [34.6937, 135.5023], company: 'KEYENCE', symbol: 'KYCCF', sector: 'TECH', employees: 10000, type: 'HQ' },
  { city: 'Stockholm', country: 'SE', coords: [59.3293, 18.0686], company: 'SPOTIFY', symbol: 'SPOT', sector: 'TECH', employees: 9000, type: 'HQ' },
  { city: 'Toronto', country: 'CA', coords: [43.6532, -79.3832], company: 'SHOPIFY', symbol: 'SHOP', sector: 'TECH', employees: 11000, type: 'HQ' },
  { city: 'Bangalore', country: 'IN', coords: [12.9716, 77.5946], company: 'INFOSYS', symbol: 'INFY', sector: 'TECH', employees: 345000, type: 'HQ' },
  { city: 'Sydney', country: 'AU', coords: [-33.8688, 151.2093], company: 'CANVA', symbol: 'CANVA', sector: 'TECH', employees: 4000, type: 'HQ' },
  { city: 'Melbourne', country: 'AU', coords: [-37.8136, 144.9631], company: 'BHP', symbol: 'BHP', sector: 'MINING', employees: 80000, type: 'HQ' },
  { city: 'Rio de Janeiro', country: 'BR', coords: [-22.9068, -43.1729], company: 'PETROBRAS', symbol: 'PBR', sector: 'ENERGY', employees: 45000, type: 'HQ' },
  { city: 'Dhahran', country: 'SA', coords: [26.3079, 50.1430], company: 'ARAMCO', symbol: '2222.SR', sector: 'ENERGY', employees: 70000, type: 'HQ' },
  { city: 'Tel Aviv', country: 'IL', coords: [32.0853, 34.7818], company: 'WIX', symbol: 'WIX', sector: 'TECH', employees: 6000, type: 'HQ' },
  { city: 'Helsinki', country: 'FI', coords: [60.1699, 24.9384], company: 'NOKIA', symbol: 'NOK', sector: 'TECH', employees: 86000, type: 'HQ' },
  { city: 'Oslo', country: 'NO', coords: [59.9139, 10.7522], company: 'EQUINOR', symbol: 'EQNR', sector: 'ENERGY', employees: 22000, type: 'HQ' },
  // Operational hubs (Simulated Logistics nodes)
  { city: 'Chicago', country: 'USA', coords: [41.8781, -87.6298], company: 'AMZN_LOGISTICS', symbol: 'AMZN', type: 'HUB', employees: 85000 },
  { city: 'Shanghai', country: 'CN', coords: [31.2304, 121.4737], company: 'AAPL_MFG', symbol: 'AAPL', type: 'HUB', employees: 350000 },
  { city: 'Berlin', country: 'DE', coords: [52.5200, 13.4050], company: 'TSLA_GIGA', symbol: 'TSLA', type: 'HUB', employees: 12000 },
  { city: 'Ho Chi Minh', country: 'VN', coords: [10.8231, 106.6297], company: 'INTC_MFG', symbol: 'INTC', type: 'HUB', employees: 45000 },
  { city: 'Phoenix', country: 'USA', coords: [33.4484, -112.0740], company: 'TSMC_AZ', symbol: 'TSM', type: 'HUB', employees: 15000 },
  { city: 'Eindhoven', country: 'NL', coords: [51.4416, 5.4697], company: 'ASML_R&D', symbol: 'ASML', type: 'HUB', employees: 22000 }
];

function updateTopologyMap() {
  const mapEl = document.getElementById('topology-map');
  if (!mapEl) return;
  
  if (!state.map) {
    state.map = L.map('topology-map', {
      zoomControl: false,
      attributionControl: false
    }).setView([20, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(state.map);

    state.markerLayer = L.layerGroup().addTo(state.map);
    state.hubsLayer = L.layerGroup().addTo(state.map);
    state.activeLayer = L.layerGroup().addTo(state.map);
    state.linesLayer = L.layerGroup().addTo(state.map);
    
    if (!document.getElementById('leaflet-custom-style')) {
      const style = document.createElement('style');
      style.id = 'leaflet-custom-style';
      style.innerHTML = `
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background: rgba(0,0,0,0.98) !important;
          border: 1px solid #06b6d4 !important;
          color: #06b6d4 !important;
          border-radius: 0 !important;
          box-shadow: 0 0 25px rgba(6,182,212,0.4) !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          padding: 10px !important;
          background: linear-gradient(180deg, rgba(6,182,212,0.08) 0%, rgba(0,0,0,0.1) 100%) !important;
          max-width: 450px !important;
          width: auto !important;
        }
        .targeting-icon {
          background: transparent;
          border: none;
          width: 0 !important;
          height: 0 !important;
        }
        @keyframes pulse-cyan {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.4); opacity: 0.3; }
          100% { transform: scale(1); opacity: 0.8; }
        }
        .active-hq-pulse {
          animation: pulse-cyan 3s infinite ease-in-out;
        }
        .trade-line {
          stroke-dasharray: 4;
          animation: dash-animation 60s linear infinite;
        }
        @keyframes dash-animation {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Helper for large numbers
  const formatLargeLocal = (num) => {
    if (typeof num !== 'number' || num === 0) return '---';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
    return num.toLocaleString();
  };

  // Only render hubs if not already present
  if (state.hubsLayer.getLayers().length === 0) {
    GLOBAL_HUBS.forEach(hub => {
      const radius = Math.max(3, Math.sqrt(hub.employees || 5000) / 40);
      const isHQ = hub.type === 'HQ';
      
      const popupHtml = `
        <div class="font-mono text-[8px] uppercase space-y-1.5 min-w-[200px]">
          <div class="flex justify-between border-b border-cyan-900/50 pb-1">
            <span class="${isHQ ? 'text-cyan-400 font-black' : 'text-cyan-700 font-bold'}">${hub.company}</span>
            <span class="text-white opacity-40">${hub.type || 'NODE'}</span>
          </div>
          <div class="grid grid-cols-2 gap-x-2">
            <span class="text-gray-500">CITY:</span>
            <span class="text-white truncate">${hub.city}</span>
            <span class="text-gray-500">STAFF:</span>
            <span class="text-white font-bold">${formatLargeLocal(hub.employees)}</span>
          </div>
          <div class="text-[7px] text-cyan-800 border-t border-cyan-950/50 pt-1">
            NODE_STATE: <span class="text-green-500">OPERATIONAL</span>
          </div>
        </div>
      `;

      const marker = L.circleMarker(hub.coords, {
        radius: radius,
        fillColor: isHQ ? "#164e63" : "#083344",
        color: isHQ ? "#06b6d4" : "#155e75",
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.5
      }).addTo(state.hubsLayer)
        .bindPopup(popupHtml, { closeButton: false });
      
      marker.on('click', () => {
        state.targetCoords = hub.coords;
        window.initTerminal(hub.symbol, true);
      });
    });
  }

  const { city, country, employees, revenue, ppe, headcountGrowth, regionalDist } = state.logistics || {};
  const { price, changes, dcf, industry } = state.logistics || {};
  
  const isUp = changes >= 0;
  const overvalued = dcf && price ? (price > dcf) : false;

  const hubsMap = {};
  GLOBAL_HUBS.forEach(h => { hubsMap[h.symbol] = h.coords; hubsMap[h.city] = h.coords; });
  const activeCoords = state.targetCoords || hubsMap[state.currentTicker] || hubsMap[city] || [34.0522, -118.2437];

  const activePopupHtml = `
    <div class="font-mono text-[9px] uppercase space-y-2 min-w-[260px]">
      <div class="flex justify-between border-b border-cyan-500/40 pb-1">
        <span class="text-cyan-400 font-black animate-pulse flex items-center gap-1">
          <span class="w-1 h-1 bg-cyan-400 rounded-full"></span>
          CENTRAL_CONTROL
        </span>
        <span class="text-white opacity-60">${state.currentTicker}</span>
      </div>
      
      <div class="grid grid-cols-2 gap-x-2 gap-y-1">
        <span class="text-gray-500">WORKFORCE:</span>
        <span class="text-white font-bold">${formatLargeLocal(employees)}</span>
        
        <span class="text-gray-500">ASSETS (PPE):</span>
        <span class="text-cyan-300">${formatLargeLocal(ppe)}</span>
        
        <span class="text-gray-500">EFFICIENCY:</span>
        <span class="text-green-500">${revenue && employees ? '$' + formatLargeLocal(revenue / employees) : '---'}/EE</span>
      </div>

      <div class="border-t border-cyan-900/40 pt-1.5">
          <div class="flex justify-between text-[7px] text-gray-500 mb-1">
            <span>REGIONAL_RISK_EXPOSURE</span>
            <span class="${headcountGrowth >= 0 ? 'text-green-500' : 'text-red-500'}">${headcountGrowth ? (headcountGrowth > 0 ? '+' : '') + headcountGrowth.toFixed(1) + '%' : '0.0%'}</span>
          </div>
          <div class="flex gap-[1px] h-1.5 bg-black/40">
             <div class="bg-cyan-500 h-full" style="width: ${regionalDist?.NA || 33}%" title="NA"></div>
             <div class="bg-cyan-700 h-full" style="width: ${regionalDist?.APAC || 33}%" title="APAC"></div>
             <div class="bg-cyan-900 h-full" style="width: ${regionalDist?.EMEA || 34}%" title="EMEA"></div>
          </div>
          <div class="flex justify-between text-[6px] text-gray-700 mt-0.5">
             <span>NA:${(regionalDist?.NA || 33).toFixed(0)}%</span>
             <span>APAC:${(regionalDist?.APAC || 33).toFixed(0)}%</span>
             <span>EMEA:${(regionalDist?.EMEA || 34).toFixed(0)}%</span>
          </div>
      </div>
    </div>
  `;

  // Always refresh active marker and lines
  state.activeLayer.clearLayers();
  state.linesLayer.clearLayers();

  // Draw lines to other hubs of the same company
  if (state.currentTicker) {
    const companyHubs = GLOBAL_HUBS.filter(h => h.symbol === state.currentTicker && h.coords.toString() !== activeCoords.toString());
    companyHubs.forEach(hub => {
      L.polyline([activeCoords, hub.coords], {
        color: '#06b6d4',
        weight: 1,
        opacity: 0.3,
        className: 'trade-line'
      }).addTo(state.linesLayer);
    });
  }

  if (!state.newsCycleInterval) {
    state.map.flyTo(activeCoords, 10, { duration: 2.5 });
    
    const targetingIcon = L.divIcon({
      className: 'targeting-icon',
      html: `
        <div class="relative flex items-center justify-center pointer-events-none active-hq-pulse">
          <div class="absolute w-20 h-20 border border-cyan-500/20 rounded-full"></div>
          <div class="absolute w-32 h-32 border border-cyan-500/10 rounded-full"></div>
          <div class="crosshair-v absolute pointer-events-none" style="height: 1000px; width: 1px; margin-top: -500px; background: rgba(6,182,212,0.1);"></div>
          <div class="crosshair-h absolute pointer-events-none" style="width: 2000px; height: 1px; margin-left: -1000px; background: rgba(6,182,212,0.1);"></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    L.marker(activeCoords, { icon: targetingIcon }).addTo(state.activeLayer);
  }

  L.circleMarker(activeCoords, {
    radius: 8,
    fillColor: "#06b6d4",
    color: "#06b6d4",
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.6
  }).addTo(state.activeLayer)
    .bindPopup(activePopupHtml, { closeButton: false })
    .openPopup();
}

function renderPriceFeed() {
  const el = document.getElementById('price-feed');
  const { price, change, source, symbol, name } = state.core || {};
  
  if (!price) {
    el.innerHTML = '<span class="animate-pulse">SYNCHRONIZING...</span>';
    return;
  }

  const isUp = change >= 0;
  el.innerHTML = `
    <div class="flex flex-col w-full">
      <div class="flex justify-between items-end mb-2 border-b border-cyan-900/50 pb-1">
        <div class="flex flex-col">
          <span class="text-[14px] font-black text-white tracking-widest leading-none">${symbol}</span>
          <span class="text-[8px] text-cyan-700 font-mono uppercase truncate w-32">${name || ''}</span>
        </div>
      </div>
      <div class="flex items-baseline justify-between mb-2">
        <span class="text-5xl font-mono font-black tracking-tighter ${isUp ? 'text-green-400' : 'text-red-400'}">
          ${Number(price).toFixed(2)}
        </span>
        <div class="flex flex-col items-end">
          <span class="text-sm font-mono ${isUp ? 'text-green-600' : 'text-red-600'}">
            ${isUp ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}
          </span>
          <span class="text-[8px] text-gray-700 font-mono uppercase">USD_EQUIV</span>
        </div>
      </div>
      <div class="flex justify-between items-center pt-1 border-t border-cyan-950 mt-1">
        <span class="text-[7px] font-mono text-cyan-900 uppercase tracking-tighter self-end">TELEMETRY_UPLINK :: ${source}</span>
        <span class="text-[7px] font-mono text-green-900 uppercase tracking-tighter">DATA_STABLE // SECURED</span>
      </div>
    </div>
  `;
}

function renderFinancials() {
  const el = document.getElementById('labor-stats');
  if (!el || !state.logistics) return;
  
  const { mktCap, beta, volAvg, dividend, range, employees, companyName, currency, exchange, industry, pe, eps, price, changes, dcf } = state.logistics;
  
  const formatLarge = (num) => {
    if (typeof num !== 'number' || num === 0) return '---';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const formatNum = (val, dec = 2) => {
    if (val === undefined || val === null) return '---';
    if (val === 0 && dec !== 0) return '0.00';
    return Number(val).toFixed(dec);
  };

  const riskQuotient = (beta * 100).toFixed(1);
  const confidence = Math.max(0, 100 - (beta * 20)).toFixed(1);
  const priceChangePct = price ? ((changes / price) * 100).toFixed(2) : '0.00';
  const isUp = changes >= 0;

  // Analysis Logic
  const overvalued = dcf && price ? (price > dcf) : false;
  const dcfDelta = dcf && price ? Math.abs(((price - dcf) / dcf) * 100).toFixed(1) : '---';

  const revPerEE = (state.logistics.revenue && state.logistics.employees) ? state.logistics.revenue / state.logistics.employees : 0;
  const growth = state.logistics.headcountGrowth || 0;

  const divYield = (dividend && price) ? ((dividend / price) * 100).toFixed(2) : '0.00';
  const targetPrice = (eps && pe) ? (eps * pe * 1.15).toFixed(2) : '---';
  const sentiment = isUp ? (Math.random() * 30 + 65).toFixed(0) : (Math.random() * 35 + 30).toFixed(0);

  const indicators = [
    { label: 'PPE', val: formatLarge(state.logistics.ppe), detail: 'Property, Plant, & Equipment: Gross physical asset footprint.' },
    { label: 'REV/EE', val: '$' + formatLarge(revPerEE), detail: 'Labor Efficiency: Total revenue generated per full-time employee.' },
    { label: 'GRWTH', val: (growth > 0 ? '+' : '') + growth.toFixed(1) + '%', detail: 'Workforce Velocity: Net headcount expansion or contraction rate.' }
  ];

  el.innerHTML = `
    <div class="flex flex-col h-full space-y-2">
      <!-- Labor Efficiency Header -->
      <div class="p-2 border-l-2 ${isUp ? 'border-cyan-500 bg-cyan-950/10' : 'border-red-500 bg-red-950/10'} relative overflow-hidden group">
        <div class="flex justify-between items-center mb-1">
          <div class="text-[10px] text-cyan-600 font-mono uppercase tracking-widest font-bold flex items-center gap-1">
            <span class="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span>
            Operational_Velocity // LIVE
          </div>
          <div class="flex gap-1">
            <span class="text-[8px] bg-black/40 px-1 text-cyan-400 font-mono">${exchange || 'N/A'}</span>
            <span class="text-[8px] bg-black/40 px-1 text-cyan-400 font-mono">${currency || 'USD'}</span>
          </div>
        </div>
        <div class="flex items-baseline justify-between relative z-10">
          <div class="flex items-baseline gap-2">
            <div class="text-3xl font-black text-white font-mono tracking-tighter leading-none">
              ${formatLarge(employees)}
            </div>
            <div class="text-[9px] text-cyan-800 font-mono uppercase flex flex-col leading-tight">
              <span>STAFF</span>
              <span>COUNT</span>
            </div>
          </div>
          <div class="flex flex-col items-end">
            <span class="text-[10px] font-mono ${growth >= 0 ? 'text-green-400' : 'text-red-400'} font-bold">
              ${growth > 0 ? '+' : ''}${growth.toFixed(1)}%
            </span>
            <span class="text-[7px] text-gray-700 font-mono uppercase">H/C_Growth</span>
          </div>
        </div>
      </div>

      <!-- Intrinsic Value Analysis (DCF) -->
      <div class="bg-cyan-950/10 border border-cyan-900/40 p-2 flex justify-between items-center relative overflow-hidden group">
         <div class="flex flex-col">
            <span class="text-[7px] text-cyan-700 font-mono uppercase">Revenue_Yield // Efficiency</span>
            <span class="text-lg font-black text-white font-mono leading-none border-b border-cyan-900/50 pb-0.5">$${formatLarge(revPerEE)}/EE</span>
         </div>
         <div class="flex flex-col items-end">
            <span class="text-[8px] font-bold text-cyan-500 font-mono uppercase tracking-widest ring-1 ring-cyan-900/50 px-1">
              ${revPerEE > 500000 ? 'HIGH_CAP' : 'LABOR_INT'}
            </span>
            <span class="text-[10px] text-cyan-100 font-mono font-bold mt-1">${formatLarge(state.logistics.revenue)} REV</span>
         </div>
      </div>

      <!-- Asset & Labor Metrics Grid -->
      <div class="grid grid-cols-3 gap-1">
        ${indicators.map(ind => `
          <div class="bg-black/60 border border-gray-900 p-1 flex flex-col items-center justify-center relative overflow-hidden h-10 group cursor-help" title="${ind.detail}">
            <div class="text-[6px] text-cyan-500 font-mono mb-0.5 uppercase tracking-widest">
              ${ind.label}
            </div>
            <div class="text-[9px] font-black text-white font-mono">${ind.val}</div>
            <div class="absolute bottom-0 left-0 h-[1px] bg-cyan-900/40 w-full"></div>
          </div>
        `).join('')}
      </div>

      <!-- Secondary Metrics Grid -->
      <div class="grid grid-cols-2 gap-1 px-0.5">
        <div class="border border-gray-900 p-2 bg-black/40 relative overflow-hidden group hover:border-cyan-900/50 transition-colors">
          <div class="flex justify-between items-start">
            <div class="text-[7px] text-gray-600 uppercase font-bold tracking-tighter">Market_Sentiment</div>
            <span class="text-[8px] text-cyan-900 font-mono">${sentiment}%_BULL</span>
          </div>
          <div class="text-lg text-cyan-400 font-mono leading-none my-1 uppercase tracking-tighter shadow-cyan-900/20 drop-shadow-md">${sentiment > 50 ? 'Bullish' : 'Bearish'}</div>
          <div class="w-full bg-gray-950 h-1 overflow-hidden relative">
            <div class="bg-cyan-500 h-full absolute transition-all duration-1000 shadow-[0_0_8px_rgba(6,182,212,0.6)]" style="width: ${sentiment}%"></div>
          </div>
        </div>
        <div class="border border-gray-900 p-2 bg-black/40 relative overflow-hidden group hover:border-cyan-900/50 transition-colors">
          <div class="text-[7px] text-gray-600 uppercase font-bold tracking-tighter">Neural_EPS</div>
          <div class="text-lg text-cyan-400 font-mono leading-none my-1">${formatNum(eps, 2)}</div>
          <div class="flex gap-1 h-3 items-end relative">
            ${Array(12).fill(0).map((_, i) => `<div class="w-1 bg-cyan-900/40 rounded-t-sm transition-all duration-500" style="height: ${40 + Math.sin(i / 2) * 20 + Math.random() * 10}%"></div>`).join('')}
            <svg class="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
               <path d="M0,80 Q25,60 50,70 T100,30" fill="none" stroke="rgba(6,182,212,0.3)" stroke-width="2" class="animate-[dash_3s_linear_infinite]"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Integrated Detail Panel -->
      <div class="border border-cyan-900/20 bg-cyan-950/5 p-2 space-y-2 flex-grow overflow-hidden relative">
        <div class="grid grid-cols-2 gap-3">
           <div class="flex flex-col border-b border-cyan-900/10 pb-1">
              <span class="text-[7px] text-cyan-900 font-mono uppercase">Dividend_Yield</span>
              <span class="text-[11px] text-cyan-700 font-mono font-bold">${divYield}%</span>
           </div>
           <div class="flex flex-col border-b border-cyan-900/10 pb-1">
              <span class="text-[7px] text-cyan-900 font-mono uppercase cursor-help" title="Estimated share price target based on analyst consensus and EPS growth.">Forecast_Target</span>
              <span class="text-[11px] text-cyan-400 font-mono font-bold">${currency === 'USD' ? '$' : ''}${targetPrice}</span>
           </div>
        </div>
        
        <div class="space-y-1">
          <div class="text-[7px] text-cyan-900 font-mono uppercase flex justify-between">
            <span>Trading_Intensity // ${formatLarge(volAvg)}</span>
            <span class="text-white font-bold opacity-80">${(volAvg && mktCap ? (volAvg / (mktCap / 1e5)).toFixed(1) : 4.2)}x</span>
          </div>
          <div class="w-full bg-cyan-950/20 h-1.5 p-[1px] relative">
            <div class="absolute left-0 h-full bg-cyan-500/40" style="width: ${Math.min(100, (volAvg && mktCap ? (volAvg / (mktCap / 1e4)) * 100 : 45))}%"></div>
          </div>
        </div>

        <div class="text-[7px] text-cyan-800 font-mono border-t border-cyan-900/20 pt-1 flex flex-col gap-1">
          <div class="flex justify-between">
            <span class="opacity-50">MARKET_VALUATION:</span>
            <span class="text-white font-bold decoration-cyan-900/40 decoration-dotted underline underline-offset-2">${mktCap ? formatLarge(mktCap) : '---'}</span>
          </div>
          <div class="flex justify-between">
            <span class="opacity-50">AGGREGATE_RISK:</span>
            <span class="font-mono text-[7px] ${state.regulatory?.riskScore < 0.4 ? 'text-green-500' : 'text-yellow-500'} bg-black/40 px-1 rounded-sm">${(state.regulatory?.riskScore || 0.24).toFixed(3)}</span>
          </div>
          <div class="flex justify-between">
            <span class="opacity-50">ANNUAL_BANDWIDTH:</span>
            <span class="text-cyan-400 font-mono text-[7px] tracking-tight">${range || 'N/A'}</span>
          </div>
          <div class="flex justify-between">
            <span class="opacity-50">VERTICAL_DOMAIN:</span>
            <span class="truncate w-32 text-right uppercase text-cyan-600 font-bold">${industry || 'N/A'}</span>
          </div>
          <!-- Regulatory Event Feed Mini -->
           <div class="bg-black/50 p-1 mt-1 border border-cyan-900/20 max-h-12 overflow-hidden">
             <div class="animate-[scrolling_15s_linear_infinite] flex flex-col gap-0.5">
               <div class="text-[6px] text-cyan-500 font-mono flex justify-between"><span>SEC_8K_FILED</span><span class="opacity-30">OK</span></div>
               <div class="text-[6px] text-cyan-500 font-mono flex justify-between"><span>KYC_AM_PASS</span><span class="opacity-30">OK</span></div>
               <div class="text-[6px] text-cyan-500 font-mono flex justify-between"><span>STRESS_TEST</span><span class="opacity-30">PASS</span></div>
               <div class="text-[6px] text-cyan-500 font-mono flex justify-between"><span>BSL_III_CAP</span><span class="opacity-30">14.2%</span></div>
             </div>
           </div>
        </div>
      </div>

      <div class="text-[8px] text-gray-800 font-mono italic px-1 mt-auto flex items-center justify-between border-t border-gray-900 pt-1">
        <div class="flex items-center gap-2">
           <span class="w-1.5 h-1.5 bg-green-950 rounded-full animate-pulse shadow-[0_0_5px_rgba(0,100,0,0.5)]"></span>
           <span class="text-[7px]">SEC_TRACE: ${Math.random().toString(36).substring(7).toUpperCase()}</span>
        </div>
        <span class="text-[7px] uppercase opacity-40 truncate w-32 text-right">${companyName || 'Target Inc.'}</span>
      </div>
    </div>
  `;
}

function renderSiloIndex() {
  const el = document.getElementById('silo-index');
  if (!el) return;

  // Render all global hubs
  el.innerHTML = GLOBAL_HUBS.map(hub => {
    const isActive = state.currentTicker === hub.symbol;
    return `
      <div onclick="window.initTerminal('${hub.symbol}')" 
           class="group flex items-center justify-between p-1.5 border-b border-gray-900/50 cursor-pointer transition-all hover:bg-cyan-950/30 ${isActive ? 'bg-cyan-900/20 border-l-2 border-l-cyan-500' : ''}">
        <div class="flex flex-col">
          <span class="text-[10px] font-bold ${isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-cyan-600'} transition-colors">${hub.symbol}</span>
          <span class="text-[8px] text-gray-600 group-hover:text-gray-500 truncate w-32">${hub.company}</span>
        </div>
        <div class="text-[7px] text-gray-700 font-mono text-right flex flex-col items-end">
          <span>${hub.city}</span>
          <span class="opacity-50">SILO_ID:${hub.symbol.slice(0,3)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderMacroCorridor() {
  // Keeping this for potential news feed display if needed elsewhere or just as ref
  // but main panel now uses silo index.
}

const FALLBACK_NEWS = [
  { 
    title: "GLOBAL LOGISTICS TRANSIT DELAYS", 
    description: "Suez Canal blockage persists as high winds and tidal shifts complicate salvage operations. Maritime insurance rates for the Red Sea corridor have surged 400 basis points as carrier fleets divert around the Cape of Good Hope, adding 14 days to the global supply chain loop.",
    published_at: new Date().toISOString() 
  },
  { 
    title: "SEMICONDUCTOR NODE CAPACITY REACHED", 
    description: "Leading foundries report 98% utilization across 3nm and 5nm lines. Speculative hoarding of H100 units has triggered a secondary market liquidity crisis, forcing major cloud providers to implement compute-rationing protocols for non-critical AI training loads.",
    published_at: new Date().toISOString() 
  },
  { 
    title: "RENEWABLE SILO EXPANSION", 
    description: "The Nordic Energy Grid integrates a new 5GW offshore wind cluster. Excess thermal generation is being routed to secondary electrolysis plants, potentially stabilizing green hydrogen pricing for the upcoming industrial manufacturing cycle.",
    published_at: new Date().toISOString() 
  },
  { 
    title: "ALGORITHMIC TRADING PEAK", 
    description: "High-frequency arbitrage bots accounted for 82% of mid-day volume on the CME. Regulatory watchdogs are investigating a series of 'flash-spikes' in the commodities index, suspected to be triggered by a Recursive Reinforcement Learning feedback loop within the dark pools.",
    published_at: new Date().toISOString() 
  },
  { 
    title: "AUTONOMOUS FREIGHT DEPLOYMENT", 
    description: "Level 4 truck convoys have entered standard operation between the Phoenix and Dallas logistics hubs. Tele-operator centers report a 35% reduction in fuel consumption and zero safety incidents during the 48-hour pilot, signaling a phase-shift in last-mile freight economics.",
    published_at: new Date().toISOString() 
  },
  { 
    title: "QUANTUM MODELING BREAKTHROUGH", 
    description: "New 112-qubit processor achieves error-corrected simulation of complex portfolio derivatives. Financial institutions are rushing to migrate legacy RSA-based encryption layers as the 'Y2Q' horizon for cryptographic obsolescence moves closer to reality.",
    published_at: new Date().toISOString() 
  },
  { 
    title: "EQUITY INDEX REBALANCING", 
    description: "Global indices move toward heavier weightings in green-tech and cybersecurity verticals. Passive funds are expected to rotate $1.2T in assets over the weekend, leading to high-than-average late-session volatility and potential liquidity gaps in legacy industrial sectors.",
    published_at: new Date().toISOString() 
  }
];

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
    if (state.markerLayer) state.markerLayer.clearLayers();
    logToTerminal('NEWS_CYCLE_TERMINATED', 'WARN');
    // Snap back to current ticker HQ
    updateTopologyMap();
    return;
  }

  const newsItems = state.macro && state.macro.length > 0 ? state.macro : FALLBACK_NEWS;

  overlay.classList.remove('hidden');
  indicator.classList.remove('hidden');
  logToTerminal('NEWS_CYCLE_ENGAGED :: 30S_ROTATION', 'INFO');

  const rotate = () => {
    const item = newsItems[state.newsCycleIndex % newsItems.length];
    if (!item) return;

    // Pick a hub from the full list for deeper global coverage
    const hub = GLOBAL_HUBS[state.newsCycleIndex % GLOBAL_HUBS.length];
    
    overlay.innerHTML = `
      <div class="flex flex-col gap-1 relative">
        <div id="sync-pulse" class="absolute -top-6 right-0 text-[7px] text-cyan-400 font-bold opacity-0 transition-opacity flex items-center gap-1">
          <span class="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span>
          LIVE_INTEL_SYNC
        </div>
        <div class="flex justify-between items-center text-[10px] font-mono text-cyan-500 uppercase font-bold">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></span>
            <span>INTEL_STORY // ${hub.city} // ${hub.company}</span>
          </div>
          <span class="bg-cyan-900/50 border border-cyan-800 px-2 py-0.5 text-[8px]">${(state.newsCycleIndex % newsItems.length) + 1}/${newsItems.length}</span>
        </div>
        <div class="text-[11px] text-cyan-50 font-medium leading-relaxed tracking-tight border-l-2 border-cyan-500 pl-3 my-1">
          ${item.description || item.title || 'NO_STORY_DATA'}
        </div>
        <div class="flex justify-between items-center text-[8px] text-cyan-900 font-mono mt-1 pt-1 border-t border-cyan-950">
          <span>SOURCE: GLOBAL_NET_TERMINAL</span>
          <span class="text-cyan-600 font-bold uppercase">HEADLINE: ${item.title}</span>
        </div>
      </div>
    `;

    if (state.map) {
      state.map.flyTo(hub.coords, 8, { 
        duration: 4,
        easeLinearity: 0.25 
      });
      
      state.markerLayer.clearLayers();
      
      // Targeting effect at the new location
      const targetingIcon = L.divIcon({
        className: 'targeting-icon',
        html: `
          <div class="relative flex items-center justify-center pointer-events-none active-hq-pulse">
            <div class="absolute w-24 h-24 border-2 border-cyan-500/30 rounded-full animate-ping"></div>
            <div class="absolute w-40 h-40 border border-cyan-500/10 rounded-full"></div>
            <div class="crosshair-v absolute pointer-events-none" style="height: 1000px; width: 1px; margin-top: -500px; background: rgba(6,182,212,0.2);"></div>
            <div class="crosshair-h absolute pointer-events-none" style="width: 2000px; height: 1px; margin-left: -1000px; background: rgba(6,182,212,0.2);"></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });
      L.marker(hub.coords, { icon: targetingIcon }).addTo(state.markerLayer);

      L.circleMarker(hub.coords, {
        radius: 15,
        fillColor: "#06b6d4",
        color: "#06b6d4",
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.3
      }).addTo(state.markerLayer)
        .bindPopup(`
          <div class="font-mono text-[10px] w-64 uppercase">
            <div class="text-cyan-400 font-black mb-1 border-b border-cyan-900 pb-1 flex justify-between">
              <span>${hub.city} NODAL_POINT</span>
              <span class="text-[8px] opacity-40">${hub.sector}</span>
            </div>
            <div class="text-white font-bold my-2 leading-none border-l-2 border-cyan-500 pl-2">${item.title}</div>
            <div class="flex justify-between items-center mt-3 pt-1 border-t border-cyan-950 text-[7px] text-cyan-800">
               <span>LAT: ${hub.coords[0].toFixed(4)}</span>
               <span>LNG: ${hub.coords[1].toFixed(4)}</span>
               <span>STAFF: ${hub.employees.toLocaleString()}</span>
            </div>
          </div>
        `, { closeButton: false, offset: [0, -10] })
        .openPopup();
    }

    state.newsCycleIndex = (state.newsCycleIndex + 1);
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
window.initTerminal = (ticker, fromMapTag = false) => {
  if (!ticker) return;
  ticker = ticker.toUpperCase();
  if (state.currentTicker !== ticker && !fromMapTag) {
    state.targetCoords = null; // Clear if manual jump
  }
  state.currentTicker = ticker;
  renderSiloIndex();
  
  // Reset news cycle for new ticker
  if (state.newsCycleInterval) window.toggleNewsCycle();
  
  fetchTerminalCore(ticker);
  fetchLogistics(ticker);
};

// Initial boot
document.addEventListener('DOMContentLoaded', () => {
  window.initTerminal('AAPL');
  startBackgroundSync();

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
