# Wheelhouse — Vehicle Rental Management System

A production-shaped MERN application where **customers** find and rent cars, SUVs, bikes and vans, and **owners** list vehicles and run the rental lifecycle — from request to hand-over to return and review. It is built as a **modular monolith** (one stateless Express API with clean internal module boundaries) and deploys to **AWS** (CloudFront, S3, ALB, ECS Fargate, MongoDB Atlas) with **Terraform** and **GitHub Actions**.

> Deeper reading: [docs/architecture.md](docs/architecture.md) (design decisions, booking concurrency, scaling) · [docs/deployment.md](docs/deployment.md) (step-by-step AWS rollout) · live API reference at `/api/v1/docs`.

---

## Contents

1. [Features](#features) · 2. [Architecture](#architecture) · 3. [Tech stack & versions](#tech-stack--versions) · 4. [Folder structure](#folder-structure) · 5. [Local setup](#local-setup) · 6. [Environment variables](#environment-variables) · 7. [MongoDB setup](#mongodb-setup) · 8. [Docker](#docker) · 9. [API](#api) · 10. [Database models](#database-models) · 11. [Authentication & authorization](#authentication--authorization) · 12. [Booking logic](#booking-logic) · 13. [AWS architecture](#aws-architecture) · 14. [Terraform](#terraform) · 15. [CI/CD & deployment](#cicd--deployment) · 16. [Security](#security) · 17. [Testing](#testing) · 18. [Assumptions](#assumptions) · 19. [Future improvements](#future-improvements)

---

## Features

**Customers** — register/login (email + password, optional Google) · browse, search-as-you-type and filter by type, location, price and **dates** (server-side, paginated) · vehicle details with photo gallery, features, rating and reviews · **availability calendar** · pick dates, check availability and see a live estimate · rent (server re-checks and prices) · booking confirmation · upcoming / active / previous rentals · cancel eligible bookings · review returned rentals, edit own reviews · **wishlist** · **PDF invoices** · **coupons** · **real-time notifications**.

**Owners** — add/edit vehicles with **direct-to-S3 photo uploads** · list own vehicles · pause/resume bookings · delete vehicles without active bookings (soft delete keeps history) · see bookings with customer contact details · approve / decline · mark handed over / returned · dashboard with total vehicles, active rentals, revenue, average rating, recent bookings, upcoming rentals and a six-month earnings chart.

**Platform** — overlap-proof booking under concurrency · server-side pricing with historical price snapshots · centralised booking state machine · role + ownership authorization on every operation · consistent JSON envelopes and error codes · loading / empty / error / success states everywhere · responsive, accessible UI with reduced-motion support · OpenAPI docs · structured logs, metrics, alarms and a dashboard.

**Demo accounts** (after seeding — password `Password123` for all): `customer@demo.com`, `customer2@demo.com`, `owner@demo.com`, `owner2@demo.com`. Coupons: `WELCOME10`, `FLAT500`.

---

## Architecture

```
                         Users
                           │
                       Route 53  ── app.example.com (alias)
                           │
                       CloudFront ── ACM (us-east-1), security headers, HTTP/3
            ┌──────────────┼──────────────────────────┐
         /* (default)   /api/*  (no cache)        /media/*
            │              │   + secret origin header │
      S3: web bucket      ALB ── ACM, HTTPS only    S3: media bucket
      (React SPA, OAC)     │   SG: CloudFront only   (vehicle photos, OAC)
                           │                            ▲
                 ECS Fargate (private subnets)          │ presigned PUT
                 Express API task 1..N  ────────────────┘ (browser → S3 directly)
                    │        │       │
       MongoDB Atlas      Secrets   CloudWatch
       (via NAT egress,   Manager   (logs, metrics, alarms, dashboard)
        IP-allow-listed)
                 ECR stores images · GitHub Actions builds & deploys (OIDC) · Terraform manages all of it
```

**Modular monolith.** One Express app; each domain (auth, users, vehicles, availability, bookings, reviews, wishlist, uploads, invoices, realtime) has its own route → controller → service → repository files. Modules talk through service interfaces, never through each other's models, so any of them could be extracted later.

```
Route → Controller (parse input, call service, send envelope)
      → Service    (business rules, authorization by ownership, transactions)
      → Repository (all Mongoose queries, indexes in mind)
      → MongoDB
e.g. booking.routes → booking.controller → booking.service → availability.service → booking.repository → MongoDB
```

**Stateless API.** No sessions, no in-memory caches, no local files. Identity is a JWT; rate-limit counters live in MongoDB; Socket.IO broadcasts across tasks through the **MongoDB adapter**; photos go to S3. Any request can hit any task, so ECS can run 1…N tasks behind the ALB and autoscale.

**Shared packages.** `packages/shared-types` (enums, DTOs, the booking transition table) and `packages/validation` (Zod schemas and date helpers) are used by both the API (enforcement) and the web app (UX), so rules can't drift.

---

## Tech stack & versions

| Layer    | Technology                                                                                                                                                                                                                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | React 19.3, TypeScript 5.9, Vite 7.3, React Router 7.18, Tailwind CSS 4.3, TanStack Query 5.104, Axios 1.20, React Hook Form 7.89, Zod 4.6, Motion 12.43, socket.io-client 4.8, lucide-react                                                                                                                   |
| Backend  | Node.js 22 (≥ 20.19), Express 5.2, Mongoose 8.24 (MongoDB driver 6.20), Zod 4.6, jsonwebtoken 9, bcryptjs 3 (bcrypt algorithm, cost 12), Helmet 8, CORS, express-rate-limit 8, pino 9 + pino-http, Socket.IO 4.8 + MongoDB adapter, AWS SDK v3 (S3 presigner), pdfkit, google-auth-library, swagger-ui-express |
| Database | MongoDB Atlas (replica set — required for transactions); MongoDB 7 locally                                                                                                                                                                                                                                     |
| Testing  | Vitest 5, Supertest, mongodb-memory-server (in-memory **replica set**), socket.io-client                                                                                                                                                                                                                       |
| Infra    | Docker (multi-stage, non-root), Terraform ≥ 1.6 (AWS provider 5.x, MongoDB Atlas provider 1.x), GitHub Actions (OIDC to AWS)                                                                                                                                                                                   |
| AWS      | Route 53, ACM, CloudFront, S3, ALB, ECS Fargate, ECR, Secrets Manager, CloudWatch, VPC, IAM, Application Auto Scaling, SNS                                                                                                                                                                                     |

---

## Folder structure

```
vehicle-rental-platform/
├── apps/
│   ├── api/                      Express API (modular monolith)
│   │   ├── src/
│   │   │   ├── config/           env (Zod-validated), logger, database
│   │   │   ├── controllers/      thin HTTP adapters
│   │   │   ├── docs/             OpenAPI document
│   │   │   ├── jobs/             idempotent scheduled jobs
│   │   │   ├── mappers/          model → DTO allow-lists
│   │   │   ├── middleware/       authenticate, requireRole, rate limit, errors
│   │   │   ├── models/           Mongoose schemas + indexes
│   │   │   ├── realtime/         Socket.IO server + notifications
│   │   │   ├── repositories/     every database query
│   │   │   ├── routes/           /api/v1 routers
│   │   │   ├── scripts/seed.ts   demo data (refuses to run in production)
│   │   │   ├── services/         business logic (booking, availability, pricing, state machine, invoice/…)
│   │   │   ├── types/ utils/ validators/
│   │   │   ├── app.ts            app factory (shared by server and tests)
│   │   │   └── server.ts         boot, graceful shutdown
│   │   ├── test/                 API + integration tests
│   │   └── Dockerfile
│   └── web/                      React SPA
│       ├── src/
│       │   ├── api/              Axios client + error normalisation
│       │   ├── components/       common/ layout/ vehicles/ bookings/ reviews/ dashboard/
│       │   ├── constants/ context/ hooks/ routes/ schemas/ services/ types/ utils/
│       │   └── pages/            public/ auth/ customer/ owner/
│       ├── nginx.conf            local container: SPA fallback + /api proxy
│       └── Dockerfile
├── packages/
│   ├── shared-types/             enums, DTOs, booking transitions
│   └── validation/               Zod schemas + date helpers (+ tests)
├── infrastructure/terraform/
│   ├── modules/                  vpc ecs alb ecr s3 cloudfront iam monitoring dns atlas platform
│   └── environments/             dev/ prod/
├── .github/workflows/            ci.yml, deploy.yml
├── docs/                         architecture.md, deployment.md
├── scripts/                      health-check.sh, put-api-secret.sh
├── docker-compose.yml
└── package.json                  npm workspaces
```

`apps/web/src/schemas` re-exports the shared Zod schemas the forms use, so client and server validate with the same rules.

---

## Local setup

Prerequisites: **Node.js 22** (≥ 20.19), npm 10+, Docker Desktop (for MongoDB, or the whole stack).

```bash
npm install                       # installs all workspaces and builds the shared packages
docker compose up -d mongo storage storage-setup   # MongoDB replica set + S3-compatible storage
cp apps/api/.env.example apps/api/.env
npm run seed                      # demo users, vehicles, bookings, reviews, coupons
npm run dev:api                   # http://localhost:4000  (docs: /api/v1/docs)
npm run dev:web                   # http://localhost:5173  (proxies /api to :4000)
```

Useful scripts (root): `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format`.

---

## Environment variables

**API** (`apps/api/.env`, validated at startup — the process exits on invalid config):

| Variable                                                      | Default                    | Purpose                                         |
| ------------------------------------------------------------- | -------------------------- | ----------------------------------------------- |
| `NODE_ENV`                                                    | `development`              | `production` in AWS                             |
| `PORT`                                                        | `4000`                     | HTTP port                                       |
| `LOG_LEVEL` / `LOG_FORMAT`                                    | `info` / `json`            | `pretty` for local reading                      |
| `MONGODB_URI`                                                 | — (**secret**)             | Must point at a replica set (Atlas or local rs) |
| `MONGODB_MAX_POOL_SIZE`, `MONGODB_AUTO_INDEX`                 | `20`, `true`               | Pool size per task; index build on boot         |
| `JWT_SECRET`                                                  | — (**secret**, ≥ 32 chars) | HS256 signing key                               |
| `JWT_EXPIRES_IN_SECONDS`                                      | `86400`                    | Session and cookie lifetime                     |
| `COOKIE_SECURE`                                               | `false`                    | `true` behind HTTPS                             |
| `CORS_ORIGINS`                                                | —                          | Comma-separated browser origins                 |
| `TRUST_PROXY`                                                 | `0`                        | Proxy hops to trust (`2` = CloudFront + ALB)    |
| `BUSINESS_TIMEZONE`                                           | `Asia/Kolkata`             | Defines "today" for date rules                  |
| `RATE_LIMIT_*`, `AUTH_RATE_LIMIT_MAX`                         | 300/min, 20/min            | Shared (MongoDB-backed) limits                  |
| `S3_BUCKET`, `S3_REGION`, `S3_PUBLIC_BASE_URL`, `S3_ENDPOINT` | —                          | Photo uploads (endpoint only for local S3)      |
| `GOOGLE_CLIENT_ID`                                            | —                          | Enables Google sign-in                          |
| `ENABLE_JOBS`, `JOB_INTERVAL_MS`                              | `false`, 15 min            | Expire stale pending requests                   |
| `ENABLE_API_DOCS`                                             | `true`                     | Swagger UI at `/api/v1/docs`                    |

**Web** (`apps/web/.env`, public build-time values only): `VITE_GOOGLE_CLIENT_ID`. Backend secrets are never exposed to React; the SPA uses relative `/api` URLs everywhere.

---

## MongoDB setup

Transactions need a **replica set**. Locally, `docker compose` runs `mongo:7 --replSet rs0` and initiates it in its healthcheck; tests use an in-memory replica set.

**Atlas (production):** create a project, then either let Terraform manage the cluster (`atlas_project_id` variable → `modules/atlas`: dedicated **M10+** with continuous backups and compute auto-scaling, M0 for dev; a least-privilege `readWrite` user scoped to the cluster; network access limited to the VPC NAT IPs) or create it in the Atlas UI with the same settings. Put the cluster in the AWS region nearest the ECS region (e.g. `AP_SOUTH_1` ↔ `ap-south-1`). Store the SRV connection string in Secrets Manager as `MONGODB_URI` (see deployment guide). Indexes are declared on the schemas and created on boot.

---

## Docker

```bash
docker compose up --build -d
docker compose run --rm -e NODE_ENV=development api node apps/api/dist/scripts/seed.js
# app → http://localhost:8080   api → http://localhost:4000   docs → http://localhost:8080/api/v1/docs
```

| Service   | Image                 | Notes                                                                                                                  |
| --------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `web`     | `apps/web/Dockerfile` | Vite build served by unprivileged nginx; SPA fallback; `/api` (incl. WebSockets) proxied — same topology as CloudFront |
| `api`     | `apps/api/Dockerfile` | Multi-stage, production dependencies only, runs as `node` (non-root), `HEALTHCHECK` on `/health`                       |
| `mongo`   | `mongo:7`             | Single-node replica set                                                                                                |
| `storage` | SeaweedFS (S3 API)    | Local stand-in for S3: presigned PUT + public GET                                                                      |

---

## API

Base path **`/api/v1`**. Interactive docs: **`/api/v1/docs`** (OpenAPI 3.1 JSON at `/api/v1/openapi.json`).

```
Success  { "success": true,  "data": { … } }
Error    { "success": false, "code": "BOOKING_CONFLICT", "message": "Vehicle is already booked for the selected dates." }
```

| Area     | Endpoints                                                                                                                                                                                                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Health   | `GET /health` (liveness, ALB/ECS) · `GET /api/v1/health` (readiness incl. DB)                                                                                                                                                                                                                                                                                |
| Auth     | `POST /auth/register` · `POST /auth/login` · `POST /auth/google` · `POST /auth/onboarding` · `GET /auth/me` · `POST /auth/logout`                                                                                                                                                                                                                            |
| Users    | `GET/PATCH /users/me` · `GET /users/me/wishlist` · `GET /users/me/wishlist/ids` · `PUT/DELETE /users/me/wishlist/:vehicleId`                                                                                                                                                                                                                                 |
| Vehicles | `GET /vehicles` (search, type, location, minPrice, maxPrice, startDate, endDate, owner, sort, page, limit) · `GET /vehicles/my` · `GET /vehicles/:id` · `POST /vehicles` · `PUT /vehicles/:id` · `PATCH /vehicles/:id/availability` · `DELETE /vehicles/:id` · `GET /vehicles/:id/availability` · `GET /vehicles/:id/calendar` · `GET /vehicles/:id/reviews` |
| Bookings | `POST /bookings` · `GET /bookings/my` · `GET /bookings/my/summary` · `GET /bookings/:id` · `GET /bookings/:id/invoice` · `PATCH /bookings/:id/cancel` · `PATCH /bookings/:id/approve` · `…/reject` · `…/hand-over` · `…/return`                                                                                                                              |
| Owner    | `GET /owner/bookings` · `GET /owner/dashboard`                                                                                                                                                                                                                                                                                                               |
| Reviews  | `POST /reviews` · `PUT /reviews/:id`                                                                                                                                                                                                                                                                                                                         |
| Uploads  | `POST /uploads/vehicle-images` (presigned S3 PUT)                                                                                                                                                                                                                                                                                                            |
| Realtime | Socket.IO at `/api/v1/socket.io` (WebSocket): `notification` events `booking.created/approved/rejected/cancelled/handed_over/returned`                                                                                                                                                                                                                       |

Status codes: `200/201` success · `400` validation / `INVALID_DATES` / `COUPON_INVALID` · `401` unauthenticated · `403` wrong role, not your vehicle/review, `ONBOARDING_REQUIRED` · `404` not found (also for other people's private bookings) · `409` `BOOKING_CONFLICT`, `INVALID_STATUS_TRANSITION`, `REVIEW_EXISTS`, `EMAIL_TAKEN`, … · `413` body too large · `429` rate limited · `503` optional integration not configured.

---

## Database models

| Collection      | Key fields                                                                                                                                                                                         | Indexes / constraints                                                                                                                                                                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`         | name, email, passwordHash (`select:false`), role (`CUSTOMER`/`OWNER`/null until onboarding), authProvider, googleId                                                                                | unique `email`; unique sparse `googleId`                                                                                                                                                                                                                                                                             |
| `vehicles`      | owner→User, name, description, images[{url,key}], type, registrationNumber, dailyPrice, location, isAvailable, features[], averageRating, reviewCount, _searchTokens_, _bookingVersion_, isDeleted | unique `registrationNumber` among live vehicles (partial index); discovery indexes `{isDeleted, createdAt}`, `{isDeleted, dailyPrice}`, `{isDeleted, averageRating, reviewCount}`, `{isDeleted, type, dailyPrice}`, `{isDeleted, locationKey, dailyPrice}`, multikey `searchTokens`, `{owner, isDeleted, createdAt}` |
| `bookings`      | vehicle, customer, owner (denormalised), startDate, endDate (UTC midnight), totalDays, dailyPrice (snapshot), subtotal, discountAmount, couponCode, totalAmount, status, statusHistory[]           | `{vehicle, status, startDate, endDate}` (overlap check), `{status, startDate, endDate}`, `{customer, status, startDate}`, `{owner, status, createdAt}`, `{owner, createdAt}`                                                                                                                                         |
| `reviews`       | vehicle, customer, booking, rating 1–5, comment                                                                                                                                                    | **unique `booking`**, `{vehicle, createdAt}`, `{customer, createdAt}`                                                                                                                                                                                                                                                |
| `wishlistitems` | customer, vehicle (references only)                                                                                                                                                                | unique `{customer, vehicle}`                                                                                                                                                                                                                                                                                         |
| `coupons`       | code, discountType, discountValue, maxDiscount, minimumAmount, expiresAt, usageLimit, usedCount, active                                                                                            | unique `code`                                                                                                                                                                                                                                                                                                        |
| `ratelimithits` | key, count, resetAt                                                                                                                                                                                | unique `key`, TTL on `resetAt`                                                                                                                                                                                                                                                                                       |

Images are never stored in MongoDB — only URLs and S3 object keys. Every list endpoint is paginated (max 50) and uses `populate` (one `$in` query) or batch lookups, so there are no N+1 queries.

---

## Authentication & authorization

- **Passwords:** bcrypt (cost 12). Hashes are `select:false` and DTOs are explicit allow-lists, so a hash can't leak.
- **Sessions:** JWT (HS256, issuer + audience, `sub` + `role` only) in an **httpOnly, Secure, SameSite=Lax** cookie. `Authorization: Bearer` is also accepted for API clients. Login responses for wrong password and unknown email are identical and take the same time.
- **`authenticate()`** verifies the token, then loads the user — a deleted user or changed role takes effect immediately. **`requireRole()`** gates routes by role; role-less Google users get `ONBOARDING_REQUIRED`.
- **Ownership** is enforced in services, using only the authenticated identity (never IDs from the request body): owners can manage only their vehicles and their vehicles' bookings; customers see only their bookings and edit only their reviews. Private resources answer **404** to others (no existence leak); public resources (vehicles, reviews) answer **403**.
- **Google OAuth:** Google Identity Services ID token → verified server-side (signature, audience, expiry) → existing account linked only for a _verified_ email → new users must pick a role once. OAuth never bypasses authorization.
- Frontend route guards are UX only; the API is the boundary.

---

## Booking logic

- **Dates** are calendar days (`YYYY-MM-DD`, stored as UTC midnight). A booking occupies **`[startDate, endDate)`** — 10 → 15 Oct occupies 10–14 and another rental may start on 15 Oct.
- **Conflict:** `existing.start < requested.end AND existing.end > requested.start`, counting only `PENDING`, `APPROVED`, `HANDED_OVER`. `REJECTED`, `CANCELLED`, `RETURNED` free the dates. This predicate exists once (`booking.repository#overlapFilter`) and is used by booking creation, the availability check, date-filtered search and the calendar.
- **Rules:** start ≥ today (business timezone), end > start, ≤ 90 days, ≤ 365 days ahead, vehicle must be accepting bookings.
- **Price:** the client sends only `vehicle`, `startDate`, `endDate` (+ optional coupon). The server computes `totalDays × dailyPrice` from the stored vehicle, applies a validated coupon, and **stores the daily price used** — later price changes never touch existing bookings.
- **Concurrency:** creation runs in a MongoDB transaction that **first increments `bookingVersion` on the vehicle document**. Two concurrent transactions for the same vehicle write the same document, so MongoDB raises a write conflict; the driver retries the loser, which now sees the winner's booking and returns **409 `BOOKING_CONFLICT`**. Different vehicles never contend. Tested by firing six simultaneous overlapping requests: exactly one succeeds. Vehicle deletion takes the same lock, so a booking can't slip in between "no active bookings" and the delete.
- **Lifecycle** (single table in `shared-types`, enforced by `bookingStateMachine.ts`, also drives the UI buttons):
  `PENDING→APPROVED | REJECTED | CANCELLED` · `APPROVED→HANDED_OVER | CANCELLED` · `HANDED_OVER→RETURNED`. Transitions are compare-and-set (`status: from` in the update filter), so two simultaneous actions can't both apply. Customers may cancel before the start date; owners hand over from the start date. A scheduled, idempotent job rejects pending requests whose start date has passed.
- **Reviews:** only the booking's customer, only after `RETURNED`, one per booking (unique index), rating 1–5. `averageRating`/`reviewCount` are recomputed from reviews inside the same transaction.

---

## AWS architecture

| Concern       | Implementation                                                                                                                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edge          | Route 53 alias → CloudFront (ACM cert in us-east-1, TLS 1.2+, HTTP/3, security headers incl. CSP/HSTS)                                                                                                                                                |
| Frontend      | S3 web bucket (private, Origin Access Control); CloudFront Function rewrites extension-less paths to `/index.html` (SPA deep links) — API 404s stay JSON                                                                                              |
| API ingress   | CloudFront `/api/*` (no caching, cookies/query/WebSockets forwarded) → ALB over HTTPS with an origin certificate. ALB SG allows only CloudFront's managed prefix list, and the listener requires a secret `X-Origin-Verify` header CloudFront injects |
| Compute       | ECS Fargate in **private subnets**, no public IPs; SG ingress only from the ALB; rolling deploys (100 %/200 %) with **circuit-breaker rollback**; autoscaling on CPU 60 %, memory 75 % and requests/target (dev 1–2, prod 2–8 tasks)                  |
| Images        | ECR, immutable tags (git SHA), scan on push, lifecycle policy                                                                                                                                                                                         |
| Data          | MongoDB Atlas (allow-listed NAT IPs, TLS, backups); S3 media bucket for photos (presigned PUT from the browser, reads via CloudFront `/media/*`)                                                                                                      |
| Secrets       | Secrets Manager (`MONGODB_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`) injected by ECS at task start; values written out-of-band, never in Terraform state or Git                                                                                          |
| Observability | CloudWatch Logs (JSON), Container Insights, metric filters (application errors, bookings created), alarms (ECS CPU/memory, running tasks below minimum, ALB 5xx, target 5xx, p95 latency, unhealthy hosts, app errors) → SNS, dashboard               |
| Identity      | Execution role (pull, logs, read one secret), task role (`s3:PutObject` on `media/vehicles/*` only), GitHub OIDC deploy role scoped to repo + environment                                                                                             |

---

## Terraform

```
infrastructure/terraform/
  modules/vpc ecs alb ecr s3 cloudfront iam monitoring   (as specified)
  modules/dns         ACM certificates + Route 53 records
  modules/atlas       optional MongoDB Atlas cluster/user/network access
  modules/platform    composes one environment from the modules above
  environments/dev    small, single NAT, 1–2 tasks, M0 Atlas, docs on
  environments/prod   3 AZs, NAT per AZ, 2–8 tasks, M10 Atlas with backups, deletion protection
```

Nothing account-specific is hard-coded: region, domain, hosted zone and GitHub repo come from `terraform.tfvars`; state backend from `backend.hcl`; bucket names are suffixed with the caller's account ID; AWS and Atlas credentials come from the environment. Both environments pass `terraform validate` (also enforced in CI).

---

## CI/CD & deployment

**`ci.yml`** (PRs and branches): install → lint → typecheck → test → build → `npm audit` (prod deps) → Docker builds → Terraform fmt/validate.

**`deploy.yml`** (push to `main` → dev; manual → prod, protect with required reviewers): runs the CI workflow first (**deploy stops if it fails**) → OIDC to AWS → build & push the API image to ECR (tag = commit SHA) → render a new task definition → ECS rolling deploy and wait for stability (circuit breaker rolls back failures) → build the SPA → `s3 sync` (immutable assets, no-cache `index.html`) → CloudFront invalidation → `scripts/health-check.sh` (API health, home page, deep link).

Full first-time rollout (state bucket, `terraform apply`, writing secrets, GitHub environment variables): **[docs/deployment.md](docs/deployment.md)**.

---

## Security

bcrypt password hashing · JWT with minimal claims, pinned algorithm, issuer/audience · httpOnly + Secure + SameSite cookies · Helmet headers on the API, CSP/HSTS/frame/referrer headers at CloudFront · strict CORS allow-list with credentials · **MongoDB-backed rate limiting** shared across tasks (tighter on auth endpoints) · Zod validation of every body, query and param (shared with the UI) · 100 kB body limit · ownership + role checks in services · no stack traces or driver messages in responses · pino redaction of passwords, tokens, cookies, auth headers and connection strings · no secrets in the frontend bundle, repo or Terraform state · S3 buckets private (OAC only, TLS-only policies), presigned uploads pinned to type/size/owner prefix and verified on save · ALB reachable only from CloudFront · tasks in private subnets, egress limited to 443 and Atlas ports · least-privilege IAM, OIDC deploys · immutable, scanned images · non-root container with read-only root filesystem · `npm audit` gate in CI (currently 0 vulnerabilities).

---

## Testing

```bash
npm test     # all workspaces
```

**130 automated tests** (119 API, 7 shared-validation, 4 web), running against a real in-memory MongoDB **replica set** so transactions are exercised for real:

- auth — registration, duplicate email (case-insensitive), validation, login, identical invalid-login responses, JWT claims, tampered/foreign tokens, Bearer support, logout, security headers, error envelopes
- authorization & ownership — roles on every area, owner A vs owner B vehicles, customer A vs B bookings and reviews, owner vs other owners' bookings
- vehicles — CRUD, normalised unique registration, search-as-you-type, type/location/price filters, sorting, pagination metadata and limits, date-window filtering, deletion blocked by active bookings
- bookings — **the mandatory 10→15 / 12→17 (409) / 15→20 (201) scenario**, contained/enclosing/edge overlaps, back-to-back both ways, freed dates after reject/cancel, **concurrent requests (exactly one wins)**, price calculation and ignoring client prices, price snapshot after edits, invalid dates, unavailable vehicles, cancellation windows, every state transition (full 6×6 matrix), compare-and-set conflicts, owner dashboard and customer summary
- reviews — eligibility, duplicates, ownership, editing, rating recomputation
- wishlist, calendar, coupons (limits), invoices (PDF + visibility), presigned uploads, Google sign-in + onboarding, real-time notifications over WebSockets

---

## Assumptions

- Single currency (INR, whole rupees for daily prices) and no payment capture — "rent" creates a request the owner approves; invoices document the agreed price.
- "Today" is evaluated in one business timezone (`Asia/Kolkata`) for all users.
- Customers cancel only before the start date; owners decline pending requests; there is no partial refund logic.
- A user has one role. Owners don't rent with the same account (they can register a renter account).
- Deleting a vehicle is a soft delete so booking history, invoices and reviews remain intact.
- Coupons are platform-wide and created by operators (seed/DB), not by owners.
- Vehicle photos uploaded but later removed from a listing stay in S3 (versioned bucket); see future improvements.

---

## Future improvements

- Payments (Razorpay/Stripe) with holds on approval and refunds on cancellation; owner payouts.
- Email/SMS notifications via SQS + SES/SNS (subscribe to the existing booking domain events); EventBridge for analytics.
- Redis (ElastiCache) for hot read caching and as the Socket.IO adapter if broadcast volume outgrows the MongoDB adapter.
- AWS WAF on CloudFront (managed rule sets, bot control) in front of the app-level rate limiter.
- Image processing (Lambda resize/WebP variants) and orphaned-upload cleanup.
- Atlas Search for full-text and geo search ("near me"), and a map view.
- Refresh tokens / server-side session revocation list; MFA for owners.
- Run the stale-booking job as an EventBridge-scheduled ECS task instead of in every API task.
- Playwright end-to-end tests in CI against the Docker Compose stack; load tests for booking contention.
