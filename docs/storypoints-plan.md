# LocallyExplained / Storypoints Project

## 1. Project goal

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
- Administrators can log in and approve or reject Storypoint requests.

The current implementation is an MVP scaffold. It has the full frontend structure, route handlers, localization architecture, map integration, admin UI, and in-memory data storage. Production persistence, real email delivery, and production-grade authentication still need to be wired.

---

## 2. Technology stack

### Frontend

- **Next.js**
  - Application framework.
  - Handles routing, server-rendered pages, API routes, metadata, and build process.
- **React**
  - Component model for the UI.
- **TypeScript**
  - Static typing for components, data models, and route payloads.
- **CSS**
  - Plain global CSS for the MVP.
  - Avoids extra styling dependencies while keeping the interface clean and responsive.

### Map

- **MapLibre GL JS**
  - Interactive map engine.
  - Renders the map, pins, navigation controls, and geolocation circle.
- **OpenStreetMap raster tiles**
  - Used as the default tile source.
  - For production, consider MapTiler, Stadia, or another tile provider with a clear usage policy.

### Backend

- **Next.js Route Handlers**
  - API endpoints live under `app/api`.
  - Used for Storypoints, Storypoint requests, and admin login.
- **In-memory store**
  - Currently implemented in `lib/store.ts`.
  - Useful for local development and MVP testing.
  - Should be replaced by a database for production.

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

Future upgrade options:

- Azure Speech
- Google Cloud Text-to-Speech
- ElevenLabs
- Amazon Polly

### Email

- Current implementation has an email hook in `lib/email.ts`.
- The hook logs moderation events to the console.
- Production should use:
  - Resend
  - Postmark
  - SendGrid
  - Amazon SES

### Authentication

- Current MVP uses a password-protected admin session cookie.
- Passwords are compared with HMAC-SHA256.
- This is acceptable for an early prototype but should be replaced by stronger password hashing, such as Argon2id, before production.

---

## 3. Architecture overview

The project uses a Next.js App Router architecture.

```text
app/
  Server-rendered page components and API route handlers.

components/
  Reusable React client and server components.

lib/
  Shared utilities, data models, localization, auth, storage, and email hooks.

docs/
  Project documentation.
```

The application is divided into three main areas:

### Public visitor area

Available without login.

Pages:

- Home map page
- Storypoint reader page
- Donations page
- Who are we page

### Story request area

Available without login.

Flow:

1. User presses **Request a storypoint**.
2. Map enters selection mode.
3. User clicks the exact location on the map.
4. Form appears asking for:
   - Title
   - Story text
   - Email
5. Request is submitted as pending.
6. Admin reviews it later.

### Admin area

Protected by password.

Pages and features:

- Admin login page
- Pending Storypoint request queue
- Approve action
- Reject action
- Email notification hook after moderation

---

## 4. Project structure

```text
locally-explained/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx
│  ├─ globals.css
│  ├─ api/
│  │  ├─ storypoints/
│  │  │  └─ route.ts
│  │  ├─ storypoint-requests/
│  │  │  └─ route.ts
│  │  └─ admin/
│  │     ├─ login/
│  │     │  └─ route.ts
│  │     └─ storypoint-requests/[id]/
│  │        └─ route.ts
│  └─ [locale]/
│     ├─ page.tsx
│     ├─ admin/
│     │  └─ page.tsx
│     ├─ donations/
│     │  └─ page.tsx
│     ├─ who-are-we/
│     │  └─ page.tsx
│     └─ storypoints/[id]/
│        └─ page.tsx
├─ components/
│  ├─ admin-dashboard.tsx
│  ├─ admin-login.tsx
│  ├─ home-client.tsx
│  ├─ language-switcher.tsx
│  ├─ map-view.tsx
│  ├─ request-storypoint-form.tsx
│  ├─ site-header.tsx
│  ├─ story-reader.tsx
│  └─ storypoint-preview.tsx
├─ docs/
│  └─ storypoints-plan.md
├─ lib/
│  ├─ auth.ts
│  ├─ circle.ts
│  ├─ email.ts
│  ├─ i18n.ts
│  ├─ store.ts
│  └─ types.ts
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ next-env.d.ts
├─ next.config.mjs
└─ prompt.md
```

---

## 5. File responsibilities

### `app/layout.tsx`

Root layout for the application.

Responsibilities:

- Defines global metadata.
- Imports MapLibre CSS.
- Imports global styles.
- Wraps every page.

### `app/page.tsx`

Root redirect.

Responsibilities:

- Redirects `/` to `/ca`.

### `app/[locale]/page.tsx`

Home page.

Responsibilities:

- Validates locale.
- Renders the site header.
- Renders the interactive map client component.
- Passes Storypoints from the store.

### `app/[locale]/storypoints/[id]/page.tsx`

Full Storypoint reader page.

Responsibilities:

- Finds a Storypoint by ID.
- Renders the plain text reader.
- Provides a back route to the map.

### `app/[locale]/donations/page.tsx`

Donations placeholder page.

Responsibilities:

- Shows a placeholder for future PayPal, Stripe, or donation widget integration.

### `app/[locale]/who-are-we/page.tsx`

Project information placeholder page.

Responsibilities:

- Shows placeholder text for the organization or project team.

### `app/[locale]/admin/page.tsx`

Admin page.

Responsibilities:

- Checks the admin session cookie.
- Shows the login form if not authenticated.
- Shows the admin dashboard if authenticated.

### `components/home-client.tsx`

Main client-side home component.

Responsibilities:

- Handles request mode.
- Handles selected Storypoint preview.
- Handles user location prompt.
- Stores the user location in `localStorage`.
- Submits Storypoint requests to `/api/storypoint-requests`.

### `components/map-view.tsx`

Map component.

Responsibilities:

- Initializes MapLibre.
- Uses OpenStreetMap tiles.
- Adds Storypoint markers.
- Handles map click selection when request mode is active.
- Centers the map on user location when permission is granted.
- Draws a 3 km geolocation radius circle.

### `components/storypoint-preview.tsx`

Mini popup shown over the map.

Responsibilities:

- Shows Storypoint title.
- Shows the location name.
- Provides **Play**.
- Provides close button.

### `components/story-reader.tsx`

Full Storypoint reader.

Responsibilities:

- Shows title.
- Shows plain text story.
- Provides larger and smaller text buttons.
- Provides play/pause text-to-speech button.
- Provides close/back button.

### `components/request-storypoint-form.tsx`

Request form shown after selecting a map point.

Responsibilities:

- Shows selected coordinates.
- Collects title, story text, and email.
- Submits the request to the API.

### `components/admin-login.tsx`

Admin login form.

Responsibilities:

- Collects password.
- Calls `/api/admin/login`.
- Refreshes the admin page after login.

### `components/admin-dashboard.tsx`

Admin moderation dashboard.

Responsibilities:

- Shows pending requests.
- Provides approve and reject buttons.
- Calls `/api/admin/storypoint-requests/[id]`.

### `components/site-header.tsx`

Global site header.

Responsibilities:

- Shows app branding.
- Shows main navigation links.
- Shows language switcher.
- Shows admin login button in the top right.

### `components/language-switcher.tsx`

Locale switcher.

Responsibilities:

- Switches between Catalan, Spanish, and English.
- Preserves the current page path when changing locale.

### `lib/types.ts`

Shared TypeScript types.

Responsibilities:

- Defines `Locale`.
- Defines `Storypoint`.
- Defines `StorypointRequest`.
- Defines UI message dictionaries.

### `lib/i18n.ts`

Localization dictionary and helpers.

Responsibilities:

- Stores UI translations for `ca`, `es`, and `en`.
- Provides `getMessages`.
- Provides `getLocaleStorypoint`.
- Provides `isLocale`.

### `lib/store.ts`

In-memory data store.

Responsibilities:

- Stores seed Storypoints.
- Stores Storypoint requests.
- Creates new Storypoint requests.
- Reviews requests.
- Converts approved requests into Storypoints.

Important note:

This store is in memory. Data will reset when the development server restarts.

### `lib/auth.ts`

Admin authentication helper.

Responsibilities:

- Verifies admin password.
- Creates admin session token.
- Checks admin session token.
- Provides cookie name.

### `lib/email.ts`

Email delivery placeholder.

Responsibilities:

- Provides `sendModerationEmail`.
- Currently logs moderation events to the console.
- Should be replaced with a real email provider.

### `lib/circle.ts`

Geospatial helper.

Responsibilities:

- Generates a geodesic circle polygon.
- Used to draw the 3 km user-radius circle on the map.

---

## 6. Routing

### Root redirect

```text
/
```

Redirects to:

```text
/ca
```

### Home pages

```text
/ca
/es
/en
```

Each locale has its own home page.

### Storypoint reader

```text
/ca/storypoints/[id]
/es/storypoints/[id]
/en/storypoints/[id]
```

Example:

```text
/ca/storypoints/cala-galdana-cliffs
```

### Donations

```text
/ca/donations
/es/donations
/en/donations
```

### Who are we

```text
/ca/who-are-we
/es/who-are-we
/en/who-are-we
```

### Admin

```text
/ca/admin
/es/admin
/en/admin
```

### API routes

```text
GET  /api/storypoints
POST /api/storypoint-requests
POST /api/admin/login
POST /api/admin/storypoint-requests/[id]
```

---

## 7. How the website works

### 7.1 First visit and default location

The home page starts with a neutral default map view.

On first visit, the browser does not automatically ask for location access. If the user presses the location button and allows location access:

- The map centers on the user's position.
- A 3 km radius circle is drawn around the user.
- The location is saved in `localStorage`.

If the user refuses location access or wants the default view, the map stays on the neutral default view.

### 7.2 Storypoints

A Storypoint contains:

- ID
- Slug
- Location name
- Latitude
- Longitude
- Original locale
- Translations for Catalan, Spanish, and English

The current seed data includes generic sample Storypoints.

### 7.3 Map pins

Each Storypoint is rendered as a pin on the MapLibre map.

When a user clicks a pin:

1. The Storypoint becomes selected.
2. A mini popup appears.
3. The popup shows the localized title.
4. The user can press **Play**.

### 7.4 Mini popup

The mini popup contains:

- Storypoint title
- Location name
- **Play** button
- Close button

Pressing **Play** opens the full Storypoint reader.

### 7.5 Full Storypoint reader

The reader page contains:

- Title
- Plain text story
- Smaller text button
- Larger text button
- Play/pause text-to-speech button
- Close/back button

Text-to-speech uses the browser `SpeechSynthesisUtterance`.

Language mapping:

```text
ca -> ca-ES
es -> es-ES
en -> en-US
```

### 7.6 Request a Storypoint

The home page has a **Request a storypoint** button.

Flow:

1. User presses the button.
2. Request mode is enabled.
3. User clicks the exact location on the map.
4. A form appears.
5. User enters:
   - Title
   - Story text
   - Email
6. The request is sent to `/api/storypoint-requests`.
7. The request is stored with status `pending`.

Pressing **Request a storypoint** again cancels request mode.

### 7.7 Donations page

The donations page is currently a placeholder.

Future options:

- PayPal donate button
- Stripe Payment Link
- Stripe Checkout
- Embedded donation widget

### 7.8 Who are we page

The who are we page is currently a placeholder.

Future content should describe:

- Project mission
- Contributors
- Local knowledge workflow
- Editorial principles
- Contact information

### 7.9 Admin login

The admin login is password-protected.

Default local admin password:

```text
admin
```

This can be overridden with environment variables:

```bash
ADMIN_PASSWORD=your-password
ADMIN_SESSION_SECRET=your-session-secret
```

### 7.10 Admin dashboard

After login, the admin can see pending Storypoint requests.

Each request shows:

- Title
- Email
- Story text
- Coordinates

The admin can approve or reject the request.

### 7.11 Approving a request

When a request is approved:

1. Request status becomes `approved`.
2. A new Storypoint is created from the request.
3. The new Storypoint uses the submitted title and body for all locales.
4. The moderation email hook is called.

### 7.12 Rejecting a request

When a request is rejected:

1. Request status becomes `rejected`.
2. The request remains in the admin history.
3. No Storypoint is created.
4. The moderation email hook is called.

---

## 8. Data model

### `Storypoint`

```ts
{
  id: string;
  slug: string;
  locationName: string;
  lat: number;
  lng: number;
  originalLocale: Locale;
  translations: Record<Locale, {
    title: string;
    body: string;
  }>;
}
```

### `StorypointRequest`

```ts
{
  id: string;
  title: string;
  body: string;
  email: string;
  locale: Locale;
  lat: number;
  lng: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
}
```

### Production database model

For production, use PostgreSQL with PostGIS.

Recommended tables:

```text
storypoints
- id
- slug
- location_name
- geom geography(Point, 4326)
- original_locale
- status
- created_at
- updated_at

storypoint_translations
- id
- storypoint_id
- locale
- title
- body
- translation_source
- reviewed
- created_at
- updated_at

storypoint_requests
- id
- title
- body
- email
- locale
- lat
- lng
- status
- admin_note
- created_at
- reviewed_at

admin_users
- id
- email
- password_hash
- role
- created_at
- last_login_at
```

---

## 9. Localization architecture

The MVP uses a simple dictionary-based localization system.

Supported locales:

```ts
type Locale = 'ca' | 'es' | 'en';
```

UI strings live in `lib/i18n.ts`.

Example:

```ts
getMessages('ca')
getMessages('es')
getMessages('en')
```

Storypoint translations are stored inside each Storypoint object.

Fallback behavior:

```ts
getLocaleStorypoint(storypoint, locale)
```

If a requested translation does not exist, the helper returns the original locale content.

Future production architecture:

- Use `next-intl` for route handling and UI translations.
- Store Storypoint translations in the database.
- Use DeepL API for automatic translation.
- Add an admin review step for translated content.

---

## 10. Security architecture

### Current MVP

Implemented:

- Admin password check
- HTTP-only session cookie
- Locale validation
- Basic request payload checks
- SameSite cookie setting

### Production requirements

Before going live, add:

- Argon2id password hashing
- Strong admin password policy
- Rate limiting on login and request submission
- CSRF protection for admin actions
- Email verification for Storypoint submissions
- Spam protection with hCaptcha or reCAPTCHA
- HTTPS-only cookies
- Content Security Policy headers
- Input sanitization
- Audit logs for moderation actions
- Database permissions and migrations
- Monitoring and error reporting

---

## 11. Setup instructions

### Requirements

Install Node.js first.

Recommended:

```text
Node.js 20 or newer
npm 10 or newer
```

Check versions:

```bash
node --version
npm --version
```

### Install dependencies

From the project root:

```bash
npm install
```

This creates:

```text
node_modules/
package-lock.json
```

### Start development server

```bash
npm run dev
```

By default, Next.js starts on:

```text
http://localhost:3000
```

### Preview the app

Open:

```text
http://localhost:3000
```

The root redirects to:

```text
http://localhost:3000/ca
```

You can also preview other locales:

```text
http://localhost:3000/es
http://localhost:3000/en
```

### Run production build

```bash
npm run build
```

### Run production server

```bash
npm run start
```

### Environment variables

Create a local environment file if needed:

```bash
cp .env.example .env.local
```

Recommended variables:

```bash
ADMIN_PASSWORD=admin
ADMIN_SESSION_SECRET=replace-with-a-long-random-secret
```

For production:

```bash
NODE_ENV=production
ADMIN_PASSWORD_HASH=argon2id-hash-of-admin-password
ADMIN_SESSION_SECRET=long-random-secret
```

Email provider variables, when email is implemented:

```bash
RESEND_API_KEY=your-resend-key
REQUESTOR_EMAIL=noreply@example.com
```

---

## 12. Local usage guide

### Open the map

```text
http://localhost:3000/ca
```

### Select a Storypoint

1. Open the map.
2. Click a pin.
3. Read the mini popup.
4. Press **Play**.

### Open the full reader

The **Play** button opens the full reader page.

### Change language

Use the language switcher in the header.

Example:

```text
CA
ES
EN
```

### Request a Storypoint

1. Press **Request a storypoint**.
2. Click the map at the exact location.
3. Enter title, story text, and email.
4. Submit the request.

### Open admin page

```text
http://localhost:3000/ca/admin
```

### Login as admin

Use the default local password:

```text
admin
```

### Moderate a request

1. Open the admin page.
2. Login.
3. Review pending requests.
4. Press **Accept** or **Reject**.
5. The request status is updated.

---

## 13. Production implementation plan

### Phase 1: Database

Add PostgreSQL with PostGIS.

Recommended providers:

- Supabase
- Neon
- AWS RDS
- Azure Database for PostgreSQL

Add Prisma or Drizzle ORM.

Recommended:

```text
Prisma + PostgreSQL + PostGIS
```

### Phase 2: Authentication

Replace the current prototype auth with production auth.

Recommended:

- Auth.js / NextAuth
- Lucia
- Custom session store with Argon2id

Requirements:

- Strong password hashing
- Password reset
- Admin roles
- Audit logs
- Secure cookies

### Phase 3: Email

Replace `lib/email.ts`.

Recommended provider:

- Resend
- Postmark

Email events:

- Request received
- Request approved
- Request rejected
- Admin notification

### Phase 4: Translation automation

Add automatic translation.

Recommended:

- DeepL API for high-quality translations
- Store translation source metadata
- Add admin review for machine-translated content

### Phase 5: Hosting

Recommended MVP hosting:

```text
Frontend/API: Vercel
Database: Supabase or Neon
Email: Resend
Tiles: MapTiler or OpenStreetMap-compatible provider
```

Alternative full-control hosting:

```text
App: Fly.io or Render
Database: managed PostgreSQL
Email: Postmark or Resend
```

### Phase 6: Hardening

Add:

- Rate limiting
- Spam protection
- CSP headers
- Monitoring
- Error reporting
- Backups
- Database migrations
- CI checks

---

## 14. Known MVP limitations

The current implementation is intentionally scaffolded.

Current limitations:

- Storypoints and requests are stored in memory.
- Data resets when the server restarts.
- Email confirmation is only a placeholder.
- Admin password hashing uses HMAC-SHA256, not Argon2id.
- Request submissions are not rate-limited.
- No spam protection yet.
- No database migrations yet.
- No CI pipeline yet.
- No production deployment configuration yet.
- `next lint` may need to be replaced with an ESLint setup for newer Next.js versions.

---

## 15. Recommended next steps

1. Add PostgreSQL with PostGIS.
2. Add Prisma schema and migrations.
3. Replace the in-memory store with database queries.
4. Add Resend or Postmark for real emails.
5. Add Argon2id password hashing.
6. Add rate limiting.
7. Add spam protection to the request form.
8. Add automatic translations with DeepL.
9. Add admin review for translations.
10. Deploy to Vercel and connect a managed database.
