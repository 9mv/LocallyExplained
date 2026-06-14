import { StorypointRequest } from './types';

export async function sendModerationEmail(request: StorypointRequest, decision: 'approved' | 'rejected') {
  const from = process.env.RESEND_FROM_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey && from) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: request.email,
        subject: `Your storypoint request was ${decision}`,
        text: `Your storypoint request "${request.title}" was ${decision}.`
      })
    });

    return;
  }

  console.info(`[email] ${decision} request ${request.id} for ${request.email}`);
}
