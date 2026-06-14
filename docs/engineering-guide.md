# LocallyExplained Engineering Guide

## Overview

LocallyExplained is a Next.js App Router application for interactive local storytelling.
It combines a map-based public experience, a story reader, a request workflow for new storypoints, and a lightweight admin moderation area.

This codebase is currently an MVP scaffold: the UI, routing, localization, and moderation flow are real, but persistence and production integrations are still in-memory or console-backed.

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

Data currently flows like this:

- Home page loads storypoints from the in-memory store.
- The map renders markers and lets the visitor enter request mode.
- The request form POSTs to an API route.
- Admin login sets an HTTP-only cookie.
- Moderation actions update the in-memory request list and optionally create a new storypoint.

## File Structure

```text
app/
  layout.tsx                 Root layout and metadata
  page.tsx                   Redirects `/` to `/ca`
  globals.css                Global styles
  [locale]/
    page.tsx                 Public map page
    admin/page.tsx           Admin dashboard or login
    donations/page.tsx        Donations placeholder page
    who-are-we/page.tsx      Project/about placeholder page
    storypoints/[id]/page.tsx Story reader page
  api/
    storypoints/route.ts     Storypoints JSON endpoint
    storypoint-requests/route.ts Storypoint request creation endpoint
    admin/login/route.ts     Admin session endpoint
    admin/storypoint-requests/[id]/route.ts Moderation endpoint

components/
  home-client.tsx            Main visitor experience
  map-view.tsx               MapLibre map and pin rendering
  story-reader.tsx           Full story reader with TTS and font controls
  request-storypoint-form.tsx Request form for new storypoints
  admin-login.tsx            Password login form
  admin-dashboard.tsx        Pending request moderation UI
  site-header.tsx            Shared top navigation
  language-switcher.tsx      Locale switcher
  storypoint-preview.tsx     Selected pin preview card

lib/
  types.ts                   Shared domain types
  store.ts                   In-memory storypoint/request store
  i18n.ts                    Locale strings and translation helpers
  auth.ts                    Password check and admin cookie helpers
  email.ts                   Moderation notification hook
  circle.ts                  Geodesic circle helper for the map radius
```

## Solutions Used

### Next.js App Router

- Server-rendered pages for routing and data lookup.
- Route handlers under `app/api` for JSON APIs.
- Locale-based routing under `/ca`, `/es`, and `/en`.

### Map and location

- `maplibre-gl` renders the interactive map.
- OpenStreetMap raster tiles are the current tile source.
- `buildGeodesicCircle()` draws the 3 km user-radius overlay.
- Browser geolocation is used to center the map when allowed.

### Story reading

- Full story pages use browser Web Speech API for text-to-speech.
- Font size is controlled via a CSS custom property on the root element.

### Requests and moderation

- New storypoint requests are stored in memory.
- Admin moderation approves or rejects requests.
- Approved requests become new storypoints immediately in the current process.

### Authentication

- Admin login uses a password check plus an HTTP-only cookie.
- This is enough for local usage and prototyping, but it is not production-grade auth.

### Localization

- Translation strings live in `lib/i18n.ts`.
- If a storypoint is missing a translation, the app falls back to the original locale.

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

For a real deployment, host it on any Node-capable platform such as Vercel, Render, Fly.io, Railway, or a VM with Node.js installed.

### Remote access from a local machine

If you want to expose a local instance temporarily:

1. Run the app so it listens on all interfaces.
2. Put it behind a tunnel such as ngrok or Cloudflare Tunnel.
3. Share the public tunnel URL.

Practical command pattern:

```bash
npm run dev -- --hostname 0.0.0.0
```

Then attach your tunnel to port `3000`.

### Environment variables

The admin flow supports these variables:

- `ADMIN_PASSWORD`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

If no values are set, the app falls back to development defaults, which are not secure and should not be used in production.

## Maintenance

### What is safe to change quickly

- Copy text in `lib/i18n.ts`
- Seed storypoints in `lib/store.ts`
- Presentation in `app/globals.css`
- Route labels and page content in `app/[locale]/*`

### What needs more care

- `lib/auth.ts` because the current auth model is intentionally minimal
- `lib/store.ts` because approved requests mutate in-memory state only
- `components/map-view.tsx` because it manages MapLibre lifecycle directly
- `components/story-reader.tsx` because it touches browser speech synthesis and global CSS state

### Operational limits

- Storypoints and moderation requests disappear when the process restarts.
- Email moderation notifications only log to the console.
- OSM tiles are subject to provider usage policy.
- The admin cookie is only as secure as the configured secret and deployment setup.

### Recommended next upgrades

1. Replace `lib/store.ts` with a database.
2. Replace `lib/email.ts` with a real email provider.
3. Replace the admin password flow with stronger auth and proper session management.
4. Add persistent audit logging for moderation actions.
5. Add tests for request creation, moderation, and locale fallback logic.

## Mental Model

If you are extending the app, think in terms of:

- `app/` for route composition
- `components/` for interactive UI
- `lib/` for business logic and reusable primitives

That separation keeps the codebase easy to reason about even if it was initially built quickly.
