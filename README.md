# Slate

An applicant tracking system (ATS). Organisations post jobs, define per-job screening
criteria, receive applications through a public (and embeddable) careers portal, and move
candidates through a configurable hiring pipeline.

Built for the 7CS069 web application assessment, but engineered as a real product:
scalable, secure, performant, and fast enough that the UI feels instantaneous.

## Stack

| Layer      | Choice                                                        |
|------------|---------------------------------------------------------------|
| Frontend   | React 19 + Vite, TypeScript,Tanstack Router (file and folder routing...item/index.tsx and item/route.tsx or item/$id/index.tsx and item/$id/route.tsx), TanStack Query, Tailwind + shadcn/ui + biome + t3env + tanstack store (if necessary) |
| Backend    | Laravel (current stable and we have laragon installed) REST API, Sanctum auth               |
| Database   | PostgreSQL (full-text search via `tsvector`)                  |
| Storage    | AWS S3 (private bucket, presigned URLs)   (for local dev we use an upload folder not tracked or committed. )                    |
| Hosting    | EC2 (Nginx + PHP-FPM) · RDS Postgres · S3 + CloudFront        |
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
docker compose up -d           # postgres

# api
cd apps/api
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve

# web
cd apps/web
cp .env.example .env
npm install
npm run dev
```

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

## Docs index

- `docs/01-product-and-phases.md` — scope, decisions, formative vs final split, rubric map
- `docs/02-architecture.md` — system + AWS design, auth, embedding, security checklist
- `docs/03-data-model.md` — schema, indexes, seeds
- `docs/04-api-spec.md` — REST conventions and endpoints
- `docs/05-screening-criteria.md` — the job-criteria validation feature
- `docs/06-design-system.md` — UI direction and the "instantaneous" techniques
- `docs/07-testing-and-performance.md` — Task 2: tests + Lighthouse
- `docs/08-project-management.md` — milestones, labels, issues, PR flow (gh CLI), commit policy
- `docs/09-dev-log.md` — running decision log + reflection raw material
