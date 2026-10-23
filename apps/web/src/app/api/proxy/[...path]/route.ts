import { NextResponse, type NextRequest } from 'next/server';
import { API_URL, SESSION_COOKIE } from '@/lib/api';

/** Browser code calls the API through here so the session token stays in the httpOnly cookie. */
const ALLOWED = ['customers', 'deviations', 'auth/mfa'];

async function forward(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join('/');
  if (!ALLOWED.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const raw = req.method === 'GET' || req.method === 'HEAD' ? '' : await req.text();
  // Fastify rejects a JSON content-type with an empty body, so only send the header when there is one.
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  if (raw) headers['content-type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`${API_URL}/${path}${req.nextUrl.search}`, {
      method: req.method,
      headers,
      body: raw || undefined,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'The service is unreachable.' }, { status: 503 });
  }
  return new NextResponse(await res.text(), {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}

export { forward as GET, forward as POST, forward as PATCH };
