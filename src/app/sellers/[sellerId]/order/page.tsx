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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { mockBuyerLocation } from '@/lib/data';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { StripeCheckoutForm } from '@/components/stripe-checkout-form';
import { cn } from '@/lib/utils';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Public Test Key for Prototype
const stripePromise = loadStripe('pk_test_51O8R7zIuK7fM8y8m9f6a4zS2T5U8v4w3q1l0k9j8h7g6f5d4s3a2q1w0e9r8t7y6u5i4o3p2l1m0n9b8v7c6x5z');

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
 * INTERNAL COMPONENT: CheckoutDrawerContent
 * This component is wrapped in <Elements> to allow usage of useStripe and useElements hooks.
 */
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
  paymentMethod,
  setPaymentMethod,
  isStripeReady,
  setIsStripeReady,
  onOrderComplete
}: any) {
  const stripe = useStripe();
  const elements = useElements();
  const { firebaseApp } = useFirebase();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * handlePlaceOrder
   * Orchestrates the multi-step Stripe and Firestore process.
   */
  const handlePlaceOrder = async () => {
    if (!firestore || activeOrderItems.length === 0) return;
    
    setIsProcessing(true);
    console.log('🚀 INITIALIZING CHECKOUT PROCESS...');
    
    try {
      // STEP 1: AUTHENTICATION
      let currentUser = user;
      if (!currentUser && auth) {
        console.log('👤 Step 1: Performing Anonymous Sign-in...');
        const result = await signInAnonymously(auth);
        currentUser = result.user;
      }
      if (!currentUser) throw new Error("Could not verify your identity. Please refresh and try again.");

      let paymentId = 'manual_at_delivery';
      let pStatus = 'Pending';

      // STEP 2 & 3: STRIPE HANDSHAKE
      if (paymentMethod === 'Stripe') {
        if (!stripe || !elements) throw new Error("The payment system (Stripe) is still initializing. Please wait a moment.");

        console.log('💳 Step 2: Requesting Payment Intent from Cloud Functions...');
        const functions = getFunctions(firebaseApp, 'us-central1');
        const createIntent = httpsCallable(functions, 'createPaymentIntent');
        
        try {
          const result = await createIntent({ amount: finalTotal, sellerId });
          const { clientSecret } = result.data as { clientSecret: string };
          console.log('✅ Step 2 Complete: Intent established.');

          // 3. Client-side confirmation
          console.log('🔒 Step 3: Securely confirming payment...');
          const confirmResult = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
              card: elements.getElement(CardElement)!,
              billing_details: {
                email: currentUser.email || undefined,
              },
            },
          });

          if (confirmResult.error) {
            console.error('❌ Step 3 Failed:', confirmResult.error.message);
            throw new Error(confirmResult.error.message);
          }

          console.log('✅ Step 3 Complete: Capture successful.');
          paymentId = confirmResult.paymentIntent.id;
          pStatus = 'Succeeded';
        } catch (funcError: any) {
          console.error('❌ Cloud Function Failure:', funcError);
          // Extract specific message from Firebase error
          const serverMessage = funcError?.message || funcError?.details?.message || "Internal server error during payment creation.";
          throw new Error(serverMessage);
        }
      }

      // STEP 4: FIRESTORE RECORDING
      console.log('📝 Step 4: Finalizing order in registry...');
      const loc = mockBuyerLocation; 
      const orderData: any = {
        sellerId,
        buyerProfileId: currentUser.uid,
        customerName: currentUser.email || 'Guest Patron',
        deliveryLocation: { latitude: loc.latitude, longitude: loc.longitude },
        items: activeOrderItems,
        subtotal,
        serviceFee: platformFee,
        tax,
        tip,
        total: finalTotal,
        status: 'Placed',
        paymentMethod: paymentMethod,
        paymentStatus: pStatus,
        stripePaymentIntentId: paymentId,
        menuType: selectedMenuType,
        menuTypeLocation: locationValue || null,
        createdAt: serverTimestamp(),
      };

      const orderRef = await addDoc(collection(firestore, 'orders'), orderData);
      console.log('✅ ORDER COMPLETE:', orderRef.id);
      onOrderComplete(orderRef.id);
      
    } catch (e: any) {
      console.error('💥 CHECKOUT CRASHED:', e);
      toast({ 
        variant: 'destructive', 
        title: 'Transaction Interrupted', 
        description: e.message || "An unexpected error occurred. Please try again." 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8 pb-10">
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
                    <p className="text-xs font-black uppercase tracking-tight text-[#213147]">Pay with Card</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      SECURE STRIPE CHECKOUT
                    </p>
                  </div>
                </div>
                {paymentMethod === 'Stripe' && <Check className="h-4 w-4 text-primary" />}
              </div>
            </RadioGroup>

            {paymentMethod === 'Stripe' && (
              <div className="mt-4 p-4 border-2 border-slate-100 rounded-3xl bg-slate-50/50">
                <StripeCheckoutForm onReadyStateChange={setIsStripeReady} />
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
      
      <SheetFooter className="p-6 bg-white border-t">
        <Button 
          size="lg" 
          className="w-full h-14 font-black uppercase tracking-widest gap-2 shadow-xl" 
          onClick={handlePlaceOrder} 
          disabled={isProcessing || (paymentMethod === 'Stripe' && !isStripeReady)}
        >
          {isProcessing ? <Loader2 className="animate-spin" /> : <ShoppingBag className="h-5 w-5" />} 
          {paymentMethod === 'Stripe' ? 'PAY & PLACE ORDER' : 'PLACE ORDER'}
        </Button>
      </SheetFooter>
    </>
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
  const [paymentMethod, setPaymentMethod] = useState<'Pay at Delivery' | 'Stripe'>('Pay at Delivery');
  const [isStripeReady, setIsStripeReady] = useState(false);

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
          <SheetHeader className="px-6 py-4 border-b bg-white"><SheetTitle>Review Order</SheetTitle></SheetHeader>
          <Elements stripe={stripePromise}>
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
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              isStripeReady={isStripeReady}
              setIsStripeReady={setIsStripeReady}
              onOrderComplete={handleOrderComplete}
            />
          </Elements>
        </SheetContent>
      </Sheet>
    </div>
  );
}
