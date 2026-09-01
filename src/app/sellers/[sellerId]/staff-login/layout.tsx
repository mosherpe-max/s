import type { Metadata } from 'next';

export async function generateMetadata(
  { params }: { params: Promise<{ sellerId: string }> }
): Promise<Metadata> {
  const { sellerId } = await params;
  return {
    manifest: `/sellers/${sellerId}/staff-login/manifest.json`,
  };
}

export default function StaffLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
