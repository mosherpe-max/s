
'use client';

import { useState, use, useEffect, useMemo } from 'react';
import { collection, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useAuth, useUser, useFirebase } from '@/firebase';
import type { Seller, MenuItem, OrderItem, PlatformConfig, Category } from '@/lib/types';
import { categories } from '@/lib/types';
import { BuyerMenu } from '@/components/buyer-menu';
import { OrderSummary } from '@/components/order-summary';
import { PricingBreakdown } from '@/components/pricing-breakdown';
import { TipSelector } from '@/components/tip-selector';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
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
  AlertTriangle,
  Info,
  ShoppingCart,
  Satellite,
  ChevronLeft,
  Clock
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
import { Badge } from '@/components/ui/badge';
import { StylizedKoopLogo } from '@/components/header';

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

function CheckoutBrandingBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-7 bg-[#213147] text-white flex items-center justify-between px-6 z-[60] w-full border-t border-white/5">
      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Secure Order</span>
      <div className="flex items-center gap-0.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Powered by</span>
        <StylizedKoopLogo size="sm" />
      </div>
    </div>
  );
}

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
      if (error) throw new Error(error.message);
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
      toast({ variant: 'destructive', title: 'Payment Denied', description: e.message });
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
      <CheckoutBrandingBar />
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
  taxRate,
  onOrderComplete
}: any) {
  const { firebaseApp } = useFirebase();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [tip, setTip] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Pay at Delivery' | 'Stripe'>('Pay at Delivery');
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isFetchingIntent, setIsFetchingIntent] = useState(false);

  const isGolf = seller?.type?.toLowerCase().includes('golf');
  const isBowling = seller?.type?.toLowerCase().includes('bowling');

  const tax = subtotal * (taxRate / 100);
  const finalTotal = subtotal + platformFee + tax + tip;
  const baseTotalForBackend = subtotal + tax + tip;

  useEffect(() => {
    if (paymentMethod === 'Stripe' && !clientSecret && !isFetchingIntent && baseTotalForBackend > 0) {
      const fetchIntent = async () => {
        setIsFetchingIntent(true);
        try {
          let currentUser = user;
          if (!currentUser && auth) {
            const result = await signInAnonymously(auth);
            currentUser = result.user;
          }
          if (!currentUser) throw new Error("Identity verification failed.");
          const functions = getFunctions(firebaseApp, 'us-central1');
          const createIntent = httpsCallable(functions, 'createPaymentIntent');
          const result = await createIntent({ amount: baseTotalForBackend, sellerId });
          const { clientSecret: secret } = result.data as { clientSecret: string };
          setClientSecret(secret);
        } catch (e: any) {
          toast({ variant: 'destructive', title: 'Payment Setup Error', description: e.message || "Could not initialize secure payment." });
        } finally {
          setIsFetchingIntent(false);
        }
      };
      fetchIntent();
    }
  }, [paymentMethod, baseTotalForBackend, sellerId, firebaseApp, clientSecret, isFetchingIntent, toast, user, auth]);

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

  const checkoutNotice = isGolf 
    ? "A small convenience fee has been added to support mobile ordering on the course."
    : isBowling 
    ? "A small convenience fee has been added so you can order without leaving your lane."
    : "A small convenience fee is included in your order total to support mobile ordering technology.";

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-8 pb-32">
        <div className="flex justify-start -mb-4">
          <SheetClose asChild>
            <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-primary h-8 gap-1.5 p-0 hover:bg-transparent hover:text-primary/80">
              <ChevronLeft className="h-3.5 w-3.5" /> Add More Items
            </Button>
          </SheetClose>
        </div>

        <OrderSummary items={activeOrderItems} />
        
        {selectedMenuType === 'Lane Delivery' && seller?.laneCount && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">STATION</h3>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: seller.laneCount }, (_, i) => (i + 1).toString()).map(l => (
                <Button key={l} variant={locationValue === `Lane ${l}` ? 'default' : 'outline'} size="sm" onClick={() => setLocationValue(`Lane ${l}`)} className="font-bold">{l}</Button>
              ))}
            </div>
          </div>
        )}

        <TipSelector subtotal={subtotal} onTipChange={setTip} />

        <PricingBreakdown subtotal={subtotal} serviceFee={platformFee} tax={tax} tip={tip} taxRate={taxRate} />

        <div className="space-y-3">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight leading-relaxed">
              {checkoutNotice}
            </p>
          </div>

          {isGolf && (
            <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-700">
              <Satellite className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Delivery Pro Tip</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight leading-relaxed">
                  Enable GPS tracking when prompted at checkout. This allows our staff to find you instantly and ensures a faster delivery experience.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">PAYMENT METHOD</h3>
          <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-1 gap-3">
            <div className={cn("flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer", paymentMethod === 'Pay at Delivery' ? "border-primary bg-primary/5 shadow-md" : "border-slate-100 hover:border-slate-200")} onClick={() => setPaymentMethod('Pay at Delivery')}>
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-lg", paymentMethod === 'Pay at Delivery' ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}><Banknote className="h-5 w-5" /></div>
                <div className="text-left"><p className="text-xs font-black uppercase tracking-tight text-[#213147]">Pay at Delivery</p><p className="text-[9px] font-bold text-muted-foreground uppercase">Cash or Card on-site</p></div>
              </div>
              {paymentMethod === 'Pay at Delivery' && <Check className="h-4 w-4 text-primary" />}
            </div>
            <div className={cn("flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer", paymentMethod === 'Stripe' ? "border-primary bg-primary/5 shadow-md" : "border-slate-100 hover:border-slate-200")} onClick={() => setPaymentMethod('Stripe')}>
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-lg", paymentMethod === 'Stripe' ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}><CreditCard className="h-5 w-5" /></div>
                <div className="text-left"><p className="text-xs font-black uppercase tracking-tight text-[#213147]">Digital Checkout</p><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">SECURE PAYMENT ELEMENT</p></div>
              </div>
              {paymentMethod === 'Stripe' && <Check className="h-4 w-4 text-primary" />}
            </div>
          </RadioGroup>
          {paymentMethod === 'Stripe' && (isFetchingIntent ? (<div className="flex flex-col items-center gap-2 py-8"><Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" /><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Initializing Secure Environment...</p></div>) : clientSecret ? (<Elements stripe={stripePromise} options={{ clientSecret }}><StripeActionArea clientSecret={clientSecret} isProcessing={isProcessing} setIsProcessing={setIsProcessing} onOrderComplete={onOrderComplete} orderData={currentOrderData} /></Elements>) : (<div className="p-8 text-center border-2 border-dashed rounded-3xl"><AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-2" /><p className="text-[10px] font-bold text-amber-700 uppercase">Configuration required to initialize payments</p></div>))}
          {paymentMethod === 'Pay at Delivery' && (
            <>
              <div className="fixed bottom-7 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-50">
                <Button size="lg" className="w-full h-14 font-black uppercase tracking-widest gap-2 shadow-xl" onClick={handleManualOrder} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="animate-spin" /> : <ShoppingBag className="h-5 w-5" />} PLACE ORDER
                </Button>
              </div>
              <CheckoutBrandingBar />
            </>
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { orderItems, updateItem, isCartOpen, setIsCartOpen, clearCart, totalItems } = useCart();
  
  const menuTypeFromUrl = searchParams.get('menuType');
  const selectedMenuType = menuTypeFromUrl || '';
  const [locationValue, setLocationValue] = useState<string>('');

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'platform', 'config') : null), [firestore]);
  const { data: platformConfig } = useDoc<PlatformConfig>(configRef);

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return collection(firestore, 'sellers', sellerId, 'menuItems');
  }, [firestore, sellerId]);
  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  const updateMenuType = (type: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('menuType', type);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const isModeAvailable = (type: string) => {
    if (!seller || !platformConfig) return false;
    const isGloballyAuthorized = platformConfig.enabledModes?.includes(type) ?? true;
    if (!isGloballyAuthorized) return false;
    const isVenueAuthorized = seller.menuTypes.includes(type);
    if (!isVenueAuthorized) return false;
    switch(type) {
      case 'Beverage Cart': return !!seller.bevcartActive;
      case 'Clubhouse': return !!seller.clubhouseActive;
      case 'Lane Delivery': return !!seller.lanedeliveryActive;
      case 'Take Out': return !!seller.takeoutActive;
      default: return true;
    }
  };

  useEffect(() => {
    if (!menuTypeFromUrl && seller && platformConfig && !isSellerLoading) {
      let defaultType = '';
      if (seller.type.toLowerCase().includes('bowling')) {
        defaultType = 'Lane Delivery';
      } else {
        defaultType = 'Beverage Cart';
      }
      if (isModeAvailable(defaultType)) {
        updateMenuType(defaultType);
      } else {
        const firstAvailable = seller.menuTypes.find(t => isModeAvailable(t));
        if (firstAvailable) updateMenuType(firstAvailable);
      }
    }
  }, [seller, platformConfig, menuTypeFromUrl, isSellerLoading]);

  const activeOrderItems = useMemo(() => orderItems.filter((item) => item.quantity > 0), [orderItems]);
  const subtotal = useMemo(() => activeOrderItems.reduce((acc, item) => {
    const unitPrice = item.price + (item.selectedModifiers ? Object.values(item.selectedModifiers).flat().reduce((s, m) => s + m.price, 0) : 0);
    return acc + unitPrice * item.quantity;
  }, 0), [activeOrderItems]);
  
  const taxRate = seller?.taxRate ?? 6.0;
  
  const platformFee = useMemo(() => {
    if (!seller) return 0;
    if (selectedMenuType && seller.serviceFees?.[selectedMenuType]) {
      return seller.serviceFees[selectedMenuType];
    }
    return seller.serviceFee || 0;
  }, [seller, selectedMenuType]);

  const filteredMenuItems = useMemo(() => {
    if (!menuItems || !selectedMenuType) return [];
    // Include items that are either naturally in standard availability OR explicitly featured for this mode
    return menuItems.filter(item => 
      item.availableOn?.includes(selectedMenuType) || 
      item.featuredOn?.includes(selectedMenuType)
    );
  }, [menuItems, selectedMenuType]);

  const currentCategories = useMemo(() => {
    if (!seller || !filteredMenuItems.length) return [];
    
    const itemCategories = new Set(filteredMenuItems.map(i => i.category));
    
    // Check if any items are explicitly featured for this mode, even if no items have "Featured" as primary category
    const hasExplicitFeatured = filteredMenuItems.some(i => i.featuredOn?.includes(selectedMenuType));
    if (hasExplicitFeatured) itemCategories.add('Featured');

    const enabledCategories = seller.categoryVisibility?.[selectedMenuType] || categories.filter(c => c !== 'Featured');
    
    const visibleCategories = categories.filter(c => {
      const isFeatured = c === 'Featured';
      const hasItems = itemCategories.has(c);
      const isEnabled = isFeatured || enabledCategories.includes(c);
      return hasItems && isEnabled;
    });

    // Ensure Featured is always first
    return visibleCategories.sort((a, b) => {
      if (a === 'Featured') return -1;
      if (b === 'Featured') return 1;
      return 0;
    });
  }, [seller, filteredMenuItems, selectedMenuType]);

  const handleOrderComplete = (orderId: string) => {
    router.push(`/order/track?id=${orderId}&sellerId=${sellerId}`);
    clearCart();
  };

  const scrollToCategory = (category: string) => {
    const element = document.getElementById(category.toLowerCase().replace(/\s+/g, '-'));
    if (element) {
      const offset = 160; 
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const isGolf = seller?.type?.toLowerCase().includes('golf');
  const isBowling = seller?.type?.toLowerCase().includes('bowling');

  const topMenuNotice = isGolf 
    ? "Order from anywhere on the course — a small convenience fee applies at checkout."
    : isBowling 
    ? "Order from your lane and stay in the game — a small convenience fee applies at checkout."
    : "Select items to begin your order — a small convenience fee applies at checkout.";

  const hasAnyAvailableMode = seller?.menuTypes?.some(t => isModeAvailable(t));
  const isLoading = isSellerLoading || areItemsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Initializing Menu...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="relative w-full min-h-[22vh] flex flex-col bg-[#213147] overflow-hidden shrink-0 pt-8 pb-8 px-6">
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border-[30px] border-white" />
        </div>
        
        <div className="relative z-10 flex flex-col items-start text-left space-y-6 max-w-2xl w-full mx-auto">
          <div className="space-y-4 w-full">
            <div className="flex flex-col">
              <h1 className="font-headline text-2xl font-black text-white uppercase tracking-tight leading-none mb-1">
                {seller?.courseName}
              </h1>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">Select Service Mode</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {seller?.menuTypes?.map((type) => {
                const Icon = serviceTypeIcons[type] || Store;
                const available = isModeAvailable(type);
                const isSelected = selectedMenuType === type;
                
                return (
                  <button
                    key={type}
                    disabled={!available}
                    onClick={() => updateMenuType(type)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg",
                      isSelected 
                        ? "bg-primary text-white scale-105" 
                        : (available ? "bg-white/10 text-white hover:bg-white/20" : "bg-white/5 text-white/20 grayscale cursor-not-allowed border border-white/5")
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {type}
                    {!available && <span className="ml-1 opacity-40 text-[8px]">(OFF)</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/50 flex items-center gap-1.5">
            <Info className="h-2.5 w-2.5 shrink-0" />
            {topMenuNotice}
          </p>
        </div>
      </header>

      {hasAnyAvailableMode ? (
        <>
          <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b-2 shadow-sm">
            <div className="max-w-2xl mx-auto px-4 py-3">
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {currentCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => scrollToCategory(cat)}
                    className={cn(
                      "whitespace-nowrap px-4 py-1.5 rounded-full border-2 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95",
                      cat === 'Featured' 
                        ? "bg-amber-50 border-amber-400 text-amber-600" 
                        : "bg-slate-50 border-slate-100 text-slate-500 hover:border-primary/30 hover:text-primary"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <main className="flex-1 px-4 pt-8 pb-32 max-w-2xl mx-auto w-full">
            {selectedMenuType ? (
              <BuyerMenu 
                orderItems={orderItems} 
                onUpdateItem={updateItem} 
                onOpenModifiers={() => {}}
                currentCategories={currentCategories} 
                menuItems={filteredMenuItems} 
                selectedMenuType={selectedMenuType}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                <div className="p-6 bg-slate-100 rounded-full">
                  <Utensils className="h-12 w-12 text-[#213147]" />
                </div>
                <div className="space-y-1">
                  <p className="font-headline font-black uppercase tracking-widest text-[#213147]">Awaiting Selection</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Please choose a service mode above to view the menu</p>
                </div>
              </div>
            )}
          </main>
        </>
      ) : (
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <div className="bg-amber-50 p-10 rounded-[3rem] border-2 border-amber-100 shadow-xl space-y-6 animate-in zoom-in-95 duration-500">
             <div className="bg-amber-500/10 p-4 rounded-3xl inline-block">
                <Clock className="h-12 w-12 text-amber-600" />
             </div>
             <div className="space-y-3">
                <h2 className="font-headline text-2xl font-black uppercase tracking-tight text-[#213147]">Service Paused</h2>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  We apologize, but there are no active service modes currently available at {seller?.courseName}. 
                </p>
             </div>
             <div className="pt-4 border-t border-amber-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Please check back again soon!</p>
             </div>
          </div>
          <Button variant="ghost" onClick={() => router.push('/')} className="mt-8 text-muted-foreground uppercase text-[10px] font-black tracking-widest">Return to Home</Button>
        </main>
      )}

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        {activeOrderItems.length > 0 && (
          <div className="fixed bottom-7 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-40">
            <SheetTrigger asChild>
              <Button size="lg" className="w-full h-14 font-black uppercase tracking-widest shadow-xl flex justify-between px-8">
                <div className="flex items-center gap-3">
                  <span>REVIEW ORDER</span>
                  <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full">{totalItems} ITEMS</span>
                </div>
                <span className="bg-white/20 px-3 py-1 rounded-lg">${subtotal.toFixed(2)}</span>
              </Button>
            </SheetTrigger>
          </div>
        )}
        <SheetContent side="bottom" className="rounded-t-[2rem] h-[90vh] flex flex-col p-0 overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b bg-[#213147] text-white shrink-0">
            <div className="flex flex-col items-start pr-10">
              <div className="flex items-center gap-3 mb-1">
                <SheetTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Checkout</SheetTitle>
                <Badge variant="outline" className="text-[9px] font-black border-primary/40 bg-primary/10 text-primary uppercase h-5">
                  {selectedMenuType}
                </Badge>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">{seller?.courseName}</p>
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
            taxRate={taxRate}
            onOrderComplete={handleOrderComplete}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
