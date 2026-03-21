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
  PlayCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function SalesDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

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
            <Card className="group hover:border-indigo-500 transition-all border-2 shadow-sm overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-indigo-500 to-blue-600 p-6 flex items-end">
                <Globe className="text-white/20 h-16 w-16 absolute -right-2 -top-2" />
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md uppercase text-[9px] font-black">On-Course Ordering</Badge>
              </div>
              <CardHeader className="pt-4">
                <CardTitle className="text-lg font-black uppercase">Public Golf Menu</CardTitle>
                <CardDescription className="text-xs">Beverage Cart & Clubhouse</CardDescription>
              </CardHeader>
              <CardFooter className="pt-0">
                <Button asChild variant="outline" className="w-full justify-between group-hover:bg-indigo-50 transition-colors">
                  <Link href="/sellers/demo-course/order?menuType=Beverage Cart">
                    Launch Demo <PlayCircle className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="group hover:border-indigo-500 transition-all border-2 shadow-sm overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-[#213147] to-slate-700 p-6 flex items-end">
                <Lock className="text-white/20 h-16 w-16 absolute -right-2 -top-2" />
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md uppercase text-[9px] font-black">Private Experience</Badge>
              </div>
              <CardHeader className="pt-4">
                <CardTitle className="text-lg font-black uppercase">Private Golf Menu</CardTitle>
                <CardDescription className="text-xs">Member-Only Clubhouse</CardDescription>
              </CardHeader>
              <CardFooter className="pt-0">
                <Button asChild variant="outline" className="w-full justify-between group-hover:bg-indigo-50 transition-colors">
                  <Link href="/sellers/demo-private-course/order?menuType=Clubhouse">
                    Launch Demo <PlayCircle className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="group hover:border-indigo-500 transition-all border-2 shadow-sm overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-pink-600 to-rose-500 p-6 flex items-end">
                <Smartphone className="text-white/20 h-16 w-16 absolute -right-2 -top-2" />
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md uppercase text-[9px] font-black">Laneside Service</Badge>
              </div>
              <CardHeader className="pt-4">
                <CardTitle className="text-lg font-black uppercase">Bowling Alley</CardTitle>
                <CardDescription className="text-xs">In-Game Food & Drinks</CardDescription>
              </CardHeader>
              <CardFooter className="pt-0">
                <Button asChild variant="outline" className="w-full justify-between group-hover:bg-indigo-50 transition-colors">
                  <Link href="/sellers/demo-bowling-alley/order?menuType=Lane Delivery">
                    Launch Demo <PlayCircle className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
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
