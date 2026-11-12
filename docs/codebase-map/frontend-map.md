# Frontend Codebase Map

This document details the frontend application architecture, layout systems, routing structure, state management, and file locations for `apps/web`.

---

## 1. Frontend Overview & Tech Stack

- **Framework:** React 18.2 with Vite 5.x
- **Routing:** React Router v7 (`react-router-dom@7.18.5`)
- **Styling:** Tailwind CSS with custom monochrome design tokens
- **Typography:**
  - `@fontsource/caveat` (Handwritten font for logo, accent headers, quotes: `.font-handwriting`)
  - `@fontsource/inter` (Clean grotesque sans-serif for UI, forms, numbers: `.font-sans`)
- **Icons:** `lucide-react`
- **PWA Capabilities:** Service worker registration (`pwa/registerServiceWorker.ts`), offline banner, install prompt

---

## 2. Directory Layout (`apps/web/src`)

```
apps/web/
├── public/
│   ├── animations/                # Monochromatic GIF animation assets
│   │   ├── loading.gif            # Mobile schedule and tasks loading states
│   │   ├── tea.gif                # Contextual break, meal, and leisure illustration
│   │   ├── sun.gif                # Daytime celestial rhythm animation
│   │   ├── moon.gif               # Nighttime celestial rhythm animation
│   │   └── tasks.gif              # Empty tasks state notebook illustration
│   ├── icons/                     # PWA icons
│   └── manifest.json              # Web app manifest
├── src/
│   ├── api/
│   │   └── client.ts              # Fetch wrapper, ApiError class, resolveApiUrl, googleApi
│   ├── components/
│   │   ├── ActivityHeatmap.tsx    # 365-day activity heatmap grid, streak cards & daily breakdown
│   │   ├── MobileAnimation.tsx    # Reusable mobile animation component with reduced-motion fallback
│   │   ├── Navbar.tsx             # Responsive navigation (Desktop sidebar + Mobile bottom bar)
│   │   ├── NotificationCenter.tsx # In-app notifications drawer/modal
│   │   ├── OfflineIndicator.tsx   # Offline connectivity indicator
│   │   ├── ProtectedRoute.tsx     # Route guards: ProtectedRoute & PublicOnlyRoute
│   │   ├── PWAInstallBanner.tsx   # Banner prompting PWA installation
│   │   └── TempoLogo.tsx          # Monochrome logo with Caveat font
│   ├── context/
│   │   └── AuthContext.tsx        # Global user authentication state & session lifecycles
│   ├── features/                  # Separated Mobile & Desktop Feature Components
│   │   ├── calendar/              # useCalendar hook, CalendarDesktop, CalendarMobile, CalendarModals
│   │   ├── dashboard/             # useDashboard hook, DashboardDesktop, DashboardMobile
│   │   ├── schedule/              # useSchedule hook, ScheduleDesktop, ScheduleMobile, ScheduleModals
│   │   └── tasks/                 # useTasks hook, TasksDesktop, TasksMobile, TasksModals
│   ├── hooks/
│   │   ├── useIsMobile.ts         # Viewport breakpoint detection hook (768px)
│   │   ├── useOnlineStatus.ts     # Window online/offline event listener hook
│   │   └── usePrefersReducedMotion.ts # Accessibility hook respecting prefers-reduced-motion
│   ├── pages/                     # Thin router entrypoints selecting Mobile vs Desktop presentation
│   │   ├── AnalyticsPage.tsx      # Productivity stats, completion rates, category distributions
│   │   ├── CalendarPage.tsx       # Calendar router entrypoint
│   │   ├── DashboardPage.tsx      # Dashboard router entrypoint
│   │   ├── LoginPage.tsx          # Email/password login + "Continue with Google"
│   │   ├── OnboardingPage.tsx     # Initial preferences and wake/sleep time setup
│   │   ├── ProfilePage.tsx        # Personal dashboard, avatar, compact edit, activity heatmap
│   │   ├── RegisterPage.tsx       # Account registration + "Continue with Google"
│   │   ├── SchedulePage.tsx       # Schedule router entrypoint
│   │   ├── SettingsPage.tsx       # Dedicated settings: Account, Routines, Preferences, Notifications, Integrations
│   │   └── TasksPage.tsx          # Tasks router entrypoint
│   ├── pwa/
│   │   └── registerServiceWorker.ts # PWA service worker lifecycle registration
│   ├── App.tsx                    # Router definitions and top-level provider hierarchy
│   ├── index.css                  # Global Tailwind directives and font definitions
│   ├── main.tsx                   # React DOM entry point
│   └── vite-env.d.ts              # Vite client type references
```

---

## 3. Layout & Navigation Architecture

Tempo employs an adaptive mobile-first monochrome navigation pattern implemented in `apps/web/src/components/Navbar.tsx`:

### Desktop Layout (`md:` breakpoint and wider: $\ge 768\text{px}$)
- **Left Sidebar:** Fixed $256\text{px}$ (`w-64`) left sidebar with border-right (`#D9D9D9`).
- **Contains:** TempoLogo with tagline ("Find your rhythm."), primary navigation links with Lucide icons, NotificationCenter trigger, user email preview, and logout action.
- **Main Content Offset:** Main content containers require `md:pl-64` or equivalent margin to avoid being hidden under the fixed sidebar.

### Mobile Layout (`< 768\text{px}`)
- **Sticky Top Bar:** Fixed top bar with mini TempoLogo and NotificationCenter bell.
- **Fixed Bottom Thumb Bar:** Fixed bottom bar (`fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#D9D9D9]`) containing primary route icons (Dashboard, Tasks, Schedule, Calendar, Profile).
- **Padding:** Content containers must include bottom padding (`pb-20`) so elements remain visible above the bottom navigation bar.

---

## 4. Routing & Route Protection

All routes are configured in `apps/web/src/App.tsx` and wrapped in `AuthProvider`:

| Route Path | Page Component | Guard Type | Description |
|---|---|---|---|
| `/login` | `LoginPage.tsx` | `PublicOnlyRoute` | Redirects to `/` if user session is already active |
| `/register` | `RegisterPage.tsx` | `PublicOnlyRoute` | Redirects to `/` if user session is already active |
| `/onboarding` | `OnboardingPage.tsx` | `ProtectedRoute` | Shown to newly registered users to set initial routines |
| `/` | `DashboardPage.tsx` | `ProtectedRoute` | Core workspace, today's schedule snapshot, current timer |
| `/tasks` | `TasksPage.tsx` | `ProtectedRoute` | Task backlog, status filters, creation modal |
| `/schedule` | `SchedulePage.tsx` | `ProtectedRoute` | Timeline view, regenerate schedule, complete blocks |
| `/calendar` | `CalendarPage.tsx` | `ProtectedRoute` | Fixed timetables, calendar events, Google Calendar sync |
| `/analytics` | `AnalyticsPage.tsx` | `ProtectedRoute` | Weekly completion rates, category time breakdown |
| `/profile` | `ProfilePage.tsx` | `ProtectedRoute` | Personal dashboard, avatar, compact edit, activity heatmap |
| `/settings` | `SettingsPage.tsx` | `ProtectedRoute` | Dedicated configuration: account, routines, preferences, notifications, integrations |
| `*` | Catch-all redirect | — | Redirects unknown routes to `/` |

### Route Guards (`apps/web/src/components/ProtectedRoute.tsx`)
- `ProtectedRoute`: Checks `user` and `loading` from `AuthContext`. Shows a loading spinner while validating. If unauthenticated, redirects to `/login` preserving intended destination in state.
- `PublicOnlyRoute`: If user is authenticated, redirects immediately to `/` to prevent re-rendering login forms.

---

## 5. API Client & Error Handling (`apps/web/src/api/client.ts`)

- **`resolveApiUrl(endpoint: string)`:**
  Uses `VITE_API_URL` environment variable if configured, or falls back to relative `/api/*` paths which are automatically forwarded to `http://localhost:5000` via Vite development proxy (`vite.config.ts`).
- **`apiRequest<T>(endpoint, options)`:**
  - Wraps browser `fetch` with `credentials: 'include'` for cookie transmission.
  - Automatically injects CSRF headers (`x-tempo-csrf: 1`) on `POST`, `PUT`, `PATCH`, `DELETE`.
  - Normalizes JSON errors into `ApiError` instances containing HTTP `status` code and server error code.
  - Gracefully converts network failures (connection refused / offline) into `ApiError` with `status: 0` and code `'NETWORK_ERROR'`.
- **`googleApi` Endpoints:**
  Namespace for Google OAuth (`getAuthUrl`, `setPassword`, `unlinkGoogle`) and Google Calendar management (`getCalendarConnectUrl`, `getCalendarStatus`, `syncCalendar`, `disconnectCalendar`).

---

## 6. Authentication State (`apps/web/src/context/AuthContext.tsx`)

Exports `useAuth()` hook providing:
```typescript
interface AuthContextType {
  user: UserDTO | null;
  loading: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
```
- On mount, calls `GET /api/auth/me`.
- Distinguishes between `401 Unauthorized` (clears user state) and transient `503 Service Unavailable` or `NETWORK_ERROR` (preserves retry posture without thrashing).

---

## 7. Feature-to-File Lookup Table

| Feature Area | Page Component | Supporting Components & Context | API Calls Made |
|---|---|---|---|
| **Authentication** | `LoginPage.tsx`, `RegisterPage.tsx` | `AuthContext.tsx`, `TempoLogo.tsx` | `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/google` |
| **Dashboard** | `DashboardPage.tsx` | `Navbar.tsx`, `NotificationCenter.tsx` | `GET /api/schedule/today`, `GET /api/tasks`, `POST /api/activities/start` |
| **Tasks & Backlog** | `TasksPage.tsx` | `Navbar.tsx` | `GET/POST/PATCH/DELETE /api/tasks`, `GET /api/categories` |
| **Daily Schedule** | `SchedulePage.tsx` | `Navbar.tsx` | `GET /api/schedule/today`, `POST /api/schedule/generate`, `POST /api/schedule/reschedule` |
| **Calendar & Timetable** | `CalendarPage.tsx` | `Navbar.tsx`, `googleApi` | `GET /api/calendar/events`, `GET /api/timetables`, `POST /api/google-calendar/sync` |
| **Profile & Routines** | `ProfilePage.tsx` | `Navbar.tsx`, `googleApi` | `GET/PUT /api/preferences`, `GET/POST/PATCH/DELETE /api/routines`, `POST /api/auth/google/unlink` |
| **Productivity Analytics** | `AnalyticsPage.tsx` | `Navbar.tsx` | `GET /api/analytics/weekly`, `GET /api/analytics/summary` |
| **Notifications** | `NotificationCenter.tsx` | `Navbar.tsx` | `GET /api/notifications`, `PATCH /api/notifications/:id/read` |

