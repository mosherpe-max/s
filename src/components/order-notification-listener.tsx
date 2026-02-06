'use client';

import { useEffect, useRef } from 'react';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Navigation, CheckCircle2, PartyPopper, BellRing } from 'lucide-react';
import { ToastAction } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';

/**
 * A global listener that monitors the most recent order status for the buyer.
 * Displays toast notifications for key milestones: Confirmed, Out for Delivery, and Delivered.
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

    // If this is a new order we haven't seen yet, just register the current status and move on
    if (order.id !== prevOrderIdRef.current) {
      prevOrderIdRef.current = order.id;
      prevStatusRef.current = order.status;
      return;
    }

    // Only trigger a "notification" if the status has actually changed for the same order
    if (order.status !== prevStatusRef.current) {
      const trackAction = (
        <ToastAction 
          altText="Track Order" 
          onClick={() => router.push(`/order/track?id=${order.id}`)}
        >
          View Order
        </ToastAction>
      );

      switch (order.status) {
        case 'Preparing':
          toast({
            title: (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-headline font-bold uppercase">Order Confirmed</span>
              </div>
            ),
            description: 'The establishment has received your order and is preparing it.',
            action: trackAction,
          });
          break;

        case 'Out for Delivery':
          // Attempt to re-initiate wake lock if browser supports it
          if ('wakeLock' in navigator) {
            try {
              (navigator as any).wakeLock.request('screen');
            } catch (e) {
              console.warn('Wake Lock re-initiation failed from background');
            }
          }

          toast({
            title: (
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary" />
                <span className="font-headline font-bold uppercase">Heading Your Way!</span>
              </div>
            ),
            description: 'The driver is out for delivery. Watch the map for their live location.',
            action: trackAction,
          });
          break;

        case 'Delivered':
          toast({
            title: (
              <div className="flex items-center gap-2">
                <PartyPopper className="h-5 w-5 text-orange-500" />
                <span className="font-headline font-bold uppercase">Order Arrived</span>
              </div>
            ),
            description: 'Your refreshments have been delivered. Enjoy your round!',
            action: trackAction,
          });
          break;
      }
      
      prevStatusRef.current = order.status;
    }
  }, [order, toast, router]);

  return null;
}
