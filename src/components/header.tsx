import Link from 'next/link';
import { UserCog, User, BookCopy } from 'lucide-react';
import { Button } from './ui/button';

const GolfBallIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
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
      <path d="M4 8c2 0 2.83 1 4 1s2-1 4-1" />
      <path d="m8.5 8.5 3 3" />
      <path d="M20 8c-2 0-2.83 1-4 1s-2-1-4-1" />
    </svg>
  );

export function AppHeader() {
  return (
    <header className="bg-card/80 backdrop-blur-sm sticky top-0 z-40 border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <GolfBallIcon className="h-8 w-8 text-primary" />
          <span className="font-headline text-2xl font-bold text-primary">
            Koop
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/">
              <User className="mr-2 h-4 w-4" />
              Buyer
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/seller/dashboard">
              <User className="mr-2 h-4 w-4" />
              Driver
            </Link>
          </Button>
           <Button variant="ghost" asChild>
            <Link href="/seller/menu">
              <BookCopy className="mr-2 h-4 w-4" />
              Manage Menu
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/admin/sellers">
              <UserCog className="mr-2 h-4 w-4" />
              Admin
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
