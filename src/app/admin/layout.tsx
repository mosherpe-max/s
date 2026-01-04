'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin/sellers", label: "Sellers", icon: Users },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
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
        <div className="flex-1">
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
