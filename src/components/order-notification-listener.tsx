'use client';

import { useEffect, useRef } from 'react';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from 'lucide-react';
import { ToastAction } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';

/**
 * A global listener that monitors the most recent order status for the buyer.
 * Displays toast notifications only when the status changes to 'Out for Delivery'.
 */
export function OrderNotificationListener() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const prevStatusRef = useRef<Order['status'] | undefined>(undefined);
  const prevOrderIdRef = useRef<string | undefined>(undefined);

  const latestOrderQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }, [firestore]);

  const { data: orders } = useCollection<Order>(latestOrderQuery);
  const order = orders?.[0];

  useEffect(() => {
    if (!order) return;

    // If this is a new order, reset tracking
    if (order.id !== prevOrderIdRef.current) {
      prevOrderIdRef.current = order.id;
      prevStatusRef.current = order.status;
      return;
    }

    // Only toast if the status has actually changed to 'Out for Delivery' for the same order
    if (order.status !== prevStatusRef.current) {
      if (order.status === 'Out for Delivery') {
        toast({
          title: (
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              <span className="font-headline font-bold uppercase">Order Out for Delivery</span>
            </div>
          ),
          description: 'The driver is heading to your location with your refreshments.',
          action: (
            <ToastAction 
              altText="Track Order" 
              onClick={() => router.push(`/order/track?id=${order.id}`)}
            >
              Track Order
            </ToastAction>
          ),
        });
      }
      
      prevStatusRef.current = order.status;
    }
  }, [order, toast, router]);

  return null;
}
