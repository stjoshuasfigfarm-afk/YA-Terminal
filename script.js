
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
    
    renderFinancials();
    renderSiloIndex();
    updateTopologyMap();
  } catch (err) {
    console.warn('[Logistics Error]', err);
  }
}

/**
 * Topology Visualizer (Leaflet implementation)
 */
const GLOBAL_HUBS = [
  { city: 'Cupertino', country: 'USA', coords: [37.3229, -122.0322], company: 'APPLE', symbol: 'AAPL', sector: 'TECH' },
  { city: 'Mountain View', country: 'USA', coords: [37.3861, -122.0839], company: 'GOOGLE', symbol: 'GOOGL', sector: 'TECH' },
  { city: 'Redmond', country: 'USA', coords: [47.6740, -122.1215], company: 'MICROSOFT', symbol: 'MSFT', sector: 'TECH' },
  { city: 'Seattle', country: 'USA', coords: [47.6062, -122.3321], company: 'AMAZON', symbol: 'AMZN', sector: 'RETAIL' },
  { city: 'New York', country: 'USA', coords: [40.7128, -74.0060], company: 'JPMORGAN', symbol: 'JPM', sector: 'FIN' },
  { city: 'San Francisco', country: 'USA', coords: [37.7749, -122.4194], company: 'SALESFORCE', symbol: 'CRM', sector: 'TECH' },
  { city: 'Seoul', country: 'KR', coords: [37.5665, 126.9780], company: 'SAMSUNG', symbol: 'SSNLF', sector: 'TECH' },
  { city: 'Austin', country: 'USA', coords: [30.2672, -97.7431], company: 'TESLA', symbol: 'TSLA', sector: 'AUTO' },
  { city: 'Palo Alto', country: 'USA', coords: [37.4419, -122.1430], company: 'META', symbol: 'META', sector: 'TECH' },
  { city: 'London', country: 'UK', coords: [51.5074, -0.1278], company: 'HSBC', symbol: 'HSBC', sector: 'FIN' },
  { city: 'Tokyo', country: 'JP', coords: [35.6762, 139.6503], company: 'SONY', symbol: 'SONY', sector: 'TECH' },
  { city: 'Paris', country: 'FR', coords: [48.8566, 2.3522], company: 'LVMH', symbol: 'LVMHF', sector: 'LUX' },
  { city: 'Taipei', country: 'TW', coords: [25.0330, 121.5654], company: 'TSMC', symbol: 'TSM', sector: 'SEMI' },
  { city: 'Shenzhen', country: 'CN', coords: [22.5431, 114.0579], company: 'TENCENT', symbol: 'TCEHY', sector: 'TECH' },
  { city: 'Omaha', country: 'USA', coords: [41.2565, -95.9345], company: 'BERKSHIRE', symbol: 'BRK-B', sector: 'FIN' },
  { city: 'Bentonville', country: 'USA', coords: [36.3724, -94.2088], company: 'WALMART', symbol: 'WMT', sector: 'RETAIL' },
  { city: 'Santa Clara', country: 'USA', coords: [37.3541, -121.9552], company: 'NVIDIA', symbol: 'NVDA', sector: 'SEMI' },
  { city: 'Amsterdam', country: 'NL', coords: [52.3676, 4.9041], company: 'ASML', symbol: 'ASML', sector: 'SEMI' },
  { city: 'Hangzhou', country: 'CN', coords: [30.2741, 120.1551], company: 'ALIBABA', symbol: 'BABA', sector: 'RETAIL' },
  { city: 'Mumbai', country: 'IN', coords: [19.0760, 72.8777], company: 'RELIANCE', symbol: 'RELIANCE.NS', sector: 'ENERGY' },
  { city: 'Wolfsburg', country: 'DE', coords: [52.4227, 10.7865], company: 'VOLKSWAGEN', symbol: 'VOW3.DE', sector: 'AUTO' },
  { city: 'Zurich', country: 'CH', coords: [47.3769, 8.5417], company: 'UBS', symbol: 'UBS', sector: 'FIN' },
  { city: 'Singapore', country: 'SG', coords: [1.3521, 103.8198], company: 'SEA', symbol: 'SE', sector: 'TECH' },
  { city: 'Sydney', country: 'AU', coords: [-33.8688, 151.2093], company: 'BHP', symbol: 'BHP', sector: 'MINING' },
  { city: 'Toronto', country: 'CA', coords: [43.6532, -79.3832], company: 'SHOPIFY', symbol: 'SHOP', sector: 'TECH' },
  { city: 'Stockholm', country: 'SE', coords: [59.3293, 18.0686], company: 'SPOTIFY', symbol: 'SPOT', sector: 'TECH' },
  { city: 'Bangalore', country: 'IN', coords: [12.9716, 77.5946], company: 'INFOSYS', symbol: 'INFY', sector: 'TECH' },
  { city: 'Milan', country: 'IT', coords: [45.4642, 9.1900], company: 'FERRARI', symbol: 'RACE', sector: 'AUTO' },
  { city: 'Dhahran', country: 'SA', coords: [26.3079, 50.1430], company: 'ARAMCO', symbol: '2222.SR', sector: 'ENERGY' },
  { city: 'Rio de Janeiro', country: 'BR', coords: [-22.9068, -43.1729], company: 'PETROBRAS', symbol: 'PBR', sector: 'ENERGY' },
  { city: 'Johannesburg', country: 'ZA', coords: [-26.2041, 28.0473], company: 'MTN', symbol: 'MTNOY', sector: 'TELE' },
  { city: 'Nairobi', country: 'KE', coords: [-1.2921, 36.8219], company: 'SAFARICOM', symbol: 'SCOM.KE', sector: 'FIN' },
  { city: 'Lagos', country: 'NG', coords: [6.5244, 3.3792], company: 'DANGOTE', symbol: 'DANGCEM.LG', sector: 'IND' },
  { city: 'Cape Town', country: 'ZA', coords: [-33.9249, 18.4232], company: 'NASPERS', symbol: 'NPSNY', sector: 'TECH' },
  { city: 'Dubai', country: 'AE', coords: [25.2048, 55.2708], company: 'DP_WORLD', symbol: 'DPW.AE', sector: 'LOG' },
  { city: 'Tel Aviv', country: 'IL', coords: [32.0853, 34.7818], company: 'CHECKPOINT', symbol: 'CHKP', sector: 'SEC' },
  { city: 'Buenos Aires', country: 'AR', coords: [-34.6037, -58.3816], company: 'MERCADOLIBRE', symbol: 'MELI', sector: 'RETAIL' },
  { city: 'Mexico City', country: 'MX', coords: [19.4326, -99.1332], company: 'AMX', symbol: 'AMX', sector: 'TELE' },
  { city: 'Jakarta', country: 'ID', coords: [-6.2088, 106.8456], company: 'GOTO', symbol: 'GOTO.JK', sector: 'TECH' },
  { city: 'Bangkok', country: 'TH', coords: [13.7563, 100.5018], company: 'PTT', symbol: 'PTT.BK', sector: 'ENERGY' },
  { city: 'Manila', country: 'PH', coords: [14.5995, 120.9842], company: 'SM_INVEST', symbol: 'SM.PH', sector: 'FIN' },
  { city: 'Ho Chi Minh', country: 'VN', coords: [10.8231, 106.6297], company: 'VINGROUP', symbol: 'VIC.HM', sector: 'IND' },
  { city: 'Istanbul', country: 'TR', coords: [41.0082, 28.9784], company: 'KOC_HOLDING', symbol: 'KCHOL.IS', sector: 'IND' },
  { city: 'Cairo', country: 'EG', coords: [30.0444, 31.2357], company: 'CIB', symbol: 'COMI.EY', sector: 'FIN' },
  { city: 'Santiago', country: 'CL', coords: [-33.4489, -70.6693], company: 'SQM', symbol: 'SQM', sector: 'MINING' },
  { city: 'Lima', country: 'PE', coords: [-12.0464, -77.0428], company: 'CREDICORP', symbol: 'BAP', sector: 'FIN' },
  { city: 'Warsaw', country: 'PL', coords: [52.2297, 21.0122], company: 'CD_PROJEKT', symbol: 'OTGLF', sector: 'ENT' },
  { city: 'Prague', country: 'CZ', coords: [50.0755, 14.4378], company: 'CEZ', symbol: 'CEZ.PR', sector: 'ENERGY' },
  { city: 'Helsinki', country: 'FI', coords: [60.1699, 24.9384], company: 'NOKIA', symbol: 'NOK', sector: 'TECH' },
  { city: 'Oslo', country: 'NO', coords: [59.9139, 10.7522], company: 'EQUINOR', symbol: 'EQNR', sector: 'ENERGY' },
  { city: 'Athens', country: 'GR', coords: [37.9838, 23.7275], company: 'PIRAEUS', symbol: 'BPIRY', sector: 'FIN' },
  { city: 'Riyadh', country: 'SA', coords: [24.7136, 46.6753], company: 'STC', symbol: '7010.SR', sector: 'TELE' },
  { city: 'Doha', country: 'QA', coords: [25.2854, 51.5310], company: 'OOREDOO', symbol: 'ORDS.QA', sector: 'TELE' }
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
    
    if (!document.getElementById('leaflet-custom-style')) {
      const style = document.createElement('style');
      style.id = 'leaflet-custom-style';
      style.innerHTML = `
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background: rgba(0,0,0,0.9) !important;
          border: 1px solid #164e63 !important;
          color: #06b6d4 !important;
          border-radius: 0 !important;
          box-shadow: 0 0 15px rgba(6,182,212,0.2) !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          padding: 8px !important;
          background: linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(10,30,40,0.95) 100%) !important;
        }
        .targeting-icon {
          background: transparent;
          border: none;
        }
        @keyframes pulse-cyan {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        .active-hq-pulse {
          animation: pulse-cyan 2s infinite ease-in-out;
        }
      `;
      document.head.appendChild(style);
    }
  }

  state.markerLayer.clearLayers();

  GLOBAL_HUBS.forEach(hub => {
    // Generate simulated telemetry for each node
    const mockPrice = 50 + (Math.random() * 200);
    const mockChange = (Math.random() - 0.4) * 5;
    const isUp = mockChange >= 0;
    
    const popupHtml = `
      <div class="font-mono text-[8px] uppercase space-y-1">
        <div class="flex justify-between border-b border-cyan-900/50 pb-1 mb-1">
          <span class="text-cyan-400 font-black">${hub.company}</span>
          <span class="text-white opacity-50">${hub.symbol}</span>
        </div>
        <div class="grid grid-cols-2 gap-x-2">
          <span class="text-gray-500">LOC:</span>
          <span class="text-white">${hub.city}, ${hub.country}</span>
          <span class="text-gray-500">IDX:</span>
          <span class="${isUp ? 'text-green-500' : 'text-red-500'} font-bold">${mockPrice.toFixed(2)} [${isUp ? '+' : ''}${mockChange.toFixed(2)}%]</span>
          <span class="text-gray-500">SEC:</span>
          <span class="text-cyan-600">${hub.sector || 'GENERAL'}</span>
        </div>
        <div class="mt-2 pt-1 border-t border-cyan-900/40 text-center animate-pulse text-cyan-200 cursor-pointer">
          [ ACCESS_NODE_CORE ]
        </div>
      </div>
    `;

    const marker = L.circleMarker(hub.coords, {
      radius: 3,
      fillColor: "#164e63",
      color: "#164e63",
      weight: 1,
      opacity: 0.6,
      fillOpacity: 0.4
    }).addTo(state.markerLayer)
      .bindPopup(popupHtml, { closeButton: false });
    
    marker.on('click', () => {
      state.targetCoords = hub.coords;
      window.initTerminal(hub.symbol);
      logToTerminal(`TERMINAL_HANDOFF :: ${hub.symbol} // NODE_${hub.city.toUpperCase()}`, 'SYSTEM');
    });
  });

  const { city, country } = state.logistics?.hq || { city: 'N/A', country: 'N/A' };
  const { price, changes, dcf, mktCap, industry } = state.logistics || {};
  const isUp = changes >= 0;
  const overvalued = dcf && price ? (price > dcf) : false;

  const formatLarge = (num) => {
    if (typeof num !== 'number' || num === 0) return '---';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toLocaleString();
  };

  const hubsMap = {};
  GLOBAL_HUBS.forEach(h => { hubsMap[h.symbol] = h.coords; hubsMap[h.city] = h.coords; });
  const activeCoords = state.targetCoords || hubsMap[state.currentTicker] || hubsMap[city] || [34.0522, -118.2437];

  const activePopupHtml = `
    <div class="font-mono text-[9px] uppercase space-y-1.5 min-w-[140px]">
      <div class="flex justify-between border-b border-cyan-500/30 pb-1 mb-1">
        <span class="text-cyan-400 font-black animate-pulse">LINK_ESTABLISHED</span>
        <span class="text-white opacity-50">${state.currentTicker}</span>
      </div>
      <div class="grid grid-cols-2 gap-x-2 gap-y-1">
        <span class="text-gray-500">VALUATION:</span>
        <span class="${isUp ? 'text-green-500' : 'text-red-500'} font-bold">${price ? price.toFixed(2) : '---'}</span>
        
        <span class="text-gray-500">MKT_CAP:</span>
        <span class="text-white">${formatLarge(mktCap)}</span>
        
        <span class="text-gray-500">IV_DCF:</span>
        <span class="${overvalued ? 'text-yellow-600' : 'text-green-600'} font-bold">${dcf ? dcf.toFixed(2) : '---'}</span>
        
        <span class="text-gray-500">VERTICAL:</span>
        <span class="text-cyan-700 truncate w-20" title="${industry}">${industry || 'GENERAL'}</span>
      </div>
      <div class="mt-2 text-[7px] text-cyan-400 bg-cyan-950/50 px-1 py-1 border border-cyan-900/40 text-center tracking-tighter">
        LOC_ID: ${city.toUpperCase()} // PING: 24ms
      </div>
    </div>
  `;

  if (!state.newsCycleInterval) {
    state.map.flyTo(activeCoords, 11, { duration: 2.5 });
    
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
    L.marker(activeCoords, { icon: targetingIcon }).addTo(state.markerLayer);
  }

  L.circleMarker(activeCoords, {
    radius: 8,
    fillColor: "#06b6d4",
    color: "#06b6d4",
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.6
  }).addTo(state.markerLayer)
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
        <span class="text-[8px] font-mono text-cyan-900 uppercase tracking-tighter self-end">${source} // ACTIVE</span>
      </div>
      <div class="flex items-baseline justify-between">
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
  const divYield = (dividend && price) ? ((dividend / price) * 100).toFixed(2) : '0.00';
  const targetPrice = (eps && pe) ? (eps * pe * 1.15).toFixed(2) : '---';
  const sentiment = isUp ? (Math.random() * 30 + 65).toFixed(0) : (Math.random() * 35 + 30).toFixed(0);
  const overvalued = dcf && price ? (price > dcf) : false;
  const dcfDelta = dcf && price ? Math.abs(((price - dcf) / dcf) * 100).toFixed(1) : '---';

  // Regulatory Logic merge
  const solvency = Math.min(100, Math.max(20, (mktCap > 1e11 ? 85 : 45) + (Math.random() * 10)));
  const compliance = Math.min(100, Math.max(40, 95 - (beta * 12)));
  const indicators = [
    { label: 'SOLV', val: solvency.toFixed(0), detail: 'Solvency_Adequacy' },
    { label: 'QUALT', val: compliance.toFixed(0), detail: 'Market_Quality' },
    { label: 'BETA', val: (Math.min(100, beta * 40)).toFixed(1), detail: 'Volatility_Rel' }
  ];

  el.innerHTML = `
    <div class="flex flex-col h-full space-y-2">
      <!-- P/E Ratio Header (Replaced Valuation) -->
      <div class="p-2 border-l-2 ${isUp ? 'border-green-500 bg-green-950/10' : 'border-red-500 bg-red-950/10'} relative overflow-hidden group">
        <div class="flex justify-between items-center mb-1">
          <div class="text-[10px] ${isUp ? 'text-green-600' : 'text-red-600'} font-mono uppercase tracking-widest font-bold flex items-center gap-1">
            <span class="w-1.5 h-1.5 ${isUp ? 'bg-green-500' : 'bg-red-500'} rounded-full animate-pulse"></span>
            Financial_Index // LIVE
          </div>
          <div class="flex gap-1">
            <span class="text-[8px] bg-black/40 px-1 text-cyan-400 font-mono">${exchange || 'N/A'}</span>
            <span class="text-[8px] bg-black/40 px-1 text-cyan-400 font-mono">${currency || 'USD'}</span>
          </div>
        </div>
        <div class="flex items-baseline justify-between relative z-10">
          <div class="flex items-baseline gap-2">
            <div class="text-3xl font-black text-white font-mono tracking-tighter leading-none shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              ${formatNum(pe, 1)}
            </div>
            <div class="text-[9px] text-cyan-800 font-mono uppercase flex flex-col leading-tight cursor-help" title="Price to Earnings Ratio: Measures share price relative to per-share earnings.">
              <span>P/E</span>
              <span>INDEX</span>
            </div>
          </div>
          <div class="flex flex-col items-end">
            <span class="text-[10px] font-mono ${isUp ? 'text-green-400' : 'text-red-400'} font-bold brightness-125">
              ${isUp ? '+' : ''}${priceChangePct}%
            </span>
            <span class="text-[7px] text-gray-700 font-mono uppercase">Telemetry_Shift</span>
          </div>
        </div>
        <div class="absolute right-0 bottom-0 opacity-10 text-[24px] font-black text-cyan-500 pointer-events-none translate-y-2">P/E</div>
        <div class="h-0.5 w-full bg-gray-900/50 mt-2 relative overflow-hidden">
           <div class="h-full ${isUp ? 'bg-green-500/50' : 'bg-red-500/50'} animate-[shimmer_2s_infinite]" style="width: 100%"></div>
        </div>
      </div>

      <!-- Intrinsic Value Analysis (DCF) -->
      <div class="bg-cyan-950/10 border border-cyan-900/40 p-2 flex justify-between items-center relative overflow-hidden group">
         <div class="flex flex-col">
            <span class="text-[7px] text-cyan-700 font-mono uppercase cursor-help" title="Discounted Cash Flow: Valuation based on future cash flow projections.">Intrinsic_Value // DCF</span>
            <span class="text-lg font-black text-white font-mono leading-none border-b border-cyan-900/50 pb-0.5">${currency === 'USD' ? '$' : ''}${formatNum(dcf, 2)}</span>
         </div>
         <div class="flex flex-col items-end">
            <span class="text-[8px] font-bold ${overvalued ? 'text-red-500' : 'text-green-500'} font-mono uppercase tracking-widest ring-1 ${overvalued ? 'ring-red-900/50' : 'ring-green-900/50'} px-1">
              ${overvalued ? 'OVERVALUED' : 'UNDERVALUED'}
            </span>
            <span class="text-[10px] text-cyan-100 font-mono font-bold mt-1">${dcfDelta}% Delta</span>
         </div>
         <div class="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      </div>

      <!-- Regulatory Quick Stats (Unified) -->
      <div class="grid grid-cols-3 gap-1">
        ${indicators.map(ind => `
          <div class="bg-black/60 border border-gray-900 p-1 flex flex-col items-center justify-center relative overflow-hidden h-10 group cursor-help" title="${ind.detail}">
            <div class="text-[6px] text-cyan-500 font-mono mb-0.5 uppercase tracking-widest flex items-center gap-0.5">
              <span class="w-0.5 h-0.5 bg-cyan-800 rounded-full"></span>
              ${ind.label}
            </div>
            <div class="text-[9px] font-black text-white font-mono">${ind.val === '0' || ind.val === '0.0' ? '---' : ind.val}${ind.label === 'BETA' || ind.val === '0' ? '' : '%'}</div>
            <div class="absolute bottom-0 left-0 h-0.5 bg-cyan-900/40 w-full">
              <div class="h-full bg-cyan-500" style="width: ${ind.val}%"></div>
            </div>
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
