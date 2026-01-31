'use client';

import { useEffect, useRef } from 'react';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Package, CookingPot, Navigation, PartyPopper } from 'lucide-react';
import { ToastAction } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';

/**
 * A global listener that monitors the most recent order status for the buyer.
 * Displays toast notifications when the status changes.
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

    // Only toast if the status has actually changed for the same order
    if (order.status !== prevStatusRef.current) {
      let title = '';
      let description = '';
      let Icon: React.ElementType = Package;

      switch (order.status) {
        case 'Preparing':
          title = 'Order Confirmed!';
          description = 'The cart is now preparing your items.';
          Icon = CookingPot;
          break;
        case 'Out for Delivery':
          title = 'Order is on the way!';
          description = 'The driver is heading to your location.';
          Icon = Navigation;
          break;
        case 'Delivered':
          title = 'Order Delivered!';
          description = 'Enjoy your refreshments.';
          Icon = PartyPopper;
          break;
      }

      if (title) {
        toast({
          title: (
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <span className="font-headline font-bold">{title}</span>
            </div>
          ),
          description: description,
          action: (
            <ToastAction 
              altText="Track Order" 
              onClick={() => router.push('/order/track')}
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
