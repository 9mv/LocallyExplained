# Resend Guide

## What Resend Does

Resend is a transactional email service. In this app it is used to send small, event-driven emails such as:

- Welcome emails after account creation
- Password recovery codes
- Storypoint request submission receipts
- Storypoint moderation notifications when a request is approved or rejected

The app sends email through the Resend API using the `RESEND_API_KEY` environment variable.

## How It Works

Resend uses two core values:

- `RESEND_API_KEY`: authenticates API calls
- `RESEND_FROM_EMAIL`: the verified sender address shown to recipients

If `RESEND_FROM_EMAIL` is not set, the app falls back to `LocallyExplained <onboarding@resend.dev>` for local development.

The mail helper is in `lib/email.ts`. It creates a `Resend` client and wraps all email sending behind one function so the rest of the app does not need to know about the provider.

## How It Is Integrated In This App

### Email helper

File: `lib/email.ts`

This file exports:

- `sendRecoveryEmail(to, code)`
- `sendWelcomeEmail(to, name)`
- `sendRequestSubmissionEmail(to, title)`
- `sendRequestNotification(to, status, title, note?)`

All of them call a shared internal `sendEmail()` helper.

### Account registration

File: `app/api/register/route.ts`

Flow:

1. The user submits email and password.
2. The account is created in the local store.
3. `sendWelcomeEmail()` sends a welcome message.
4. A session cookie is created.

### Password recovery

File: `app/api/recover/route.ts`

Flow:

1. The user enters an email address.
2. A six-digit recovery code is generated.
3. The code is stored in the user record with an expiry.
4. `sendRecoveryEmail()` sends the code.
5. The same endpoint also accepts `code`, `newPassword`, and `confirmPassword` to complete the reset.

### Storypoint request submission

File: `app/api/storypoint-requests/route.ts`

Flow:

1. The user submits a storypoint request.
2. The request is stored.
3. `sendRequestSubmissionEmail()` sends a receipt email.

### Request moderation

File: `app/api/admin/storypoint-requests/[id]/route.ts`

Flow:

1. An admin approves or rejects a request.
2. The request is updated in the store.
3. `sendRequestNotification()` emails the requester with the decision.

## How To Test It

### 1. Add environment variables

Set these in `.env`:

```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=LocallyExplained <onboarding@resend.dev>
```

For production, use a sender you verified in Resend.

### 2. Start the app

```bash
npm run dev
```

### 3. Test account creation

Create a new account from the account page.

Expected result:

- Account is created
- You receive a welcome email

### 4. Test password recovery

On the login form:

1. Click `Forgot password?`
2. Enter the email address
3. Request the recovery code
4. Check the inbox for the code
5. Enter the code and new password

Expected result:

- Recovery code email is sent
- Password can be reset with the code

### 5. Test storypoint request submission

Submit a new storypoint request.

Expected result:

- Request is created
- Receipt email is sent to the requester

### 6. Test moderation emails

As an admin, approve or reject a pending request.

Expected result:

- Request status updates
- Decision email is sent to the requester

### 7. Verify logs if email is not configured

If `RESEND_API_KEY` is missing, the helper logs the outgoing email payload instead of sending it.

## Production Checklist

- [ ] Verify a sender identity or domain in Resend
- [ ] Set `RESEND_API_KEY` in the production environment
- [ ] Set `RESEND_FROM_EMAIL` to the verified sender
- [ ] Make sure the sender matches the authenticated Resend domain
- [ ] Confirm password recovery emails are delivered end-to-end
- [ ] Confirm welcome, receipt, and moderation emails are delivered
- [ ] Decide whether request submission receipts should be enabled in production
- [ ] Add rate limiting to recovery and request endpoints
- [ ] Add retries or alerting for email failures if needed
- [ ] Replace the in-memory store if you need persistent recovery codes and moderation state

## Notes

- Resend is best suited for transactional email, not bulk marketing email.
- The current app treats email failures as non-blocking: the main action still succeeds and the app logs the problem.
- For local development, `onboarding@resend.dev` is enough to confirm integration without a custom domain.
