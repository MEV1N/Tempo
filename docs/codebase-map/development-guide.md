# Development & Workflow Guide

This document describes the development environment, package commands, database operations, testing standards, environment configuration, and Antigravity execution rules for the Tempo monorepo.

---

## 1. Prerequisites & Tooling

- **Node.js:** v20.x or higher
- **Package Manager:** `pnpm` v9.x (`pnpm@9.15.9`)
- **Database:** PostgreSQL (default port 5432)
- **Cache & Queue:** Redis (default port 6379, required for BullMQ workers)

---

## 2. Monorepo Scripts Reference

All primary commands can be run from the root directory:

```bash
# Install dependencies across all packages
pnpm install

# Start all three services concurrently (API, Web, Worker)
pnpm dev

# Start individual applications
pnpm dev:api       # Express API on http://localhost:5000 (via tsx watch)
pnpm dev:web       # Vite React SPA on http://localhost:5173
pnpm dev:worker    # BullMQ Worker process (via tsx watch)

# Build packages and applications
pnpm build:packages  # Builds @tempo/shared, @tempo/scheduler, and @tempo/database
pnpm build           # Full build of packages, api, worker, and web

# Typecheck and lint
pnpm typecheck       # Runs tsc --noEmit across all workspaces
pnpm lint            # Runs ESLint across .ts and .tsx files
pnpm format:check    # Verifies Prettier code formatting
pnpm format          # Applies Prettier code formatting
```

---

## 3. Database Operations (`@tempo/database`)

Prisma commands are managed via the `@tempo/database` workspace:

```bash
# Generate Prisma Client after schema changes
pnpm db:generate
# Alternatively:
pnpm --filter @tempo/database prisma generate

# Create and apply a new migration in development
pnpm --filter @tempo/database prisma migrate dev --name <migration_name>

# Apply pending migrations to database
pnpm --filter @tempo/database prisma migrate deploy

# Push schema directly to database (prototype / test only)
pnpm db:push

# Run database seeders
pnpm db:seed

# Launch Prisma Studio web GUI
pnpm db:studio
```

---

## 4. Testing Standards & Targeted Commands

Tempo uses **Vitest** for testing backend APIs and the scheduler engine.

> **Execution Rule:** Never run full workspace tests when making a localized fix. Run only the specific test file covering the modified feature.

### Run Targeted Test Files
```bash
# Run a specific API test file:
pnpm --filter @tempo/api exec vitest run test/login-flow.test.ts
pnpm --filter @tempo/api exec vitest run test/auth-regression.test.ts
pnpm --filter @tempo/api exec vitest run test/phase7.test.ts
pnpm --filter @tempo/api exec vitest run test/routines.test.ts

# Run the pure TypeScript scheduler engine tests:
pnpm --filter @tempo/scheduler exec vitest run test/scheduler.test.ts

# Run all API tests (CI / full verification only):
pnpm test
```

---

## 5. Environment Variables Guide

Tempo reads configuration from `.env` in the repository root. Create `.env` based on `.env.example`:

| Variable | Description | Default / Example Value |
|---|---|---|
| `PORT` | HTTP port for the Express API server | `5000` |
| `NODE_ENV` | Runtime environment (`development`, `test`, `production`) | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/tempo?schema=public` |
| `CORS_ORIGIN` | Allowed web frontend origin | `http://localhost:3000` or `http://localhost:5173` |
| `VITE_API_URL` | Frontend API target URL (optional if using Vite proxy) | `http://localhost:5000` |
| `REDIS_URL` | Redis connection URL for BullMQ queues | `redis://localhost:6379` |
| `VAPID_PUBLIC_KEY` | Public key for Web Push notifications | VAPID public key string |
| `VAPID_PRIVATE_KEY` | Private key for Web Push notifications | VAPID private key string |
| `VAPID_SUBJECT` | Contact mailto: URI for push service | `mailto:admin@tempo.app` |
| `GOOGLE_CLIENT_ID` | Google OAuth2 Client ID from Google Cloud Console | `*.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 Client Secret | Google secret string |
| `ENCRYPTION_KEY` | 32-byte secret key for encrypting stored OAuth refresh tokens | 32-character string |

> **Security Rule:** Never commit real secrets, private keys, or credentials to version control or documentation.

---

## 6. Antigravity Developer Execution Protocol

When executing tasks in this codebase, follow this strict 6-step protocol:

1. **Locate Before Modifying:**
   Consult [`docs/codebase-map/feature-file-index.md`](file:///c:/Users/mevin_z1mcnwj/Desktop/time%20magement/docs/codebase-map/feature-file-index.md) to identify the exact files involved. Do not recursively crawl or explore the entire monorepo.
2. **Inspect Relevant Code Only:**
   Read only the specific files or functions directly implicated in the issue or request.
3. **Follow the Minimum-Change Principle:**
   Make the smallest targeted edit that correctly resolves the problem. Do not refactor unrelated functions, reformat unchanged files, or upgrade packages.
4. **Preserve Architectural Invariants:**
   - No direct database access from frontend (`apps/web`).
   - Pure TypeScript, zero external dependencies in `@tempo/scheduler`.
   - Use the singleton `prisma` client from `@tempo/database`.
   - Validate API inputs with `@tempo/shared` schemas.
   - Preserve monochrome Caveat/Inter typography in the UI.
5. **Targeted Verification:**
   Run only the targeted test file associated with the modified feature (e.g. `pnpm --filter @tempo/api exec vitest run test/<file>.test.ts`).
6. **Strict Stopping Rule:**
   Once the requested change is implemented and verified, stop immediately. Do not explore unrelated warnings or initiate unrequested refactors.

