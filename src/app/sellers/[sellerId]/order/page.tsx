
'use client';

import { useState, use, useEffect, useMemo } from 'react';
import { collection, doc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useAuth, useUser, useFirebase } from '@/firebase';
import type { Seller, MenuItem, OrderItem, SolutionConfig, Category, Venue, StaffMember } from '@/lib/types';
import { categories } from '@/lib/types';
import { BuyerMenu } from '@/components/buyer-menu';
import { OrderSummary } from '@/components/order-summary';
import { PricingBreakdown } from '@/components/pricing-breakdown';
import { TipSelector } from '@/components/tip-selector';
import { ModifierSelector } from '@/components/modifier-selector';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose, SheetDescription } from '@/components/ui/sheet';
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
  Clock,
  Zap,
  User,
  Smartphone,
  Mail,
  X,
  ReceiptText
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCart } from '@/lib/cart-context';
import { Label } from '@/components/ui/label';
import { RadioGroup } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { mockBuyerLocation } from '@/lib/data';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { StripeCheckoutForm } from '@/components/stripe-checkout-form';
import { cn } from '@/lib/utils';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Badge } from '@/components/ui/badge';
import { StylizedKoopLogo } from '@/components/header';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { FEE_DISCLOSURES, getDisclosureCategory } from '@/config/fee-disclosures';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

const serviceTypeIcons: Record<string, any> = {
  'Beverage Cart': Zap,
  'Clubhouse': Zap,
  'Pool': Waves,
  'Halfway House': Home,
  'Dine-In': Utensils,
  'Lane Delivery': MapPin,
};

const SERVICE_INSTRUCTIONS: Record<string, string> = {
  'Beverage Cart': 'Drinks and Snacks delivered on Course',
  'Clubhouse': 'Food and Drinks delivered on Course',
  'Lane Delivery': 'Food and Drinks delivered to your lane',
};

function CheckoutBrandingBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-7 bg-[#213147] text-white flex items-center justify-center z-[60] w-full border-t border-white/5">
      <div className="max-w-xl mx-auto w-full px-4 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Secure Order</span>
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Powered by</span>
          <StylizedKoopLogo size="sm" />
        </div>
      </div>
    </div>
  );
}

function PatronIdentifyFields({ patronEmail, setPatronEmail, patronName, setPatronName, patronPhone, setPatronPhone, saveInfo, setSaveInfo }: any) {
  return (
    <div className="space-y-6 bg-slate-50/50 p-5 rounded-[2rem] border-2 border-slate-100 animate-in fade-in duration-500">
      <div className="space-y-1.5 px-1">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
          <User className="h-3 w-3" /> Delivery Contact
        </h3>
        <p className="text-[9px] font-bold text-muted-foreground uppercase leading-relaxed">
          We collect these details to send you order status updates via SMS and a digital receipt via email.
        </p>
      </div>
      
      <div className="space-y-3">
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Email Address" 
            type="email"
            value={patronEmail} 
            onChange={(e) => setPatronEmail(e.target.value)} 
            className="pl-10 h-12 border-2 border-white rounded-xl font-bold focus-visible:ring-primary bg-white shadow-sm"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Full Name" 
              value={patronName} 
              onChange={(e) => setPatronName(e.target.value)} 
              className="pl-10 h-12 border-2 border-white rounded-xl font-bold focus-visible:ring-primary bg-white shadow-sm"
            />
          </div>
          <div className="relative">
            <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Mobile Number" 
              type="tel"
              value={patronPhone} 
              onChange={(e) => setPatronPhone(e.target.value)} 
              className="pl-10 h-12 border-2 border-white rounded-xl font-bold focus-visible:ring-primary bg-white shadow-sm"
            />
          </div>
        </div>
        
        <div 
          className="flex items-center space-x-3 p-3 bg-primary/5 rounded-xl border-2 border-primary/10 cursor-pointer transition-all hover:bg-primary/10"
          onClick={() => setSaveInfo(!saveInfo)}
        >
          <Checkbox id="save-info" checked={saveInfo} onCheckedChange={(val) => setSaveInfo(!!val)} className="h-5 w-5 data-[state=checked]:bg-primary" />
          <div className="text-left">
            <label htmlFor="save-info" className="text-[10px] font-black uppercase text-[#213147] cursor-pointer block leading-none">Save for faster checkout</label>
            <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Securely store details for your next visit</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StripeActionArea({ 
  clientSecret, 
  customerSessionClientSecret,
  isProcessing, 
  setIsProcessing, 
  onOrderComplete,
  orderData,
  patronEmail,
  patronName,
  patronPhone,
  stripeCustomerId,
  idFields
}: any) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isStripeReady, setIsStripeReady] = useState(false);

  const handleStripePayment = async () => {
    if (!stripe || !elements || !clientSecret || !firestore) return;
    
    // Validate Identification First
    const isContactValid = patronName.length >= 2 && patronPhone.replace(/\D/g, '').length >= 10 && patronEmail.includes('@');
    if (!isContactValid) {
      toast({ variant: 'destructive', title: 'Details Required', description: 'Please complete your contact info to receive tracking updates.' });
      return;
    }

    setIsProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order/track`,
          payment_method_data: {
            billing_details: {
              name: patronName,
              email: patronEmail,
              phone: patronPhone
            }
          }
        },
        redirect: 'if_required',
      });

      if (error) throw new Error(error.message);

      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        // CACHE IDENTITY FOR ZERO-FRICTION CHECKOUT
        if (stripeCustomerId) {
          localStorage.setItem('koop_stripe_customer_id', stripeCustomerId);
        }

        const finalOrderData = {
          ...orderData,
          customerEmail: patronEmail,
          customerName: patronName,
          customerPhone: patronPhone.replace(/\D/g, ''),
          paymentStatus: paymentIntent.status === 'succeeded' ? 'Succeeded' : 'Processing',
          stripePaymentIntentId: paymentIntent.id,
        };
        const ordersCol = collection(firestore, 'orders');
        addDoc(ordersCol, finalOrderData).then((orderRef) => {
          onOrderComplete(orderRef.id);
        }).catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: ordersCol.path,
            operation: 'create',
            requestResourceData: finalOrderData,
          } satisfies SecurityRuleContext));
          setIsProcessing(false);
        });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Payment Denied', description: e.message });
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {idFields}
      
      <div className="p-4 border-2 border-slate-100 rounded-[2rem] bg-slate-50/50 animate-in fade-in duration-500">
        <StripeCheckoutForm onReadyStateChange={setIsStripeReady} />
      </div>

      <div className="fixed bottom-7 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-50">
        <div className="max-w-xl mx-auto px-2">
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
  solutionFee, 
  taxRate,
  onOrderComplete
}: any) {
  const { firebaseApp } = useFirebase();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [patronEmail, setPatronEmail] = useState('');
  const [patronName, setPatronName] = useState('');
  const [patronPhone, setPatronPhone] = useState('');
  const [saveInfo, setSaveInfo] = useState(false); 
  const [tip, setTip] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Pay at Delivery' | 'Stripe' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerSessionClientSecret, setCustomerSessionClientSecret] = useState<string | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [isFetchingIntent, setIsFetchingIntent] = useState(false);

  const tax = subtotal * (taxRate / 100);
  const finalTotal = subtotal + solutionFee + tax + tip;
  const baseTotalForBackend = subtotal + tax + tip;

  const disclosureCategory = getDisclosureCategory(seller?.type);
  const checkoutNotice = FEE_DISCLOSURES[disclosureCategory].checkout;

  // LOAD CACHED IDENTITY
  useEffect(() => {
    const cachedId = localStorage.getItem('koop_stripe_customer_id');
    if (cachedId) setStripeCustomerId(cachedId);
  }, []);

  useEffect(() => {
    if (paymentMethod === 'Stripe' && !isFetchingIntent && baseTotalForBackend > 0 && !clientSecret) {
      const fetchIntent = async () => {
        setIsFetchingIntent(true);
        try {
          let currentUser = user;
          if (!currentUser && auth) {
            const result = await signInAnonymously(auth);
            currentUser = result.user;
          }
          if (!currentUser) throw new Error("Anonymous session failed.");
          
          const functions = getFunctions(firebaseApp, 'us-central1');
          const createIntent = httpsCallable(functions, 'createPaymentIntent');
          
          const result = await createIntent({ 
            amount: baseTotalForBackend, 
            sellerId,
            patronName: patronName || 'Guest',
            patronPhone: patronPhone.replace(/\D/g, '') || '',
            patronEmail: patronEmail || '',
            saveInfo,
            stripeCustomerId // PASSED FOR ZERO-FRICTION FETCH
          });
          
          const data = result.data as { clientSecret: string; customerSessionClientSecret?: string; stripeCustomerId?: string };
          if (data?.clientSecret) {
            setClientSecret(data.clientSecret);
            if (data.customerSessionClientSecret) {
              setCustomerSessionClientSecret(data.customerSessionClientSecret);
            }
            if (data.stripeCustomerId) {
              setStripeCustomerId(data.stripeCustomerId);
            }
          }
        } catch (e: any) {
          console.error("Payment Intent Error:", e);
          toast({ variant: 'destructive', title: 'Gateway Error', description: "Digital checkout unavailable. Please use Pay at Delivery." });
          setPaymentMethod('Pay at Delivery');
        } finally {
          setIsFetchingIntent(false);
        }
      };
      fetchIntent();
    }
  }, [paymentMethod, baseTotalForBackend, sellerId, firebaseApp, clientSecret, isFetchingIntent, toast, user, auth, saveInfo, patronEmail, patronName, patronPhone, stripeCustomerId]);

  const handleManualOrder = async () => {
    if (!firestore || activeOrderItems.length === 0) return;
    const isContactValid = patronName.length >= 2 && patronPhone.replace(/\D/g, '').length >= 10 && patronEmail.includes('@');
    if (!isContactValid) {
      toast({ variant: 'destructive', title: 'Details Required', description: 'Please complete your contact info to receive tracking updates.' });
      return;
    }
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
        customerEmail: patronEmail,
        customerName: patronName || 'Guest Patron',
        customerPhone: patronPhone.replace(/\D/g, ''),
        deliveryLocation: mockBuyerLocation,
        items: activeOrderItems,
        subtotal,
        serviceFee: solutionFee,
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
      const ordersCol = collection(firestore, 'orders');
      addDoc(ordersCol, orderData).then((orderRef) => {
        onOrderComplete(orderRef.id);
      }).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: ordersCol.path,
          operation: 'create',
          requestResourceData: orderData,
        } satisfies SecurityRuleContext));
        setIsProcessing(false);
      });
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
      deliveryLocation: mockBuyerLocation,
      items: activeOrderItems,
      subtotal,
      serviceFee: solutionFee,
      tax,
      tip,
      total: finalTotal,
      status: 'Placed',
      paymentMethod: 'Stripe',
      menuType: selectedMenuType,
      menuTypeLocation: locationValue || null,
      createdAt: serverTimestamp(),
    };
  }, [user, sellerId, activeOrderItems, subtotal, solutionFee, tax, tip, finalTotal, selectedMenuType, locationValue]);

  const idForm = (
    <PatronIdentifyFields 
      patronEmail={patronEmail} setPatronEmail={setPatronEmail}
      patronName={patronName} setPatronName={setPatronName}
      patronPhone={patronPhone} setPatronPhone={setPatronPhone}
      saveInfo={saveInfo} setSaveInfo={setSaveInfo}
    />
  );

  return (
    <ScrollArea className="flex-1 w-full overflow-x-hidden">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-10 pb-32">
        <div className="flex justify-start -mb-6">
          <SheetClose asChild>
            <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-primary h-8 gap-1.5 p-0 hover:bg-transparent hover:text-primary/80">
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Menu
            </Button>
          </SheetClose>
        </div>

        <OrderSummary 
          items={activeOrderItems} 
          onUpdateItem={() => {}} 
          onRemoveItem={() => {}}
        />
        
        {selectedMenuType === 'Lane Delivery' && seller?.laneCount && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">STATION / LANE</h3>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: seller.laneCount }, (_, i) => (i + 1).toString()).map(l => (
                <Button key={l} variant={locationValue === `Lane ${l}` ? 'default' : 'outline'} size="sm" onClick={() => setLocationValue(`Lane ${l}`)} className="font-black h-11 px-0 rounded-xl">
                  {l}
                </Button>
              ))}
            </div>
          </div>
        )}

        <TipSelector subtotal={subtotal} onTipChange={setTip} />

        <div className="space-y-4">
          <PricingBreakdown subtotal={subtotal} serviceFee={solutionFee} tax={tax} tip={tip} taxRate={taxRate} />
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-center px-4 leading-relaxed opacity-60">
            {checkoutNotice}
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">PAYMENT METHOD</h3>
          <RadioGroup value={paymentMethod || ''} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-1 gap-3">
            <div className={cn("flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer", paymentMethod === 'Stripe' ? "border-primary bg-primary/5 shadow-md" : "border-slate-100 hover:border-slate-200")} onClick={() => setPaymentMethod('Stripe')}>
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-lg", paymentMethod === 'Stripe' ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}><CreditCard className="h-5 w-5" /></div>
                <div className="text-left"><p className="text-xs font-black uppercase tracking-tight text-[#213147]">Digital Checkout</p><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">SECURE CARD PAYMENT</p></div>
              </div>
              {paymentMethod === 'Stripe' && <Check className="h-4 w-4 text-primary" />}
            </div>
            <div className={cn("flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer opacity-60", paymentMethod === 'Pay at Delivery' ? "border-primary bg-primary/5" : "border-slate-100")} onClick={() => setPaymentMethod('Pay at Delivery')}>
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-lg", paymentMethod === 'Pay at Delivery' ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}><Banknote className="h-5 w-5" /></div>
                <div className="text-left"><p className="text-xs font-black uppercase tracking-tight text-[#213147]">Pay at Delivery</p><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">CHECKOUT ON ARRIVAL</p></div>
              </div>
              {paymentMethod === 'Pay at Delivery' && <Check className="h-4 w-4 text-primary" />}
            </div>
          </RadioGroup>

          {paymentMethod === 'Stripe' && (
            isFetchingIntent ? (
              <div className="flex flex-col items-center gap-4 py-20 animate-in fade-in duration-300">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Initializing Secure Checkout...</p>
              </div>
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret, customerSessionClientSecret: customerSessionClientSecret || undefined }}>
                <StripeActionArea 
                  clientSecret={clientSecret} 
                  customerSessionClientSecret={customerSessionClientSecret}
                  isProcessing={isProcessing} 
                  setIsProcessing={setIsProcessing} 
                  onOrderComplete={onOrderComplete} 
                  orderData={currentOrderData}
                  patronEmail={patronEmail}
                  patronName={patronName}
                  patronPhone={patronPhone}
                  stripeCustomerId={stripeCustomerId}
                  idFields={idForm}
                />
              </Elements>
            ) : null
          )}

          {paymentMethod === 'Pay at Delivery' && (
            <div className="space-y-6">
              {idForm}
              
              <div className="fixed bottom-7 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-50">
                <div className="max-w-xl mx-auto px-2">
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
              </div>
              <CheckoutBrandingBar />
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { orderItems, updateItem, isCartOpen, setIsCartOpen, clearCart, totalItems, total } = useCart();
  
  const menuTypeFromUrl = searchParams.get('menuType');
  const selectedMenuType = menuTypeFromUrl || '';
  const [locationValue, setLocationValue] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('Featured');
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: solutionConfig, isLoading: isConfigLoading } = useDoc<SolutionConfig>(configRef);

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const venueRef = useMemoFirebase(() => (firestore ? doc(firestore, 'venues', sellerId) : null), [firestore, sellerId]);
  const { data: venue, isLoading: isVenueLoading } = useDoc<Venue>(venueRef);

  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'staff') : null), [firestore, sellerId]);
  const { data: staffList } = useCollection<StaffMember>(staffQuery);

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
    if (!seller) return false;
    
    // Check Global Koop Auth
    const isGloballyAuthorized = !solutionConfig || (solutionConfig.enabledModes?.includes(type) ?? true);
    if (!isGloballyAuthorized) return false;
    
    // Check Venue Admin Toggles
    const isVenueAuthorized = seller.menuTypes.includes(type);
    if (!isVenueAuthorized) return false;
    
    let isChannelOpen = true;
    switch(type) {
      case 'Beverage Cart': isChannelOpen = !!seller.bevcartActive; break;
      case 'Clubhouse': isChannelOpen = !!seller.clubhouseActive; break;
      case 'Lane Delivery': isChannelOpen = !!seller.lanedeliveryActive; break;
    }
    if (!isChannelOpen) return false;

    // RESTRICTION: Check for at least one active staff heartbeat in this mode
    const activeStaff = staffList?.filter(s => {
      if (!s.lastActive || s.activeMode !== type) return false;
      const secondsSinceActive = (Date.now() - s.lastActive.toMillis()) / 1000;
      return secondsSinceActive < 300; // Heartbeat valid if updated in last 5 mins
    });

    return (activeStaff && activeStaff.length > 0) || false;
  };

  useEffect(() => {
    if (!menuTypeFromUrl && seller && !isSellerLoading && staffList) {
      let defaultType = seller.type.toLowerCase().includes('bowling') ? 'Lane Delivery' : 'Beverage Cart';
      if (isModeAvailable(defaultType)) updateMenuType(defaultType);
      else {
        const firstAvailable = seller.menuTypes.filter(t => t !== 'Take Out').find(t => isModeAvailable(t));
        if (firstAvailable) updateMenuType(firstAvailable);
      }
    }
  }, [seller, solutionConfig, menuTypeFromUrl, isSellerLoading, staffList]);

  useEffect(() => {
    const options = { root: null, rootMargin: '-160px 0px -50% 0px', threshold: 0 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const catId = entry.target.id;
          const catName = currentCategories.find(c => c.toLowerCase().replace(/\s+/g, '-') === catId);
          if (catName) setActiveCategory(catName);
        }
      });
    }, options);
    document.querySelectorAll('section[id]').forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [seller, menuItems, selectedMenuType]);

  const activeOrderItems = useMemo(() => orderItems.filter((item) => item.quantity > 0), [orderItems]);
  const subtotal = useMemo(() => activeOrderItems.reduce((acc, item) => {
    const modsPrice = item.selectedModifiers ? Object.values(item.selectedModifiers).flat().reduce((s, m) => s + m.priceAdjustment, 0) : 0;
    return acc + (item.price + modsPrice) * item.quantity;
  }, 0), [activeOrderItems]);
  
  const taxRate = seller?.taxRate ?? 6.0;
  const solutionFee = useMemo(() => {
    if (venue?.patronConvenienceFee !== undefined) return venue.patronConvenienceFee / 100;
    if (!seller) return 0;
    return (selectedMenuType && seller.serviceFees?.[selectedMenuType]) || seller.serviceFee || 0;
  }, [seller, venue, selectedMenuType]);

  const disclosureCategory = getDisclosureCategory(seller?.type);
  const menuNotice = FEE_DISCLOSURES[disclosureCategory].menu;

  const filteredMenuItems = useMemo(() => {
    if (!menuItems || !selectedMenuType) return [];
    return menuItems.filter(item => item.isAvailable !== false && (item.availableOn?.includes(selectedMenuType) || item.featuredOn?.includes(selectedMenuType)));
  }, [menuItems, selectedMenuType]);

  const currentCategories = useMemo(() => {
    if (!seller || !filteredMenuItems.length) return [];
    const hasExplicitFeatured = filteredMenuItems.some(i => i.featuredOn?.includes(selectedMenuType));
    const visibleCategories = categories.filter(c => {
      if (c === 'Featured') return hasExplicitFeatured;
      const hasItemsInCat = filteredMenuItems.some(i => i.category === c && i.availableOn?.includes(selectedMenuType));
      return hasItemsInCat && (seller.categoryVisibility?.[selectedMenuType]?.includes(c) ?? true);
    });
    return visibleCategories.sort((a, b) => (a === 'Featured' ? -1 : (b === 'Featured' ? 1 : 0)));
  }, [seller, filteredMenuItems, selectedMenuType]);

  const handleOrderComplete = (orderId: string) => {
    router.push(`/order/track?id=${orderId}&sellerId=${sellerId}`);
    clearCart();
  };

  const scrollToCategory = (category: string) => {
    const element = document.getElementById(category.toLowerCase().replace(/\s+/g, '-'));
    if (element) {
      const offset = 160; 
      const elementPosition = element.getBoundingClientRect().top - document.body.getBoundingClientRect().top;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
      setActiveCategory(category);
    }
  };

  const handleConfirmModifiers = (orderItem: OrderItem) => {
    updateItem(orderItem);
    setCustomizingItem(null);
  };

  const isLoading = isSellerLoading || areItemsLoading || isVenueLoading || (isConfigLoading && !solutionConfig);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Initializing Menu...</p>
      </div>
    );
  }

  const authorizedModes = seller?.menuTypes?.filter(t => t !== 'Take Out') || [];
  const availableModes = authorizedModes.filter(t => isModeAvailable(t));

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F0F0] overflow-x-auto">
      <header className="relative w-full min-h-[22vh] flex flex-col bg-[#213147] overflow-hidden shrink-0 pt-8 pb-8 px-6 text-left">
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border-[30px] border-white" />
        </div>
        <div className="relative z-10 flex flex-col items-start text-left space-y-6 max-w-2xl w-full mx-auto">
          <div className="space-y-4 w-full">
            <h1 className="font-headline text-2xl font-black text-white uppercase tracking-tight leading-none mb-1">{seller?.courseName}</h1>
            <div className="flex wrap gap-2">
              {authorizedModes.map((type) => {
                const Icon = serviceTypeIcons[type] || Store;
                const available = availableModes.includes(type);
                const isSelected = selectedMenuType === type;
                return (
                  <button key={type} disabled={!available} onClick={() => updateMenuType(type)} className={cn("flex items-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg", isSelected ? "bg-primary text-white scale-105" : (available ? "bg-white/10 text-white hover:bg-white/20" : "bg-white/5 text-white/20 grayscale cursor-not-allowed border border-white/5"))}>
                    <Icon className="h-3.5 w-3.5" /> {type}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white flex items-center gap-1.5">
              <Info className="h-2.5 w-2.5 shrink-0 text-primary" /> 
              {availableModes.includes(selectedMenuType) ? (SERVICE_INSTRUCTIONS[selectedMenuType] || 'Select items to begin your order') : 'Service currently unavailable.'}
            </p>
            <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/40 pl-4">
              {menuNotice}
            </p>
          </div>
        </div>
      </header>

      {availableModes.includes(selectedMenuType) ? (
        <>
          <div className="sticky top-16 z-[35] bg-white/95 backdrop-blur-md border-b-2 shadow-sm w-full">
            <div className="max-w-2xl mx-auto px-4 py-3">
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {currentCategories.map((cat) => (
                  <button 
                    key={cat} 
                    onClick={() => scrollToCategory(cat)} 
                    className={cn(
                      "whitespace-nowrap px-4 py-1.5 rounded-full border-2 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95", 
                      activeCategory === cat 
                        ? (cat === 'Featured' ? "bg-[#213147] border-[#213147] text-white shadow-md scale-105" : "bg-primary border-primary text-white shadow-md scale-105") 
                        : (cat === 'Featured' ? "bg-[#213147]/5 border-[#213147]/20 text-[#213147] hover:bg-[#213147]/10" : "bg-slate-50 border-slate-100 text-slate-500 hover:border-primary/30 hover:text-primary")
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <main className="flex-1 px-4 pt-8 pb-32 max-w-2xl mx-auto w-full">
            <BuyerMenu 
              orderItems={orderItems} 
              onUpdateItem={updateItem} 
              onOpenModifiers={setCustomizingItem} 
              currentCategories={currentCategories} 
              menuItems={filteredMenuItems} 
              selectedMenuType={selectedMenuType} 
            />
          </main>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-slate-100 max-w-sm">
            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-6" />
            <h2 className="font-headline font-black text-2xl uppercase tracking-tight text-[#213147] mb-3">Service Offline</h2>
            <p className="text-muted-foreground text-sm font-medium leading-relaxed">
              We don't have any staff active for {selectedMenuType || 'this channel'} at the moment. Please select another mode or check back soon.
            </p>
          </div>
          <Button variant="outline" className="font-black uppercase text-[10px] tracking-widest border-2 h-12 px-8 rounded-full" onClick={() => router.push('/')}>
            Return to Home
          </Button>
        </div>
      )}

      <Sheet open={!!customizingItem} onOpenChange={(o) => !o && setCustomizingItem(null)}>
        <SheetContent side="bottom" className="rounded-t-[2.5rem] h-[90vh] flex flex-col p-0 overflow-hidden outline-none">
          <SheetHeader className="px-6 py-5 border-b bg-[#213147] text-white shrink-0 text-left">
            <div className="max-w-xl mx-auto w-full flex flex-col items-start relative pr-10">
              <SheetTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Customize Item</SheetTitle>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">{customizingItem?.name}</p>
              <SheetClose className="absolute right-0 top-0 text-white/40 hover:text-white"><X className="h-6 w-6" /></SheetClose>
            </div>
          </SheetHeader>
          {customizingItem && (
            <ModifierSelector 
              item={customizingItem} 
              onConfirm={handleConfirmModifiers} 
              onCancel={() => setCustomizingItem(null)} 
            />
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        {totalItems > 0 && !customizingItem && (
          <div className="fixed bottom-7 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-40">
            <div className="max-w-xl mx-auto px-2">
              <SheetTrigger asChild>
                <Button size="lg" className="w-full h-14 font-black uppercase tracking-widest shadow-xl flex justify-between px-6 sm:px-8">
                  <div className="flex items-center gap-2 sm:gap-3"><span>REVIEW ORDER</span><span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full">{totalItems} ITEMS</span></div>
                  <span className="bg-white/20 px-3 py-1 rounded-lg">${total.toFixed(2)}</span>
                </Button>
              </SheetTrigger>
            </div>
          </div>
        )}
        <SheetContent side="bottom" className="rounded-t-[2.5rem] h-[90vh] flex flex-col p-0 overflow-hidden outline-none">
          <SheetHeader className="px-6 py-5 border-b bg-[#213147] text-white shrink-0 text-left">
            <div className="max-w-xl mx-auto w-full flex flex-col items-start pr-10 relative">
              <div className="flex items-center gap-3 mb-1"><SheetTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Checkout</SheetTitle><Badge variant="outline" className="text-[9px] font-black border-primary/40 bg-primary/10 text-primary uppercase h-5">{selectedMenuType}</Badge></div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">{seller?.courseName}</p>
              <SheetClose className="absolute right-0 top-1 text-white/40 hover:text-white"><X className="h-6 w-6" /></SheetClose>
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
            solutionFee={solutionFee}
            taxRate={taxRate}
            onOrderComplete={handleOrderComplete}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
