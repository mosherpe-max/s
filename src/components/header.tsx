import Link from 'next/link';
import { Button } from './ui/button';

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
  return (
    <header className="bg-transparent sticky top-0 z-40">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
            <GolfBallIcon className="h-8 w-8 text-primary" />
            <span className="font-headline text-2xl font-bold text-foreground">
                Koop
            </span>
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
                <Link href="/#features" className="text-foreground hover:text-primary transition-colors">Features</Link>
                <Link href="/#pricing" className="text-foreground hover:text-primary transition-colors">Pricing</Link>
                <Link href="/sellers/1/order" className="text-foreground hover:text-primary transition-colors">Demo Menu</Link>
            </nav>
        </div>
        <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
                <Link href="/seller/dashboard">Driver</Link>
            </Button>
            <Button asChild>
                <Link href="/sellers/1/menu">Seller Admin</Link>
            </Button>
        </div>
      </div>
    </header>
  );
}
