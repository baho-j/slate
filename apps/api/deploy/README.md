# Deployment

Slate deploys to Azure as a fully managed stack. A push to `main` triggers
`.github/workflows/deploy.yml`, which deploys both halves.

## Topology

| Component | Azure resource | Notes |
|-----------|----------------|-------|
| SPA       | Blob Storage static website (`$web`) | built with Vite, `VITE_API_URL` baked in |
| API       | App Service (Linux, PHP 8.3)         | Laravel; nginx root pointed at `public/` |
| Database  | Azure Database for PostgreSQL (Flexible) | `sslmode=require` |
| CV files  | Blob Storage private container       | SAS upload/download |

The SPA and API are on separate hosts, so auth uses cross-site cookies:
`SESSION_SAME_SITE=none`, `SESSION_SECURE_COOKIE=true`, `SANCTUM_STATEFUL_DOMAINS`
set to the SPA host, and CORS (`FRONTEND_URL`) allows the SPA origin with credentials.

## App Service specifics

- `startup.sh` is the App Service startup command. It repoints the built-in nginx document root
  to `public/` (via `nginx-default`), then runs `migrate --force`, seeds the demo data, and
  caches config/routes. It runs in the runtime container on each start (the Kudu/SCM container
  has no PHP, so migrations can't run there), and everything it does is idempotent.
- Server-side Oryx build is disabled; CI ships a prebuilt `vendor/` (`composer install --no-dev`).
- `SESSION_DRIVER=cookie` in production — the SPA and API are on separate hosts, so sessions ride
  encrypted client cookies (no `sessions` table, nothing to share across App Service instances).

## CD credentials (GitHub secrets)

- `AZURE_WEBAPP_PUBLISH_PROFILE` — App Service publish profile (API deploy)
- `AZURE_WEBAPP_NAME` — the web app name
- `AZURE_SPA_ACCOUNT` / `AZURE_SPA_STORAGE_KEY` — the SPA storage account + key (blob upload)

Runtime configuration lives in App Service application settings, not in the repo.
