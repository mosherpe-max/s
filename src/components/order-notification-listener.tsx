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
 * A global listener that monitors the most recent order status.
 * It displays a toast notification with a link to the tracking page when the status changes.
 */
export function OrderNotificationListener() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const prevStatusRef = useRef<Order['status']>();

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

    // Initialize the previous status on first load to prevent double toasting the current state
    if (!prevStatusRef.current) {
      prevStatusRef.current = order.status;
      return;
    }

    // Only toast if the status has actually changed
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
                title = 'On The Way!';
                description = 'Your order is out for delivery.';
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
                        <Icon className="h-5 w-5" />
                        <span>{title}</span>
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
