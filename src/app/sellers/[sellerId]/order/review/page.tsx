'use client';

import { use, useEffect, useMemo, Suspense } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { Seller, Venue } from '@/lib/types';
import { useCart } from '@/lib/cart-context';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { OrderSummary } from '@/components/order-summary';
import { PricingBreakdown } from '@/components/pricing-breakdown';
import { TipSelector } from '@/components/tip-selector';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { FEE_DISCLOSURES, getDisclosureCategory } from '@/config/fee-disclosures';

function ReviewOrderContent({ sellerId }: { sellerId: string }) {
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { orderItems, updateItem, removeItem, tip, setTip } = useCart();

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const venueRef = useMemoFirebase(() => (firestore ? doc(firestore, 'venues', sellerId) : null), [firestore, sellerId]);
  const { data: venue, isLoading: isVenueLoading } = useDoc<Venue>(venueRef);

  const menuTypeFromUrl = searchParams.get('menuType') || '';
  const menuUrl = `/sellers/${sellerId}/order?${searchParams.toString()}`;
  const checkoutUrl = `/sellers/${sellerId}/order/checkout?${searchParams.toString()}`;

  const activeOrderItems = useMemo(() => orderItems.filter((item) => item.quantity > 0), [orderItems]);
  const subtotal = useMemo(() => activeOrderItems.reduce((acc, item) => {
    const modsPrice = item.selectedModifiers ? Object.values(item.selectedModifiers).flat().reduce((s, m) => s + m.priceAdjustment, 0) : 0;
    return acc + (item.price + modsPrice) * item.quantity;
  }, 0), [activeOrderItems]);

  const taxRate = seller?.taxRate ?? 6.0;
  const solutionFee = useMemo(() => {
    if (venue?.patronConvenienceFee !== undefined) return venue.patronConvenienceFee / 100;
    if (!seller) return 0;
    return (menuTypeFromUrl && seller.serviceFees?.[menuTypeFromUrl]) || seller.serviceFee || 0;
  }, [seller, venue, menuTypeFromUrl]);
  const tax = subtotal * (taxRate / 100);

  const disclosureCategory = getDisclosureCategory(seller?.type);
  const checkoutNotice = FEE_DISCLOSURES[disclosureCategory].checkout;

  // Nothing to review without items or a seller/menu context - send back to the menu.
  useEffect(() => {
    if (!isSellerLoading && (activeOrderItems.length === 0 || !menuTypeFromUrl)) {
      router.replace(menuUrl);
    }
  }, [isSellerLoading, activeOrderItems.length, menuTypeFromUrl, menuUrl, router]);

  const isLoading = isSellerLoading || isVenueLoading;

  if (isLoading || activeOrderItems.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F0F0F0]">
      <header className="shrink-0 bg-[#213147] px-4 py-3 flex items-center gap-3 shadow-md border-b-2 border-[#E50000]">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 shrink-0 h-9 w-9"
          onClick={() => router.push(menuUrl)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="font-headline font-black uppercase tracking-tight text-white text-sm leading-tight truncate">Review Order</h1>
          <p className="text-[9px] font-bold text-white/50 uppercase tracking-[0.2em] truncate">{seller?.courseName}</p>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        <OrderSummary
          items={activeOrderItems}
          onUpdateItem={updateItem}
          onRemoveItem={removeItem}
        />
      </div>

      <div className="shrink-0 bg-white border-t-2 border-slate-100 px-4 pt-4 pb-5 space-y-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <TipSelector subtotal={subtotal} onTipChange={setTip} />
        <PricingBreakdown subtotal={subtotal} serviceFee={solutionFee} tax={tax} tip={tip} taxRate={taxRate} />
        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center leading-relaxed opacity-60">
          {checkoutNotice}
        </p>
        <Button
          size="lg"
          className="w-full h-14 font-black uppercase tracking-widest gap-2 shadow-xl"
          onClick={() => router.push(checkoutUrl)}
        >
          Checkout <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

export default function ReviewOrderPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);

  return (
    <Suspense fallback={
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    }>
      <ReviewOrderContent sellerId={sellerId} />
    </Suspense>
  );
}
