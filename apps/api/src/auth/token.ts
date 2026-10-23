import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Role } from '@crm/types';

export interface SessionClaims {
  sub: string;
  tid: string;
  role: Role;
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const mac = (body: string, secret: string) => createHmac('sha256', secret).update(body).digest();

export type VerifyResult<T> =
  { ok: true; data: T } | { ok: false; reason: 'malformed' | 'bad-signature' | 'expired' };

/** Compact HMAC-signed payload with an expiry: base64url(json).base64url(signature). */
export function signData<T extends object>(
  data: T,
  secret: string,
  ttlSeconds: number,
  now = Date.now(),
): string {
  const body = b64(JSON.stringify({ ...data, exp: Math.floor(now / 1000) + ttlSeconds }));
  return `${body}.${b64(mac(body, secret))}`;
}

export function verifyData<T extends object>(
  token: string,
  secret: string,
  now = Date.now(),
): VerifyResult<T> {
  const [body, sig] = token.split('.');
  if (!body || !sig) return { ok: false, reason: 'malformed' };
  const expected = mac(body, secret);
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: 'bad-signature' };
  }
  let parsed: T & { exp?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof parsed.exp !== 'number' || parsed.exp * 1000 <= now)
    return { ok: false, reason: 'expired' };
  return { ok: true, data: parsed };
}

export const signSession = (
  claims: SessionClaims,
  secret: string,
  ttlSeconds: number,
  now?: number,
) => signData(claims, secret, ttlSeconds, now);
export const verifySession = (token: string, secret: string, now?: number) =>
  verifyData<SessionClaims>(token, secret, now);

const DEV_SECRET = 'dev-only-secret-change-me-0123456789abcdef';

/** AUTH_SECRET must be set in production; development falls back to a fixed insecure value. */
export function authSecret(env: Record<string, string | undefined> = process.env): string {
  const s = env.AUTH_SECRET;
  if (s) {
    if (s.length < 32) throw new Error('AUTH_SECRET must be at least 32 characters');
    return s;
  }
  if (env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is required in production');
  return DEV_SECRET;
}
