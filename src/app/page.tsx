'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, ArrowRight, UserCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const getImageUrl = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative w-full py-20 md:py-32 lg:py-40 overflow-hidden">
        {/* Simplified Hero Grid: Golf and Bowling only */}
        <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2">
          <div className="relative h-full w-full">
            <Image
              alt="Golf course"
              data-ai-hint="golf course"
              priority
              fill
              className="object-cover"
              src={getImageUrl('hero-golf')}
            />
          </div>
          <div className="relative h-full w-full">
            <Image
              alt="Bowling alley"
              data-ai-hint="bowling lane"
              priority
              fill
              className="object-cover"
              src={getImageUrl('hero-bowling')}
            />
          </div>
        </div>
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="container relative mx-auto px-4 text-center text-white">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl font-headline">
            Turn Convenience into Revenue
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-neutral-200">
            Give your customers VIP treatment with KOOP's plug-and-play digital ordering platform, boosting your food and beverage sales.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 font-headline font-bold uppercase tracking-wider">
              <Link href="/sellers/demo-course/order">
                Public Golf Course Menu
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 font-headline font-bold uppercase tracking-wider bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white">
              <Link href="/sellers/demo-golf-course-private/order">
                Private Club Menu
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 font-headline font-bold uppercase tracking-wider bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white">
              <Link href="/sellers/demo-bowling-alley/order">
                Bowling Alley Menu
              </Link>
            </Button>
          </div>
          <div className="mt-8">
             <Button asChild variant="link" className="text-white/60 hover:text-white uppercase text-xs font-bold tracking-[0.2em]">
                <Link href="#features">Learn More About KOOP</Link>
             </Button>
          </div>
        </div>
      </section>

      <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">
                Key Features
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                How KOOP Works
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                We connect hungry and thirsty patrons with specialized service teams for a seamless experience.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:max-w-none lg:grid-cols-2 mt-12">
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center gap-4">
                <ShoppingCart className="h-8 w-8 text-primary" />
                <CardTitle className="font-headline">Effortless Ordering</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Browse menus and order directly from your phone. No more waiting or waving down busy staff.
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center gap-4">
                <UserCheck className="h-8 w-8 text-primary" />
                <CardTitle className="font-headline">For Operators</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Increase sales and efficiency with a streamlined ordering
                  process, real-time tracking, and powerful admin tools.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container grid items-center gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-10">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">
              Stay in the Game
            </h2>
            <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Our mobile-friendly design means you can place an order in
              seconds without disrupting your experience. Track your delivery in
              real-time and know exactly when it will arrive.
            </p>
          </div>
          <div className="flex justify-center">
            <Image
              alt="Patron using their phone to order"
              data-ai-hint="golfer phone"
              loading="lazy"
              width="600"
              height="400"
              className="overflow-hidden rounded-xl object-cover shadow-2xl"
              src={getImageUrl('feature-golfer-phone')}
            />
          </div>
        </div>
      </section>

      <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-secondary">
        <div className="container grid items-center gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-10">
          <div className="flex justify-center lg:order-last">
            <Image
              alt="Service staff ready to deliver"
              data-ai-hint="beverage cart"
              loading="lazy"
              width="600"
              height="400"
              className="overflow-hidden rounded-xl object-cover shadow-2xl"
              src={getImageUrl('feature-bev-cart')}
            />
          </div>
          <div className="space-y-4">
            <div className="inline-block rounded-lg bg-background px-3 py-1 text-sm">
              For Business Owners
            </div>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">
              Drive Revenue and Delight Customers
            </h2>
            <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Equip your service staff with KOOP to increase order volume,
              optimize routes, and manage your menu with ease. Our seller
              dashboard provides all the tools you need to succeed.
            </p>
            <Button asChild size="lg" style={{backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)'}}>
                <Link href="/admin">
                    Explore the Admin Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
