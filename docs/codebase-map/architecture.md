# System Architecture & Topology

This document describes the architectural layout, process boundaries, execution flows, and integration mechanisms of the Tempo system.

---

## 1. Monorepo Structure & Process Boundaries

Tempo is structured as an npm/pnpm workspace monorepo consisting of **three runtime applications** and **three shared packages**:

```
tempo/
├── apps/
│   ├── web/        # React 18 SPA (Vite, Tailwind, React Router v7)
│   ├── api/        # Express 4 REST API (TypeScript, Prisma, Sessions)
│   └── worker/     # BullMQ Background Worker (TypeScript, Redis, Cron/Events)
└── packages/
    ├── database/   # Prisma schema, migrations, seeders & PrismaClient singleton
    ├── scheduler/  # Pure TypeScript deterministic scheduling engine
    └── shared/     # Shared Zod schemas, TypeScript types/DTOs, constants
```

### Process Isolation & Network Boundaries

```mermaid
flowchart TD
    subgraph ClientBrowser ["Browser Client"]
        SPA["Tempo Web App (Vite React SPA)\nhttp://localhost:5173"]
    end

    subgraph APIHost ["API Server (Node.js)"]
        API["Tempo Express API\nhttp://localhost:5000\nRoutes + Middleware + Services"]
    end

    subgraph WorkerHost ["Worker Process (Node.js)"]
        Worker["Tempo BullMQ Worker\nCron & Async Job Consumers"]
    end

    subgraph Infrastructure ["Data & State Stores"]
        Postgres[("PostgreSQL Database\nDefault Port 5432")]
        Redis[("Redis Instance\nDefault Port 6379\nQueues & Rate Limiting")]
    end

    subgraph ExternalServices ["External Providers"]
        GoogleOAuth["Google Identity (OAuth2 / OIDC)"]
        GoogleCal["Google Calendar API v3"]
    end

    SPA -->|"HTTP REST + SameSite Cookie\n/api/* & /health"| API
    API -->|"Prisma ORM (Direct SQL connection)"| Postgres
    API -->|"BullMQ Queue Producer (ioredis)"| Redis
    API -->|"In-process pure TS engine"| SchedulerLib["@tempo/scheduler"]
    API -->|"OAuth token exchange & API sync"| GoogleOAuth
    API -->|"Event sync & push notifications"| GoogleCal

    Worker -->|"BullMQ Queue Consumer (ioredis)"| Redis
    Worker -->|"Prisma ORM (Direct SQL connection)"| Postgres
    Worker -->|"In-process pure TS engine"| SchedulerLib
    Worker -->|"Calendar background synchronization"| GoogleCal
```

---

## 2. Shared Packages Architecture

### `@tempo/database` (`packages/database`)
- **Location:** `packages/database/src/index.ts`
- **Schema:** `packages/database/prisma/schema.prisma`
- **Responsibilities:**
  - Exports a singleton `prisma` client (`PrismaClient`).
  - Contains database migrations in `packages/database/prisma/migrations/`.
  - Exports helper functions: `connectDatabase()`, `disconnectDatabase()`, `isDatabaseHealthy()`.
  - Re-exports all generated Prisma types (`User`, `Task`, `Schedule`, `PersonalRoutine`, etc.).

### `@tempo/scheduler` (`packages/scheduler`)
- **Location:** `packages/scheduler/src/index.ts`
- **Responsibilities:**
  - Zero-dependency, pure TypeScript deterministic constraint-satisfaction engine.
  - Implements interval algebra, availability calculation, scoring, task allocation, break insertion, minimal-change rescheduling, and validation.
  - Consumed directly in-memory by `apps/api` (`scheduler.service.ts`) and `apps/worker` (`planning.worker.ts`).

### `@tempo/shared` (`packages/shared`)
- **Location:** `packages/shared/src/index.ts`
- **Responsibilities:**
  - Single source of truth for Zod schemas (`loginSchema`, `createTaskSchema`, `personalRoutineSchema`, etc.).
  - TypeScript interfaces, API response types (`ApiResponse<T>`), and request DTOs.
  - Global configuration constants (`APP_CONFIG`, time constants, priority weights).

---

## 3. Authentication Architecture

Tempo uses a **cookie-based session token** architecture combined with **Google OAuth 2.0 / OpenID Connect**.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant Web as Web Client (apps/web)
    participant API as Express API (apps/api)
    participant DB as PostgreSQL (@tempo/database)
    participant Google as Google Identity Services

    Note over User,Google: Standard Email / Password Flow
    User->>Web: Enter credentials on /login
    Web->>API: POST /api/auth/login { email, password }
    API->>DB: Query User by email
    API->>API: Verify password hash (scrypt / bcrypt)
    API->>DB: Create Session record (token, expiresAt)
    API-->>Web: Set HTTP-Only Cookie (tempo_session) + User DTO
    Web-->>User: Navigate to /dashboard

    Note over User,Google: Google OAuth 2.0 Flow
    User->>Web: Click "Continue with Google"
    Web->>API: GET /api/auth/google
    API-->>Web: 302 Redirect to Google OAuth Consent Screen
    Web->>Google: Authenticate & Authorize
    Google-->>API: GET /api/auth/google/callback?code=...&state=...
    API->>Google: Exchange code for Tokens (access, refresh, id_token)
    API->>DB: Find or create User & OAuthConnection by google sub
    API->>DB: Create Session record
    API-->>Web: Set HTTP-Only Cookie (tempo_session) & redirect to /dashboard
```

### Session Handling & Middleware Pipeline
1. **Cookie Storage:** The session token is stored in an `httpOnly`, `sameSite: "lax"`, signed/secure cookie named `tempo_session` (configured in `apps/api/src/config.ts`).
2. **Session Verification (`apps/api/src/middleware/auth.ts`):**
   - Extracts session token from cookie.
   - Looks up `Session` in database including user details.
   - If missing or expired: returns `401 Unauthorized` and clears the cookie.
   - If database error or connection failure occurs: returns `503 Service Unavailable` without clearing cookie.
   - Attaches `req.user` and `req.session` to the Express Request.
3. **Session Revocation:**
   - On `POST /api/auth/logout`: deletes session record from DB and clears the cookie.

---

## 4. Scheduler Integration Architecture

The scheduling engine (`@tempo/scheduler`) is designed as a stateless, deterministic calculator.

```mermaid
flowchart LR
    subgraph DataFetch ["1. Context Aggregation (API / Worker)"]
        A1["User Preferences\n(Wake/Sleep, Breaks)"]
        A2["Personal Routines\n(Fixed Habits & Commitments)"]
        A3["Timetables & Calendar Events\n(Hard Busy Blocks)"]
        A4["Pending Tasks\n(Priorities, Durations, Deadlines)"]
    end

    subgraph EngineCall ["2. Engine Invocation (@tempo/scheduler)"]
        B1["TempoSchedulerEngine.generateSchedule()"]
    end

    subgraph EngineStages ["3. Pure In-Memory Stages"]
        C1["availability.ts\nBuild Free Intervals"] -->
        C2["scoring.ts\nScore & Order Tasks"] -->
        C3["allocation.ts\nAllocate Tasks into Slots"] -->
        C4["breaks.ts\nInsert Dynamic Breaks"] -->
        C5["validation.ts\nVerify Feasibility"]
    end

    subgraph Persistence ["4. Schedule Storage (@tempo/database)"]
        D1["Persist Schedule & ScheduleBlocks\nin PostgreSQL transaction"]
    end

    DataFetch --> EngineCall
    EngineCall --> EngineStages
    EngineStages --> Persistence
```

- **Execution Contexts:**
  1. **Interactive API:** When user visits the Schedule page or clicks "Regenerate", `scheduler.controller.ts` calls `scheduler.service.ts`, which runs the engine synchronously and returns candidate or confirmed blocks.
  2. **Minimal-Change Rescheduling:** Triggered when an event runs over or a user delays a task. Calls `rescheduleMinimalChange` to shift only affected blocks while pinning locked blocks.
  3. **Nightly Worker:** BullMQ planning queue job runs nightly to build tomorrow's draft schedule for active users.

---

## 5. Background Worker Architecture (`apps/worker`)

The worker application runs as a separate Node.js process listening to BullMQ queues backed by Redis.

```mermaid
flowchart TD
    RedisQueue[("Redis BullMQ Queues")]

    subgraph WorkerWorkers ["Worker Process (apps/worker)"]
        PlanningWorker["Planning Queue Worker\nNightly schedule generation"]
        ReminderWorker["Reminder Queue Worker\nPush & task notifications"]
        CalendarWorker["Calendar Queue Worker\nGoogle Calendar background sync"]
        CleanupWorker["Cleanup Queue Worker\nExpired sessions & stale temp data"]
    end

    RedisQueue --> PlanningWorker
    RedisQueue --> ReminderWorker
    RedisQueue --> CalendarWorker
    RedisQueue --> CleanupWorker

    PlanningWorker --> DB[("PostgreSQL")]
    ReminderWorker --> DB
    CalendarWorker --> DB
    CleanupWorker --> DB
```

### Queue Definitions (`apps/api/src/queue/` and `apps/worker/src/queues/`)
- `planning`: Dispatches daily schedule pre-computation.
- `reminders`: Dispatches upcoming block reminders and web push notifications.
- `calendar-sync`: Background synchronization of Google Calendar events and webhook notifications.
- `cleanup`: Purges revoked sessions, expired tokens, and temporary schedule drafts.

---

## 6. Architecture Invariants & Rules

1. **No Direct Database Access from Frontend:** The frontend (`apps/web`) communicates exclusively via HTTP REST with `apps/api`.
2. **Scheduler Independence:** `@tempo/scheduler` has zero external dependencies and must never import database clients, network libraries, or UI code.
3. **Database Client Singleton:** Never instantiate `new PrismaClient()` in controllers or routes. Always import the shared instance from `@tempo/database`.
4. **Validation Separation:** API request payloads must be validated against `@tempo/shared` Zod schemas using `validateRequest` middleware before reaching service layers.

