'use client';

import React, { useState, useEffect, startTransition } from 'react';
import { prioritizeDeliveryRoutes, type PrioritizeDeliveryRoutesOutput } from '@/ai/flows/prioritize-delivery-routes';
import { mockOrders, mockSellerLocation } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapView } from '@/components/map-view';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { ListOrdered, Loader2, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import * as Tone from 'tone';

export function RouteOptimizer() {
  const [optimizationResult, setOptimizationResult] = useState<PrioritizeDeliveryRoutesOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [previousRoute, setPreviousRoute] = useState<string[]>([]);
  const [synth, setSynth] = useState<Tone.Synth | null>(null);

  useEffect(() => {
    // Initialize synth on the client
    setSynth(new Tone.Synth().toDestination());
  }, []);
  
  const handleOptimize = async () => {
    setIsLoading(true);
    try {
      const result = await prioritizeDeliveryRoutes({
        currentLocation: mockSellerLocation,
        openOrders: mockOrders.map(o => ({ orderId: o.orderId, deliveryLocation: o.deliveryLocation })),
      });
      startTransition(() => {
        setOptimizationResult(result);
      });
    } catch (error) {
      console.error('Optimization failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to optimize route. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Run initial optimization on load
    handleOptimize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    if (optimizationResult && synth) {
      const newRoute = optimizationResult.prioritizedRoute;
      if (previousRoute.length > 0 && JSON.stringify(newRoute) !== JSON.stringify(previousRoute)) {
        toast({
          title: "Route Updated!",
          description: "A more optimal delivery route has been suggested.",
        });
        // Play a notification sound
        synth.triggerAttackRelease("C5", "8n");
      }
      setPreviousRoute(newRoute);
    }
  }, [optimizationResult, previousRoute, toast, synth]);

  const sortedOrders = optimizationResult
    ? optimizationResult.prioritizedRoute.map(orderId => mockOrders.find(o => o.orderId === orderId)!)
    : mockOrders;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className='flex items-center gap-3'>
              <ListOrdered className="w-6 h-6 text-accent" />
              <CardTitle className="font-headline text-2xl">Open Orders</CardTitle>
            </div>
             <Button onClick={handleOptimize} disabled={isLoading} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4"/>}
              Optimize
            </Button>
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
        {optimizationResult && (
          <Card className="shadow-lg bg-accent/10">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center gap-2">
                <Bot className="w-5 h-5 text-accent" /> AI Suggestion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80 italic">{optimizationResult.reasoning}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="lg:col-span-2">
        <Card className="shadow-lg h-full">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Delivery Map</CardTitle>
          </CardHeader>
          <CardContent>
            <MapView
              sellerLocation={mockSellerLocation}
              mapImage={PlaceHolderImages.find(img => img.id === 'map-view')!}
              buyers={sortedOrders.map(o => ({ name: o.customerName, location: o.deliveryLocation }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
