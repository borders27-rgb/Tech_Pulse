# TechPulse

TechPulse has one canonical frontend and one canonical backend:

- `apps/web` = canonical frontend
- `apps/worker` = canonical backend aggregation API

## Source of truth

- Only frontend entry point: `apps/web/app/page.js`
- Canonical backend entry point: `apps/worker/src/index.ts`

The old root static site is removed and is **not** the app anymore. GitHub Pages must deploy the canonical `apps/web` output.

## Why the old Pages URL showed the wrong frontend

`https://borders27-rgb.github.io/Tech_Pulse/` was serving legacy root static artifacts (`index.html`-style flow) rather than a deployment artifact built from `apps/web`. This made Pages open the old TechPulse Signals page instead of the canonical Next frontend.

## Local development

### 1) Worker (`apps/worker`)

Configure feeds in `apps/worker/wrangler.toml` (`FEEDS`), then run:

```bash
cd apps/worker
bun install
bunx wrangler dev
```

### 2) Web (`apps/web`)

Create `apps/web/.env.local` (or set repo variable for Pages):

```bash
TECHPULSE_AGGREGATE_URL=https://your-worker-subdomain.workers.dev/aggregate
```

Fallback is also supported:

```bash
NEXT_PUBLIC_AGGREGATE_URL=https://your-worker-subdomain.workers.dev/aggregate
```

Run locally:

```bash
cd apps/web
npm install
npm run dev
```

## GitHub Pages deployment (canonical frontend only)

Workflow: `.github/workflows/deploy-pages.yml`

- Builds from `apps/web` only
- Publishes `apps/web/out` as the Pages artifact
- Does **not** use root legacy static files

Set one repo variable for Pages runtime fetch:

- `NEXT_PUBLIC_AGGREGATE_URL` (recommended)

Optional:

- `TECHPULSE_AGGREGATE_URL`

After merge to `main`, the Pages workflow deploys the canonical frontend.
