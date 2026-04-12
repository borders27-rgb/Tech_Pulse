# TechPulse

TechPulse is a trend intelligence platform that aggregates signals from multiple sources (news, YouTube, Reddit, and more) and exposes them through a unified dashboard and API.

## Structure

- **`apps/web`** – canonical frontend built with Next.js (App Router). The homepage is located at `apps/web/app/page.js` and fetches live aggregated data from the Worker backend.
- **`apps/worker`** – canonical backend implemented as a Cloudflare Worker. It aggregates RSS/Atom feeds defined in the `FEEDS` environment variable and exposes them via `/aggregate`.

Legacy static pages and duplicate front‑end implementations have been removed to avoid confusion. The **only** frontend entry point is `apps/web/app/page.js`.

## Local Development

### Worker

```bash
cd apps/worker
bun install
bunx wrangler dev
```

### Web

Create a `.env.local` file in `apps/web`:

```bash
TECHPULSE_AGGREGATE_URL=http://127.0.0.1:8787/aggregate
```

Then run:

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:3000/ to view the dashboard.

## Deployment

Deploy the Worker using Cloudflare Wrangler. For the frontend, build with `next build` (no static export) and deploy the output to a platform that supports serverless functions or dynamic environments. GitHub Pages is not suited for dynamic fetches; instead use Vercel or another serverless host.
