# Tempo - Intelligent Daily Time Management & Scheduling

> **Phase 0–7 Complete: Full Monorepo, Auth & User Management, Routine & Timetables, Intelligent Scheduling Engine, Schedule Editing, Activity Tracking & Analytics, PWA & Automation, Google Authentication + Google Calendar Integration**

Tempo is a modern, full-stack intelligent daily scheduling and time management platform built with React, Vite, Express, Prisma, PostgreSQL, Redis, BullMQ, Web Push, and TypeScript in a unified pnpm monorepo.

---

## 🏛 Architecture Overview

```
tempo/
├── apps/
│   ├── web/               # React 18 + Vite + Tailwind CSS frontend application
│   │   ├── src/pages/     # Login, Register, Onboarding, Dashboard, Profile
│   │   ├── src/context/   # Cookie-based AuthContext & Session state
│   │   └── src/api/       # CSRF-protected API fetch client
│   ├── api/               # Express + TypeScript REST API backend
│   │   ├── src/routes/    # Auth, Preferences, Profile, Health
│   │   ├── src/services/  # Password hashing, Session management, Profile
│   │   ├── src/middleware/# Auth guard, Rate limiting, CSRF, Validation
│   │   └── test/          # Vitest & Supertest suites
│   └── worker/            # Background worker service for async scheduling
│
├── packages/
│   ├── database/          # Prisma schema targeting PostgreSQL + SQL migrations
│   ├── shared/            # Shared DTOs, Zod schemas, constants & types
│   └── scheduler/         # Scheduling algorithm interfaces & engine foundation
│
├── .env.example           # Canonical environment configuration template
├── .eslintrc.json         # Workspace-wide ESLint configuration
├── .prettierrc            # Code formatting rules
├── pnpm-workspace.yaml    # Monorepo workspace definition
└── tsconfig.base.json     # Base TypeScript compiler options
```

---

## 🛠 Tech Stack

- **Package Manager:** `pnpm` (Workspace protocol `workspace:*`)
- **Frontend (`apps/web`):** React 18, Vite 5, Tailwind CSS, React Router 6, Lucide Icons, TypeScript
- **Backend API (`apps/api`):** Express 4, TypeScript, bcryptjs, cookie-parser, express-rate-limit, zod, tsx
- **Testing (`apps/api`):** Vitest, Supertest
- **Background Worker (`apps/worker`):** Node.js, TypeScript, tsx
- **Database (`packages/database`):** Prisma 5, PostgreSQL
- **Shared Libraries (`packages/shared`, `packages/scheduler`):** TypeScript, Zod schemas
- **Tooling:** ESLint, Prettier, Concurrently, Cross-Env

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** `>= 18.x` (Recommended: `v20.x` or `v24.x`)
- **pnpm:** `>= 9.x` (`npm install -g pnpm`)
- **PostgreSQL:** `>= 14` (Local instance or Docker container)

### 1. Installation

Install all workspace dependencies:

```bash
pnpm install
```

### 2. Environment Configuration

Copy the example environment file to `.env`:

```bash
# On Windows PowerShell
Copy-Item .env.example .env

# On Bash / POSIX
cp .env.example .env
```

Ensure `DATABASE_URL` is configured to point to your PostgreSQL database.

### 3. Generate Prisma Client & Database Setup

```bash
pnpm db:generate
```

When connected to PostgreSQL, run migrations:

```bash
pnpm db:push
```

### 4. Seed Demo Data (Optional)

To seed a pre-configured demo account with sample tasks, preferences, and timetable slots:

```bash
pnpm db:seed
```

**Demo Account Credentials:**

- **Email:** `demo@tempo.app`
- **Password:** `Password123!`

---

### 5. Running the Development Environment

To seed a pre-configured demo account with sample tasks, preferences, and timetable slots:

```bash
pnpm db:seed
```

**Demo Account Credentials:**

- **Email:** `demo@tempo.app`
- **Password:** `Password123!`

---

### 5. Running the Development Environment

Run all services concurrently (Web, API, Worker):

```bash
pnpm dev
```

Or run individual services independently:

```bash
# Run API service only (port 5000)
pnpm dev:api

# Run Frontend only (port 3000)
pnpm dev:web

# Run Worker service only
pnpm dev:worker
```

### 5. Running Automated Tests

```bash
pnpm test
```

---

## 🔐 API Endpoints (Phase 1)

| Endpoint             | Method  | Auth Required | Description                                    |
| :------------------- | :------ | :------------ | :--------------------------------------------- |
| `/health`            | `GET`   | No            | System health check                            |
| `/api/health`        | `GET`   | No            | System health check under `/api` prefix        |
| `/api/auth/register` | `POST`  | No            | Register new user with name, email, password   |
| `/api/auth/login`    | `POST`  | No            | Authenticate user & issue HTTP-only cookie     |
| `/api/auth/logout`   | `POST`  | No            | Invalidate session in DB & clear cookie        |
| `/api/auth/me`       | `GET`   | Yes           | Get currently authenticated user & preferences |
| `/api/preferences`   | `GET`   | Yes           | Get authenticated user's preferences           |
| `/api/preferences`   | `PUT`   | Yes           | Update routine preferences & onboarding status |
| `/api/profile`       | `GET`   | Yes           | Get authenticated user's profile               |
| `/api/profile`       | `PATCH` | Yes           | Update profile name                            |

---

## 🛡 Security & Multi-User Isolation

1. **Password Security:** Passwords hashed with bcrypt (12 rounds); raw passwords are never stored or logged.
2. **Session Security:** Database-backed sessions using SHA-256 hashed tokens. Raw tokens reside only in secure HTTP-only cookies (`SameSite: 'lax'`, `path: '/'`). Tokens are never stored in `localStorage`.
3. **Session Revocation:** Logout explicitly updates `revokedAt` in the database, immediately invalidating the session.
4. **CSRF Protection:** Non-GET mutation endpoints require matching origins/referers and custom header validation.
5. **Rate Limiting:** Authentication routes protected via `express-rate-limit` (30 attempts per 15 minutes window).
6. **Multi-User Isolation:** All database queries are strictly scoped to `req.user.id` resolved by `requireAuth` middleware. Requests attempting to supply an arbitrary `userId` in the body or params are disregarded or rejected.
7. **Input Validation:** All input payloads validated via strict Zod schemas with friendly validation responses.

---

## 📜 Monorepo Scripts

| Script              | Command                                  | Description                                    |
| :------------------ | :--------------------------------------- | :--------------------------------------------- |
| `pnpm dev`          | `concurrently ...`                       | Starts `api`, `web`, and `worker` in dev mode  |
| `pnpm dev:api`      | `pnpm --filter @tempo/api dev`           | Runs Express API via `tsx watch` on port 5000  |
| `pnpm dev:web`      | `pnpm --filter @tempo/web dev`           | Runs Vite dev server on port 3000              |
| `pnpm dev:worker`   | `pnpm --filter @tempo/worker dev`        | Runs background worker via `tsx watch`         |
| `pnpm build`        | Multiple                                 | Builds all shared packages and applications    |
| `pnpm test`         | `pnpm --filter @tempo/api test`          | Runs Vitest automated test suite               |
| `pnpm typecheck`    | `pnpm -r typecheck`                      | Type-checks all workspaces with `tsc --noEmit` |
| `pnpm lint`         | `eslint . --ext .ts,.tsx`                | Lints TypeScript and TSX files                 |
| `pnpm format`       | `prettier --write ...`                   | Formats code repository-wide                   |
| `pnpm format:check` | `prettier --check ...`                   | Checks code formatting                         |
| `pnpm db:generate`  | `pnpm --filter @tempo/database generate` | Generates Prisma Client                        |
| `pnpm db:push`      | `pnpm --filter @tempo/database push`     | Pushes Prisma schema to PostgreSQL             |

---

## 📌 Phase Status

- [x] **Phase 0:** Monorepo architecture, packages, scripts, health endpoints, documentation.
- [x] **Phase 1:** Authentication, session management, user preferences, onboarding flow, profile settings, multi-user isolation, automated tests.
