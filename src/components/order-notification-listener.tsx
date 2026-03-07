
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
 * A global listener that monitors order status for the buyer.
 * Silenced on Admin and Public pages to prevent permission race conditions.
 */
export function OrderNotificationListener() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const prevStatusRef = useRef<Order['status'] | undefined>(undefined);
  const prevOrderIdRef = useRef<string | undefined>(undefined);

  // CRITICAL: Silent mode for pages that don't need live tracking
  const isSilentPath = 
    pathname === '/' || 
    pathname === '/login' || 
    pathname?.startsWith('/admin') || 
    pathname?.includes('/bevcart') || 
    pathname?.includes('/clubhouse') ||
    pathname?.includes('/laneside');

  const latestOrderQuery = useMemoFirebase(() => {
    // Only attempt query if on tracking-eligible page and user is signed in
    if (!firestore || !user || isSilentPath) return null;
    
    return query(
      collection(firestore, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }, [firestore, user, isSilentPath]);

  const { data: orders } = useCollection<Order>(latestOrderQuery);
  const order = orders?.[0];

  useEffect(() => {
    if (!order || isSilentPath) return;

    const orderUrl = `/order/track?id=${order.id}&sellerId=${order.sellerId}`;

    if (order.id !== prevOrderIdRef.current) {
      prevOrderIdRef.current = order.id;
      prevStatusRef.current = order.status;
      return;
    }

    if (order.status !== prevStatusRef.current) {
      const trackAction = (
        <ToastAction altText="View Order" onClick={() => router.push(orderUrl)}>
          View
        </ToastAction>
      );

      const title = (icon: any, text: string) => (
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-headline font-bold uppercase">{text}</span>
        </div>
      );

      switch (order.status) {
        case 'Preparing':
          toast({ title: title(<CheckCircle2 className="h-5 w-5 text-green-500" />, 'Order Confirmed'), description: 'Establishment received your order.', action: trackAction });
          break;
        case 'Out for Delivery':
          toast({ title: title(<Navigation className="h-5 w-5 text-primary" />, 'Heading Your Way!'), description: 'The driver is out for delivery.', action: trackAction });
          break;
        case 'Delivered':
          toast({ title: title(<PartyPopper className="h-5 w-5 text-green-600" />, 'Delivered!'), description: 'Your items have arrived. Enjoy!', action: trackAction });
          break;
      }
      prevStatusRef.current = order.status;
    }
  }, [order, toast, router, isSilentPath]);

  return null;
}
