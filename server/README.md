# Book Quality Assessor — Backend

Laravel 12 + Postgres + Sanctum API for assessing quality of textbooks, reference books, and e-books across configurable rubric criteria (accuracy, relevance, readability, engagement, etc.).

Frontend (Next.js) lives in `../client` and consumes `/api/v1/*`.

## Stack

- PHP 8.2+ / Laravel 12
- PostgreSQL 14+ (Docker locally)
- Laravel Sanctum (token + SPA auth)
- Laravel Socialite (Google + GitHub OAuth login)
- Google Books + Open Library + Project Gutenberg (Gutendex) providers
- In-house readability service (Flesch–Kincaid, Gunning Fog, SMOG)
- Redis (optional, queue/cache)

## Local setup

```bash
cp .env.example .env
composer install
php artisan key:generate
# Create Postgres DB matching DB_DATABASE/DB_USERNAME/DB_PASSWORD
php artisan migrate --seed
php artisan serve --port=8000
```

Default admin (from `.env`): `admin@example.com` / `password`.

## Docker

```bash
docker compose up --build
```

API at `http://localhost:8080`. Postgres on 5432. Redis on 6379.

## API surface (`/api/v1`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | public | reviewer/student/educator self-signup |
| POST | `/auth/login` | public | returns bearer token |
| GET  | `/auth/{provider}/redirect` | public | provider ∈ {google, github}, 302 to OAuth |
| GET  | `/auth/{provider}/callback` | public | bounces to `OAUTH_FRONTEND_REDIRECT?token=...` |
| POST | `/auth/logout` | bearer | revokes current token |
| GET  | `/auth/me` | bearer | current user |
| GET  | `/books` | bearer | `?q=&type=&per_page=` |
| POST | `/books` | educator+ | manual create |
| GET  | `/books/{book}` | bearer | |
| PUT  | `/books/{book}` | educator+ | |
| DELETE | `/books/{book}` | admin | |
| GET  | `/books/external/search` | bearer | `?q=&limit=` (Google + OpenLib) |
| POST | `/books/import` | educator+ | `{source, external_id, type}` |
| GET  | `/books/{book}/assessments` | bearer | submitted only |
| GET  | `/books/{book}/readability` | bearer | optional `?gutendex_id=`; falls back to description |
| POST | `/readability/score` | bearer | `{text}` → readability metrics |
| GET  | `/criteria` | bearer | |
| POST | `/criteria` | admin | rubric admin |
| PUT/DELETE | `/criteria/{criterion}` | admin | |
| GET  | `/assessments` | bearer | own + submitted |
| POST | `/assessments` | reviewer+ | with optional `scores[]` |
| PUT  | `/assessments/{assessment}` | owner/admin | edit while draft |
| POST | `/assessments/{assessment}/submit` | owner | locks + computes overall |
| GET/POST/PUT/DELETE | `/institutions` | mixed (admin write) | multi-tenant |

## OAuth flow

1. Frontend opens `GET /api/v1/auth/google/redirect` (or `/github/redirect`) in a new tab/window.
2. User approves on provider; provider hits `/api/v1/auth/{provider}/callback`.
3. Server creates/links the user (matched by provider+id, then by email) and issues a Sanctum token.
4. Server 302-redirects to `OAUTH_FRONTEND_REDIRECT?token=<bearer>`. Frontend reads the `token` query param, stores it, and uses it as `Authorization: Bearer ...`.

Errors come back as `?error=invalid_state|oauth_failed|email_missing`.

## Readability scoring

`POST /api/v1/readability/score` with `{text}` returns Flesch Reading Ease, Flesch–Kincaid Grade, Gunning Fog, SMOG, and a normalized 0–100 score.

`GET /api/v1/books/{id}/readability` tries to find a sample on Project Gutenberg (Gutendex) by title, falls back to `book.description`. Pass `?gutendex_id=` to force a specific Gutenberg book.

## Roles

`admin`, `educator`, `reviewer` (default), `student`. See `App\Enums\Role`.

## Scoring

Weighted average across active criteria: `Σ(weight × value) / Σ(weight)`. Recomputed on every score change and on submit. Default criteria seeded: accuracy, relevance, readability, engagement, depth, pedagogy.

## Tests

```bash
php artisan test
```

Tests use sqlite in-memory (fast). Production runs on Postgres.

## Deployment

- `Dockerfile` is multi-stage, runs migrations on boot, listens on `$PORT` (defaults 8080) — works on Render, Railway, Fly.io.
- Production env: set `APP_ENV=production`, `APP_DEBUG=false`, real `DB_*`, `GOOGLE_BOOKS_API_KEY` (optional), `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`.
- Run `php artisan db:seed --class=CriterionSeeder` once after first deploy if you want default rubric.

## Required credentials

Provide before deploy:

- `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- `APP_URL`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, `OAUTH_FRONTEND_REDIRECT`
- `GOOGLE_BOOKS_API_KEY` (optional — anonymous works, but rate-limited)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (for Google login)
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI` (for GitHub login)
- Mail driver creds if you wire password reset / verify (Resend/Mailtrap/SES)
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` for first admin

Project Gutenberg (Gutendex) and Open Library require no credentials.
