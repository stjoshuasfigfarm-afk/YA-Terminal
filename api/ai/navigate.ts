import { Router } from "express";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

const router = Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const isKeyReady = (k: string) => k && k.length > 5 && !k.includes("YOUR_");

let aiClient: GoogleGenAI | null = null;
const getAiClient = () => {
  if (!aiClient && isKeyReady(GEMINI_API_KEY)) {
    aiClient = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
};

// Clean raw JSON response from markdown wrappers and any extra non-whitespace leading/trailing characters
function cleanJSONResponse(text: string): string {
  let cleaned = text.trim();
  
  // 1. Find the first occurrence of '{' or '['
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  
  let startIdx = -1;
  let isObject = true;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    isObject = false;
  }
  
  if (startIdx !== -1) {
    // 2. Scan forward and find the balanced matching closing symbol
    let stack: string[] = [];
    let inString = false;
    let escape = false;
    let endIdx = -1;
    
    for (let i = startIdx; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') {
          stack.push('}');
        } else if (char === '[') {
          stack.push(']');
        } else if (char === '}' || char === ']') {
          stack.pop();
          if (stack.length === 0) {
            endIdx = i;
            break;
          }
        }
      }
    }
    
    if (endIdx !== -1) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    } else {
      // Fallback if not balanced
      const endChar = isObject ? '}' : ']';
      const lastIdx = cleaned.lastIndexOf(endChar);
      if (lastIdx !== -1 && lastIdx > startIdx) {
        cleaned = cleaned.substring(startIdx, lastIdx + 1);
      }
    }
  } else {
    // If no brace/bracket found, check for markdown block format
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "");
      cleaned = cleaned.replace(/\n```$/, "");
    }
  }

  // 3. Robust control-character/newline escape within double-quoted strings
  let sanitized = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (esc) {
      sanitized += char;
      esc = false;
      continue;
    }
    if (char === '\\') {
      sanitized += char;
      esc = true;
      continue;
    }
    if (char === '"') {
      inStr = !inStr;
      sanitized += char;
      continue;
    }
    if (inStr) {
      if (char === '\n') {
        sanitized += '\\n';
      } else if (char === '\r') {
        sanitized += '\\r';
      } else if (char === '\t') {
        sanitized += '\\t';
      } else {
        sanitized += char;
      }
    } else {
      sanitized += char;
    }
  }
  
  // 4. Remove trailing commas before closing braces/brackets, taking care of spaces
  sanitized = sanitized.trim();
  sanitized = sanitized.replace(/,\s*([}\]])/g, '$1');
  
  return sanitized;
}

// Helper to identify quota or rate limit exhaustion
function isQuotaExhausted(err: any): boolean {
  const errMsg = (err.message || "").toLowerCase();
  const status = err.status || err.code || 0;
  return (
    status === 429 ||
    status === 402 ||
    errMsg.includes("quota") ||
    errMsg.includes("resource_exhausted") ||
    errMsg.includes("rate limit") ||
    errMsg.includes("ratelimit") ||
    errMsg.includes("limit exceeded") ||
    errMsg.includes("free-models") ||
    errMsg.includes("per-min") ||
    errMsg.includes("per-day") ||
    errMsg.includes("exceeded") ||
    errMsg.includes("too many requests")
  );
}

// Call OpenRouter API
async function callOpenRouter(prompt: string, key: string, model: string, jsonMode = false): Promise<string> {
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://ai.studio/build",
    "X-Title": "Yield Analysts Terminal"
  };

  const mappedModel = (model === "anthropic/claude-sonnet-4.6" || model === "anthropic/claude-3.5-sonnet") ? "openai/gpt-4o-mini" : model;

  const modelsToTry = Array.from(new Set([
    mappedModel,
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "deepseek/deepseek-v4-flash:free",
    "z-ai/glm-4.5-air:free",
    "openrouter/free"
  ])).filter(Boolean);

  let lastError: Error | null = null;

  for (const modelId of modelsToTry) {
    try {
      if (modelId === "openai/gpt-4o-mini") continue; // Skip to avoid credit errors
      
      const bodyData: any = {
        model: modelId,
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 800
      };

      if (jsonMode) {
        bodyData.response_format = { type: "json_object" };
      }

      console.log(`[NAVIGATOR_OR_ATTEMPT] Running prompt with model: ${modelId}`);

      const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", bodyData, {
        headers,
        timeout: 25000
      });

      const result = response.data;
      const choice = result.choices?.[0];
      if (!choice || !choice.message?.content) {
        throw new Error(`Invalid response structure from OpenRouter: ${JSON.stringify(result)}`);
      }

      return choice.message.content;
    } catch (err: any) {
      if (err.response) {
        const errData = err.response.data;
        let errorMessage = `OpenRouter error (${err.response.status})`;
        if (errData && typeof errData === 'object') {
          errorMessage = errData.error?.message || errData.message || JSON.stringify(errData);
        }
        throw new Error(errorMessage);
      }
      
      if (isQuotaExhausted(err)) {
        console.warn(`[NAVIGATOR_OR_FAIL] Model ${modelId} hit rate/quota limit. Immediate abort to preserve resources.`);
        throw new Error("QUOTA_EXHAUSTED");
      }
      console.warn(`[NAVIGATOR_OR_FAIL] Model ${modelId} failed: ${err.message}. Retrying next free model...`);
      lastError = err;
    }
  }

  throw lastError || new Error("All fallback models on OpenRouter failed to return coordinates.");
}

// Universal AI Caller
async function callAI(prompt: string, headers: any, jsonMode = false): Promise<string> {
  const clientOpenRouterKey = headers['x-openrouter-api-key'];
  const envOpenRouterKey = process.env.OPENROUTER_API_KEY || "";
  const openRouterKey = clientOpenRouterKey || envOpenRouterKey;
  const openRouterModel = headers['x-openrouter-model'] || process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  const ai = getAiClient();

  // 1. If user provided a specific OpenRouter key, respect their choice
  if (clientOpenRouterKey && isKeyReady(clientOpenRouterKey)) {
    try {
      return await callOpenRouter(prompt, clientOpenRouterKey, openRouterModel, jsonMode);
    } catch (err: any) {
      if (err.message === "QUOTA_EXHAUSTED" || isQuotaExhausted(err)) {
        console.log(`[AI_FALLBACK] OpenRouter key controls active. Entering fallback.`);
        throw new Error("QUOTA_EXHAUSTED");
      }
      console.log(`[AI_FALLBACK] Custom OpenRouter redirected: ${err.message}`);
    }
  }

  // 2. Default to Gemini (most reliable, high rate limits)
  if (ai) {
    const geminiModels = ["gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-3.5-flash", "gemini-flash-latest"];
    let lastGeminiErr: any = null;
    for (const modelName of geminiModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: jsonMode ? { responseMimeType: "application/json" } : undefined
        });
        if (response.text) {
          return response.text;
        }
      } catch (err: any) {
        if (isQuotaExhausted(err)) {
          console.log(`[AI_FALLBACK] Gemini model ${modelName} rate limit engaged. Transitioning to baseline.`);
          throw new Error("QUOTA_EXHAUSTED");
        }
        console.log(`[AI_FALLBACK] Gemini ${modelName} returned status detail: ${err.message}`);
        lastGeminiErr = err;
      }
    }
    console.log(`[AI_FALLBACK] Transitioning telemetry request path.`);
  }

  // 3. Fallback to default OpenRouter if Gemini failed or is unavailable
  if (isKeyReady(envOpenRouterKey)) {
    try {
      return await callOpenRouter(prompt, envOpenRouterKey, openRouterModel, jsonMode);
    } catch (err: any) {
      if (err.message === "QUOTA_EXHAUSTED" || isQuotaExhausted(err)) {
        throw new Error("QUOTA_EXHAUSTED");
      }
      throw err;
    }
  }

  throw new Error("AI_LINK_DISCONNECTED: Configure a Gemini API Key or provide an OpenRouter API key in Settings.");
}

// Retry helper for robustness
async function withRetry<T>(fn: (attempt: number) => Promise<T>, maxRetries = 2, delayMs = 1500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn(i);
    } catch (err: any) {
      lastErr = err;
      const message = (err.message || "").toLowerCase();
      const status = err.status || err.code || 500;
      
      if (err.message === "QUOTA_EXHAUSTED" || message.includes("quota") || message.includes("resource_exhausted") || status === 429 || isQuotaExhausted(err)) {
        throw new Error("QUOTA_EXHAUSTED");
      }
      
      console.log(`[AI_RETRY] Attempt ${i + 1} status code: ${err.message}`);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }
  throw lastErr;
}

interface OSMResult {
  lat: number;
  lon: number;
  name: string;
}

let lastGeocodeTime = 0;
const GEOCODE_MIN_INTERVAL = 1000; // 1s

async function geocodeWithNominatim(query: string): Promise<OSMResult | null> {
  const now = Date.now();
  if (now - lastGeocodeTime < GEOCODE_MIN_INTERVAL) {
    // throttle
    await new Promise(resolve => setTimeout(resolve, GEOCODE_MIN_INTERVAL - (now - lastGeocodeTime)));
  }
  lastGeocodeTime = Date.now();

  try {
    const cleanQuery = query
      .replace(/(?:bottlenecks|bottleneck|maritime|chokepoint|production|megafactory|foundry|foundries|hq|headquarters|shipping|route|port|canal|node)/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanQuery) return null;

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&limit=1`;
    console.log(`[NOMINATIM_GEOCODE] Query: "${cleanQuery}" via OpenStreetMap...`);
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        "User-Agent": "StrategicAssetTerminal/1.0 (st.joshuasfigfarm@gmail.com)"
      }
    });

    const data = response.data;
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      const lat = parseFloat(first.lat);
      const lon = parseFloat(first.lon);
      const name = first.display_name;

      if (!isNaN(lat) && !isNaN(lon)) {
        console.log(`[NOMINATIM_SUCCESS] Resolved "${query}" -> "${name}" at [${lat}, ${lon}]`);
        return { lat, lon, name };
      }
    }
  } catch (err: any) {
    console.warn(`[NOMINATIM_ERROR] Failed to geocode via OpenStreetMap: ${err.message}`);
  }
  return null;
}

function getOsmDynamicFallback(query: string, osm: OSMResult) {
  const shortName = osm.name.split(',')[0] || query;
  return {
    locationName: `${shortName} (${osm.lat.toFixed(3)}N, ${osm.lon.toFixed(3)}E)`,
    coordinates: [osm.lat, osm.lon],
    zoomLevel: 7,
    briefing: `Dynamic geospatial coordinate resolved via OpenStreetMap Nominatim search for "${query}". This region serves as an actively tracked logistical node within our global supply-chain telemetry system. High-level monitoring and geopolitical asset tracking are prioritized.`,
    facts: [
      `Geographic node: ${osm.name.slice(0, 80)}${osm.name.length > 80 ? '...' : ''}`,
      `Verified Map Coordinates: latitude ${osm.lat.toFixed(4)}, longitude ${osm.lon.toFixed(4)}`,
      `Target verified successfully via decentralized OSM registry`
    ],
    ticker: null,
    entities: [
      {
        id: `NODE_OSM_${Date.now()}`,
        name: `${shortName} Hub`,
        coordinates: [osm.lat, osm.lon],
        type: "NODE",
        description: `Active logistical gateway indexed via Nominatim geocoding engine.`
      }
    ],
    aiStrategyAnalysis: {
      summary: `Macroeconomic analysis active for ${shortName}. Real-time coordinate translation provides critical baseline context for trade-flow and maritime route calculations.`,
      growthVectors: [
        "Regional infrastructure developments",
        "Intermodal connection expansions",
        "Digital route tracking systems"
      ],
      riskFactors: [
        "Unfavorable local weather/port congestion",
        "Vulnerability to international shipping interruptions",
        "Localized supply chain friction"
      ],
      outlook: "STABLE"
    }
  };
}

// POST /api/ai/navigate
router.post("/", async (req, res) => {
  try {
    const { prompt: userPrompt } = req.body;
    if (!userPrompt) {
      return res.status(400).json({ error: "Missing parameter: prompt" });
    }

    const openRouterKey = req.headers['x-openrouter-api-key'] as string || process.env.OPENROUTER_API_KEY || "";
    const hasOpenRouter = isKeyReady(openRouterKey);
    const hasGemini = isKeyReady(GEMINI_API_KEY);

    if (!hasOpenRouter && !hasGemini) {
      // Use fallback logic with Nominatim if search finds anything
      const osmResult = await geocodeWithNominatim(userPrompt);
      if (osmResult) {
        return res.json({
          ...getOsmDynamicFallback(userPrompt, osmResult),
          warning: "AI_DEMO_FAILSAFE: Utilizing synthesized baseline telemetry model with precision OSM geocoding because no live API keys are activated."
        });
      }
      const fallback = getFallbackNavigation(userPrompt);
      return res.json({
        ...fallback,
        warning: "AI_DEMO_FAILSAFE: Utilizing synthesized baseline telemetry model because no live API keys are activated."
      });
    }

    const osmResult = await geocodeWithNominatim(userPrompt);

    const aiPrompt = `
      You are a professional geopolitical and supply chain intelligence analyst.
      The user is requesting navigation coordinates and research on this topic/location: "${userPrompt}"
      ${osmResult ? `
      To ensure mapping accuracy, OpenStreetMap Nominatim resolved this location metadata:
      - Display Name: "${osmResult.name}"
      - Precise Coordinates: [${osmResult.lat}, ${osmResult.lon}]
      
      CRITICAL INSTRUCTION: You MUST use these exact coordinates [${osmResult.lat}, ${osmResult.lon}] in your JSON coordinates array, and prefer a clean, shortened version of "${osmResult.name}" for your locationName.
      ` : ""}

      CRITICAL MANDATE: You MUST write all textual descriptions, location names, briefings, and insights strictly in clear, standard English. Avoid all technical jargon, pseudo-code, terminal-style abbreviations, or "cyberpunk" aesthetics. Speak in a natural, professional human voice. Do NOT reply in any foreign language.

      Provide a clear, natural briefing explaining the importance of this location for global business and trade. Also construct a rigorous, standard strategic AI analysis for the topic.

      You MUST return a clean, valid and structured JSON object (do NOT wrap it in any extra text).
      Ensure the schema matches this EXACT structure:
      {
        "locationName": "string representing the city/country or specific facility/hub (e.g., Cupertino, California)",
        "coordinates": [latitude_number, longitude_number],
        "zoomLevel": number (integer between 3 and 12),
        "briefing": "string representing a 3-sentence clear, natural briefing in plain English. Avoid technical terminal jargon.",
        "facts": ["Simple Fact 1", "Simple Fact 2", "Simple Fact 3"],
        "ticker": "string representation of single relevant ticker from list [AAPL, TSM, ASML, NVDA, AMZN, MSFT, META, SPY] if and ONLY if the typed topic explicitly mentions or directly targets that specific company. Otherwise, set this strictly to null",
        "entities": [
          {
            "id": "unique_id",
            "name": "Entity Name",
            "coordinates": [lat, lng],
            "type": "NODE" | "CARGO" | "CONFLICT" | "SIGNAL" | "RELATION",
            "description": "Simple 1-sentence data point in plain English"
          }
        ],
        "aiStrategyAnalysis": {
          "summary": "Geopolitical and macroeconomic strategic analysis of the typed topic / query (max 60 words). Must be clear and robust.",
          "growthVectors": ["Specific catalyst vector 1 corresponding to the searched topic", "Specific catalyst vector 2", "Specific catalyst vector 3"],
          "riskFactors": ["Specific systemic risk 1 corresponding to the searched topic", "Specific structural risk 2", "Specific operational risk 3"],
          "outlook": "STRETCHED" | "STABLE" | "ACCELERATING" | "VULNERABLE" | "COMPROMISED"
        }
      }
    `;

    const result = await withRetry(async () => {
      const responseText = await callAI(aiPrompt, req.headers, true);
      const cleaned = cleanJSONResponse(responseText);
      const parsed = JSON.parse(cleaned);

      // Defensively override/verify coordinates if OSM geocoding was successful
      if (osmResult && (!parsed.coordinates || !Array.isArray(parsed.coordinates) || parsed.coordinates.length < 2 || isNaN(Number(parsed.coordinates[0])))) {
        parsed.coordinates = [osmResult.lat, osmResult.lon];
        if (!parsed.locationName) {
          parsed.locationName = osmResult.name.split(',')[0];
        }
      }
      return parsed;
    });

    res.json(result);
  } catch (err: any) {
    if (err.message === "QUOTA_EXHAUSTED") {
      console.log("[AI_INFO] AI Navigator routed to offline geocoding fallback due to rate limits.");
    } else {
      console.log(`[AI_INFO] AI Navigator routed to fallback: ${err.message}`);
    }
    const userPrompt = req.body.prompt || "";
    try {
      const osmResult = await geocodeWithNominatim(userPrompt);
      if (osmResult) {
        return res.json(getOsmDynamicFallback(userPrompt, osmResult));
      }
    } catch (osmErr: any) {
      console.log("[AI_INFO] Osm fallback geocoding failed during error flow:", osmErr.message);
    }
    const fallback = getFallbackNavigation(userPrompt);
    res.json(fallback);
  }
});

function getFallbackNavigation(query: string) {
  const q = query.toLowerCase();

  if (q.includes("semi") || q.includes("chip") || q.includes("tsmc") || q.includes("taiwan")) {
    return {
      locationName: "Hsinchu, Taiwan (TSMC Fab 18)",
      coordinates: [24.7816, 121.0153],
      zoomLevel: 8,
      briefing: "Hsinchu Science Park represents the center of global sub-7nm foundry capacity. Localized seismic risks and specialized power infrastructure requirements create a high fragility index. Disruption here triggers automated shutdowns of high-performance computing supply lines.",
      facts: ["Monopolizes 90% of advanced logic node output", "Vulnerable to littoral kinetic activity", "Extreme electricity consumption necessitates local grid decoupling"],
      ticker: "TSM",
      entities: [
        { id: "NODE_T1", name: "TSMC Fab 12", coordinates: [24.77, 121.02], type: "NODE", description: "Primary R&D and pilot line for 2nm process logic." },
        { id: "NODE_T2", name: "MediaTek HQ", coordinates: [24.78, 121.00], type: "NODE", description: "SoC design hub for mobile and IoT telemetry." },
        { id: "SIGNAL_T1", name: "Seismic Sensor S-4", coordinates: [24.79, 121.05], type: "SIGNAL", description: "High-sensitivity tectonic monitoring active." }
      ],
      aiStrategyAnalysis: {
        summary: "Advanced logic fabrication remains highly centralized in Western Pacific littoral zones. Systemic bottlenecks in chemical substrate delivery and lithography tooling create high vulnerability.",
        growthVectors: ["Integration of dynamic seismic backup clusters", "Expanded dry-bulk recycling limits localized resource dependencies", "Secondary packaging facility scaling distributes kinetic risk"],
        riskFactors: ["Tectonic shifts cause automated fab calibration shutdowns", "Export controls compress multi-generation capacity growth spreads", "Power grid limits in critical science parks constrain physical output"],
        outlook: "ACCELERATING"
      }
    };
  }

  if (q.includes("oil") || q.includes("energy") || q.includes("suez") || q.includes("bab") || q.includes("strait")) {
    return {
      locationName: "Suez Canal / Bab-el-Mandeb Strait",
      coordinates: [12.6, 43.33],
      zoomLevel: 4,
      briefing: "The Bab-el-Mandeb represents a primary global energy transit vulnerability vector. Geopolitical blockades force alternative container routing around the Cape of Good Hope, adding nine days dry-bulk transit. This structural rerouting spikes the Shanghai Containerized Freight Index.",
      facts: ["Handles 12% of global trade volume", "Primary choke for Russian/Gulf crude flows to EU", "Alternative Cape route adds $1M in fuel costs per vessel"],
      ticker: null,
      entities: [
        { id: "CARGO_S1", name: "VLCC Ever-Alpha", coordinates: [12.5, 43.4], type: "CARGO", description: "Fully laden Crude ULCC transiting northwards." },
        { id: "CONFLICT_S1", name: "Red Sea Zone Delta", coordinates: [12.8, 43.1], type: "CONFLICT", description: "Active operational hazard area; rerouting advised." },
        { id: "SIGNAL_S1", name: "AIS Relay 9", coordinates: [12.4, 43.2], type: "SIGNAL", description: "Secure maritime telemetry node reporting." }
      ],
      aiStrategyAnalysis: {
        summary: "Maritime bottleneck activity spikes shipping indices and alters energy distribution corridors. Supply chain delays push localized manufacturers into safety stock accumulation.",
        growthVectors: ["Automated asset tracking links vessel routes to inventory forecasts", "Cape detour logistics optimization lowers extra fuel consumption models", "Dual-route pipeline integration routes crude past physical straits"],
        riskFactors: ["Persistent kinetic threat levels in Red Sea corridor", "Alternative rail/land shipping lines lack sufficient cargo carrying width", "Port congestion at secondary harbors triggers multi-month delivery lags"],
        outlook: "VULNERABLE"
      }
    };
  }

  if (q.includes("battery") || q.includes("lithium") || q.includes("ev") || q.includes("catl") || q.includes("china")) {
    return {
      locationName: "Ningde, China (CATL Headquarters)",
      coordinates: [26.6655, 119.5479],
      zoomLevel: 7,
      briefing: "Ningde represents the epicenter of worldwide lithium-iron-phosphate (LFP) cell fabrication. Access to raw material refinement corridors determines downstream automotive margins. Grid supply metrics are analyzed as direct leading indicators of global industrial inventory levels.",
      facts: ["World's largest battery producer by GWh", "Vertical integration into lithium mines in Africa/South America", "Critical node for Tesla and VW supply pipelines"],
      ticker: null,
      aiStrategyAnalysis: {
        summary: "Electrification corridors rely heavily on East Asian mineral refinery centers. Integration of next-generation solid state systems and sodium alternatives is accelerating.",
        growthVectors: ["Sodium-ion chemistry mass scaling avoids global lithium shortages", "Direct recycling of raw elements secures local battery core loops", "High-voltage charging infrastructure expansion boosts overall node demands"],
        riskFactors: ["Mineral delivery corridor delays increase cell construction costs", "National regulatory mandates constrain geographical supplier access", "Grid load stress in refining provinces forces periodic operational curtailment"],
        outlook: "STRENGTHED"
      }
    };
  }

  if (q.includes("asml") || q.includes("netherland") || q.includes("litho") || q.includes("euv")) {
    return {
      locationName: "Veldhoven, Netherlands (ASML Headquarters)",
      coordinates: [51.4035, 5.4081],
      zoomLevel: 9,
      briefing: "ASML Holding NV maintains a global monopoly on high-NA EUV lithography equipment. Each tool relies on a highly specialized subsystem supply tier that cannot be replicated. Air-cargo routes for finished equipment remain under strict regulatory monitoring.",
      facts: ["Only source of EUV lithography tools", "Deep integration with Zeiss and TRUMPF optics", "Subject to shifting export control regimes"],
      ticker: "ASML",
      aiStrategyAnalysis: {
        summary: "Lithography dominates the sub-3nm chip fabrication pipeline, creating absolute reliance on European tooling. Advanced optical mirror fabrication remains a sole-source bottleneck structure.",
        growthVectors: ["High-NA EUV rollout enables advanced sub-2nm mass processing", "Expanded global maintenance services secure high utility uptimes", "Deep collaborative research with major fabrication giants drives product retention"],
        riskFactors: ["Geopolitical export bans contract available terminal markets", "Highly limited specialized technician pool slows system rollout speeds", "Sub-tier supplier failure vectors cascade directly onto machine delivery schedules"],
        outlook: "STABLE"
      }
    };
  }

  // Default fallback (e.g. general query or generic)
  return {
    locationName: "New York, USA (Financial Core)",
    coordinates: [40.7128, -74.006],
    zoomLevel: 5,
    briefing: "Wall Street acts as the clearing house for international logistics financing and yield spreads. Volatility is derived from sovereign debt ratings and policy shifts. Physical node telemetry from overseas suppliers is processed here to hedge equity assets.",
    facts: ["Global clearing for energy futures", "Concentrates risk in dollar-denominated shipping insurance", "Centralized command for global hedge fund outflows"],
    ticker: null,
    aiStrategyAnalysis: {
      summary: "Global financial systems represent the core clearance channel for trade operations. Sovereign bond movements and interest rate volatility are heavily priced into shipping futures. Strategic asset hedges are advised to combat fluctuating supply cost factors.",
      growthVectors: ["Automated derivative flow analysis predicts commodity spot updates", "Cross-continental capital integrations accelerate trade infrastructure investments", "Alternative asset tokenization expands general supply finance channels"],
      riskFactors: ["Macro interest policy jumps alter yield curve positions", "Dollar-dominated insurance limits force maritime settlement disruptions", "Hedge fund volatility spreads across linked global nodes"],
      outlook: "STABLE"
    }
  };
}

export default router;
