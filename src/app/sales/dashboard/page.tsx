
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Target, 
  LayoutDashboard, 
  ExternalLink, 
  FileText, 
  Presentation, 
  FileImage, 
  BookOpen, 
  MessageSquare, 
  ArrowRight,
  Zap,
  Globe,
  Smartphone,
  CheckCircle2,
  Lock,
  ChevronRight,
  Download,
  Share2,
  Briefcase,
  PlayCircle,
  Users,
  QrCode,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function SalesDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  if (!isMounted) return null;

  const demoVenues = [
    {
      id: 'demo-course',
      title: 'Public Golf Menu',
      sub: 'Beverage Cart & Clubhouse',
      type: 'On-Course Ordering',
      gradient: 'from-indigo-500 to-blue-600',
      icon: <Globe className="text-white/20 h-16 w-16 absolute -right-2 -top-2" />,
      buyerUrl: '/sellers/demo-course/order?menuType=Beverage Cart',
      staffEntryUrl: '/sellers/demo-course/staff-login',
      staffViews: [
        { label: 'Staff Entry', url: '/sellers/demo-course/staff-login', icon: <ShieldCheck className="h-3.5 w-3.5" /> }
      ]
    },
    {
      id: 'demo-private-course',
      title: 'Private Golf Menu',
      sub: 'Member-Only Clubhouse',
      type: 'Private Experience',
      gradient: 'from-[#213147] to-slate-700',
      icon: <Lock className="text-white/20 h-16 w-16 absolute -right-2 -top-2" />,
      buyerUrl: '/sellers/demo-private-course/order?menuType=Clubhouse',
      staffEntryUrl: '/sellers/demo-private-course/staff-login',
      staffViews: [
        { label: 'Staff Entry', url: '/sellers/demo-private-course/staff-login', icon: <ShieldCheck className="h-3.5 w-3.5" /> }
      ]
    },
    {
      id: 'demo-bowling-alley',
      title: 'Bowling Center',
      sub: 'In-Game Food & Drinks',
      type: 'Laneside Service',
      gradient: 'from-pink-600 to-rose-500',
      icon: <Smartphone className="text-white/20 h-16 w-16 absolute -right-2 -top-2" />,
      buyerUrl: '/sellers/demo-bowling-alley/order?menuType=Lane Delivery',
      staffEntryUrl: '/sellers/demo-bowling-alley/staff-login',
      staffViews: [
        { label: 'Staff Entry', url: '/sellers/demo-bowling-alley/staff-login', icon: <ShieldCheck className="h-3.5 w-3.5" /> }
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pb-24">
      {/* HEADER - Consistent with Sales CRM */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-headline text-3xl font-bold uppercase tracking-tight text-indigo-600">SALES PORTAL</h1>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 border-indigo-200 text-indigo-700">
              Rep Workspace
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Central hub for demos, collateral, and sales strategy.</p>
        </div>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 shadow-lg h-11 px-6 font-black uppercase tracking-widest text-xs gap-2">
          <Link href="/sales">
            Open Sales CRM
            <LayoutDashboard className="h-4 w-4" />
          </Link>
        </Button>
      </header>

      <div className="space-y-16">
        {/* SECTION 1: LIVE DEMOS */}
        <section id="demos">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Zap className="h-5 w-5" />
            </div>
            <h2 className="font-headline text-xl font-black uppercase tracking-tight text-[#213147]">Interactive Demos</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {demoVenues.map((venue) => (
              <Card key={venue.id} className="group hover:border-indigo-500 transition-all border-2 shadow-sm overflow-hidden flex flex-col h-full">
                <div className={cn("h-24 bg-gradient-to-br p-6 flex items-end relative", venue.gradient)}>
                  {venue.icon}
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md uppercase text-[9px] font-black">{venue.type}</Badge>
                </div>
                <CardHeader className="pt-4 space-y-1">
                  <CardTitle className="text-lg font-black uppercase">{venue.title}</CardTitle>
                  <CardDescription className="text-xs">{venue.sub}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center gap-3 bg-muted/30 p-3 rounded-2xl border-2 border-dashed">
                      <div className="bg-white p-1.5 rounded-xl border-2 shadow-sm hover:scale-105 transition-transform cursor-pointer">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${baseUrl}${venue.buyerUrl}`}
                          alt="Patron QR"
                          width={100}
                          height={100}
                          className="rounded-lg w-24 h-24"
                        />
                      </div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <ShoppingBag className="h-2 w-2" /> Patron Menu
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-3 bg-indigo-50/50 p-3 rounded-2xl border-2 border-indigo-100/50 border-dashed">
                      <div className="bg-white p-1.5 rounded-xl border-2 shadow-sm hover:scale-105 transition-transform cursor-pointer">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${baseUrl}${venue.staffEntryUrl}`}
                          alt="Staff QR"
                          width={100}
                          height={100}
                          className="rounded-lg w-24 h-24"
                        />
                      </div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1">
                        <ShieldCheck className="h-2 w-2" /> Staff Entry
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Staff Impersonation</p>
                    <div className="grid grid-cols-1 gap-2">
                      {venue.staffViews.map((view) => (
                        <Button 
                          key={view.url}
                          variant="outline" 
                          size="sm" 
                          asChild
                          className="h-9 justify-start text-[10px] font-black uppercase tracking-widest border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                        >
                          <Link href={view.url}>
                            {view.icon}
                            <span className="ml-2">{view.label}</span>
                            <ExternalLink className="ml-auto h-3 w-3 opacity-30" />
                          </Link>
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t bg-muted/5">
                  <Button asChild className="w-full justify-between h-11 bg-[#213147] hover:bg-black font-black uppercase tracking-widest text-[10px]">
                    <Link href={venue.buyerUrl}>
                      Launch Patron Menu <PlayCircle className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        {/* SECTION 2: MARKETING MATERIAL */}
        <section id="marketing">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="font-headline text-xl font-black uppercase tracking-tight text-[#213147]">Marketing Material</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Card className="border-2 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                      <Presentation className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-sm uppercase">2026 Platform Pitch Deck</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Keynote / PDF • 4.2 MB</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-10 w-10 text-muted-foreground hover:text-indigo-600"><Download className="h-5 w-5" /></Button>
                </CardContent>
              </Card>

              <Card className="border-2 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-xl text-green-600">
                      <FileImage className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-sm uppercase">Venue Brochure Template</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Canva / AI • 12 MB</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-10 w-10 text-muted-foreground hover:text-indigo-600"><Download className="h-5 w-5" /></Button>
                </CardContent>
              </Card>

              <Card className="border-2 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-amber-100 p-3 rounded-xl text-amber-600">
                      <Share2 className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-sm uppercase">Social Media Asset Kit</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">PNG / MP4 • 45 MB</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-10 w-10 text-muted-foreground hover:text-indigo-600"><Download className="h-5 w-5" /></Button>
                </CardContent>
              </Card>
            </div>

            <Card className="border-2 shadow-sm bg-muted/10 border-dashed flex flex-col items-center justify-center p-8 text-center">
              <div className="bg-white p-6 rounded-[2rem] shadow-xl border-2 mb-6">
                <Smartphone className="h-12 w-12 text-indigo-600" />
              </div>
              <h3 className="font-headline text-lg font-black uppercase mb-2">QR Signage Generator</h3>
              <p className="text-xs text-muted-foreground max-w-xs mb-6">Instantly generate white-labeled QR code placards for course presentations.</p>
              <Button className="font-black uppercase tracking-widest text-[10px] bg-[#213147] hover:bg-black">
                Launch Generator <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </Card>
          </div>
        </section>

        {/* SECTION 3: SALES GUIDES */}
        <section id="guides">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <h2 className="font-headline text-xl font-black uppercase tracking-tight text-[#213147]">Sales Strategy</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-2 hover:bg-indigo-50/30 transition-colors cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="bg-indigo-100 p-2 rounded-lg w-fit text-indigo-600 mb-2">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-black uppercase">Onboarding</CardTitle>
                <CardDescription className="text-[10px]">The 48-hour launch workflow.</CardDescription>
              </CardHeader>
              <CardFooter>
                <span className="text-[9px] font-black uppercase text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">Read Guide <ChevronRight className="h-2 w-2" /></span>
              </CardFooter>
            </Card>

            <Card className="border-2 hover:bg-indigo-50/30 transition-colors cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="bg-indigo-100 p-2 rounded-lg w-fit text-indigo-600 mb-2">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-black uppercase">Objections</CardTitle>
                <CardDescription className="text-[10px]">Handling POS integration fears.</CardDescription>
              </CardHeader>
              <CardFooter>
                <span className="text-[9px] font-black uppercase text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">Read Guide <ChevronRight className="h-2 w-2" /></span>
              </CardFooter>
            </Card>

            <Card className="border-2 hover:bg-indigo-50/30 transition-colors cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="bg-indigo-100 p-2 rounded-lg w-fit text-indigo-600 mb-2">
                  <Briefcase className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-black uppercase">Fees Policy</CardTitle>
                <CardDescription className="text-[10px]">Explaining convenience fees.</CardDescription>
              </CardHeader>
              <CardFooter>
                <span className="text-[9px] font-black uppercase text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">Read Guide <ChevronRight className="h-2 w-2" /></span>
              </CardFooter>
            </Card>

            <Card className="border-2 hover:bg-indigo-50/30 transition-colors cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="bg-indigo-100 p-2 rounded-lg w-fit text-indigo-600 mb-2">
                  <PlayCircle className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-black uppercase">Pitch Script</CardTitle>
                <CardDescription className="text-[10px]">The elevator pitch for GMs.</CardDescription>
              </CardHeader>
              <CardFooter>
                <span className="text-[9px] font-black uppercase text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">Read Guide <ChevronRight className="h-2 w-2" /></span>
              </CardFooter>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
