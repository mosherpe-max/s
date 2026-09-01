import type { Metadata } from 'next';

// See bevcart/layout.tsx - links to the same manifest URL as staff-login so
// the <link rel="manifest"> tag stays identical across every staff route.
export async function generateMetadata(
  { params }: { params: Promise<{ sellerId: string }> }
): Promise<Metadata> {
  const { sellerId } = await params;
  return {
    manifest: `/sellers/${sellerId}/staff-login/manifest.json`,
  };
}

export default function ClubhouseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
