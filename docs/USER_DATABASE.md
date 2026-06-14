# User Database and Admin Guide

This guide explains how the user account system works in LocallyExplained.

## Database Location

The database is a JSON file stored at `.data/locally-explained-db.json`. It contains:

- `users`: Array of user accounts
- `sessions`: Array of active session tokens
- `storypoints`: Array of story point data
- `requests`: Array of storypoint requests

## User Account Model

Each user account has these fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique UUID identifier |
| `email` | string | Unique email address (normalized to lowercase) |
| `name` | string | Display name (derived from email if not provided) |
| `passwordSalt` | string | Random 32-char hex salt for password hashing |
| `passwordHash` | string | Scrypt-derived key from password + salt |
| `profileImageUrl` | string | Optional URL to profile picture |
| `favoriteStorypointIds` | string[] | List of storypoint IDs the user favorited |
| `role` | 'user' \| 'admin' | User role for access control |
| `createdAt` | string | ISO timestamp |
| `updatedAt` | string | ISO timestamp |

## Registration Flow

1. User submits email, password, and password confirmation to `/api/register`
2. System checks if email already exists → returns 409 Conflict if so
3. Password must be at least 8 characters
4. Creates `passwordSalt` and `passwordHash` using scrypt (64-byte output)
5. Sets default `role` to `'user'`
6. Creates session token and returns it as HTTP-only cookie
7. Returns user object without sensitive fields

## Login Flow

1. User submits email and password to `/api/login`
2. System validates credentials via `scrypt` comparison
3. If valid, creates session token stored as `locally_explained_user` cookie
4. Cookie lasts 30 days, HTTP-only, SameSite=lax

## Admin Access

Admin is now a **regular user with the `admin` role**:

- Admin panel at `/[locale]/admin` checks `currentUser.role === 'admin'`
- If not admin, the account center is shown instead
- Same login endpoint works for both user and admin authentication
- Admin can:
  - View and approve/reject storypoint requests
  - Delete any storypoint
  - See submitter name/email on requests and storypoints

To create an admin user, set environment variables:

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password
```

On first run, an admin user is auto-created with these credentials.

## Session Management

- Tokens are random 64-char hex strings
- Token hashes stored in database for session verification
- `getUserBySessionToken(token)` returns user if session valid
- Sessions expire after 30 days

## Email Notifications

When an admin approves/rejects a request, `sendModerationEmail()` is called:

- If `RESEND_API_KEY` and `RESEND_FROM_EMAIL` env vars set → sends via Resend API
- Otherwise logs to console

## Profile Image

Each user can set a `profileImageUrl` in their account settings:

- Image shown next to their name on storypoints and requests
- Stored as a URL string in the user account and copied to owned storypoints
- If unset, shows a placeholder with their initials
- On the profile page, displays at larger size

## Test User

A test user was created:

- Email: `user1@example.com`
- Password: `12345678`

You can sign in at `/[locale]/account` to test the user flow.