# HY Analysts Terminal

A production-ready financial intelligence terminal built with Vanilla JS, Tailwind CSS, and Leaflet.js.

## Features
- **Global Asset Map**: Visualizing major corporate nodes with supply chain logic (Upstream/Downstream).
- **Deep Packet Inspection**: Real-time financial profiles, balance sheet snapshots, and income history.
- **Dynamic Charting**: High-performance price visualization via Lightweight Charts.
- **News Ticker**: Rolling news intelligence feed.

## Prerequisites
- Node.js (v18+)
- Financial Data API Key (Recommended: [Financial Modeling Prep](https://site.financialmodelingprep.com/))

## Local Development
1. Clone the repository.
2. Run `npm install`.
3. Create a `.env` file based on `.env.example`.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

## Deployment to Vercel
1. Set up a new project on [Vercel](https://vercel.com).
2. Connect your GitHub repository.
3. Add the environment variable `FINANCIAL_API_KEY`.
4. Deploy.

## Technology Stack
- **Frontend**: Vanilla JS, Leaflet, Lightweight Charts, Tailwind CSS.
- **Backend**: Node.js (CommonJS for Vercel Serverless Functions).
- **Styling**: JetBrains Mono (Typography), Dark-Brutalist (Theme).
