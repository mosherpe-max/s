'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Target, 
  Store, 
  Settings2, 
  LogOut, 
  PanelLeft, 
  ChevronRightSquare,
  Menu,
  ShieldCheck,
  Library
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, SUPER_ADMIN_ID } from '@/lib/utils';
import { StylizedKoopLogo } from '@/components/header';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import Link from 'next/link';

const NAV_ITEMS = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard, href: "/admin/dashboard" },
  { id: "sales", label: "Sales CRM", icon: Target, href: "/admin/sales" },
  { id: "venues", label: "Venue Registry", icon: Store, href: "/admin/venues" },
  { id: "libraries", label: "Global Libraries", icon: Library, href: "/admin/libraries" },
  { id: "system", label: "System Config", icon: Settings2, href: "/admin/system" }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';

  useEffect(() => {
    if (!isUserLoading && (!user || !isSuperAdmin)) {
      router.push('/login');
    }
  }, [user, isUserLoading, isSuperAdmin, router]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#213147]">
        <ShieldCheck className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return null;
  }

  const NavButton = ({ item, isSidebar }: { item: typeof NAV_ITEMS[0], isSidebar?: boolean }) => {
    const active = pathname === item.href;
    return (
      <Link
        href={item.href}
        onClick={() => !isSidebar && setIsMobileMenuOpen(false)}
        className={cn(
          "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group relative text-left",
          active ? "bg-primary/10 text-primary" : "text-slate-400 hover:bg-white/5 hover:text-white"
        )}
      >
        <item.icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "group-hover:text-white")} />
        {(isSidebar ? sidebarOpen : true) && (
          <span className={cn("text-[10px] font-black uppercase tracking-widest leading-none", active ? "text-primary" : "")}>
            {item.label}
          </span>
        )}
        {active && isSidebar && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-left">
      {/* DESKTOP SIDEBAR */}
      <aside className={cn(
        "bg-[#213147] hidden md:flex flex-col transition-all duration-300 relative border-r-4 border-primary/20 shrink-0 z-40",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          {sidebarOpen && <StylizedKoopLogo size="md" />}
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/20 hover:text-white mx-auto">
            {sidebarOpen ? <PanelLeft className="h-4 w-4" /> : <ChevronRightSquare className="h-4 w-4" />}
          </Button>
        </div>
        <ScrollArea className="flex-1 p-3">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavButton key={item.id} item={item} isSidebar />
            ))}
          </nav>
        </ScrollArea>
        <div className="p-4 border-t border-white/5">
          <Button variant="ghost" className="w-full justify-start text-white/40 hover:text-white gap-3 px-4 h-12" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            {sidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">Terminate</span>}
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* GLOBAL ADMIN HEADER */}
        <header className="h-16 bg-white border-b-2 flex items-center justify-between px-6 shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-6 w-6 text-[#213147]" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-[#213147] border-0 p-0 text-white">
                <SheetHeader className="p-6 border-b border-white/5 text-left">
                  <StylizedKoopLogo size="md" />
                  <SheetTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-2">Solution Control</SheetTitle>
                </SheetHeader>
                <div className="p-4">
                  {NAV_ITEMS.map((item) => (
                    <NavButton key={item.id} item={item} />
                  ))}
                  <Button variant="ghost" className="w-full justify-start text-white/40 hover:text-white gap-3 px-4 h-12 mt-4" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Terminate Session</span>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <div className="hidden md:flex flex-col">
              <h1 className="text-sm font-black text-[#213147] uppercase tracking-tight leading-none mb-1">KOOP Solution Control</h1>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Global Administrator Instance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end text-right mr-2 hidden sm:flex">
                <span className="text-[10px] font-black uppercase text-[#213147] leading-none mb-1">Status: God Mode</span>
                <span className="text-[8px] font-bold text-green-600 uppercase tracking-widest flex items-center gap-1">
                  <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" /> Security Feed Active
                </span>
             </div>
             <div className="h-10 w-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                <ShieldCheck className="h-6 w-6 text-[#213147]" />
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-[#F8FAFC]">
          {children}
        </main>
      </div>
    </div>
  );
}
