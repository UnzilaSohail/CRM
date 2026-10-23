import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const API_URL = process.env.API_URL ?? 'http://localhost:3001';
export const SESSION_COOKIE = 'crm_session';

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; denied: true } | { ok: false; error: string };

/**
 * Server-side GET against the API using the session cookie.
 * 401 sends the user to the login page (expired or missing session); 403 is returned as `denied`
 * so the page can render an access-denied state instead of throwing.
 */
export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return { ok: false, error: 'The service is unreachable. Try again shortly.' };
  }
  if (res.status === 401) redirect('/login?expired=1');
  if (res.status === 403) return { ok: false, denied: true };
  if (!res.ok) return { ok: false, error: `Request failed (${res.status})` };
  return { ok: true, data: (await res.json()) as T };
}
