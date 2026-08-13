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

The SPA and API are on separate hosts, so auth uses Sanctum personal access tokens
instead of cookies: login returns a bearer token, the SPA stores it and sends
`Authorization: Bearer`, and CORS (`FRONTEND_URL`) allows the SPA origin.

## App Service specifics

- `startup.sh` is the App Service startup command. It repoints the built-in nginx document root
  to `public/` (via `nginx-default`), then runs `migrate --force`, seeds the demo data, and
  caches config/routes. It runs in the runtime container on each start (the Kudu/SCM container
  has no PHP, so migrations can't run there), and everything it does is idempotent.
- Server-side Oryx build is disabled; CI ships a prebuilt `vendor/` (`composer install --no-dev`).

## Queue worker (email notifications)

Email notifications (applied, stage change, interview scheduled) are queued Laravel
notifications — no request ever blocks on mail. The queue uses the `database` driver
(`queue_jobs` table), so no extra infrastructure is needed.

`startup.sh` launches `php artisan queue:work` in the background on each container start:

- `--tries=3` `--backoff=30` — three attempts, 30s apart, before a job is parked.
- `--max-time=3600` — the worker exits hourly and App Service's startup command respawns it,
  so a new deploy's code is always picked up (queued jobs hold a serialized payload, not stale
  code, but the worker process itself must be recycled to load new classes).
- Tunable via the `QUEUE_TRIES` / `QUEUE_BACKOFF` application settings.

Because App Service Linux runs one container, the worker lives beside nginx rather than under
systemd/supervisor. If the API is scaled out, only one instance should own the worker (or move
the queue to a dedicated always-on instance) to avoid duplicate sends.

### Failed jobs

A job that exhausts its `--tries` is written to the `failed_jobs` table with its exception.
Operational runbook:

```bash
php artisan queue:failed        # list failed jobs
php artisan queue:retry <id>    # requeue one (or `all`)
php artisan queue:flush         # discard failed jobs after triage
```

A transient mail outage (e.g. an ACS 429/503) surfaces as a thrown request exception, so the
job fails and retries per the backoff rather than being silently dropped.

## Mail (Azure Communication Services)

Production sends through **Azure Communication Services Email** via a small in-repo Symfony
transport (`App\Mail\Transport\AzureCommunicationTransport`), registered as the `acs` mailer.
It signs each request with HMAC-SHA256 using the ACS access key — no third-party dependency
handles the key. Set as application settings (never in the repo):

- `MAIL_MAILER=acs`
- `ACS_EMAIL_ENDPOINT` — e.g. `https://slate-acs.europe.communication.azure.com/`
- `ACS_EMAIL_KEY` — the ACS access key
- `MAIL_FROM_ADDRESS` — a sender on the linked ACS domain, e.g.
  `donotreply@<subdomain>.azurecomm.net`

Dev keeps `MAIL_MAILER=log` (or `smtp` → Mailpit) so nothing real is sent from a dev box.

The ACS resources (`slate-acs` Communication Service, `slate-email` Email Communication Service,
and an Azure-managed domain) live in the `slate-ats-app` resource group.

## CD credentials (GitHub secrets)

- `AZURE_WEBAPP_PUBLISH_PROFILE` — App Service publish profile (API deploy)
- `AZURE_WEBAPP_NAME` — the web app name
- `AZURE_SPA_ACCOUNT` / `AZURE_SPA_STORAGE_KEY` — the SPA storage account + key (blob upload)

Runtime configuration lives in App Service application settings, not in the repo.
