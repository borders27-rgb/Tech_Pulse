# TechPulse

TechPulse is a trend intelligence platform that aggregates signals from multiple sources (news, YouTube, Reddit, and more) and exposes them through a unified dashboard and API.

## Structure

- **`apps/web`** – canonical frontend built with Next.js (App Router). The homepage is located at `apps/web/app/page.js` and fetches live aggregated data from the Worker backend.
- **`apps/worker`** – canonical backend implemented as a Cloudflare Worker. It aggregates RSS/Atom feeds defined in the `FEEDS` environment variable and exposes them via `/aggregate`.

Legacy static pages and duplicate front-end implementations have been removed to avoid confusion. The only frontend entry point is `apps/web/app/page.js`.

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

The canonical deployment path is:

1. Deploy `apps/worker` to Cloudflare Workers.
2. Enable its production `workers.dev` URL.
3. Set `TECHPULSE_AGGREGATE_URL` in Vercel to that URL plus `/aggregate`.
4. Deploy `apps/web` to Vercel.

The frontend uses dynamic server rendering, so GitHub Pages and static export are not supported deployment targets.
