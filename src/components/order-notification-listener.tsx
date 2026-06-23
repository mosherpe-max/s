'use client';

import { useEffect, useRef } from 'react';
import { collection, query, limit, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Navigation, CheckCircle2, PartyPopper } from 'lucide-react';
import { ToastAction } from '@/components/ui/toast';
import { useRouter, usePathname } from 'next/navigation';

/**
 * A global listener that monitors order status for the buyer.
 * Scoped to the current customer session.
 */
export function OrderNotificationListener() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const prevStatusRef = useRef<Order['status'] | undefined>(undefined);
  const prevOrderIdRef = useRef<string | undefined>(undefined);

  // Silent mode for certain paths to avoid redundant notifications
  const isSilentPath = 
    pathname === '/login' || 
    pathname?.startsWith('/admin') || 
    pathname?.includes('/bevcart') || 
    pathname?.includes('/clubhouse') ||
    pathname?.includes('/laneside');

  const latestOrderQuery = useMemoFirebase(() => {
    // Only query if we have a user identity and aren't on a restricted path
    if (!firestore || !user?.uid || isSilentPath) return null;
    
    return query(
      collection(firestore, 'orders'),
      where('buyerProfileId', '==', user.uid),
      limit(5)
    );
  }, [firestore, user?.uid, isSilentPath]);

  const { data: orders } = useCollection<Order>(latestOrderQuery);
  
  // Sort manually client-side
  const order = orders && orders.length > 0 
    ? [...orders].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0] 
    : null;

  useEffect(() => {
    if (!order || isSilentPath) return;

    const orderUrl = `/order/track?id=${order.id}&sellerId=${order.sellerId}`;

    // Handle initial state or order change
    if (order.id !== prevOrderIdRef.current) {
      prevOrderIdRef.current = order.id;
      prevStatusRef.current = order.status;
      return;
    }

    // Trigger toast on status change
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
          toast({ 
            title: title(<CheckCircle2 className="h-5 w-5 text-primary" />, 'Order Confirmed'), 
            description: 'Establishment received your order.', 
            action: trackAction 
          });
          break;
        case 'Out for Delivery':
          toast({ 
            title: title(<Navigation className="h-5 w-5 text-primary" />, 'Heading Your Way!'), 
            description: 'The driver is out for delivery.', 
            action: trackAction 
          });
          break;
        case 'Delivered':
          toast({ 
            title: title(<PartyPopper className="h-5 w-5 text-primary" />, 'Delivered!'), 
            description: 'Your items have arrived. Enjoy!', 
            action: trackAction 
          });
          break;
      }
      prevStatusRef.current = order.status;
    }
  }, [order, toast, router, isSilentPath]);

  return null;
}