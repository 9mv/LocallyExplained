# User Account and Data Model Guide

This guide explains the data models, persistence layer, and account flows in LocallyExplained.

## Persistence Layer

The app supports two storage backends, selected automatically based on environment variables.

### Neon PostgreSQL (Production)

When `DATABASE_URL`, `POSTGRES_URL`, or `NEON_DATABASE_URL` is set, the app uses Neon serverless PostgreSQL.

Schema: A single table holds the entire application state as JSONB.

```sql
CREATE TABLE IF NOT EXISTS locally_explained_state (
  id integer PRIMARY KEY,
  data jsonb NOT NULL
);
```

The `data` column contains the full `Store` object (users, sessions, storypoints, requests). This is practical for an MVP but should be normalized for production scale.

### JSON File Fallback (Local Development)

When no database URL is configured, the app writes to `.data/locally-explained-db.json`.

The file format mirrors the in-memory `Store` type exactly:

```json
{
  "users": [],
  "sessions": [],
  "storypoints": [],
  "requests": []
}
```

To reset local data, delete the file:

```bash
rm .data/locally-explained-db.json
```

## Core Data Types

### UserAccount

```typescript
type UserAccount = {
  id: string;                  // UUID
  email: string;               // Normalized lowercase
  name: string;                // Display name
  passwordSalt: string;        // 16-byte hex for scrypt
  passwordHash: string;        // 64-byte hex derived key
  profileImageUrl: string;     // External URL or empty
  favoriteStorypointIds: string[]; // Linked storypoint IDs
  role: 'user' | 'admin';      // Access control
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
  recoveryCode?: string;       // 6-digit reset code
  recoveryCodeExpiresAt?: number; // Unix ms
};
```

### Storypoint

```typescript
type Storypoint = {
  id: string;                        // UUID
  slug: string;                      // URL-safe identifier
  locationName: string;              // Human-readable place name
  lat: number;                       // Latitude (WGS84)
  lng: number;                       // Longitude (WGS84)
  originalLocale: Locale;            // Source language
  submittedByUserId?: string;        // Linked user ID
  submittedByUserName?: string;      // Submitter display name
  submittedByEmail?: string;         // Submitter email
  submittedByProfileImageUrl?: string; // Submitter avatar
  translations: Record<Locale, StoryTranslation>;
};

type StoryTranslation = {
  title: string;
  body: string;
};
```

### StorypointRequest

```typescript
type StorypointRequest = {
  id: string;                        // UUID
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
};
```

### SessionRecord (Internal)

```typescript
type SessionRecord = {
  tokenHash: string;       // HMAC-SHA256 of session token
  userId: string;          // References UserAccount.id
  expiresAt: string;       // ISO timestamp (30 days)
};
```

## User Account Flows

### Registration

1. Client sends `POST /api/register` with email, password, confirmPassword.
2. Server validates: email required, password min 8 chars, passwords must match.
3. Server creates `passwordSalt` (random 16-byte hex) and `passwordHash` (scrypt 64-byte).
4. Creates `UserAccount` with `role: 'user'`.
5. Calls `claimContentForEmail()` to link any prior anonymous requests/storypoints to the new user.
6. Creates a session token (random 32-byte hex).
7. Returns user object (no sensitive fields) and HTTP-only cookie `locally_explained_user`.

### Login

1. Client sends `POST /api/login` with email and password.
2. Server finds user by normalized email.
3. Server verifies password via `scrypt` + timing-safe comparison.
4. Creates session token and HTTP-only cookie.
5. Returns user object.

### Password Recovery

1. Client sends `POST /api/recover` with `email`.
2. Server generates a 6-digit numeric code, stores it with 1-hour expiry.
3. Server sends email via Resend (or logs to console).
4. Client sends `POST /api/recover` with `email`, `code`, `newPassword`, `confirmPassword`.
5. Server validates code and expiry, updates password hash and salt.
6. Clears recovery code from user record.

### Session Management

- Session tokens are random 32-byte hex strings.
- Token hashes are stored server-side to prevent token theft from the database.
- Sessions expire after 30 days.
- `getCurrentUser()` reads the cookie, looks up the session, and returns the user or `null`.
- Expired sessions are purged on every access.

### Account Management

Users can update their profile via `PATCH /api/account`:

- Email (must remain unique)
- Name
- Profile image URL
- Password (requires current password for verification)

### Admin Operations

Admins (`role === 'admin'`) can:

- **Approve/reject requests** via `POST /api/admin/storypoint-requests/[id]`.
- **Delete any storypoint** via `DELETE /api/admin/storypoints/[id]`.
- **Delete users** via `DELETE /api/admin/users/[id]`.

Self-deletion is blocked for safety (at least one admin must remain).

### Content Ownership

When a user registers, the system calls `claimContentForEmail()`:

- Matches any unlinked `StorypointRequest` or `Storypoint` by email.
- Sets `submittedByUserId`, `submittedByUserName`, and `submittedByProfileImageUrl`.
- This ensures users can manage their prior contributions even if submitted anonymously.

## Default Accounts

An admin user is auto-created on first load:

| Field | Value |
|-------|-------|
| Email | `ADMIN_EMAIL` env var or `admin@locally-explained.local` |
| Password | `ADMIN_PASSWORD` env var or `admin` |
| Role | `admin` |

No default test users are seeded. Use the environment variables to configure production credentials.

## Email Integration

Emails are sent via the Resend client in `lib/email.ts`.

Functions:

- `sendVerificationEmail(to, code)` - Sent during registration (verification code)
- `sendRecoveryEmail(to, code)` - Sent for password recovery
- `sendRequestSubmissionEmail(to, title)` - Sent after creating a request
- `sendRequestNotification(to, status, title, note?)` - Sent after moderation

If `RESEND_API_KEY` is not set, emails are logged to the console instead of being sent.

## Database Seeding

Run `npm run db:seed` to execute `scripts/seed-db.mjs`.

This script:
1. Loads environment variables from `.env`.
2. Connects to the configured database (Neon or local JSON).
3. Ensures seed data exists (default admin account).
