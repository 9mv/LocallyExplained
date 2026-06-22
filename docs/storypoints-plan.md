# LocallyExplained / Storypoints Project

## 1. Project Goal

LocallyExplained is a multilingual web application for city and location visitors. The application presents an interactive map with pins called **Storypoints**. Each Storypoint represents a place, monument, natural area, historical site, or culturally significant location.

Visitors can:

- Explore a map that starts with a neutral default view.
- Click Storypoint pins.
- Open a mini popup with the Storypoint title and a **Play** button.
- Open the full Storypoint reader.
- Read the story as plain text.
- Increase or decrease text size.
- Listen to the story using browser text-to-speech.
- Request a new Storypoint by selecting a point on the map.
- Browse donations and project information pages.
- Create accounts, manage profiles, and save favorites.
- Administrators can log in and approve or reject Storypoint requests.

## 2. Current Technology Stack

### Frontend

- **Next.js 15**
  - Application framework with App Router.
  - Handles routing, server-rendered pages, API routes, metadata, and build process.
- **React 19**
  - Component model for the UI.
- **TypeScript 5.8**
  - Static typing for components, data models, and route payloads.
- **CSS**
  - Plain global CSS for the MVP.
  - Avoids extra styling dependencies while keeping the interface clean and responsive.

### Map

- **MapLibre GL JS 5.5**
  - Interactive map engine.
  - Renders the map, pins, navigation controls, and geolocation circle.
- **OpenStreetMap raster tiles**
  - Used as the default tile source.
  - For production, consider MapTiler, Stadia, or another tile provider with a clear usage policy.

### Backend

- **Next.js Route Handlers**
  - API endpoints live under `app/api`.
  - Used for Storypoints, Storypoint requests, user auth, and admin operations.
- **Neon PostgreSQL**
  - Primary data store when `DATABASE_URL` is configured.
  - Uses a serverless HTTP-based driver (`@neondatabase/serverless`).
  - For local development without a database, falls back to a JSON file at `.data/locally-explained-db.json`.
- **In-memory cache**
  - The store is loaded lazily and cached for the process lifetime.

### Localization

- Manual locale dictionary in `lib/i18n.ts`.
- Supported locales:
  - `ca`: Catalan, default locale.
  - `es`: Spanish.
  - `en`: English.
- Locale routes:
  - `/ca`
  - `/es`
  - `/en`

### Text-to-speech

- **Browser Web Speech API**
  - Current MVP implementation.
  - No server cost.
  - Voice quality depends on browser and operating system.

### Email

- **Resend**
  - Transactional email for: welcome emails, password recovery, request receipts, and moderation notifications.
  - Falls back to console logging if API key is not configured.

### Authentication

- User passwords use `scrypt` with random salts.
- Session management uses HMAC-SHA256 hashed tokens in HTTP-only cookies.
- Admins are users with `role === 'admin'`.
- Password recovery uses time-limited 6-digit codes sent via email.

## 3. Architecture Overview

The project uses a Next.js App Router architecture.

```text
app/
  Server-rendered page components and API route handlers.

components/
  Reusable React client and server components.

lib/
  Shared utilities, data models, localization, auth, storage, and email hooks.

scripts/
  One-off Node.js scripts for seeding and migrations.
```

### Public Visitor Area

Available without login.

Pages:

- Home map page
- Storypoint reader page
- Donations page
- Who are we page
- Public user profile

### User Account Area

Available after login or registration.

Pages:

- Account center (profile, settings, my requests, favorites, my storypoints)
- Password recovery flow

### Request Flow

Available without login, but linking to an account is encouraged.

Flow:

1. User presses **Request a storypoint**.
2. Map enters selection mode.
3. User clicks the exact location on the map.
4. Form appears asking for title, story text, and email.
5. Request is submitted as pending.
6. Admin reviews it later.

### Admin Area

Protected by admin role.

Pages and features:

- Admin login and dashboard
- Pending Storypoint request queue
- Approve/reject actions
- Delete any storypoint
- Delete users
- Email notification to requesters

## 4. Project Structure

```text
locally-explained/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx
│  ├─ globals.css
│  ├─ [locale]/
│  │  ├─ page.tsx
│  │  ├─ account/
│  │  │  └─ page.tsx
│  │  ├─ admin/
│  │  │  └─ page.tsx
│  │  ├─ donations/
│  │  │  └─ page.tsx
│  │  ├─ who-are-we/
│  │  │  └─ page.tsx
│  │  ├─ storypoints/
│  │  │  └─ [id]/page.tsx
│  │  └─ users/
│  │     └─ [id]/page.tsx
│  └─ api/
│     ├─ storypoints/route.ts
│     ├─ storypoint-requests/route.ts
│     ├─ favorites/[id]/route.ts
│     ├─ recover/route.ts
│     ├─ login/route.ts
│     ├─ register/route.ts
│     ├─ logout/route.ts
│     ├─ account/route.ts
│     ├─ account/requests/[id]/route.ts
│     ├─ account/storypoints/[id]/route.ts
│     ├─ account/favorites/[id]/route.ts
│     ├─ admin/storypoint-requests/[id]/route.ts
│     ├─ admin/storypoints/[id]/route.ts
│     └─ admin/users/[id]/route.ts
├─ components/
│  ├─ home-client.tsx
│  ├─ map-view.tsx
│  ├─ story-reader.tsx
│  ├─ request-storypoint-form.tsx
│  ├─ account-center.tsx
│  ├─ admin-dashboard.tsx
│  ├─ site-header.tsx
│  ├─ language-switcher.tsx
│  ├─ storypoint-preview.tsx
│  └─ confirm-dialog.tsx
├─ docs/
│  ├─ DEVELOPER_GUIDE.md
│  ├─ engineering-guide.md
│  ├─ USER_DATABASE.md
│  ├─ storypoints-plan.md
│  └─ resend-guide.md
├─ lib/
│  ├─ types.ts
│  ├─ store.ts
│  ├─ i18n.ts
│  ├─ auth.ts
│  ├─ email.ts
│  ├─ circle.ts
│  └─ session.ts
├─ scripts/
│  └─ seed-db.mjs
├─ package.json
├─ tsconfig.json
├─ next.config.mjs
├─ vercel.json
└─ .env.example
```

## 5. File Responsibilities

### `app/layout.tsx`

Root layout. Sets metadata, imports MapLibre CSS and global styles.

### `app/page.tsx`

Root redirect from `/` to `/ca`.

### `app/[locale]/page.tsx`

Home page. Validates locale, fetches storypoints and current user, renders `SiteHeader` and `HomeClient`.

### `app/[locale]/storypoints/[id]/page.tsx`

Story reader page. Fetches storypoint by ID, renders `StoryReader`.

### `app/[locale]/account/page.tsx`

User account page. Fetches user data, requests, favorites, and storypoints. Renders `AccountCenter`.

### `app/[locale]/admin/page.tsx`

Admin page. Checks `currentUser.role === 'admin'`. Shows `AdminDashboard` for admins, `AccountCenter` for others.

### `app/[locale]/users/[id]/page.tsx`

Public user profile. Shows user info and their storypoints.

### `components/home-client.tsx`

Main client-side component. Manages map state, request mode, favorites, and geolocation.

### `components/map-view.tsx`

MapLibre map component. Renders OSM tiles, markers, geolocation circle, and handles clicks.

### `components/storypoint-preview.tsx`

Mini popup over the map. Shows title, location, Play button, and favorite toggle.

### `components/story-reader.tsx`

Full story reader. Font size controls, text-to-speech, favorite toggle, back navigation.

### `components/request-storypoint-form.tsx`

Form for submitting new storypoint requests. Collects title, body, and email.

### `components/account-center.tsx`

Account management hub. Login, registration, password recovery, profile editing, and content management.

### `components/admin-dashboard.tsx`

Admin moderation panel. Shows pending requests and all storypoints with approve/reject/delete actions.

### `lib/store.ts`

Data access layer. Abstracts Neon PostgreSQL and JSON file storage. All CRUD operations.

### `lib/auth.ts`

Password hashing (`scrypt`), session token minting/verification, HMAC helpers.

### `lib/email.ts`

Email delivery via Resend. Console fallback when API key is missing.

### `lib/i18n.ts`

Locale dictionaries for Catalan, Spanish, and English. Translation helpers.

### `lib/circle.ts`

Geodesic circle calculation for the 3 km user radius on the map.

## 6. Routing

### Root redirect

```text
/ -> /ca
```

### Home pages

```text
/ca, /es, /en
```

### Storypoint reader

```text
/ca/storypoints/[id]
/es/storypoints/[id]
/en/storypoints/[id]
```

### User profile

```text
/ca/users/[id]
```

### Account

```text
/ca/account
```

### Admin

```text
/ca/admin
```

### Donations and About

```text
/ca/donations
/ca/who-are-we
```

### API routes

```text
GET    /api/storypoints
POST   /api/storypoint-requests
POST   /api/favorites/[id]
POST   /api/recover
POST   /api/login
POST   /api/register
POST   /api/logout
PATCH  /api/account
DELETE /api/account/requests/[id]
DELETE /api/account/storypoints/[id]
DELETE /api/account/favorites/[id]
POST   /api/admin/storypoint-requests/[id]
DELETE /api/admin/storypoints/[id]
DELETE /api/admin/users/[id]
```

## 7. How the Website Works

### 7.1 First Visit and Default Location

The home page starts with a neutral map view centered at longitude 20, latitude 0.

On first visit, the browser does not automatically ask for location access. If the user presses the location button and allows:

- The map centers on the user's coordinates.
- A 3 km radius geodesic circle is drawn.
- The location is saved in `localStorage`.

### 7.2 Storypoints

A Storypoint contains title, body, and metadata for three locales, plus geographic coordinates.

Seed data includes two sample Storypoints in Mallorca, Spain.

### 7.3 Map Interaction

Clicking a marker selects the storypoint and shows a preview popup. In request mode, clicking the map places a new point marker for submission.

### 7.4 Search and Discovery

No full-text search is implemented yet. Users discover storypoints by browsing the map and clicking markers.

### 7.5 Full Story Reader

The reader page shows the story, adjustable font size, and text-to-speech playback. Submitter info is displayed with a link to their profile.

### 7.6 Favorites

Logged-in users can favorite storypoints. Favorites are managed per user and displayed on the account page.

### 7.7 Requests

Anonymous or logged-in users can submit storypoint requests. The request includes title, body, email, and map coordinates.

### 7.8 Admin Moderation

Admins review pending requests. Approval creates a storypoint and emails the requester. Rejection preserves the request record.

### 7.9 Accounts and Profiles

Users manage their profile (name, email, avatar URL, password) on the account page. Account deletion cascades to related data.

## 8. Data Model

### Storypoint

```ts
{
  id: string;
  slug: string;
  locationName: string;
  lat: number;
  lng: number;
  originalLocale: Locale;
  submittedByUserId?: string;
  submittedByUserName?: string;
  submittedByEmail?: string;
  submittedByProfileImageUrl?: string;
  translations: Record<Locale, { title: string; body: string }>;
}
```

### StorypointRequest

```ts
{
  id: string;
  title: string;
  body: string;
  email: string;
  submittedByUserId?: string;
  submittedByUserName?: string;
  submittedByProfileImageUrl?: string;
  locale: Locale;
  lat: number;
  lng: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
}
```

### UserAccount

```ts
{
  id: string;
  email: string;
  name: string;
  passwordSalt: string;
  passwordHash: string;
  profileImageUrl: string;
  favoriteStorypointIds: string[];
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
  recoveryCode?: string;
  recoveryCodeExpiresAt?: number;
}
```

### Future Production Schema

For production scale, normalize into:

- `users` table with proper constraints
- `storypoints` table with PostGIS geometry column
- `storypoint_translations` table
- `storypoint_requests` table
- `sessions` table with indexed expiry

## 9. Localization Architecture

The MVP uses a dictionary-based localization system.

Supported locales:

```ts
type Locale = 'ca' | 'es' | 'en';
```

UI strings are stored in `lib/i18n.ts` as a `Record<Locale, Messages>`.

Storypoint translations are embedded in each `Storypoint.translations` object.

Fallback behavior:

```ts
getLocaleStorypoint(storypoint, locale)
```

Returns the requested locale, or falls back to `storypoint.originalLocale`.

## 10. Security Architecture

### Implemented

- `scrypt` password hashing with random salts
- HMAC-SHA256 session token hashing
- HTTP-only, SameSite=Lax session cookies
- Locale path validation
- Admin role checks on protected routes
- Password recovery with time-limited codes
- Input validation on API endpoints

### Recommended for Production

- Argon2id password hashing
- Rate limiting on auth and request endpoints
- CSRF protection for state-changing operations
- hCaptcha or reCAPTCHA on request submission
- Email verification for new accounts
- HTTPS-only cookies with `secure` flag
- Content Security Policy headers
- Audit logging for moderation actions
- Normalized database schema with migrations
- Monitoring and error reporting

## 11. Setup Instructions

### Requirements

- Node.js 22.x
- npm 10+

### Install and Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The root redirects to `/ca`.

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Minimum local config:

```bash
ADMIN_PASSWORD=admin123
ADMIN_SESSION_SECRET=replace-with-random-secret
```

For production database:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

For email:

```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=LocallyExplained <noreply@yourdomain.com>
```

### Seed Database

```bash
npm run db:seed
```

## 12. Known Limitations

- The JSONB storage model does not scale for high concurrency or complex queries.
- No full-text search for storypoints.
- No automated translation pipeline yet.
- Rate limiting and spam protection not implemented.
- No CI/CD pipeline.
- Email is best-effort (failures are logged but do not block actions).

## 13. Recommended Next Steps

1. Migrate to a normalized PostgreSQL schema with Prisma or Drizzle.
2. Add PostgreSQL full-text search for storypoints.
3. Add Argon2id password hashing.
4. Add rate limiting and spam protection.
5. Add automated translation via DeepL or similar.
6. Add admin review for machine-translated content.
7. Add CI/CD with database migrations.
8. Add monitoring and error reporting.
