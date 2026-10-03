import { NextResponse, type NextRequest } from 'next/server';
import { MARKETING_PATHS } from '@/lib/marketing-paths';

// kooporder.com is the public marketing site; kooporder.app is the product
// (Koop Admin, Venue Admin, staff terminals, patron ordering). Both domains
// point at this one deployment, so this is where they get separated: the
// marketing host serves only the pages listed below and sends everything else
// to the same path on the app host. Any other host (kooporder.app, preview
// URLs, localhost) is untouched.
const APP_ORIGIN = 'https://kooporder.app';
const MARKETING_HOSTS = new Set(['kooporder.com', 'www.kooporder.com']);

// Marketing pages are listed in src/lib/marketing-paths.ts.
const MARKETING_PATH_SET = new Set(MARKETING_PATHS);

// Assets the marketing pages themselves need.
const SHARED_PREFIXES = ['/_next/', '/icons/', '/marketing/'];
const SHARED_FILES = new Set(['/favicon.ico', '/icon', '/apple-icon', '/robots.txt', '/sitemap.xml']);

// Install/offline plumbing for the product only: the marketing host must not
// be installable as an app or register the service worker.
const APP_ONLY_FILES = new Set(['/manifest.json', '/manifest.webmanifest', '/sw.js']);

export function middleware(request: NextRequest) {
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '')
    .split(':')[0]
    .toLowerCase();
  if (!MARKETING_HOSTS.has(host)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;

  if (MARKETING_PATH_SET.has(pathname) || SHARED_FILES.has(pathname) || SHARED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  if (APP_ONLY_FILES.has(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  // 307 (temporary) while the split is new; switch to 308 once it's settled.
  return NextResponse.redirect(`${APP_ORIGIN}${pathname}${search}`, 307);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
