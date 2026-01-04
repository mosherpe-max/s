'use client';

import { usePathname } from "next/navigation";
import { Users } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex-1">
        <main>{children}</main>
      </div>
    </div>
  );
}
