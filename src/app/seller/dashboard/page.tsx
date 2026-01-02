'use client'

import { mockOrders } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListOrdered } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapView } from '@/components/map-view';
import { mockSellerLocation } from '@/lib/data';
import { APIProvider } from '@vis.gl/react-google-maps';

export default function SellerDashboardPage() {
  const sortedOrders = mockOrders;

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Driver Dashboard</h1>
          <p className="text-lg text-muted-foreground mt-2">Your active orders and delivery map.</p>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="shadow-lg h-full">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Delivery Map</CardTitle>
              </CardHeader>
              <CardContent>
                <MapView
                  sellerLocation={mockSellerLocation}
                  buyers={sortedOrders.map(o => ({ name: o.customerName, location: o.deliveryLocation }))}
                />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className='flex items-center gap-3'>
                  <ListOrdered className="w-6 h-6 text-accent" />
                  <CardTitle className="font-headline text-2xl">Open Orders</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sortedOrders.map((order, index) => (
                    <div key={order.orderId} className="p-3 rounded-lg border bg-card/50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <Badge className="text-lg bg-primary text-primary-foreground h-8 w-8 flex items-center justify-center p-0">{index + 1}</Badge>
                          <Avatar>
                            <AvatarImage src={order.avatar.imageUrl} alt={order.customerName} data-ai-hint={order.avatar.imageHint} />
                            <AvatarFallback>{order.customerName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold">{order.customerName}</p>
                            <p className="text-sm text-muted-foreground">{order.orderId}</p>
                          </div>
                        </div>
                        <p className="font-mono font-bold text-primary">${order.total.toFixed(2)}</p>
                      </div>
                      <Separator className="my-2" />
                      <div className="text-sm text-muted-foreground">
                        {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </APIProvider>
  );
}
