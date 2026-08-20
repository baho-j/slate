# Slate

An applicant tracking system (ATS). Organisations post jobs, define per-job screening
criteria, receive applications through a public (and embeddable) careers portal, and move
candidates through a configurable hiring pipeline.

Built for the 7CS069 web application assessment, but engineered as a real product:
scalable, secure, performant, and fast enough that the UI feels instantaneous.

## Stack

| Layer      | Choice                                                        |
|------------|---------------------------------------------------------------|
| Frontend   | React 19 + Vite, TypeScript,Tanstack Router (file and folder routing...item/index.tsx and item/route.tsx or item/$id/index.tsx and item/$id/route.tsx), TanStack Query, Tailwind + shadcn/ui + Biome + t3env + tanstack store (if necessary) |
| Backend    | Laravel (current stable and we have laragon installed) REST API, Sanctum auth               |
| Database   | PostgreSQL (full-text search via `tsvector`)                  |
| Storage    | Azure Blob Storage (SAS presigned upload/download; Azurite emulator for local dev) |
| Hosting    | Azure App Service (Nginx + PHP-FPM) · Azure Database for PostgreSQL · Blob static site + CDN |
| Async      | Laravel queues (emails, file post-processing)                 |

> Pin exact framework versions at scaffold time (`composer create-project`, `npm create vite`).
> Do not hardcode a version from this doc — verify current stable when you initialise.

## Monorepo layout

```
slate/
  apps/
    api/            # Laravel REST API
    web/            # React + Vite SPA
  .github/          # workflows, issue/PR templates
  docker-compose.yml
  README.md
```

## Quickstart (local)

```bash
# infra
docker compose up -d           # postgres + azurite (Blob emulator)

# api
cd apps/api
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve

# web (pnpm workspace — run from repo root)
cp apps/web/.env.example apps/web/.env
pnpm install
pnpm dev
```

By default, file uploads (CVs, org logos) use a local filesystem disk — nothing else to set
up. To exercise the real Blob presign → PUT → store flow locally, use Azurite (below).

## Uploads locally with Azurite

`docker compose up -d` starts [Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite),
Azure's Blob emulator, on `127.0.0.1:10000`. To route the CV and logo disks at it:

```bash
# 1. Create the two containers (logos is public-read so the careers header can load it).
#    Requires the Azure CLI; the connection string is Azurite's well-known dev value.
CS="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
az storage container create --name cvs   --connection-string "$CS"
az storage container create --name logos --connection-string "$CS" --public-access blob

# 2. In apps/api/.env, switch the disks to azure and point them at Azurite
#    (the exact lines are in apps/api/.env.example under "Local Blob via Azurite"):
#      CV_DISK=azure
#      LOGO_DISK=azure
#      AZURE_STORAGE_CONNECTION_STRING="<the CS above>"
#      AZURE_LOGO_URL=http://127.0.0.1:10000/devstoreaccount1/logos

# 3. Restart `php artisan serve`. Apply to a job with a CV, or upload an org logo in
#    Settings — the file lands in Azurite, and `az storage blob list` will show it:
az storage blob list --container-name cvs --connection-string "$CS" --output table
```

Without the Azure CLI, any Azurite-aware tool (Azure Storage Explorer, `azurite` REST) can create
the containers. Set `CV_DISK`/`LOGO_DISK` back to `local` to return to the filesystem disk.

## Tests

```bash
# api — Pest against a real Postgres
cd apps/api && php artisan test

# web — Vitest + Testing Library (from repo root)
pnpm test

# api contract — Newman, against a running, seeded API
npx newman run apps/api/postman/slate.postman_collection.json
```

CI runs all three on every PR to `main`, plus Pint, Biome, `tsc` and a production build.
A red pipeline blocks the merge.

## Seeded demo credentials

All demo users share the password `password` and are created by `DemoSeeder`.
They are surfaced on the login screen (a "Demo accounts" helper) for the assessor.

| Role         | Email                     |
|--------------|---------------------------|
| Super Admin  | admin@slate.test          |
| HR Manager   | hr@slate.test             |
| Recruiter    | recruiter@slate.test      |
| Interviewer  | interviewer@slate.test    |
| Candidate    | candidate@slate.test      |

The staff accounts above belong to the **Acme** demo organisation. `DemoSeeder` also creates a
second organisation, **Globex**, with its own HR/recruiter/interviewer staff
(`hr@globex.test`, `recruiter@globex.test`, `interviewer@globex.test`, same password) so
org-scoped isolation is visible. Run with `php artisan migrate --seed`.
