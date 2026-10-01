import type {Metadata} from 'next';
import './globals.css';
import { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { AppHeader } from '@/components/header';
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase';
import { CartProvider } from '@/lib/cart-context';
import { OrderNotificationListener } from '@/components/order-notification-listener';
import { NavigationStateTracker } from '@/components/navigation-state-tracker';
import { BrandingFooter } from '@/components/branding-footer';
import { StandaloneDebugBadge } from '@/components/standalone-debug-badge';

export const metadata: Metadata = {
  title: 'KOOP',
  description: 'On-course refreshment delivery.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KOOP',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700;900&family=PT+Sans:wght@400;700;900&family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        {/* Next.js's `appleWebApp: { capable: true }` metadata field only renders
            the generic <meta name="mobile-web-app-capable"> tag - as of Next 15 it
            no longer emits the legacy Apple-prefixed one (verified by inspecting
            node_modules/next/dist/lib/metadata/generate/basic.js's AppleWebAppMeta
            resolver and the actual built HTML output). iOS Safari has only ever
            reliably honored apple-mobile-web-app-capable, not the generic tag, so
            every page in this app was silently missing the one signal iOS checks.
            The very first load of an installed PWA (from the Home Screen icon)
            doesn't need it - iOS uses the manifest's display mode for that launch
            - but a real top-level navigation mid-session to a new document (e.g.
            staff-login -> bevcart/clubhouse/laneside via window.location.href)
            is a fresh document load, and without this tag iOS falls back to full
            browser chrome even though the app's WKWebView process never actually
            left the installed standalone container (navigator.standalone stayed
            true throughout every observed break). Writing it directly as a static
            tag here guarantees it is present synchronously on every single page. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className={cn("font-body antialiased min-h-screen flex flex-col pb-7")}>
        <StandaloneDebugBadge />
        <FirebaseClientProvider>
          <CartProvider>
            <Suspense fallback={null}>
              <NavigationStateTracker />
            </Suspense>
            <OrderNotificationListener />
            <Suspense fallback={<div className="h-16 bg-[#213147] border-b-2 border-[#E50000]" />}>
              <AppHeader />
            </Suspense>
            <main className="flex-1">
              {children}
            </main>
            <Toaster />
            <BrandingFooter />
          </CartProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
