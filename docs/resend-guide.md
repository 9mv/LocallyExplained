# Resend Integration Guide

Resend is the transactional email provider for LocallyExplained. It handles:

- Welcome/verification emails during account registration
- Password recovery codes
- Storypoint request submission confirmations
- Moderation decisions (approved/rejected)

## Configuration

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | No | Authenticates API calls to Resend |
| `RESEND_FROM_EMAIL` | No | Verified sender address shown to recipients |

### Development Fallback

If `RESEND_API_KEY` is not set, `lib/email.ts` logs the email content to the console instead of sending it.

```typescript
const defaultFromEmail = isProduction ? null : 'LocallyExplained <onboarding@resend.dev>';
```

In local development, the app uses `onboarding@resend.dev` as the sender if `RESEND_FROM_EMAIL` is not explicitly set.

## Email Helper

All email sending is centralized in `lib/email.ts`:

### `sendVerificationEmail(to, code)`
Sends a 6-digit account verification code. The code expires in 5 minutes and is only valid until a newer code is requested.

### `sendRecoveryEmail(to, code)`

Sends a 6-digit password recovery code. The code expires in 1 hour.

### `sendRequestSubmissionEmail(to, title)`

Confirms that a storypoint request was received and is pending review.

### `sendRequestNotification(to, status, title, note?)`

Notifies the requester of the moderation decision. `status` is `'approved'` or `'rejected'`. An optional `note` from the admin is included.

### Internal `sendEmail(to, subject, text)`

All public functions delegate to this helper. It:

1. Checks if the Resend client is initialized.
2. Fails open (logs to console) if email is not configured.
3. Calls `resend.emails.send()` with the configured sender.
4. Logs success or failure.

## Email Flows in the Application

### Registration

1. Client: `POST /api/register` with username, email, password, confirm password.
2. Server: Creates an unverified user account and stores a 6-digit verification code (5-min expiry).
3. Server: Calls `sendVerificationEmail(user.email, code)` and returns an opaque resume token.
4. Client: `POST /api/register/verify` with the resume token and code.
5. Server: Validates the code (max 5 attempts, latest code only), marks the account verified, creates a session, and sets the cookie (auto-login).
6. `POST /api/register/resend` (with resume token) issues a new code, enforcing a 2-minute cooldown; only the latest code is valid.

### Password Recovery

1. Client: `POST /api/recover` (first call with just email)
2. Server: Generates 6-digit code, updates user record.
3. Server: Calls `sendRecoveryEmail(email, code)`.
4. Client: Submits code + new password.
5. Server: Validates code, updates password.

### Storypoint Request Submission

1. Client: `POST /api/storypoint-requests`
2. Server: Creates request in store.
3. Server: Calls `sendRequestSubmissionEmail(email, title)`.

### Moderation

1. Client: `POST /api/admin/storypoint-requests/[id]` with `{ decision: 'approved' }`
2. Server: Updates request status, creates storypoint if approved.
3. Server: Calls `sendRequestNotification(email, decision, title, reviewerNote)`.

## Testing

### Test Without a Resend Account

Do not set `RESEND_API_KEY`. Emails will be logged to the console:

```
[mail] Password recovery code -> user@example.com
Your password recovery code is: 123456

This code will expire in 1 hour.
```

### Test With a Real Resend Account

1. Sign up at [resend.com](https://resend.com).
2. Verify a sender domain or identity.
3. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in `.env`.
4. Run `npm run dev`.
5. Trigger an email event (e.g., register a new user).
6. Check the Resend dashboard for sent emails.

## Production Checklist

- [ ] Verify sender domain/identity in Resend
- [ ] Set `RESEND_API_KEY` in production environment
- [ ] Set `RESEND_FROM_EMAIL` to the verified sender address
- [ ] Confirm all four email types are delivered end-to-end
- [ ] Add retries or alerting for email failures if needed
- [ ] Consider adding rate limiting to recovery and request endpoints

## Notes

- Email failures are non-blocking. The main action succeeds even if email delivery fails.
- Resend is suited for transactional email, not bulk marketing.
