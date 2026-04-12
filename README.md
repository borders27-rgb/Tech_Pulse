# TechPulse

TechPulse is organized as a two-app monorepo with one canonical frontend and one canonical backend:

- `apps/web` → canonical Next.js frontend
- `apps/worker` → canonical Cloudflare Worker aggregation API

## Canonical entry points

- Frontend entry point: `apps/web/app/page.js` (the only homepage implementation)
- Backend aggregate endpoint: `apps/worker/src/index.ts` at `/aggregate`

The frontend renders live Worker data from `/aggregate` and no longer uses mock/demo signal generation.
Duplicate frontend paths and legacy competing static frontend artifacts were removed.

## Web app (`apps/web`)

### Environment

Create `apps/web/.env.local` (you can copy `apps/web/.env.example`):

```bash
TECHPULSE_AGGREGATE_URL=https://your-worker-subdomain.workers.dev/aggregate
```

`NEXT_PUBLIC_AGGREGATE_URL` is supported as a fallback, but `TECHPULSE_AGGREGATE_URL` is preferred.

### Run locally

```bash
cd apps/web
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Worker (`apps/worker`)

The Worker exposes:

- `GET /health`
- `GET /aggregate`

`/aggregate` fetches feeds from `FEEDS`, parses RSS/Atom items, deduplicates by link, sorts by newest date, and returns:

```json
{
  "items": [],
  "count": 0,
  "generatedAt": "2026-04-12T00:00:00.000Z"
}
```

### Configure feeds

Set `FEEDS` in `apps/worker/wrangler.toml` or with `wrangler secret put`/environment config:

```toml
[vars]
FEEDS = "https://example.com/rss,https://hnrss.org/frontpage"
```

### Run locally

```bash
cd apps/worker
bun install
bunx wrangler dev
```

The default local Worker URL is typically `http://127.0.0.1:8787`.
