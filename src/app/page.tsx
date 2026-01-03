'use client'

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Users } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="mb-8">
        <Button variant="secondary" size="sm" className="rounded-full mb-4 font-semibold text-xs h-auto py-1 px-3">
            Key Features
        </Button>
        <h1 className="font-headline text-5xl md:text-6xl font-bold text-foreground">
          How Koop Works
        </h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
          We connect hungry and thirsty golfers with on-course beverage carts for a seamless experience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12">
        <Card className="text-left shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <ShoppingCart className="w-8 h-8 text-primary" />
              <CardTitle className="font-headline text-2xl font-bold">Effortless Ordering</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Browse menus from on-course carts and order directly from your phone. No more waiting or waving down the cart.
            </p>
          </CardContent>
        </Card>
        <Card className="text-left shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Users className="w-8 h-8 text-primary" />
              <CardTitle className="font-headline text-2xl font-bold">For Golf Courses</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
                Increase sales and efficiency with a streamlined ordering process, real-time tracking, and powerful admin tools.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
