import { NextResponse } from 'next/server';
import { API_URL, SESSION_COOKIE } from '@/lib/api';

/** Exchanges credentials for a session and stores the token in an httpOnly cookie (never exposed to JS). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { message: 'The service is unreachable. Try again shortly.' },
      { status: 503 },
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { message: data.message ?? 'Sign in failed', mfaRequired: data.mfaRequired === true },
      { status: res.status },
    );
  }
  const out = NextResponse.json({ role: data.user.role, name: data.user.name });
  out.cookies.set(SESSION_COOKIE, data.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_INSECURE !== '1',
    path: '/',
    maxAge: data.expiresInSeconds,
  });
  return out;
}
