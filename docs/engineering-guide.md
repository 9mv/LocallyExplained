# LocallyExplained Engineering Guide

## Overview

LocallyExplained is a Next.js 15 App Router application for interactive local storytelling. It combines a map-based public experience, a story reader, a request workflow for new storypoints, and a lightweight admin moderation area.

The app supports multilingual UI (Catalan, Spanish, English) and uses Neon PostgreSQL with a JSON file fallback for data persistence.

## Architecture

The app is organized around three layers:

1. `app/`
   - Route segments, page shells, and API handlers.
   - Server-rendered pages handle locale validation and data lookup.
2. `components/`
   - UI building blocks.
   - `use client` components handle map interaction, forms, speech synthesis, and admin actions.
3. `lib/`
   - Shared domain types and utilities.
   - Includes store, localization, auth, email hook, and geodesic circle math.

Data flows like this:

- Home page loads storypoints from the store (Neon PostgreSQL or local JSON).
- The map renders markers and lets the visitor enter request mode.
- The request form POSTs to an API route.
- Admin login sets an HTTP-only cookie.
- Moderation actions update the store and optionally create a new storypoint.

## File Structure

```text
app/
  layout.tsx                 Root layout and metadata
  page.tsx                   Redirects `/` to `/ca`
  globals.css                Global styles
  [locale]/
    page.tsx                 Public map page
    account/page.tsx         User account center
    admin/page.tsx           Admin dashboard or login
    donations/page.tsx        Donations placeholder page
    who-are-we/page.tsx      Project/about placeholder page
    storypoints/[id]/page.tsx Story reader page
    users/[id]/page.tsx      Public user profile page
  api/
    storypoints/route.ts              GET all storypoints
    storypoint-requests/route.ts      POST create request
    favorites/[id]/route.ts           POST toggle favorite
    recover/route.ts                  POST recover/reset password
    login/route.ts                    POST login
    register/route.ts                 POST register
    logout/route.ts                   POST logout
    account/route.ts                  PATCH update profile
    account/requests/[id]/route.ts    DELETE request
    account/storypoints/[id]/route.ts DELETE storypoint
    account/favorites/[id]/route.ts   DELETE favorite
    admin/storypoint-requests/[id]/route.ts POST approve/reject
    admin/storypoints/[id]/route.ts   DELETE storypoint
    admin/users/[id]/route.ts         DELETE user

components/
  home-client.tsx              Main visitor experience
  map-view.tsx                 MapLibre map and pin rendering
  story-reader.tsx             Full story reader with TTS and font controls
  request-storypoint-form.tsx  Request form for new storypoints
  account-center.tsx           User account management
  admin-dashboard.tsx          Pending request moderation UI
  site-header.tsx              Shared top navigation
  language-switcher.tsx        Locale switcher
  storypoint-preview.tsx       Selected pin preview card
  confirm-dialog.tsx           Confirmation modal

lib/
  types.ts                     Shared domain types
  store.ts                     Data access layer (Neon + JSON fallback)
  i18n.ts                      Locale strings and translation helpers
  auth.ts                      Password hashing and session helpers
  email.ts                     Email delivery via Resend
  circle.ts                    Geodesic circle helper for the map radius
  session.ts                   Current user session resolver

docs/
  DEVELOPER_GUIDE.md           New developer onboarding and architecture deep-dive
  engineering-guide.md         Engineering conventions and maintenance
  USER_DATABASE.md             User account and data models
  storypoints-plan.md          Product requirements and roadmap
  resend-guide.md              Email integration guide

scripts/
  seed-db.mjs                  Database seeding script
```

## Solutions Used

### Next.js App Router

- Server-rendered pages for routing and data lookup.
- Route handlers under `app/api` for JSON APIs.
- Locale-based routing under `/ca`, `/es`, and `/en`.
- Server Components by default; `'use client'` for interactivity.

### Map and location

- `maplibre-gl` renders the interactive map.
- OpenStreetMap raster tiles are the current tile source.
- `buildGeodesicCircle()` draws the 3 km user-radius overlay.
- Browser geolocation is used to center the map when allowed.

### Story reading

- Full story pages use browser Web Speech API for text-to-speech.
- Font size is controlled via a CSS custom property on the root element.

### Requests and moderation

- New storypoint requests are stored in the data layer.
- Admin moderation approves or rejects requests.
- Approved requests become new storypoints immediately.

### Authentication

- User passwords use `scrypt` with random salts and 64-byte derived keys.
- Session management uses HMAC-SHA256 hashed tokens stored in HTTP-only cookies.
- Admins are users with `role === 'admin'`.
- Password recovery uses time-limited 6-digit codes sent via email.

### Localization

- Translation strings live in `lib/i18n.ts`.
- If a storypoint is missing a translation, the app falls back to the original locale.
- Supported locales: `ca` (Catalan), `es` (Spanish), `en` (English).

### Database

- Primary: Neon serverless PostgreSQL. The entire app state is stored as JSONB in a single row.
- Fallback: Local JSON file at `.data/locally-explained-db.json`.
- The store layer in `lib/store.ts` abstracts both backends.

### Email

- Transactional emails via Resend API.
- Falls back to console logging if `RESEND_API_KEY` is not set.
- Used for: welcome emails, password recovery, request receipts, moderation notifications.

## Deployment

### Local development

```bash
npm install
npm run dev
```

The app redirects `/` to `/ca`.

### Production build

```bash
npm run build
npm run start
```

Host on any Node-capable platform: Vercel, Render, Fly.io, Railway, or a VM.

### Environment variables

Key environment variables:

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | Neon/PostgreSQL connection | Falls back to JSON |
| `ADMIN_EMAIL` | Admin user email | `admin@locally-explained.local` |
| `ADMIN_PASSWORD` | Admin user password | `admin` |
| `ADMIN_SESSION_SECRET` | HMAC secret for sessions | `dev-session-secret` |
| `RESEND_API_KEY` | Resend API key | None (console log) |
| `RESEND_FROM_EMAIL` | Email sender address | `onboarding@resend.dev` |

## Maintenance

### What is safe to change quickly

- Copy text in `lib/i18n.ts`
- Seed storypoints in `lib/store.ts`
- Presentation in `app/globals.css`
- Route labels and page content in `app/[locale]/*`

### What needs more care

- `lib/store.ts` because the data layer abstracts Neon + JSON fallback
- `lib/auth.ts` because session and password logic is security-sensitive
- `components/map-view.tsx` because it manages MapLibre lifecycle directly
- `components/story-reader.tsx` because it touches browser speech synthesis and global CSS state

### Recommended next upgrades

1. Normalize the database schema (separate tables for users, storypoints, requests, translations).
2. Add Prisma or Drizzle ORM.
3. Replace scrypt with Argon2id for password hashing.
4. Add rate limiting to login, register, and recover endpoints.
5. Add spam protection (hCaptcha or reCAPTCHA) to request submission.
6. Add automated translation (e.g., DeepL) for storypoint content.
7. Add CI/CD pipeline and database migrations.
8. Add monitoring and error reporting.

## Mental Model

If you are extending the app, think in terms of:

- `app/` for route composition (server components + API routes)
- `components/` for interactive UI (client components)
- `lib/` for business logic and reusable primitives

That separation keeps the codebase easy to reason about.
