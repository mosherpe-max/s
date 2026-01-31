'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/cart-context';

const GolfBallIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 12c-2 0-2.83 1-4 1s-2-1-4-1" />
      <path d="m15.5 15.5-3-3" />
      <path d="M20 16c-2 0-2.83-1-4-1s-2 1-4 1" />
      <path d="M4 16c2 0 2.83-1 4-1s2 1 4 1" />
      <path d="M12 12c2 0 2.83-1 4-1s2 1 4 1" />
      <path d="M4 8c2 0 2.83 1 4 1s2-1-4-1" />
      <path d="m8.5 8.5 3 3" />
      <path d="M20 8c-2 0-2.83 1-4 1s-2-1-4-1" />
    </svg>
  );

export function AppHeader() {
  const pathname = usePathname();
  const { total, totalItems, setIsCartOpen } = useCart();
  
  const isOrderPage = pathname?.includes('/order') && !pathname?.includes('/track');

  return (
    <header className="bg-transparent sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
            <GolfBallIcon className="h-8 w-8 text-primary" />
            <span className="font-headline text-2xl font-bold text-foreground">
                Koop
            </span>
            </Link>
            {!isOrderPage && (
              <nav className="hidden lg:flex items-center gap-4 text-sm font-medium">
                  <Link href="/#features" className="text-foreground hover:text-primary transition-colors">Features</Link>
                  <Link href="/#pricing" className="text-foreground hover:text-primary transition-colors">Pricing</Link>
                  <Link href="/sellers/1/order" className="text-foreground hover:text-primary transition-colors">Demo Menu</Link>
              </nav>
            )}
        </div>
        <div className="flex items-center gap-2 md:gap-4">
            {isOrderPage ? (
              <Button 
                variant="outline" 
                className="flex items-center gap-2 h-10 px-4"
                onClick={() => setIsCartOpen(true)}
              >
                <div className="flex flex-col items-end leading-none mr-2 hidden sm:flex">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">My Order</span>
                  <span className="text-sm font-mono font-bold">${total.toFixed(2)}</span>
                </div>
                <div className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </div>
                <span className="sm:hidden font-mono font-bold ml-1">${total.toFixed(2)}</span>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                    <Link href="/admin">Admin</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/seller/bevcartdriver">Driver</Link>
                </Button>
                <Button size="sm" asChild>
                    <Link href="/sellers/1">Menu Mgr</Link>
                </Button>
              </>
            )}
        </div>
      </div>
    </header>
  );
}
