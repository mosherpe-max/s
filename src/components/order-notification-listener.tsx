
'use client';

import { useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Navigation, CheckCircle2, PartyPopper } from 'lucide-react';
import { ToastAction } from '@/components/ui/toast';
import { useRouter, usePathname } from 'next/navigation';

/**
 * A global listener that monitors the most recent order status for the buyer.
 * Displays toast notifications and System Level Push Notifications for key milestones.
 */
export function OrderNotificationListener() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const prevStatusRef = useRef<Order['status'] | undefined>(undefined);
  const prevOrderIdRef = useRef<string | undefined>(undefined);

  // Skip notifications if on an admin page to avoid permission collision or unnecessary overhead
  const isAdminPath = pathname?.startsWith('/admin') || pathname?.includes('/bevcart') || pathname?.includes('/clubhouse');

  const latestOrderQuery = useMemoFirebase(() => {
    // CRITICAL: Only attempt the query if we have an authenticated user and NOT on admin pages.
    if (!firestore || !user || isAdminPath) return null;
    
    return query(
      collection(firestore, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }, [firestore, user, isAdminPath]);

  const { data: orders } = useCollection<Order>(latestOrderQuery);
  const order = orders?.[0];

  useEffect(() => {
    if (order && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [order]);

  const sendSystemNotification = (title: string, body: string, url: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: 'https://picsum.photos/seed/koop/192/192',
          badge: 'https://picsum.photos/seed/koop/96/96',
          vibrate: [200, 100, 200],
          tag: 'order-status',
          renotify: true,
          data: { url }
        });
      });
    }
  };

  useEffect(() => {
    if (!order) return;

    const orderUrl = `/order/track?id=${order.id}&sellerId=${order.sellerId}`;

    if (order.id !== prevOrderIdRef.current) {
      prevOrderIdRef.current = order.id;
      prevStatusRef.current = order.status;
      return;
    }

    if (order.status !== prevStatusRef.current) {
      const trackAction = (
        <ToastAction 
          altText="Track Order" 
          onClick={() => router.push(orderUrl)}
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
          
          sendSystemNotification(
            'Order Confirmed!',
            'The establishment has received your order and is now preparing it.',
            orderUrl
          );
          break;

        case 'Out for Delivery':
          toast({
            title: (
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary" />
                <span className="font-headline font-bold uppercase">Heading Your Way!</span>
              </div>
            ),
            description: 'The driver is out for delivery.',
            action: trackAction,
          });

          sendSystemNotification(
            'Your Refreshments are On the Way!',
            'Watch the map live to see your driver approaching.',
            orderUrl
          );
          break;
          
        case 'Delivered':
          toast({
            title: (
              <div className="flex items-center gap-2">
                <PartyPopper className="h-5 w-5 text-green-600" />
                <span className="font-headline font-bold uppercase text-green-600">Delivered!</span>
              </div>
            ),
            description: 'Your items have arrived. Enjoy!',
            action: trackAction,
          });

          sendSystemNotification(
            'Order Delivered!',
            'Your items have arrived. Enjoy!',
            orderUrl
          );
          break;
      }
      
      prevStatusRef.current = order.status;
    }
  }, [order, toast, router]);

  return null;
}
