Here is a production-ready, professional `README.md` file tailored specifically to the architecture, optimization features, and system design patterns of your quantitative dashboard.

You can copy and paste this directly into the root folder of your GitHub repository.

---

```markdown
# Yield Terminal: Supply Intelligence (YA-Terminal)

An enterprise-grade, high-performance tactical financial analytics dashboard designed for global logistics monitoring, asset topology tracking, and macroeconomic risk assessment. Centered around a multi-layered 3D geospatial layer, the application integrates live signal telemetry feeds, neural volatility heatmaps, and global supply chain corridor vectors to provide a unified overview of structural market stressors.

---

## ⚡ Core System Architecture: The High-Yield Silo Pattern

The application operates on a distributed, low-latency synthesis stack engineered to process high-volume asset streams without blocking the main rendering thread.


```

┌────────────────────────────────────────────────────────────────────────┐
│                          THE INTELLIGENCE LAYER                        │
│             Genkit • Claude 3.5 Sonnet • Gemini 3.1 TTS Proxy          │
└───────────────────────────────────┬────────────────────────────────────┘
│ (Recursive Synthesis)
┌───────────────────────────────────▼────────────────────────────────────┐
│                             THE ENGINE                                 │
│                     Next.js 15 Server Actions                          │
└───────────────────────────────────┬────────────────────────────────────┘
│ (Stale-While-Revalidate / Silo)
┌───────────────────────────────────▼────────────────────────────────────┐
│                           DATA PIPELINE / REGISTRY                     │
│          Firebase Firestore Silo  •  Asynchronous Public CDN JSON      │
└────────────────────────────────────────────────────────────────────────┘

```

* **The Pipeline:** Interfaces directly with institutional APIs (Finnhub, Polygon.io, Tiingo), coordinating rate-limiting policies, error backoffs, and strict asset data normalization.
* **The Engine:** Structured using Next.js Server Actions acting as the core systems orchestrator. It queries the local Firestore data silo first, dynamically rehydrating from external market streams only if state data is missing or stale.
* **The Intelligence Layer:** Powered by Google Genkit and the `gemini-3.1-flash-tts-preview` proxy model, performing real-time signal synthesis and compiling automated tactical vocalizer briefings streamed directly to the frontend client.

---

## 🛠️ Performance Engineering & Runtime Optimizations

### 1. Dynamic Ticker Capacity Throttle (HUD Control)
To prevent DOM element bloating and frame rate drops during heavy 3D globe coordinate drawings, the terminal features a hardware-throttled **Ticker Capacity HUD Section** inside the system configuration modules:
* **Persistent State Thresholds:** Keeps state bounds cached inside browser `localStorage` under `system_ticker_limit`.
* **Data Slicing Contexts:** Dynamically slices incoming high-volume registries (e.g., `companies_large.json`) at the context layer, maintaining smooth 60 FPS animations on lower-powered devices.
* **Quick Presets:** Instant anchor buttons to constrain active working arrays down to lean frames (**50**, **150**, **300**, or **ALL** tickers).

### 2. Full-Stream Defensive Filters & Suffix Sanitization
Built-in resilience layers guard downstream charting and mapping tools from processing database indexing artifacts or malformed telemetry feeds:
* **Automatic Suffix Slicing:** Catches and strips trailing database tracking flags (e.g., turning `AAPL_0` or `SPY_12` back into clean ticker assets via `.split('_')[0].trim()`).
* **Hydration Guards:** Blocks lower-bound static placeholder values ($180 initialization fallbacks) from corrupting production time-series arrays, eliminating vertical "gap up" scaling artifacts on terminal trendlines.

---

## 📁 System Blueprint Directory Structure

```text
YA-Terminal/
├── public/
│   └── data/
│       └── companies_large.json   # Unified master corporate registry
├── src/
│   ├── ai/
│   │   └── flows.ts               # Server-side Genkit configs and autonomous execution loops
│   ├── app/
│   │   ├── actions.ts             # Next.js Server Actions (Engine orchestration layer)
│   │   ├── api/
│   │   │   └── proxy/             # Secure streaming endpoint proxy for TTS audio payloads
│   │   └── page.tsx               # Primary interface initialization viewport
│   ├── components/
│   │   └── yield-terminal/        # The Chassis - modular dashboard component nodes
│   │       ├── TopologyMap.tsx    # 3D geospatial coordinate vector layer
│   │       ├── MacroCorridor.tsx  # Suez / Taiwan Strait chokepoint simulation panels
│   │       └── TrendChart.tsx     # Active time-series trend monitor
│   ├── firebase/
│   │   └── connectors.ts          # useSiloPrice and useCollection real-time hooks
│   └── lib/
│       └── types.ts               # Strict TypeScript data schemas and interface models

```

---

## ⚙️ Environment Variables & Deployment

Create a `.env.local` file in the root directory to store secure analytical access signatures:

```env
# Next.js Server Core
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase Silo Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

# Intelligence Layer Gateway Keys
GEMINI_API_KEY=your_google_ai_studio_api_key
CLAUDE_API_KEY=your_anthropic_api_key
FINNHUB_API_KEY=your_finnhub_key

```

### Deployment Pipeline

This system is optimized for zero-overhead serverless hosting configurations. The codebase features strict build isolation logic, making it fully ready for automated production deployment via **Vercel** connected directly to your main **GitHub** tracking branch.

---

## 👥 Engineering & Maintainers

* **Jerome Jackson (High Yield Associates)** * *Email:* jerome.jackson.solutions@gmail.com
* *Focus:* Quantitative Architecture, AI Software Engineering, Predictable Regulatory Operations.



```
ℹ️ **Deployment Note:** When modifying active tracking lists, ensure updates are committed directly into `public/data/companies_large.json`. Ensure strict alignment with the standard coordinate schema (`symbol`, `name`, `sector`, `lat`, `lng`) to allow the sanitization guard to map data segments successfully on application boot.

```
