# TechPulse

TechPulse is a trend-intelligence platform that aggregates external signals and presents them through one canonical frontend and one canonical backend.

## Canonical architecture

- `apps/web` — Next.js App Router frontend. `apps/web/app/page.js` is the only homepage entry point.
- `apps/worker` — Cloudflare Worker backend. It exposes `/health` and `/aggregate`.

Legacy static implementations and duplicate frontends have been removed. Do not add another production entry point outside these two applications.

## Local development

Requirements:

- Node.js 20.9 or newer
- npm

### Start the Worker

```bash
cd apps/worker
npm install
npm run dev
```

The Worker runs locally at `http://127.0.0.1:8787` by default.

### Start the web app

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Configuration

### Worker

`apps/worker/wrangler.toml` defines:

- `FEEDS` — comma-separated RSS or Atom feed URLs
- `CORS_ORIGIN` — optional allowed frontend origin; defaults to `*`

The aggregator validates feed URLs, limits feed count and response size, times out slow sources, canonicalizes article links, deduplicates results, and reports partial source failures without failing the whole request.

### Web

`TECHPULSE_AGGREGATE_URL` must point to the canonical Worker `/aggregate` endpoint.

## Validation

```bash
cd apps/web && npm run build
cd apps/worker && npm run typecheck
```

GitHub Actions performs both checks on pull requests. Worker deployment runs only from `main` and requires these repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Deployment

- Deploy `apps/worker` to Cloudflare Workers.
- Deploy `apps/web` to a Next.js-capable host such as Vercel.
- Do not deploy the dynamic web application to GitHub Pages.
