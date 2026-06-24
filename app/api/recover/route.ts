import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { getUserByEmail, updateUserPassword, resetUserPassword } from '@/lib/store';
import { sendRecoveryEmail } from '@/lib/email';

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? '').trim();
  const code = String(body.code ?? '').trim();
  const newPassword = String(body.newPassword ?? '').trim();
  const confirmPassword = String(body.confirmPassword ?? '').trim();

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const user = await getUserByEmail(email);

  const recoveryCode = String(randomInt(100000, 999999));
  const expiresAt = Date.now() + 60 * 60 * 1000;

  if (!code) {
    if (user) {
      await updateUserPassword(user.id, recoveryCode, expiresAt);
      const result = await sendRecoveryEmail(email, recoveryCode);
      if (!result.ok) {
        // The user exists, so revealing a delivery failure does not leak account
        // existence and lets the user (and operator) act on the real problem.
        return NextResponse.json({ error: 'Could not send recovery email. Please try again later.' }, { status: 502 });
      }
    }
    return NextResponse.json({ message: 'If the email exists, a recovery code has been sent.' });
  }

  if (!user || !user.recoveryCode || !user.recoveryCodeExpiresAt) {
    return NextResponse.json({ error: 'Invalid or expired recovery code' }, { status: 400 });
  }

  if (user.recoveryCode !== code || user.recoveryCodeExpiresAt < Date.now()) {
    return NextResponse.json({ error: 'Invalid or expired recovery code' }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password too short' }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
  }

  await resetUserPassword(email, code, newPassword);

  return NextResponse.json({ message: 'Password reset successfully' });
}
