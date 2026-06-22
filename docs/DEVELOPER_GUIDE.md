# Developer Guide

Welcome to LocallyExplained. This guide explains the project structure, architecture, and how to build new features.

## Overview

LocallyExplained is a multilingual web application that presents local stories on an interactive map. Visitors can explore storypoints, listen to stories via text-to-speech, and request new storypoints. Admins moderate submissions and manage content.

The project uses **Next.js 15 App Router** with **React 19**, **TypeScript**, and **PostgreSQL (Neon)** for data. It supports Catalan, Spanish, and English.

## Tech Stack at a Glance

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | Next.js 15 | Full-stack React with file-based routing and API routes |
| Runtime | Node.js 22 | Required by the project engine |
| Language | TypeScript 5.8 | Static typing for safer development |
| UI Library | React 19 | Component model with Server and Client Components |
| Maps | MapLibre GL JS 5.5 | Open-source map engine with WebGL |
| Tiles | OpenStreetMap raster | Default tile source, free for development |
| Database | Neon serverless PostgreSQL | Managed Postgres with HTTP-based serverless driver |
| Fallback storage | JSON file (`.data/locally-explained-db.json`) | Local development without a database |
| Email | Resend | Transactional email provider |
| Styling | Plain CSS | No CSS framework; custom design tokens and utilities |

## Architecture

The app follows Next.js App Router conventions:

```
app/              Route segments, server components, and API handlers
components/      Reusable React components (mostly client-side)
lib/             Business logic, types, i18n, auth, data store
docs/            Project documentation
scripts/         Seed and migration scripts
```

### Key Architectural Principles

1. **Server Components by default.** Pages in `app/` are server-rendered. Components that need browser APIs mark themselves with `'use client'`.
2. **Route-based data fetching.** Server components read from the store/database directly and pass data to client components as props.
3. **Colocated API routes.** REST endpoints live alongside pages in `app/api/`.
4. **Dual storage mode.** The app uses PostgreSQL when `DATABASE_URL` is set; otherwise it falls back to a local JSON file.

## How Next.js Works in This Project

Next.js App Router is the backbone of the application. It handles routing, rendering, and API serving.

### App Directory Structure

```
app/
  layout.tsx                 Root HTML shell; imports global CSS and MapLibre CSS
  page.tsx                   Root redirect to /ca
  globals.css                Global styles and CSS custom properties
  [locale]/                  Dynamic locale segment (ca | es | en)
    page.tsx                 Public home page
    account/page.tsx         User account center
    admin/page.tsx           Admin dashboard (role-gated)
    donations/page.tsx       Donations placeholder
    who-are-we/page.tsx      About page placeholder
    storypoints/[id]/page.tsx Story reader page
    users/[id]/page.tsx      Public user profile
  api/
    storypoints/route.ts         GET all storypoints
    storypoint-requests/route.ts POST create request
    favorites/[id]/route.ts      POST toggle favorite
    recover/route.ts             POST recover/reset password
    login/route.ts               POST login
    register/route.ts            POST register
    logout/route.ts              POST logout
    account/route.ts             PATCH update profile
    account/requests/[id]/route.ts    DELETE request
    account/storypoints/[id]/route.ts DELETE storypoint
    account/favorites/[id]/route.ts   DELETE favorite
    admin/storypoint-requests/[id]/route.ts POST approve/reject
    admin/storypoints/[id]/route.ts DELETE storypoint
    admin/users/[id]/route.ts        DELETE user
```

### Server Components vs. Client Components

- **Server Components** (`app/[locale]/page.tsx`): Fetch data on the server, render HTML, send minimal JS to the browser.
- **Client Components** (`components/home-client.tsx`, `components/map-view.tsx`): Handle interactivity, browser APIs (geolocation, speech synthesis), and form state. They start with `'use client'`.

### Rendering Strategy

- The project uses **Server-Side Rendering (SSR)** via `page.tsx` files that are async functions.
- Data is fetched server-side (from `lib/store.ts`) and passed to client components as props.
- Client components use `fetch` to call API routes for mutations.

### Image and Asset Handling

- Profile images are external URLs (no local uploads).
- OpenStreetMap tiles are loaded as raster images via MapLibre.

## How Node.js Works in This Project

Node.js 22.x is the runtime. The project uses it for:

### Server-Side Execution

- Next.js server components run on Node.js in the server (or Vercel Edge runtime if deployed there).
- API route handlers run as Node.js serverless functions.
- The Neon database driver (`@neondatabase/serverless`) runs HTTP queries from Node.js to a Postgres endpoint.

### Data Layer

- `lib/store.ts` is the data access layer. It abstracts whether data comes from:
  - A local JSON file (`.data/locally-explained-db.json`)
  - A Neon PostgreSQL database (via `neon()` SQL template tags)
- All data mutations go through `persistStore()`, which knows how to write to the active backend.
- The store is loaded lazily and cached in a module-level promise (`storePromise`).

### Scripts

Node.js scripts in `scripts/` handle one-off tasks like database seeding:

```bash
npm run db:seed   # Runs scripts/seed-db.mjs with .env loaded
```

### Build and Dev

- `next dev` starts a local dev server with Turbopack.
- `next build` compiles the app for production.
- `next start` serves the compiled app.

## How the Frontend Works

The frontend is a React 19 application with server-rendered pages and client-side interactivity.

### Page Flow

1. **Navigation:** Next.js router handles `/[locale]/` URL segments. `notFound()` is used for invalid locales.
2. **Server Rendering:** Page components fetch data (`listStorypoints()`, `getCurrentUser()`) on the server and pass it to client components.
3. **Client Hydration:** Client components handle interactivity using React hooks.

### Map Frontend (`components/map-view.tsx`)

- Uses MapLibre GL JS to render an OpenStreetMap raster tile layer.
- Renders circular markers for each storypoint.
- Handles click events for selection and request-mode picking.
- Draws a 3 km geodesic radius circle around the user's geolocation when available.
- Uses `useRef` to maintain the MapLibre instance across React renders.
- Uses a `defaultMapCenter` of `[0, 20]` when no user location is available.

### Story Reader (`components/story-reader.tsx`)

- Displays story title and body with adjustable font size via CSS custom property `--story-font-size`.
- Uses the browser's `SpeechSynthesisUtterance` API for text-to-speech.
- Maps locale codes: `ca -> ca-ES`, `es -> es-ES`, `en -> en-US`.
- Shows submitter info and link to their profile.
- Supports favoriting (if logged in).

### Home Client (`components/home-client.tsx`)

- Main orchestrator for the home page.
- Manages state for: selected storypoint, request mode, picked point, user location, favorites, and status messages.
- Calls `/api/storypoint-requests` for new requests.
- Calls `/api/favorites/[id]` for toggling favorites.
- Persists user location in `localStorage`.

### Account Center (`components/account-center.tsx`)

- Handles login, registration, and password recovery in a single component with mode switching.
- Shows account settings (profile image URL, name, email, password change).
- Lists user's requests, favorites, and owned storypoints with delete actions.
- Uses `router.refresh()` after mutations to re-fetch server data.

### Styling

- `app/globals.css` contains all global styles.
- CSS custom properties for theme values (e.g., `--story-font-size`).
- Maps are contained in `.map-shell` / `.map-frame`.
- No CSS framework; designed with plain CSS for the MVP.

## How the Backend Works

The backend lives in `lib/store.ts` and `app/api/`.

### Data Store (`lib/store.ts`)

The store is a singleton that abstracts the persistence layer:

```typescript
// If DATABASE_URL is set:
const remoteSql = neon(remoteDatabaseUrl);
// Uses a single-row JSONB table: locally_explained_state (id=1, data=jsonb)

// If no DATABASE_URL:
const dbPath = join(process.cwd(), '.data/locally-explained-db.json');
// Reads/writes the entire store as a JSON file
```

The `Store` type contains:

```typescript
type Store = {
  users: UserAccount[];
  sessions: SessionRecord[];
  storypoints: Storypoint[];
  requests: StorypointRequest[];
};
```

Key behaviors:
- **Lazy loading:** `getStore()` loads once and caches the result.
- **Atomic persistence:** `persistStore()` writes the entire store on every mutation. For the JSON backend, it syncs the file. For PostgreSQL, it upserts the JSONB row.
- **Session cleanup:** `purgeExpiredSessions()` removes expired sessions on access.
- **Content claiming:** `claimContentForEmail()` links anonymous requests/storypoints to a newly registered user by matching email.

### API Routes

All API routes use `NextResponse` from `next/server`. Most follow this pattern:

1. Extract auth token from cookies.
2. Validate user/admin role.
3. Call the appropriate store function.
4. Send email notification (if applicable).
5. Return JSON response.

Example approval flow:
1. Admin clicks "Approve" in `AdminDashboard`.
2. `fetch('/api/admin/storypoint-requests/[id]', { method: 'POST', body: { decision: 'approved' } })`.
3. Server handler calls `reviewStorypointRequest(id, 'approved', ...)`.
4. Store creates a new `Storypoint` from the request.
5. Store persists.
6. `sendRequestNotification()` emails the requester.

### Authentication

- **User auth:** `scrypt` password hashing with random 16-byte salts. 64-byte derived keys.
- **Session management:** Random 32-byte hex tokens stored as HMAC-SHA256 hashes in the `sessions` array. Tokens last 30 days. Cookies are HTTP-only, SameSite=Lax.
- **Admin auth:** Same session mechanism. Admins are users with `role === 'admin'`.
- **Password recovery:** 6-digit numeric codes stored with 1-hour expiry. Sent via Resend email.

### Types (`lib/types.ts`)

Core domain types:

- `UserAccount` - Registered user with role, favorites, password hash/salt
- `Storypoint` - Map location with multilingual translations
- `StorypointRequest` - Pending submission with status
- `Locale` - `'ca' | 'es' | 'en'`
- `Messages` - UI string dictionary per locale

## Database

### Local Development (JSON Fallback)

File: `.data/locally-explained-db.json`

```json
{
  "users": [...],
  "sessions": [...],
  "storypoints": [...],
  "requests": [...]
}
```

Reset the database by deleting this file; it will be regenerated from seed data.

### Production (Neon PostgreSQL)

When `DATABASE_URL`, `POSTGRES_URL`, or `NEON_DATABASE_URL` is present:

- Table `locally_explained_state` stores the entire application state as a single `jsonb` column.
- The store reads/writes the whole row on every request.
- This simplifies the MVP but does not scale for high concurrency.

### Seed Data

Two seed storypoints are embedded in `lib/store.ts`:
- "Sheltered Bay" (lat 39.9376, lng 3.9624)
- "Natural Harbour" (lat 39.8894, lng 4.2631)

An admin user is auto-created on first load:
- Email: `ADMIN_EMAIL` env var or `admin@locally-explained.local`
- Password: `ADMIN_PASSWORD` env var or `admin`
- Role: `admin`

## Internationalization (i18n)

- UI strings live in `lib/i18n.ts` as a `Record<Locale, Messages>`.
- `getMessages(locale)` returns the string dictionary.
- `getLocaleStorypoint(storypoint, locale)` returns the translation, falling back to `originalLocale`.
- Locale is part of the URL path: `/[locale]/...`.
- Invalid locales trigger `notFound()`.

No external i18n library is used; the MVP uses a simple dictionary with manual fallback.

## How to Develop New Features

### Add a New Page

1. Create `app/[locale]/new-page/page.tsx`.
2. Validate the locale with `isLocale(locale)`.
3. Fetch data in the server component.
4. Create a `'use client'` component in `components/` for interactivity.

### Add a New API Route

1. Create a file in `app/api/` following the existing convention.
2. Extract the session token from the cookie header.
3. Validate auth and input.
4. Call the store function.
5. Return `NextResponse.json()`.

### Add a New Store Function

1. Add the function to `lib/store.ts`.
2. Read from `(await getStore())`.
3. Mutate the store object.
4. Call `await persistStore(store)`.
5. Export the function.

### Add a New UI Message

1. Add the key to the `Messages` type in `lib/types.ts`.
2. Add the string for `ca`, `es`, and `en` in `lib/i18n.ts`.
3. Use `messages.yourKey` in the component.

### Modify the Database Schema

In the current architecture, the schema is the `Store` type in `lib/store.ts`. To add a field:

1. Add the field to the relevant TypeScript type.
2. Update seed data if needed.
3. If using PostgreSQL, the JSONB column handles it automatically (no migration needed).

For production, migrate to a normalized schema with Prisma or Drizzle.

### Common Patterns

**Fetching data in a server component:**
```typescript
const storypoints = await listStorypoints();
const currentUser = await getCurrentUser();
return <ClientComponent storypoints={storypoints} user={currentUser} />;
```

**Handling a mutation from a client component:**
```typescript
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(input)
});
router.refresh();
```

**Checking admin access:**
```typescript
if (!currentUser || currentUser.role !== 'admin') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | Neon/PostgreSQL connection string | Falls back to JSON file |
| `ADMIN_EMAIL` | Admin user email | `admin@locally-explained.local` |
| `ADMIN_PASSWORD` | Admin user password | `admin` |
| `ADMIN_SESSION_SECRET` | HMAC secret for session tokens | `dev-session-secret` |
| `RESEND_API_KEY` | Resend API key | None (logs to console) |
| `RESEND_FROM_EMAIL` | Sender address for emails | `onboarding@resend.dev` (dev) |

## Development Commands

```bash
npm run dev         # Start dev server at http://localhost:3000
npm run build       # Production build
npm run start       # Serve production build
npm run lint        # ESLint check
npm run db:seed     # Seed database
```

## Deployment Notes

- The app is configured for Vercel (`vercel.json`).
- For self-hosted deployment, run `next build && next start` with Node.js 22.
- Required env vars: `DATABASE_URL` (or use JSON fallback), `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`.
- For email: `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
