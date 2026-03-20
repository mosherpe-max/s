import type {Metadata} from 'next';
import './globals.css';
import { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { AppHeader } from '@/components/header';
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase';
import { CartProvider } from '@/lib/cart-context';
import { OrderNotificationListener } from '@/components/order-notification-listener';
import { BrandingFooter } from '@/components/branding-footer';

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
        <FirebaseClientProvider>
          <CartProvider>
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
