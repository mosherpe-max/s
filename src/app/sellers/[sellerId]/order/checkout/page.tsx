'use client';

import { use, useState, useEffect, useMemo, Suspense } from 'react';
import { collection, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useFirestore, useFirebase, useAuth, useUser, useDoc, useMemoFirebase } from '@/firebase';
import type { Seller, Venue, PaymentMethodType } from '@/lib/types';
import { useCart } from '@/lib/cart-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PatronIdentifyFields } from '@/components/patron-identify-fields';
import { StripeActionArea } from '@/components/stripe-action-area';
import { StripeCheckoutForm } from '@/components/stripe-checkout-form';
import { CheckoutBrandingBar } from '@/components/checkout-branding-bar';
import { Loader2, ChevronLeft, CreditCard, Banknote, UserCircle, Check, ShoppingBag, Lock, ArrowLeft } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { cn } from '@/lib/utils';
import { mockBuyerLocation } from '@/lib/data';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Link from 'next/link';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

const LOCATION_TRACKING_NOTE: Partial<Record<string, string>> = {
  'Beverage Cart': "Please allow location access — it helps our cart driver find you faster on the course.",
  'Clubhouse': "Please allow location access — it helps our staff find you faster on the course.",
};

function CheckoutContent({ sellerId }: { sellerId: string }) {
  const { firebaseApp } = useFirebase();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orderItems, tip, clearCart } = useCart();

  const menuTypeFromUrl = searchParams.get('menuType') || '';
  const keyParam = searchParams.get('key');
  const menuUrl = `/sellers/${sellerId}/order?${searchParams.toString()}`;
  const reviewUrl = `/sellers/${sellerId}/order/review?${searchParams.toString()}`;

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const venueRef = useMemoFirebase(() => (firestore ? doc(firestore, 'venues', sellerId) : null), [firestore, sellerId]);
  const { data: venue, isLoading: isVenueLoading } = useDoc<Venue>(venueRef);

  const isAccessValid = useMemo(() => {
    if (!seller || isSellerLoading) return true;
    if (sellerId.startsWith('demo-')) return true;
    if (!seller.qrSecret) return true;
    if (seller.qrActive === false) return false;
    return seller.qrSecret === keyParam;
  }, [seller, isSellerLoading, keyParam, sellerId]);

  const [locationValue, setLocationValue] = useState('');
  const [patronEmail, setPatronEmail] = useState('');
  const [patronName, setPatronName] = useState('');
  const [patronPhone, setPatronPhone] = useState('');
  const [saveInfo, setSaveInfo] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStripeReady, setIsStripeReady] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [isFetchingIntent, setIsFetchingIntent] = useState(false);
  const [orderJustPlaced, setOrderJustPlaced] = useState(false);

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
  const finalTotal = subtotal + solutionFee + tax + tip;
  const baseTotalForBackend = subtotal + tax + tip;

  const isContactValid = patronName.length >= 2 && patronPhone.replace(/\D/g, '').length >= 10 && patronEmail.includes('@');
  const isLocationValid = menuTypeFromUrl !== 'Lane Delivery' || !!locationValue;
  const isFormValid = isContactValid && isLocationValid && !!paymentMethod;

  const availableMethods = useMemo<PaymentMethodType[]>(() => {
    return seller?.enabledPaymentMethods || ['Digital Payment', 'Pay at Delivery'];
  }, [seller]);

  useEffect(() => {
    if (availableMethods.length > 0 && !paymentMethod) {
      setPaymentMethod(availableMethods[0]);
    }
  }, [availableMethods, paymentMethod]);

  useEffect(() => {
    const cachedName = localStorage.getItem('koop_patron_name');
    const cachedEmail = localStorage.getItem('koop_patron_email');
    const cachedPhone = localStorage.getItem('koop_patron_phone');
    const cachedCustomerId = localStorage.getItem('koop_stripe_customer_id');

    if (cachedName) setPatronName(cachedName);
    if (cachedEmail) setPatronEmail(cachedEmail);
    if (cachedPhone) setPatronPhone(cachedPhone);
    if (cachedCustomerId) setStripeCustomerId(cachedCustomerId);

    if (cachedName || cachedEmail || cachedPhone || cachedCustomerId) {
      setSaveInfo(true);
    }
  }, []);

  useEffect(() => {
    if (paymentMethod === 'Digital Payment' && !isFetchingIntent && baseTotalForBackend > 0) {
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

          // A callable's own deadline can be as long as 70s of silent
          // spinning with zero feedback - race it against a much shorter
          // timeout so a hung/unreachable gateway fails fast and visibly
          // instead of leaving the "Initializing Secure Checkout" spinner
          // running indefinitely.
          const result: any = await Promise.race([
            createIntent({
              amount: baseTotalForBackend,
              convenienceFee: solutionFee,
              sellerId,
              patronName: patronName || 'Guest',
              patronPhone: patronPhone.replace(/\D/g, '') || '',
              patronEmail: patronEmail || '',
              saveInfo,
              stripeCustomerId
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Payment gateway timed out.')), 20000))
          ]);

          const data = result.data as { clientSecret: string; stripeCustomerId?: string };
          if (data?.clientSecret) {
            setClientSecret(data.clientSecret);
            if (data.stripeCustomerId) setStripeCustomerId(data.stripeCustomerId);
          }
        } catch (e: any) {
          console.error("Payment Intent Error:", e);
          toast({ variant: 'destructive', title: 'Gateway Error', description: "Digital checkout unavailable." });
          setPaymentMethod('Pay at Delivery');
        } finally {
          setIsFetchingIntent(false);
        }
      };
      fetchIntent();
    }
  }, [paymentMethod, baseTotalForBackend, sellerId, firebaseApp, user, auth]);

  const handleManualOrder = async () => {
    if (!firestore || activeOrderItems.length === 0) return;
    if (!isFormValid) {
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

      if (saveInfo) {
        localStorage.setItem('koop_patron_name', patronName);
        localStorage.setItem('koop_patron_email', patronEmail);
        localStorage.setItem('koop_patron_phone', patronPhone);
      }

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
        paymentMethod: paymentMethod,
        paymentStatus: 'Pending',
        menuType: menuTypeFromUrl,
        menuTypeLocation: locationValue || null,
        createdAt: serverTimestamp(),
      };
      const ordersCol = collection(firestore, 'orders');
      addDoc(ordersCol, orderData).then((orderRef) => {
        handleOrderComplete(orderRef.id);
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
      paymentMethod: 'Digital Payment',
      menuType: menuTypeFromUrl,
      menuTypeLocation: locationValue || null,
      createdAt: serverTimestamp(),
    };
  }, [user, sellerId, activeOrderItems, subtotal, solutionFee, tax, tip, finalTotal, menuTypeFromUrl, locationValue]);

  const handleOrderComplete = (orderId: string) => {
    // Set before clearCart() so the empty-cart guard below doesn't see the
    // now-empty cart and redirect to the menu, racing the push to /order/track.
    setOrderJustPlaced(true);
    router.push(`/order/track?id=${orderId}&sellerId=${sellerId}`);
    clearCart();
  };

  // Nothing to check out without items or a menu context - send back to the menu.
  useEffect(() => {
    if (!orderJustPlaced && !isSellerLoading && (activeOrderItems.length === 0 || !menuTypeFromUrl)) {
      router.replace(menuUrl);
    }
  }, [orderJustPlaced, isSellerLoading, activeOrderItems.length, menuTypeFromUrl, menuUrl, router]);

  const isLoading = isSellerLoading || isVenueLoading;

  if (isLoading || activeOrderItems.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  if (!isAccessValid) {
    return (
      <div className="flex flex-col min-h-screen bg-[#213147] items-center justify-center p-8 text-center text-white">
        <div className="bg-red-500/10 p-10 rounded-[3rem] border-2 border-red-500/20 shadow-2xl mb-8 animate-in zoom-in-95 duration-500">
          <Lock className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h2 className="font-headline font-black text-2xl uppercase tracking-tight mb-3">Secure Access Required</h2>
          <p className="text-white/60 text-sm font-medium leading-relaxed max-w-xs mx-auto">
            This QR code link is either expired or invalid. Please scan the official Koop signage at your location.
          </p>
        </div>
        <Button variant="ghost" asChild className="text-white/40 hover:text-white uppercase text-[10px] font-black tracking-widest gap-2">
          <Link href="/"><ArrowLeft className="h-3 w-3" /> Return to Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F0F0]">
      <header className="shrink-0 bg-[#213147] px-4 py-3 flex items-center gap-3 shadow-md border-b-2 border-[#E50000] sticky top-0 z-40">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 shrink-0 h-9 w-9"
          onClick={() => router.push(reviewUrl)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="font-headline font-black uppercase tracking-tight text-white text-sm leading-tight truncate">Checkout</h1>
          <p className="text-[9px] font-bold text-white/50 uppercase tracking-[0.2em] truncate">{seller?.courseName}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[8px] font-black text-white/40 uppercase tracking-widest leading-none">Total</p>
          <p className="font-mono font-black text-white text-sm">${finalTotal.toFixed(2)}</p>
        </div>
      </header>

      <ScrollArea className="flex-1 w-full overflow-x-hidden">
        <div className="max-w-xl mx-auto px-4 py-4 space-y-4 pb-28">
          {menuTypeFromUrl === 'Lane Delivery' && seller?.laneCount && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">STATION / LANE</h3>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: seller.laneCount }, (_, i) => (i + 1).toString()).map(l => (
                  <Button key={l} variant={locationValue === `Lane ${l}` ? 'default' : 'outline'} size="sm" onClick={() => setLocationValue(`Lane ${l}`)} className="font-black h-10 px-0 rounded-xl">
                    {l}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {paymentMethod !== 'Digital Payment' && (
            <PatronIdentifyFields
              patronEmail={patronEmail} setPatronEmail={setPatronEmail}
              patronName={patronName} setPatronName={setPatronName}
              patronPhone={patronPhone} setPatronPhone={setPatronPhone}
            />
          )}

          {LOCATION_TRACKING_NOTE[menuTypeFromUrl] && (
            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center px-4 leading-relaxed opacity-60">
              {LOCATION_TRACKING_NOTE[menuTypeFromUrl]}
            </p>
          )}

          <div className="space-y-2">
            {availableMethods.length > 1 && (
              new Set(availableMethods).size === 2 && availableMethods.includes('Digital Payment') && availableMethods.includes('Pay at Delivery') ? (
                // Prototyping-only affordance: at launch a venue's
                // enabledPaymentMethods will just be ['Digital Payment'] and
                // this whole selector disappears (availableMethods.length
                // becomes 1). Until then, Digital Payment is still the
                // default/primary flow - this checkbox exists purely so the
                // venue admin can flip to Pay at Delivery for their own
                // testing without a customer-facing "pick a method" choice.
                <div className="flex items-center gap-3 px-1 py-1" onClick={() => { const next = paymentMethod === 'Pay at Delivery' ? 'Digital Payment' : 'Pay at Delivery'; setPaymentMethod(next); setClientSecret(null); }}>
                  <Checkbox id="test-pay-at-delivery" checked={paymentMethod === 'Pay at Delivery'} className="shrink-0" />
                  <label htmlFor="test-pay-at-delivery" className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest cursor-pointer">
                    Testing: Use Pay at Delivery instead of card
                  </label>
                </div>
              ) : (
              <>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">PAYMENT METHOD</h3>
                <RadioGroup value={paymentMethod || ''} onValueChange={(v: any) => { setPaymentMethod(v); setClientSecret(null); }} className="grid grid-cols-1 gap-2">
                  {availableMethods.includes('Digital Payment') && (
                    <div className={cn("flex items-center justify-between p-2.5 rounded-xl border-2 transition-all cursor-pointer", paymentMethod === 'Digital Payment' ? "border-primary bg-primary/5 shadow-md" : "border-slate-100 hover:border-slate-200")} onClick={() => setPaymentMethod('Digital Payment')}>
                      <div className="flex items-center gap-3">
                        <div className={cn("p-1.5 rounded-lg", paymentMethod === 'Digital Payment' ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}><CreditCard className="h-4 w-4" /></div>
                        <p className="text-xs font-black uppercase tracking-tight text-[#213147]">Digital Checkout</p>
                      </div>
                      {paymentMethod === 'Digital Payment' && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  )}

                  {availableMethods.includes('Pay at Delivery') && (
                    <div className={cn("flex items-center justify-between p-2.5 rounded-xl border-2 transition-all cursor-pointer", paymentMethod === 'Pay at Delivery' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200")} onClick={() => setPaymentMethod('Pay at Delivery')}>
                      <div className="flex items-center gap-3">
                        <div className={cn("p-1.5 rounded-lg", paymentMethod === 'Pay at Delivery' ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}><Banknote className="h-4 w-4" /></div>
                        <p className="text-xs font-black uppercase tracking-tight text-[#213147]">Pay at Delivery</p>
                      </div>
                      {paymentMethod === 'Pay at Delivery' && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  )}

                  {availableMethods.includes('Member Account') && (
                    <div className={cn("flex items-center justify-between p-2.5 rounded-xl border-2 transition-all cursor-pointer", paymentMethod === 'Member Account' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200")} onClick={() => setPaymentMethod('Member Account')}>
                      <div className="flex items-center gap-3">
                        <div className={cn("p-1.5 rounded-lg", paymentMethod === 'Member Account' ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}><UserCircle className="h-4 w-4" /></div>
                        <p className="text-xs font-black uppercase tracking-tight text-[#213147]">Member Account</p>
                      </div>
                      {paymentMethod === 'Member Account' && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  )}
                </RadioGroup>
              </>
              )
            )}

            {paymentMethod === 'Digital Payment' && (
              isFetchingIntent || !clientSecret ? (
                // One shared card for contact info + payment - Koop's own
                // fields and Stripe's card fields read as one form, not two
                // stacked ones, and this data already flows to both: it's
                // saved on the order doc and passed to Stripe as the
                // PaymentMethod's billing_details in stripe-action-area.tsx.
                <div className="p-3 border-2 border-slate-100 rounded-2xl bg-slate-50/50 animate-in fade-in duration-500 space-y-3">
                  <PatronIdentifyFields
                    bare
                    patronEmail={patronEmail} setPatronEmail={setPatronEmail}
                    patronName={patronName} setPatronName={setPatronName}
                    patronPhone={patronPhone} setPatronPhone={setPatronPhone}
                  />
                  <div className="border-t-2 border-white" />
                  <div className="flex flex-col items-center gap-4 py-16 animate-in fade-in duration-300">
                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Initializing Secure Checkout...</p>
                  </div>
                </div>
              ) : (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    // Confirmed live: the Payment Element never rendered
                    // (onReady never fired) with a Customer Session attached,
                    // even with a fully valid clientSecret, correct key
                    // pairing, and a real resolved payment method - dropping
                    // it fixed checkout. Its only purpose was showing
                    // previously-saved cards/Link in the form; saving a new
                    // card via setup_future_usage in stripe-action-area.tsx
                    // is unrelated and unaffected. Revisit only alongside
                    // confirming the account-level setup Customer Sessions
                    // needs, since that's the likely reason it hung.
                    defaultValues: {
                      billingDetails: {
                        name: patronName,
                        email: patronEmail,
                        phone: patronPhone
                      }
                    }
                  }}
                >
                  <div className="p-3 border-2 border-slate-100 rounded-2xl bg-slate-50/50 animate-in fade-in duration-500 space-y-3">
                    <PatronIdentifyFields
                      bare
                      patronEmail={patronEmail} setPatronEmail={setPatronEmail}
                      patronName={patronName} setPatronName={setPatronName}
                      patronPhone={patronPhone} setPatronPhone={setPatronPhone}
                    />
                    <div className="border-t-2 border-white" />
                    <StripeCheckoutForm onReadyStateChange={setIsStripeReady} clientSecret={clientSecret} />
                  </div>
                  <StripeActionArea
                    clientSecret={clientSecret}
                    isProcessing={isProcessing}
                    setIsProcessing={setIsProcessing}
                    onOrderComplete={handleOrderComplete}
                    orderData={currentOrderData}
                    patronEmail={patronEmail}
                    patronName={patronName}
                    patronPhone={patronPhone}
                    stripeCustomerId={stripeCustomerId}
                    saveInfo={saveInfo}
                    setSaveInfo={setSaveInfo}
                    isFormValid={isFormValid}
                    isStripeReady={isStripeReady}
                  />
                </Elements>
              )
            )}

            {(paymentMethod === 'Pay at Delivery' || paymentMethod === 'Member Account') && (
              <div className="space-y-3">
                <div
                  className="flex items-center space-x-3 p-3 bg-primary/5 rounded-2xl border-2 border-primary/10 cursor-pointer transition-all hover:bg-primary/10 animate-in fade-in duration-500"
                  onClick={() => setSaveInfo(!saveInfo)}
                >
                  <Checkbox id="save-info-non-digital" checked={saveInfo} onCheckedChange={(val) => setSaveInfo(!!val)} className="h-5 w-5 data-[state=checked]:bg-primary" />
                  <div className="text-left">
                    <label htmlFor="save-info-non-digital" className="text-[10px] font-black uppercase text-[#213147] cursor-pointer block leading-none">Save for faster checkout</label>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Securely saves your contact info on this device.</p>
                  </div>
                </div>
                {isFormValid && (
                  <div className="fixed bottom-7 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-50 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="max-w-xl mx-auto px-2">
                      <Button size="lg" className="w-full h-14 font-black uppercase tracking-widest gap-2 shadow-xl" onClick={handleManualOrder} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="animate-spin" /> : <ShoppingBag className="h-5 w-5" />} PLACE ORDER
                      </Button>
                    </div>
                  </div>
                )}
                <CheckoutBrandingBar />
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default function CheckoutPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);

  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    }>
      <CheckoutContent sellerId={sellerId} />
    </Suspense>
  );
}
