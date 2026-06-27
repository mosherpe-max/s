'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { Order } from '@/lib/types';

/**
 * Order Status Gateway
 * Provides a clean URL for SMS notifications: https://koop.app/orders/[orderId]
 * Automatically resolves the required seller context and redirects to the tracking screen.
 */
export default function OrderStatusGateway({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();
  const firestore = useFirestore();

  const orderRef = useMemoFirebase(() => (firestore ? doc(firestore, 'orders', orderId) : null), [firestore, orderId]);
  const { data: order, isLoading, error } = useDoc<Order>(orderRef);

  useEffect(() => {
    if (order) {
      // Redirect to the actual high-precision tracking page with necessary context
      router.replace(`/order/track?id=${order.id}&sellerId=${order.sellerId}`);
    }
  }, [order, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#213147] text-white flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-red-500/10 p-6 rounded-[2rem] border-2 border-red-500/20 mb-6">
          <p className="font-headline font-black text-xl uppercase text-red-500">Order Not Found</p>
        </div>
        <p className="text-white/60 text-sm max-w-xs">We couldn't locate this order. Please check the link or contact the venue for assistance.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#213147] flex flex-col items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Initializing High-Precision Feed...</p>
    </div>
  );
}
