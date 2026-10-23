import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/api';

export async function POST() {
  const out = NextResponse.json({ ok: true });
  out.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return out;
}
