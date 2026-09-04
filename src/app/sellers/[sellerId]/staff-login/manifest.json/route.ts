import { NextResponse } from 'next/server';

/**
 * Per-venue manifest so "Add to Home Screen" from the staff PIN-entry page
 * launches straight back into that page instead of the site's global "/"
 * start_url (the app-wide manifest.json's start_url, which is what Safari
 * uses on standalone launch regardless of which page the icon was added from).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sellerId: string }> }
) {
  const { sellerId } = await params;

  return NextResponse.json(
    {
      name: 'KOOP Staff Portal',
      short_name: 'KOOP Staff',
      description: 'Koop staff sign-in and shift dashboard.',
      start_url: `/sellers/${sellerId}/staff-login`,
      // Explicit scope, not left to iOS's implicit inference from start_url's
      // directory. The staff flow's first real navigation (staff-login ->
      // bevcart/clubhouse/laneside) is exactly where the standalone PWA has
      // been dropping into Safari browser chrome - the working theory is
      // that iOS mis-resolves the implicit scope on that first cross-path
      // navigation. Covers every route under this venue (staff-login,
      // bevcart, clubhouse, laneside).
      scope: `/sellers/${sellerId}/`,
      display: 'standalone',
      background_color: '#213147',
      theme_color: '#E50000',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } }
  );
}
