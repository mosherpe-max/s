import type { Metadata } from 'next';

// Links to the SAME manifest URL as the staff-login layout, not a
// bevcart-specific one. Keeping the <link rel="manifest"> tag identical
// across every staff route (staff-login, bevcart, clubhouse, laneside)
// means it never changes as staff navigate through their shift - only
// the initial page (staff-login) needs its own start_url, and switching
// to a different manifest resource mid-session is suspected of causing
// iOS to eject the standalone PWA into browser chrome.
export async function generateMetadata(
  { params }: { params: Promise<{ sellerId: string }> }
): Promise<Metadata> {
  const { sellerId } = await params;
  return {
    manifest: `/sellers/${sellerId}/staff-login/manifest.json`,
  };
}

export default function BevcartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
