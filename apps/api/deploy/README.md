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

- `nginx-default` repoints the built-in nginx document root to `public/` and routes
  through `index.php`. It's applied by the startup command
  `cp .../deploy/nginx-default /etc/nginx/sites-available/default && service nginx reload`.
- Server-side Oryx build is disabled; CI ships a prebuilt `vendor/` (`composer install --no-dev`).
- After each deploy the workflow runs `php artisan migrate --force` (plus config/route cache)
  on the app host via the Kudu command API.

## CD credentials (GitHub secrets)

- `AZURE_WEBAPP_PUBLISH_PROFILE` — App Service publish profile (API deploy + Kudu migrate)
- `AZURE_WEBAPP_NAME` — the web app name
- `AZURE_SPA_ACCOUNT` / `AZURE_SPA_STORAGE_KEY` — the SPA storage account + key (blob upload)

Runtime configuration lives in App Service application settings, not in the repo.
