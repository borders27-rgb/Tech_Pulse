# TechPulse

TechPulse uses a single frontend and backend source of truth:

- `apps/web` is the canonical frontend
- `apps/worker` is the canonical backend aggregation API

## Canonical entry points

- Frontend: `apps/web/app/page.js` (only frontend entry page)
- Backend: `apps/worker/src/index.ts` (`/aggregate`, `/health`)

The old root static frontend is removed. Frontend data is live Worker aggregate data (no mock/demo/random local feed generation).

## Web setup (`apps/web`)

1. Create `apps/web/.env.local` (copy from `apps/web/.env.example`):

```bash
TECHPULSE_AGGREGATE_URL=https://your-worker-subdomain.workers.dev/aggregate
```

2. Run the app:

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000`.

## Worker setup (`apps/worker`)

1. Configure `FEEDS` in `apps/worker/wrangler.toml` (comma-separated RSS/Atom URLs).
2. Run locally:

```bash
cd apps/worker
bun install
bunx wrangler dev
```

Common local Worker URL: `http://127.0.0.1:8787`.

## Workflows

- `.github/workflows/deploy-pages.yml` is a **web build check** for `apps/web` only.
- `.github/workflows/deploy-worker-workflow.yml` handles Worker deployment.

This keeps workflow behavior aligned with the current architecture and avoids implying a legacy static Pages frontend deploy.
