'use client'

import { OrderStatus } from "@/components/order-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import type { Order } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderTrackingPage() {
  // In a real app, you'd fetch the specific order being tracked.
  // For this prototype, we will fetch the most recent order for the demo seller.
  const firestore = useFirestore();

  const latestOrderQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'orders'),
      where('sellerId', '==', '1'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }, [firestore]);

  const { data: orders, isLoading } = useCollection<Order>(latestOrderQuery);
  const order = orders?.[0];

  return (
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
          {isLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
             </div>
          ) : order ? (
            <OrderStatus currentStatus={order.status} />
          ) : (
            <p className="text-muted-foreground text-center">No recent order found.</p>
          )}
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
  );
}
