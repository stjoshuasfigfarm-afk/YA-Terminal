
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
    state.macro = macro.data || [];
    state.regulatory = regulatory;
    
    renderLaborStats();
    renderSiloIndex();
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
const GLOBAL_HUBS = [
  { city: 'Cupertino', country: 'USA', coords: [37.3229, -122.0322], company: 'APPLE', symbol: 'AAPL' },
  { city: 'Mountain View', country: 'USA', coords: [37.3861, -122.0839], company: 'GOOGLE', symbol: 'GOOGL' },
  { city: 'Redmond', country: 'USA', coords: [47.6740, -122.1215], company: 'MICROSOFT', symbol: 'MSFT' },
  { city: 'Seattle', country: 'USA', coords: [47.6062, -122.3321], company: 'AMAZON', symbol: 'AMZN' },
  { city: 'New York', country: 'USA', coords: [40.7128, -74.0060], company: 'FINANCIAL_DISTRICT', symbol: 'SPY' },
  { city: 'San Francisco', country: 'USA', coords: [37.7749, -122.4194], company: 'SALESFORCE', symbol: 'CRM' },
  { city: 'Seoul', country: 'KR', coords: [37.5665, 126.9780], company: 'SAMSUNG', symbol: 'SSNLF' },
  { city: 'Austin', country: 'USA', coords: [30.2672, -97.7431], company: 'TESLA', symbol: 'TSLA' },
  { city: 'Palo Alto', country: 'USA', coords: [37.4419, -122.1430], company: 'META', symbol: 'META' },
  { city: 'London', country: 'UK', coords: [51.5074, -0.1278], company: 'HSBC', symbol: 'HSBC' },
  { city: 'Tokyo', country: 'JP', coords: [35.6762, 139.6503], company: 'SONY', symbol: 'SONY' },
  { city: 'Paris', country: 'FR', coords: [48.8566, 2.3522], company: 'LVMH', symbol: 'LVMHF' },
  { city: 'Taipei', country: 'TW', coords: [25.0330, 121.5654], company: 'TSMC', symbol: 'TSM' },
  { city: 'Shenzhen', country: 'CN', coords: [22.5431, 114.0579], company: 'TENCENT', symbol: 'TCEHY' },
  { city: 'Omaha', country: 'USA', coords: [41.2565, -95.9345], company: 'BERKSHIRE', symbol: 'BRK-B' },
  { city: 'Bentonville', country: 'USA', coords: [36.3724, -94.2088], company: 'WALMART', symbol: 'WMT' },
  // Added 20 more
  { city: 'Santa Clara', country: 'USA', coords: [37.3541, -121.9552], company: 'NVIDIA', symbol: 'NVDA' },
  { city: 'Armonk', country: 'USA', coords: [41.1265, -73.7140], company: 'IBM', symbol: 'IBM' },
  { city: 'Deerfield', country: 'USA', coords: [42.1712, -87.8445], company: 'CATERPILLAR', symbol: 'CAT' },
  { city: 'Wolfsburg', country: 'DE', coords: [52.4227, 10.7865], company: 'VOLKSWAGEN', symbol: 'VOW3.DE' },
  { city: 'Toyota City', country: 'JP', coords: [35.0824, 137.1562], company: 'TOYOTA', symbol: 'TM' },
  { city: 'Stuttgart', country: 'DE', coords: [48.7758, 9.1829], company: 'MERCEDES', symbol: 'MBG.DE' },
  { city: 'Espoo', country: 'FI', coords: [60.2055, 24.6559], company: 'NOKIA', symbol: 'NOK' },
  { city: 'Beaverton', country: 'USA', coords: [45.4865, -122.8037], company: 'NIKE', symbol: 'NKE' },
  { city: 'Portland', country: 'USA', coords: [45.5152, -122.6784], company: 'INTEL', symbol: 'INTC' },
  { city: 'Burbank', country: 'USA', coords: [34.1808, -118.3090], company: 'DISNEY', symbol: 'DIS' },
  { city: 'Atlanta', country: 'USA', coords: [33.7490, -84.3880], company: 'COCA-COLA', symbol: 'KO' },
  { city: 'Purchase', country: 'USA', coords: [41.0401, -73.7143], company: 'PEPSICO', symbol: 'PEP' },
  { city: 'Cincinnati', country: 'USA', coords: [39.1031, -84.5120], company: 'P&G', symbol: 'PG' },
  { city: 'San Jose', country: 'USA', coords: [37.3382, -121.8863], company: 'ADOBE', symbol: 'ADBE' },
  { city: 'Walldorf', country: 'DE', coords: [49.3008, 8.6441], company: 'SAP', symbol: 'SAP' },
  { city: 'Dublin', country: 'IE', coords: [53.3498, -6.2603], company: 'ACCENTURE', symbol: 'ACN' },
  { city: 'Basel', country: 'CH', coords: [47.5596, 7.5886], company: 'NOVARTIS', symbol: 'NVS' },
  { city: 'Round Rock', country: 'USA', coords: [30.5083, -97.6789], company: 'DELL', symbol: 'DELL' },
  { city: 'Minato', country: 'JP', coords: [35.6586, 139.7511], company: 'HONDA', symbol: 'HMC' },
  { city: 'Amsterdam', country: 'NL', coords: [52.3676, 4.9041], company: 'ASML', symbol: 'ASML' },
  { city: 'Hangzhou', country: 'CN', coords: [30.2741, 120.1551], company: 'ALIBABA', symbol: 'BABA' },
  { city: 'Mumbai', country: 'IN', coords: [19.0760, 72.8777], company: 'RELIANCE', symbol: 'RELIANCE.NS' },
  { city: 'Munich', country: 'DE', coords: [48.1351, 11.5820], company: 'BMW', symbol: 'BMW.DE' },
  { city: 'Zurich', country: 'CH', coords: [47.3769, 8.5417], company: 'UBS', symbol: 'UBS' },
  { city: 'Tel Aviv', country: 'IL', coords: [32.0853, 34.7818], company: 'CHECKPOINT', symbol: 'CHKP' },
  { city: 'Singapore', country: 'SG', coords: [1.3521, 103.8198], company: 'SEA', symbol: 'SE' },
  { city: 'Sydney', country: 'AU', coords: [-33.8688, 151.2093], company: 'ATLASSIAN', symbol: 'TEAM' },
  { city: 'Toronto', country: 'CA', coords: [43.6532, -79.3832], company: 'SHOPIFY', symbol: 'SHOP' },
  { city: 'Madrid', country: 'ES', coords: [40.4168, -3.7038], company: 'SANTANDER', symbol: 'SAN' },
  { city: 'Stockholm', country: 'SE', coords: [59.3293, 18.0686], company: 'SPOTIFY', symbol: 'SPOT' },
  { city: 'Bangalore', country: 'IN', coords: [12.9716, 77.5946], company: 'INFOSYS', symbol: 'INFY' },
  { city: 'Oslo', country: 'NO', coords: [59.9139, 10.7522], company: 'EQUINOR', symbol: 'EQNR' },
  { city: 'Milan', country: 'IT', coords: [45.4642, 9.1900], company: 'FERRARI', symbol: 'RACE' },
  { city: 'Beijing', country: 'CN', coords: [39.9042, 116.4074], company: 'BAIDU', symbol: 'BIDU' },
  { city: 'Melbourne', country: 'AU', coords: [-37.8136, 144.9631], company: 'BHP', symbol: 'BHP' },
  // Added 20 more
  { city: 'Vevey', country: 'CH', coords: [46.4674, 6.8436], company: 'NESTLE', symbol: 'NESN.SW' },
  { city: 'Basel', country: 'CH', coords: [47.5596, 7.5886], company: 'ROCHE', symbol: 'ROG.SW' },
  { city: 'New York', country: 'USA', coords: [40.7128, -74.0060], company: 'PFIZER', symbol: 'PFE' },
  { city: 'San Ramon', country: 'USA', coords: [37.7799, -121.9780], company: 'CHEVRON', symbol: 'CVX' },
  { city: 'London', country: 'UK', coords: [51.5074, -0.1278], company: 'SHELL', symbol: 'SHEL' },
  { city: 'London', country: 'UK', coords: [51.5074, -0.1278], company: 'BP', symbol: 'BP' },
  { city: 'Dhahran', country: 'SA', coords: [26.3079, 50.1430], company: 'ARAMCO', symbol: '2222.SR' },
  { city: 'Rio de Janeiro', country: 'BR', coords: [-22.9068, -43.1729], company: 'PETROBRAS', symbol: 'PBR' },
  { city: 'Rio de Janeiro', country: 'BR', coords: [-22.9068, -43.1729], company: 'VALE', symbol: 'VALE' },
  { city: 'Suwon', country: 'KR', coords: [37.2636, 127.0286], company: 'SAMSUNG_ELECTRO', symbol: '009150.KS' },
  { city: 'Osaka', country: 'JP', coords: [34.6937, 135.5022], company: 'SHARP', symbol: 'SHCAY' },
  { city: 'Kyoto', country: 'JP', coords: [34.9696, 135.7562], company: 'NINTENDO', symbol: 'NTDOY' },
  { city: 'Toulouse', country: 'FR', coords: [43.6047, 1.4442], company: 'AIRBUS', symbol: 'AIR.PA' },
  { city: 'Paris', country: 'FR', coords: [48.8566, 2.3522], company: 'SANOFI', symbol: 'SNY' },
  { city: 'Paris', country: 'FR', coords: [48.8566, 2.3522], company: 'TOTALENERGIES', symbol: 'TTE' },
  { city: 'Basel', country: 'CH', coords: [47.5596, 7.5886], company: 'SYNGENTA', symbol: 'SYT' },
  { city: 'London', country: 'UK', coords: [51.5074, -0.1278], company: 'RIO_TINTO', symbol: 'RIO' },
  { city: 'Baar', country: 'CH', coords: [47.1662, 8.5155], company: 'GLENCORE', symbol: 'GLNCY' },
  { city: 'Zurich', country: 'CH', coords: [47.3769, 8.5417], company: 'ABB', symbol: 'ABB' },
  { city: 'Copenhagen', country: 'DK', coords: [55.6761, 12.5683], company: 'MAERSK', symbol: 'AMKBY' }
];

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

    state.markerLayer = L.layerGroup().addTo(state.map);
    
    if (!document.getElementById('leaflet-custom-style')) {
      const style = document.createElement('style');
      style.id = 'leaflet-custom-style';
      style.innerHTML = `
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background: #000 !important;
          border: 1px solid #164e63 !important;
          color: #06b6d4 !important;
          border-radius: 0 !important;
        }
        .targeting-icon {
          background: transparent;
          border: none;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Clear previous markers
  state.markerLayer.clearLayers();

  // Add all global hubs
  GLOBAL_HUBS.forEach(hub => {
    const marker = L.circleMarker(hub.coords, {
      radius: 4,
      fillColor: "#164e63",
      color: "#164e63",
      weight: 1,
      opacity: 0.6,
      fillOpacity: 0.3
    }).addTo(state.markerLayer)
      .bindPopup(`<div class="font-mono text-[8px] uppercase">HUB: ${hub.city}<br>SEC: ${hub.company}<br><span class="text-cyan-400 mt-1 block">[CLICK_TO_ANALYZE]</span></div>`);
    
    marker.on('click', () => {
      state.targetCoords = hub.coords;
      window.initTerminal(hub.symbol);
      logToTerminal(`TERMINAL_HANDOFF :: ${hub.symbol}`, 'SYSTEM');
    });
  });

  if (!state.logistics || !state.logistics.hq || state.logistics.hq.city === 'N/A' || state.logistics.hq.city === 'KEY_MISSING') {
    return;
  }
  
  const { city, country } = state.logistics.hq;
  
  // Find coords for the current ticker HQ
  const hubs = {};
  GLOBAL_HUBS.forEach(h => { 
    hubs[h.city] = h.coords;
    hubs[h.symbol] = h.coords;
  });
  
  const coords = state.targetCoords || hubs[state.currentTicker] || hubs[city] || [34.0522, -118.2437]; // Default fallback
  
  logToTerminal(`LOCATING_HQ :: ${city}, ${country} [${coords[0].toFixed(2)}, ${coords[1].toFixed(2)}]`, 'SYSTEM');
  
  if (!state.newsCycleInterval) {
    state.map.flyTo(coords, 12, {
      duration: 3,
      easeLinearity: 0.25
    });

    // Targeting Animation Overlay
    const targetingIcon = L.divIcon({
      className: 'targeting-icon',
      html: `
        <div class="relative flex items-center justify-center pointer-events-none">
          <div class="targeting-sq absolute w-16 h-16 pointer-events-none"></div>
          <div class="crosshair-v absolute pointer-events-none" style="height: 1000px; width: 1px; margin-top: -500px;"></div>
          <div class="crosshair-h absolute pointer-events-none" style="width: 2000px; height: 1px; margin-left: -1000px;"></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });

    L.marker(coords, { icon: targetingIcon }).addTo(state.markerLayer);
  }

  // Add special marker for current HQ
  const currentMarker = L.circleMarker(coords, {
    radius: 10,
    fillColor: "#06b6d4",
    color: "#06b6d4",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.5
  }).addTo(state.markerLayer)
    .bindPopup(`<div class="font-mono text-[9px] uppercase">ACTIVE_HQ: ${city}<br>STATUS: COMPLIANT</div>`)
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
      
      state.markerLayer.clearLayers();
      
      L.circleMarker(hub.coords, {
        radius: 12,
        fillColor: "#06b6d4",
        color: "#06b6d4",
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.2
      }).addTo(state.markerLayer)
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
  if (state.currentTicker !== ticker) {
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
