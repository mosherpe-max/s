'use client';

import { useState, use, useEffect, useMemo } from 'react';
import { collection, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useAuth, useUser, useFirebase } from '@/firebase';
import type { Seller, MenuItem, OrderItem } from '@/lib/types';
import { categories } from '@/lib/types';
import { BuyerMenu } from '@/components/buyer-menu';
import { OrderSummary } from '@/components/order-summary';
import { PricingBreakdown } from '@/components/pricing-breakdown';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Loader2, 
  Store, 
  Truck,
  Building,
  Waves,
  Home,
  Utensils,
  MapPin,
  ShoppingBasket,
  ShoppingBag,
  CreditCard,
  Banknote,
  Check,
  AlertTriangle
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCart } from '@/lib/cart-context';
import { Label } from '@/components/ui/label';
import { RadioGroup } from '@/components/ui/radio-group';
import { mockBuyerLocation } from '@/lib/data';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { StripeCheckoutForm } from '@/components/stripe-checkout-form';
import { cn } from '@/lib/utils';
import { getFunctions, httpsCallable } from 'firebase/functions';

// 🌟 Load Stripe with environment variable
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

const serviceTypeIcons: Record<string, any> = {
  'Beverage Cart': Truck,
  'Clubhouse': Building,
  'Pool': Waves,
  'Take Out': ShoppingBasket,
  'Halfway House': Home,
  'Dine-In': Utensils,
  'Lane Delivery': MapPin,
};

/**
 * 🌟 SUB-COMPONENT: StripeActionArea
 * This component is wrapped in <Elements> so it has access to useStripe()
 */
function StripeActionArea({ 
  clientSecret, 
  isProcessing, 
  setIsProcessing, 
  onOrderComplete,
  orderData
}: any) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isStripeReady, setIsStripeReady] = useState(false);

  const handleStripePayment = async () => {
    if (!stripe || !elements || !clientSecret || !firestore) return;
    
    setIsProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order/track`,
        },
        redirect: 'if_required',
      });

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        const finalOrderData = {
          ...orderData,
          paymentStatus: paymentIntent.status === 'succeeded' ? 'Succeeded' : 'Processing',
          stripePaymentIntentId: paymentIntent.id,
        };
        const orderRef = await addDoc(collection(firestore, 'orders'), finalOrderData);
        onOrderComplete(orderRef.id);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Payment Failed', description: e.message });
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mt-4 p-4 border-2 border-slate-100 rounded-3xl bg-slate-50/50 min-h-[100px] flex flex-col justify-center">
        <StripeCheckoutForm onReadyStateChange={setIsStripeReady} />
      </div>
      
      <div className="fixed bottom-7 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-50">
        <Button 
          size="lg" 
          className="w-full h-14 font-black uppercase tracking-widest gap-2 shadow-xl" 
          onClick={handleStripePayment}
          disabled={isProcessing || !isStripeReady}
        >
          {isProcessing ? <Loader2 className="animate-spin" /> : <CreditCard className="h-5 w-5" />} 
          PAY & PLACE ORDER
        </Button>
      </div>
    </div>
  );
}

function CheckoutDrawerContent({ 
  seller, 
  sellerId, 
  selectedMenuType, 
  locationValue, 
  setLocationValue, 
  activeOrderItems, 
  subtotal, 
  platformFee, 
  tax, 
  tip, 
  finalTotal, 
  taxRate,
  onOrderComplete
}: any) {
  const { firebaseApp } = useFirebase();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [paymentMethod, setPaymentMethod] = useState<'Pay at Delivery' | 'Stripe'>('Pay at Delivery');
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isFetchingIntent, setIsFetchingIntent] = useState(false);

  // 🌟 Base amount for calculation: Subtotal + Tax + Tip
  // The server will fetch the convenience fee from the venue registry and add it.
  const baseTotalForBackend = subtotal + tax + tip;

  useEffect(() => {
    if (paymentMethod === 'Stripe' && !clientSecret && !isFetchingIntent && baseTotalForBackend > 0) {
      const fetchIntent = async () => {
        setIsFetchingIntent(true);
        try {
          const functions = getFunctions(firebaseApp, 'us-central1');
          const createIntent = httpsCallable(functions, 'createPaymentIntent');
          // Send the base amount; server adds regulated fee
          const result = await createIntent({ amount: baseTotalForBackend, sellerId });
          const { clientSecret: secret } = result.data as { clientSecret: string };
          setClientSecret(secret);
        } catch (e: any) {
          console.error('💥 [INTENT FAILED]:', e);
          toast({ variant: 'destructive', title: 'Payment Setup Error', description: e.details?.message || e.message });
        } finally {
          setIsFetchingIntent(false);
        }
      };
      fetchIntent();
    }
  }, [paymentMethod, baseTotalForBackend, sellerId, firebaseApp, clientSecret, isFetchingIntent, toast]);

  const handleManualOrder = async () => {
    if (!firestore || activeOrderItems.length === 0) return;
    setIsProcessing(true);
    try {
      let currentUser = user;
      if (!currentUser && auth) {
        const result = await signInAnonymously(auth);
        currentUser = result.user;
      }
      if (!currentUser) throw new Error("Authentication failed.");

      const orderData: any = {
        sellerId,
        buyerProfileId: currentUser.uid,
        customerName: currentUser.email || 'Guest Patron',
        deliveryLocation: mockBuyerLocation,
        items: activeOrderItems,
        subtotal,
        serviceFee: platformFee,
        tax,
        tip,
        total: finalTotal,
        status: 'Placed',
        paymentMethod: 'Pay at Delivery',
        paymentStatus: 'Pending',
        menuType: selectedMenuType,
        menuTypeLocation: locationValue || null,
        createdAt: serverTimestamp(),
      };

      const orderRef = await addDoc(collection(firestore, 'orders'), orderData);
      onOrderComplete(orderRef.id);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Order Failed', description: e.message });
      setIsProcessing(false);
    }
  };

  const currentOrderData = useMemo(() => {
    if (!user) return null;
    return {
      sellerId,
      buyerProfileId: user.uid,
      customerName: user.email || 'Guest Patron',
      deliveryLocation: mockBuyerLocation,
      items: activeOrderItems,
      subtotal,
      serviceFee: platformFee,
      tax,
      tip,
      total: finalTotal,
      status: 'Placed',
      paymentMethod: 'Stripe',
      menuType: selectedMenuType,
      menuTypeLocation: locationValue || null,
      createdAt: serverTimestamp(),
    };
  }, [user, sellerId, activeOrderItems, subtotal, platformFee, tax, tip, finalTotal, selectedMenuType, locationValue]);

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-8 pb-32">
        <OrderSummary items={activeOrderItems} />
        
        {selectedMenuType === 'Lane Delivery' && seller?.laneCount && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">STATION</h3>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: seller.laneCount }, (_, i) => (i + 1).toString()).map(l => (
                <Button 
                  key={l} 
                  variant={locationValue === `Lane ${l}` ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setLocationValue(`Lane ${l}`)}
                  className="font-bold"
                >
                  {l}
                </Button>
              ))}
            </div>
          </div>
        )}

        <PricingBreakdown subtotal={subtotal} serviceFee={platformFee} tax={tax} tip={tip} taxRate={taxRate} />

        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">PAYMENT METHOD</h3>
          <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-1 gap-3">
            <div 
              className={cn(
                "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer",
                paymentMethod === 'Pay at Delivery' ? "border-primary bg-primary/5 shadow-md" : "border-slate-100 hover:border-slate-200"
              )}
              onClick={() => setPaymentMethod('Pay at Delivery')}
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-lg", paymentMethod === 'Pay at Delivery' ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}>
                  <Banknote className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-tight text-[#213147]">Pay at Delivery</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Cash or Card on-site</p>
                </div>
              </div>
              {paymentMethod === 'Pay at Delivery' && <Check className="h-4 w-4 text-primary" />}
            </div>

            <div 
              className={cn(
                "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer",
                paymentMethod === 'Stripe' ? "border-primary bg-primary/5 shadow-md" : "border-slate-100 hover:border-slate-200"
              )}
              onClick={() => setPaymentMethod('Stripe')}
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-lg", paymentMethod === 'Stripe' ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}>
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-tight text-[#213147]">Digital Checkout</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">SECURE PAYMENT ELEMENT</p>
                </div>
              </div>
              {paymentMethod === 'Stripe' && <Check className="h-4 w-4 text-primary" />}
            </div>
          </RadioGroup>

          {paymentMethod === 'Stripe' && (
            isFetchingIntent ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Initializing Secure Environment...</p>
              </div>
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripeActionArea 
                  clientSecret={clientSecret} 
                  isProcessing={isProcessing} 
                  setIsProcessing={setIsProcessing}
                  onOrderComplete={onOrderComplete}
                  orderData={currentOrderData}
                />
              </Elements>
            ) : (
              <div className="p-8 text-center border-2 border-dashed rounded-3xl">
                <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-amber-700 uppercase">Configuration required to initialize payments</p>
              </div>
            )
          )}

          {paymentMethod === 'Pay at Delivery' && (
            <div className="fixed bottom-7 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-50">
              <Button 
                size="lg" 
                className="w-full h-14 font-black uppercase tracking-widest gap-2 shadow-xl" 
                onClick={handleManualOrder}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : <ShoppingBag className="h-5 w-5" />} 
                PLACE ORDER
              </Button>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

export default function BuyerOrderPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orderItems, updateItem, isCartOpen, setIsCartOpen, clearCart } = useCart();

  const menuTypeFromUrl = searchParams.get('menuType');
  const [selectedMenuType, setSelectedMenuType] = useState<string>(menuTypeFromUrl || '');
  const [locationValue, setLocationValue] = useState<string>('');

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return collection(firestore, 'sellers', sellerId, 'menuItems');
  }, [firestore, sellerId]);
  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  const activeOrderItems = useMemo(() => orderItems.filter((item) => item.quantity > 0), [orderItems]);
  const subtotal = useMemo(() => activeOrderItems.reduce((acc, item) => {
    const unitPrice = item.price + (item.selectedModifiers ? Object.values(item.selectedModifiers).flat().reduce((s, m) => s + m.price, 0) : 0);
    return acc + unitPrice * item.quantity;
  }, 0), [activeOrderItems]);
  
  const taxRate = seller?.taxRate ?? 6.0;
  const tax = subtotal * (taxRate / 100);
  const platformFee = seller?.serviceFee || 0;
  const tip = subtotal * 0.15;
  const finalTotal = subtotal + platformFee + tax + tip;

  const filteredMenuItems = useMemo(() => {
    if (!menuItems || !selectedMenuType) return [];
    return menuItems.filter(item => item.availableOn?.includes(selectedMenuType));
  }, [menuItems, selectedMenuType]);

  const currentCategories = useMemo(() => {
    if (!seller || !filteredMenuItems.length) return [];
    const available = new Set(filteredMenuItems.map(i => i.category));
    return categories.filter(c => available.has(c));
  }, [seller, filteredMenuItems]);

  const handleOrderComplete = (orderId: string) => {
    router.push(`/order/track?id=${orderId}&sellerId=${sellerId}`);
    clearCart();
  };

  const isLoading = isSellerLoading || areItemsLoading;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-muted/30 border-b">
        <div className="px-4 py-3 space-y-3 max-w-2xl mx-auto">
          <Label className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Select Service</Label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {seller?.menuTypes?.map((type) => {
              const Icon = serviceTypeIcons[type] || Store;
              return (
                <Button key={type} variant={selectedMenuType === type ? 'default' : 'secondary'} size="sm" onClick={() => setSelectedMenuType(type)} className="h-8 text-[10px] font-bold">
                  <Icon className="h-3.5 w-3.5 mr-1.5" /> {type}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 pt-6 pb-32 max-w-2xl mx-auto w-full">
        {isLoading ? <Skeleton className="h-40 w-full" /> : (
          <BuyerMenu 
            orderItems={orderItems} 
            onUpdateItem={updateItem} 
            onOpenModifiers={() => {}}
            currentCategories={currentCategories} 
            menuItems={filteredMenuItems} 
            selectedMenuType={selectedMenuType}
          />
        )}
      </main>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        {activeOrderItems.length > 0 && (
          <div className="fixed bottom-7 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-30">
            <SheetTrigger asChild>
              <Button size="lg" className="w-full font-black uppercase tracking-widest">Review Order — ${subtotal.toFixed(2)}</Button>
            </SheetTrigger>
          </div>
        )}
        <SheetContent side="bottom" className="rounded-t-[2rem] h-[90vh] flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b bg-white">
            <div className="flex justify-between items-center pr-10">
              <SheetTitle>Review Order</SheetTitle>
            </div>
          </SheetHeader>
          <CheckoutDrawerContent 
            seller={seller}
            sellerId={sellerId}
            selectedMenuType={selectedMenuType}
            locationValue={locationValue}
            setLocationValue={setLocationValue}
            activeOrderItems={activeOrderItems}
            subtotal={subtotal}
            platformFee={platformFee}
            tax={tax}
            tip={tip}
            finalTotal={finalTotal}
            taxRate={taxRate}
            onOrderComplete={handleOrderComplete}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
