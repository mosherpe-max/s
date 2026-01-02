'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users, BookCopy } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin/sellers", label: "Sellers", icon: Users },
    { href: "/admin/menus", label: "Menus", icon: BookCopy },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Admin Panel</h1>
        <p className="text-lg text-muted-foreground mt-2">Manage your sellers and menus.</p>
      </header>
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="md:w-64">
          <nav className="flex flex-col gap-2">
            {navItems.map(item => (
              <Button
                key={item.href}
                variant={pathname.startsWith(item.href) ? "secondary" : "ghost"}
                asChild
                className="justify-start"
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </nav>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
