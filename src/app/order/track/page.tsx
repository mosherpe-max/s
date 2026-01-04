'use client'

import { MapView } from "@/components/map-view";
import { OrderStatus } from "@/components/order-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockSellerLocation } from "@/lib/data";
import { APIProvider } from "@vis.gl/react-google-maps";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function OrderTrackingPage() {
  // In a real app, you'd fetch the specific order being tracked.
  // For this prototype, we will assume we are tracking the user's most recent order.
  
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground">Track Your Order</h1>
          <p className="text-lg text-muted-foreground mt-2">It's on the way!</p>
        </header>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderStatus />
          </CardContent>
        </Card>
        
        <div className="text-center">
            <p className="text-muted-foreground mb-4">Your order has been placed. You can view the delivery status on the driver's dashboard.</p>
             <Button asChild>
              <Link href="/seller/dashboard">
                Go to Driver Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
        </div>
      </div>
    </APIProvider>
  );
}
