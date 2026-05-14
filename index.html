/**
 * Orbital Data Dashboard - Core Logic
 * Vanilla JS version for Static HTML setup
 */

// State Management
let selectedSymbol = null;
let assets = [
    { symbol: 'AAPL', name: 'Apple Inc.', pos: [37.3318, -122.0311] },
    { symbol: 'MSFT', name: 'Microsoft Corp.', pos: [47.6397, -122.1287] },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', pos: [37.3732, -121.9658] },
    { symbol: 'TSLA', name: 'Tesla, Inc.', pos: [30.3119, -97.6891] },
    { symbol: 'AMD', name: 'Advanced Micro Devices', pos: [37.3820, -121.9610] },
    { symbol: 'META', name: 'Meta Platforms', pos: [37.4530, -122.1438] },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', pos: [37.4221, -122.0841] },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', pos: [47.6087, -122.3370] },
    { symbol: 'NFLX', name: 'Netflix, Inc.', pos: [37.2267, -121.9744] },
    { symbol: 'COIN', name: 'Coinbase Global', pos: [37.7749, -122.4194] },
    { symbol: 'PLTR', name: 'Palantir Tech', pos: [39.7392, -104.9903] },
    { symbol: 'ARM', name: 'Arm Holdings', pos: [52.2053, 0.1218] },
    { symbol: 'TSM', name: 'TSMC', pos: [24.7737, 121.0116] },
    { symbol: 'ASML', name: 'ASML Holding', pos: [51.4231, 5.4245] },
    { symbol: 'TM', name: 'Toyota Motor', pos: [35.0824, 137.1562] },
    { symbol: 'SAP', name: 'SAP SE', pos: [49.2721, 8.6432] },
    { symbol: 'SHOP', name: 'Shopify Inc.', pos: [45.4215, -75.6972] },
    { symbol: 'SPOT', name: 'Spotify Tech', pos: [59.3293, 18.0686] },
    { symbol: 'UBER', name: 'Uber Tech', pos: [37.7753, -122.4172] },
    { symbol: 'PYPL', name: 'PayPal Holdings', pos: [37.3229, -121.8832] },
];

// Initialize Map
const map = L.map('map', {
    center: [20, 0],
    zoom: 2,
    zoomControl: false,
    attributionControl: false
});

// Dark Map Tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.css', {
    maxZoom: 19
}).addTo(map);

const markers = {};

// Custom Icon
const customIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="w-2 h-2 bg-terminal-accent rounded-full shadow-[0_0_8px_#00FF41] animate-pulse"></div>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4]
});

// Add Markers
assets.forEach(asset => {
    const marker = L.marker(asset.pos, { icon: customIcon }).addTo(map);
    markers[asset.symbol] = marker;
    
    marker.on('click', () => selectAsset(asset.symbol));
});

// Selection Logic
function selectAsset(symbol) {
    selectedSymbol = symbol;
    const asset = assets.find(a => a.symbol === symbol);
    if (!asset) return;

    // UI Updates
    document.getElementById('no-selection').classList.add('hidden');
    document.getElementById('asset-details').classList.remove('hidden');
    document.getElementById('top-price-display').classList.remove('hidden');
    
    // Zoom map
    map.flyTo(asset.pos, 5, { duration: 1.5 });

    // Initial Fetch
    refreshAssetData(symbol);
    
    // Update List Styling
    renderAssetList();
}

async function refreshAssetData(symbol) {
    try {
        const response = await fetch(`/api/financials/${symbol}`);
        const data = await response.json();
        
        // Update Details
        document.getElementById('detail-name').textContent = data.companyName;
        document.getElementById('detail-symbol').textContent = data.symbol;
        document.getElementById('detail-sector').textContent = data.sector;
        document.getElementById('detail-desc').textContent = data.description;
        
        // Update Top Bar
        const priceEl = document.getElementById('price-ticker');
        const changeEl = document.getElementById('price-change');
        priceEl.textContent = `$${data.price}`;
        const changeVal = parseFloat(data.change);
        changeEl.textContent = `${changeVal >= 0 ? '+' : ''}${data.change}%`;
        changeEl.className = `text-[10px] font-mono ml-2 ${changeVal >= 0 ? 'text-terminal-accent' : 'text-rose-500'}`;

        // Stats Grid
        const statsGrid = document.getElementById('stats-grid');
        statsGrid.innerHTML = `
            <div class="bg-zinc-900/40 p-2 border border-zinc-800">
                <span class="text-[6px] text-zinc-500 block uppercase">Market Cap</span>
                <span class="text-[10px] text-white font-bold font-mono">${data.stats.marketCap}</span>
            </div>
            <div class="bg-zinc-900/40 p-2 border border-zinc-800">
                <span class="text-[6px] text-zinc-500 block uppercase">P/E Ratio</span>
                <span class="text-[10px] text-white font-bold font-mono">${data.stats.pe}</span>
            </div>
            <div class="bg-zinc-900/40 p-2 border border-zinc-800">
                <span class="text-[6px] text-zinc-500 block uppercase">Dividend</span>
                <span class="text-[10px] text-white font-bold font-mono">${data.stats.dividend}</span>
            </div>
            <div class="bg-zinc-900/40 p-2 border border-zinc-800">
                <span class="text-[6px] text-zinc-500 block uppercase">Volume</span>
                <span class="text-[10px] text-white font-bold font-mono">${data.stats.volume}</span>
            </div>
        `;

        // Supply Chain
        const scEl = document.getElementById('supply-chain-intel');
        scEl.innerHTML = `
            <div class="bg-zinc-900/40 p-2 border border-zinc-800">
                <span class="text-[7px] text-zinc-500 block mb-1 uppercase">Upstream (Suppliers)</span>
                <div class="flex flex-wrap gap-1">
                    ${data.supplyChain.upstream.map(s => `<span class="text-[8px] px-1 border border-terminal-accent/30 text-terminal-accent font-mono">${s}</span>`).join('')}
                </div>
            </div>
            <div class="bg-zinc-900/40 p-2 border border-zinc-800">
                <span class="text-[7px] text-zinc-500 block mb-1 uppercase">Downstream (Buyers)</span>
                <div class="flex flex-wrap gap-1">
                    ${data.supplyChain.downstream.map(s => `<span class="text-[8px] px-1 border border-rose-500/30 text-rose-500 font-mono">${s}</span>`).join('')}
                </div>
            </div>
        `;

        // Render D3 Chart
        renderChart(symbol);
        
    } catch (err) {
        console.error("Fetch failed", err);
    }
}

function renderChart(symbol) {
    const container = document.getElementById('chart-container');
    container.innerHTML = '';
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Simulate chart data based on symbol hash
    const hash = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const data = Array.from({length: 40}, (_, i) => ({
        x: i,
        y: 20 + Math.sin(i * 0.5 + hash) * 10 + Math.random() * 5
    }));

    const x = d3.scaleLinear().domain([0, 39]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 40]).range([height, 0]);

    const line = d3.line()
        .x(d => x(d.x))
        .y(d => y(d.y))
        .curve(d3.curveMonotoneX);

    // Grid lines
    svg.append("g")
        .attr("class", "grid")
        .attr("opacity", 0.1)
        .selectAll("line")
        .data(d3.range(0, 41, 10))
        .enter().append("line")
        .attr("x1", 0)
        .attr("y1", d => y(d))
        .attr("x2", width)
        .attr("y2", d => y(d))
        .attr("stroke", "#00FF41");

    // Path
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#00FF41")
        .attr("stroke-width", 1.5)
        .attr("d", line)
        .attr("opacity", 0.8);

    // Area
    const area = d3.area()
        .x(d => x(d.x))
        .y0(height)
        .y1(d => y(d))
        .curve(d3.curveMonotoneX);

    svg.append("path")
        .datum(data)
        .attr("fill", "url(#chart-gradient)")
        .attr("d", area);

    // Gradient
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "chart-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");
    
    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#00FF41").attr("stop-opacity", 0.2);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#00FF41").attr("stop-opacity", 0);
}

// Asset List Rendering
function renderAssetList() {
    const list = document.getElementById('asset-list');
    const searchTerm = document.getElementById('asset-search').value.toLowerCase();
    
    const filtered = assets.filter(a => a.symbol.toLowerCase().includes(searchTerm) || a.name.toLowerCase().includes(searchTerm));
    
    list.innerHTML = filtered.map(a => `
        <div class="asset-item group flex items-center justify-between px-3 py-2 cursor-pointer border-b border-zinc-900/30 hover:bg-zinc-900/50 transition-colors ${selectedSymbol === a.symbol ? 'bg-zinc-900/80 border-l-2 border-l-terminal-accent' : ''}" onclick="selectAsset('${a.symbol}')">
            <div class="flex flex-col flex-1 min-w-0">
                <div class="flex items-center gap-1">
                    <span class="font-mono text-[7px] font-bold group-hover:text-terminal-accent transition-colors ${selectedSymbol === a.symbol ? 'text-terminal-accent' : 'text-[#888]'}">${a.symbol}</span>
                    ${selectedSymbol === a.symbol ? '<div class="w-0.5 h-0.5 bg-terminal-accent rounded-full animate-pulse"></div>' : ''}
                </div>
                <span class="text-[6px] text-[#333] uppercase truncate block leading-tight">${a.name}</span>
            </div>
            ${selectedSymbol === a.symbol ? '<span class="text-terminal-accent text-[8px]">»</span>' : ''}
        </div>
    `).join('');
}

// Search interaction
document.getElementById('asset-search').addEventListener('input', renderAssetList);

// Real-time Clock
function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toTimeString().split(' ')[0];
}
setInterval(updateClock, 1000);
updateClock();

// Initial Render
renderAssetList();

// Handle window resize for charts
window.addEventListener('resize', () => {
    if (selectedSymbol) renderChart(selectedSymbol);
});
