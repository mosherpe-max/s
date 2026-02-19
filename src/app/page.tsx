'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, ArrowRight, UserCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative w-full py-20 md:py-32 lg:py-40">
        <Image
          alt="A beautiful golf course on a sunny day."
          data-ai-hint="golf course"
          priority
          fill
          className="object-cover"
          src="https://images.unsplash.com/photo-1623567341691-1f47b5cf949e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw2fHxnb2xmJTIwY291cnNlfGVufDB8fHx8MTc2MzAyNDQ5Mnww&ixlib=rb-4.1.0&q=80&w=1080"
        />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="container relative mx-auto px-4 text-center text-white">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl font-headline">
            Turn Convenience into Revenue
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-neutral-200">
            Provide immediate food and beverage service to your customers anywhere
            at your establishment, never miss a sales opportunity again.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 font-headline font-bold uppercase tracking-wider">
              <Link href="/sellers/demo-course/order">
                View BevCart Sample Menu
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 font-headline font-bold uppercase tracking-wider bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white">
              <Link href="/sellers/demo-course/order">
                View Clubhouse Sample Menu
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 font-headline font-bold uppercase tracking-wider bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white">
              <Link href="/sellers/demo-bowling-alley/order">
                View LaneSide Sample Menu
              </Link>
            </Button>
          </div>
          <div className="mt-8">
             <Button asChild variant="link" className="text-white/60 hover:text-white uppercase text-xs font-bold tracking-[0.2em]">
                <Link href="#features">Learn More About Koop</Link>
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
                How Koop Works
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                We connect hungry and thirsty golfers with on-course beverage
                carts for a seamless experience.
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
                  Browse menus from on-course carts and order directly from your
                  phone. No more waiting or waving down the cart.
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center gap-4">
                <UserCheck className="h-8 w-8 text-primary" />
                <CardTitle className="font-headline">For Course Operators</CardTitle>
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
              seconds without disrupting your round. Track your delivery in
              real-time and know exactly when it will arrive.
            </p>
          </div>
          <div className="flex justify-center">
            <Image
              alt="A golfer using their phone on the course."
              data-ai-hint="golfer phone"
              loading="lazy"
              width="600"
              height="400"
              className="overflow-hidden rounded-xl object-cover"
              src="https://images.unsplash.com/photo-1741518401564-6c3ea0d461ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxnb2xmZXIlMjBwaG9uZXxlbnwwfHx8fDE3NjMwNjA3MDZ8MA&ixlib=rb-4.1.0&q=80&w=1080"
            />
          </div>
        </div>
      </section>

      <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-secondary">
        <div className="container grid items-center gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-10">
          <div className="flex justify-center lg:order-last">
            <Image
              alt="A beverage cart on a golf course path."
              data-ai-hint="beverage cart"
              loading="lazy"
              width="600"
              height="400"
              className="overflow-hidden rounded-xl object-cover"
              src="https://images.unsplash.com/photo-1650553451549-61606be7ef0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxiZXZlcmFnZSUyMGNhcnR8ZW58MHx8fHwxNzYzMDYwNzA2fDA&ixlib=rb-4.1.0&q=80&w=1080"
            />
          </div>
          <div className="space-y-4">
            <div className="inline-block rounded-lg bg-background px-3 py-1 text-sm">
              For Course Operators
            </div>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">
              Drive Revenue and Delight Customers
            </h2>
            <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Equip your service staff with Koop to increase order volume,
              optimize routes, and manage your menu with ease. Our seller
              dashboard provides all the tools you need to succeed.
            </p>
            <Button asChild size="lg" style={{backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)'}}>
                <Link href="/sellers/demo-course">
                    Explore the Seller Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
