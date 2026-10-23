import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/invite', '/reset'];

/** Cheap gate: no cookie, no app. The API still validates the token on every request. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)))
    return NextResponse.next();
  if (req.cookies.get('crm_session')?.value) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|offline.html).*)',
  ],
};
