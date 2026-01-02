import Link from 'next/link';
import { Golf, UserCog, User } from 'lucide-react';
import { Button } from './ui/button';

export function AppHeader() {
  return (
    <header className="bg-card/80 backdrop-blur-sm sticky top-0 z-40 border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Golf className="h-8 w-8 text-primary" />
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
