
# TechPulse (Demo-Ready)

A polished, client-first dashboard to **aggregate tech news**, **extract entities & concepts**, compute a **Novelty Index**, and map topics to **market tickers** with an extensible architecture.

> Built to align with your feasibility brief. Open it directly in Canvas or a browser. All state persists locally.

## Quick Start
1. Open `index.html` (Canvas → Import the ZIP → open `index.html`).
2. You’ll see **Demo Mode** with bundled data. Click **Live mode** (toggle the “Demo data” button) when you’ve added real sources and a CORS proxy.
3. Add tickers to **Watchlist**. If you add an **Alpha Vantage** key in Settings, price sparklines fetch live daily data (free tier; rate-limited).
4. Use **Alerts** → **New Alert** to add simple rules (`noveltyAbove`, `priceJumpPct`). Click **Evaluate Now** to test.

## Features
- **Unified Feed**: Hacker News API, generic RSS (via naive client parser; use a CORS proxy for most feeds), YouTube placeholder.
- **Trend Grouping**: Keyword/concept overlap; auto-detected tickers; cluster labeling.
- **Novelty Index**: Recency × velocity × source diversity (0–100).
- **Watchlist**: Chart.js sparklines with mock or Alpha Vantage data.
- **Alerts**: Threshold rules with one-click evaluation (simple demo logic).
- **LLM Hook**: Optional endpoint + bearer token for deeper extraction/summaries.
- **Offline-friendly**: Basic service worker caching.

## Settings → Integrations
- **CORS Proxy**: For RSS and some APIs, set a proxy like `https://your-proxy.example.com/fetch?url=` then all fetches will be routed through it.
- **LLM Endpoint**: Any endpoint that accepts `{ input: <text> }` and returns JSON (e.g., `{ concepts:[], companies:[], summary:"" }`). The code is intentionally thin so you can wire your internal LLM.
- **Alpha Vantage**: Paste a key to enable live daily prices for your watchlist (fallbacks to mock data otherwise).

## Add/Manage Sources
- **Settings → Sources → Add RSS/JSON feed URL** to extend.
- Out of the box includes: HN frontpage (JSON), TechCrunch RSS, The Verge RSS, and a YouTube placeholder card.
- For Twitter/Reddit long-term: swap in official APIs or your server-side collectors (client-side scraping is brittle).

## Files
- `index.html` — app shell and views
- `assets/css/styles.css` — dark, high-contrast, modern UI
- `assets/js/mock_data.js` — demo articles + prices
- `assets/js/store.js` — localStorage persistence
- `assets/js/analyzers.js` — keyword extraction, clustering, novelty, LLM hook
- `assets/js/connectors.js` — HN/RSS/YT connectors + Alpha Vantage utility
- `assets/js/ui.js` — rendering + controls
- `assets/js/main.js` — app state, sorting, alerts, hydration
- `service-worker.js`, `manifest.json`, `favicon.png`

## Roadmap Hooks (matching your study)
- **Supply-chain relationship mapping**: add a `relationships` table and extend `analyzeWithLLM()` to extract tuples like `(A supplies B: component, confidence)`; render under Trend Details.
- **Google Trends**: a server-side microservice can fetch interest-over-time for keywords to strengthen novelty scoring.
- **Backtesting**: store historical novelty per trend; correlate with price deltas to surface “moved before” scenarios.
- **Notifications**: wire OneSignal/email/SMS for real push. The in-app alerts are demo-grade today.

## Notes
- Client-only demo minimizes setup friction. For production reliability and API compliance, move fetching to a tiny Node/Python backend and expose a single CORS-safe endpoint for the UI.
- Respect content usage: show short snippets, credit/link sources. This app limits itself to headlines + brief summaries.

––
Enjoy, and customize aggressively. The architecture is deliberately modular so you can swap connectors or scoring logic without touching the UI.
