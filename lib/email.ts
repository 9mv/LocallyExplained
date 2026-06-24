import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL;

// Only use the fallback in development; production needs a real verified sender
const isProduction = process.env.NODE_ENV === 'production';
const defaultFromEmail = isProduction ? null : 'LocallyExplained <onboarding@resend.dev>';

const resend = apiKey ? new Resend(apiKey) : null;

export type SendEmailResult = { ok: true } | { ok: false; error: string };

async function sendEmail(to: string, subject: string, text: string): Promise<SendEmailResult> {
  if (!resend) {
    // Dev fallback: no API key configured. Surface the message on the server console.
    console.log(`[mail] ${subject} -> ${to}\n${text}`);
    return { ok: true };
  }

  const sender = fromEmail || defaultFromEmail;
  if (!sender) {
    const error = 'No sender configured. Set RESEND_FROM_EMAIL in production.';
    console.error(`[mail] ${error}`);
    return { ok: false, error };
  }

  try {
    // Resend v6 resolves with { data, error } instead of throwing on API failures,
    // so the error field must be inspected explicitly.
    const result = await resend.emails.send({ from: sender, to, subject, text });
    if (result.error) {
      const message = result.error.message || 'Unknown Resend error';
      console.error(`[mail] Failed to send "${subject}" to ${to}:`, message);
      return { ok: false, error: message };
    }
    console.log(`[mail] Sent "${subject}" to ${to}`, result.data?.id ?? '');
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[mail] Threw while sending "${subject}" to ${to}:`, message);
    return { ok: false, error: message };
  }
}

export async function sendRecoveryEmail(to: string, code: string): Promise<SendEmailResult> {
  return sendEmail(
    to,
    'Password recovery code',
    `Your password recovery code is: ${code}\n\nThis code will expire in 1 hour.`
  );
}

export async function sendVerificationEmail(to: string, code: string): Promise<SendEmailResult> {
  return sendEmail(
    to,
    'Confirm your LocallyExplained account',
    `Welcome! Use the following code to confirm your account: ${code}\n\nThis code will expire in 5 minutes.`
  );
}

export async function sendRequestSubmissionEmail(to: string, title: string): Promise<SendEmailResult> {
  return sendEmail(
    to,
    'Storypoint request received',
    `Your storypoint request "${title}" was received and is waiting for review.`
  );
}

export async function sendRequestNotification(to: string, status: 'approved' | 'rejected', title: string, note?: string): Promise<SendEmailResult> {
  const statusText = status === 'approved' ? 'approved' : 'rejected';
  const body = note
    ? `Your storypoint request "${title}" has been ${statusText}.\n\nNote: ${note}`
    : `Your storypoint request "${title}" has been ${statusText}.`;

  return sendEmail(to, `Storypoint request ${statusText}`, body);
}
