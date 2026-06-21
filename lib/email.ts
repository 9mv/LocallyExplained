import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL;
const defaultFromEmail = 'LocallyExplained <onboarding@resend.dev>';

const resend = apiKey ? new Resend(apiKey) : null;

async function sendEmail(to: string, subject: string, text: string) {
  if (!resend) {
    console.log(`[mail] ${subject} -> ${to}\n${text}`);
    return;
  }

  try {
    await resend.emails.send({
      from: fromEmail || defaultFromEmail,
      to,
      subject,
      text
    });
  } catch (error) {
    console.error(`[mail] failed to send ${subject} to ${to}`, error);
  }
}

export async function sendRecoveryEmail(to: string, code: string) {
  await sendEmail(
    to,
    'Password recovery code',
    `Your password recovery code is: ${code}\n\nThis code will expire in 1 hour.`
  );
}

export async function sendWelcomeEmail(to: string, name: string) {
  await sendEmail(to, 'Welcome to LocallyExplained', `Hello ${name},\n\nYour account has been created successfully.`);
}

export async function sendRequestSubmissionEmail(to: string, title: string) {
  await sendEmail(
    to,
    'Storypoint request received',
    `Your storypoint request "${title}" was received and is waiting for review.`
  );
}

export async function sendRequestNotification(to: string, status: 'approved' | 'rejected', title: string, note?: string) {
  const statusText = status === 'approved' ? 'approved' : 'rejected';
  const body = note
    ? `Your storypoint request "${title}" has been ${statusText}.\n\nNote: ${note}`
    : `Your storypoint request "${title}" has been ${statusText}.`;

  await sendEmail(to, `Storypoint request ${statusText}`, body);
}
