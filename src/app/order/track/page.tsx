'use client'

import { MapView } from "@/components/map-view";
import { OrderStatus } from "@/components/order-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { mockOrders, mockSellerLocation } from "@/lib/data";
import { Truck, User } from "lucide-react";
import { APIProvider } from "@vis.gl/react-google-maps";

export default function OrderTrackingPage() {
  const order = mockOrders[0];
  // For demonstration, buyer is at the first order's location
  const buyerLocation = order.deliveryLocation;
  
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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="shadow-lg h-full">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Delivery Map</CardTitle>
              </CardHeader>
              <CardContent>
                <MapView 
                  buyerLocation={buyerLocation} 
                  sellerLocation={mockSellerLocation}
                />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-mono">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="font-mono">${order.total.toFixed(2)}</span>
                </div>
                 <Separator />
                 <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                      <Truck className="w-4 h-4 text-accent" />
                      <span className="font-semibold">Driver:</span>
                      <span>Mike</span>
                  </div>
                   <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-accent" />
                      <span className="font-semibold">Your Location:</span>
                      <span>Hole 8 Green</span>
                  </div>
                 </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </APIProvider>
  );
}
