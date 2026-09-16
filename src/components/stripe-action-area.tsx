'use client';

import { useStripe, useElements } from '@stripe/react-stripe-js';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CreditCard } from 'lucide-react';
import { CheckoutBrandingBar } from '@/components/checkout-branding-bar';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

interface StripeActionAreaProps {
  clientSecret: string;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  onOrderComplete: (orderId: string) => void;
  orderData: Record<string, unknown> | null;
  patronEmail: string;
  patronName: string;
  patronPhone: string;
  stripeCustomerId: string | null;
  saveInfo: boolean;
  setSaveInfo: (value: boolean) => void;
  isFormValid: boolean;
  // The card fields themselves (StripeCheckoutForm) are rendered by the
  // parent, inside its own shared card alongside contact info, so this
  // reads as one unified form. This is just whether that form has finished
  // loading, to gate the Pay button.
  isStripeReady: boolean;
}

export function StripeActionArea({
  clientSecret,
  isProcessing,
  setIsProcessing,
  onOrderComplete,
  orderData,
  patronEmail,
  patronName,
  patronPhone,
  stripeCustomerId,
  saveInfo,
  setSaveInfo,
  isFormValid,
  isStripeReady,
}: StripeActionAreaProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleStripePayment = async () => {
    if (!stripe || !elements || !clientSecret || !firestore) return;

    if (!isFormValid) {
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
            },
            allow_redisplay: 'always'
          },
          payment_method_options: {
            card: {
              setup_future_usage: saveInfo ? 'off_session' : undefined
            }
          }
        },
        redirect: 'if_required',
      });

      if (error) throw new Error(error.message);

      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        if (saveInfo) {
          localStorage.setItem('koop_patron_name', patronName);
          localStorage.setItem('koop_patron_email', patronEmail);
          localStorage.setItem('koop_patron_phone', patronPhone);
          if (stripeCustomerId) {
            localStorage.setItem('koop_stripe_customer_id', stripeCustomerId);
          }
        }

        const finalOrderData = {
          ...orderData,
          customerEmail: patronEmail,
          customerName: patronName,
          customerPhone: patronPhone.replace(/\D/g, ''),
          paymentStatus: paymentIntent.status === 'succeeded' ? 'Succeeded' : 'Processing',
          stripePaymentIntentId: paymentIntent.id,
        };
        // Keyed on the PaymentIntent id (not addDoc's random id) so this write and the
        // Stripe webhook's own order-upsert can never race into two separate order docs.
        const orderRef = doc(firestore, 'orders', paymentIntent.id);
        setDoc(orderRef, finalOrderData, { merge: true }).then(() => {
          onOrderComplete(orderRef.id);
        }).catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: orderRef.path,
            operation: 'write',
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
    <div className="space-y-3">
      <div
        className="flex items-center space-x-3 p-3 bg-primary/5 rounded-2xl border-2 border-primary/10 cursor-pointer transition-all hover:bg-primary/10 animate-in fade-in duration-500"
        onClick={() => setSaveInfo(!saveInfo)}
      >
        <Checkbox id="save-info-stripe" checked={saveInfo} onCheckedChange={(val) => setSaveInfo(!!val)} className="h-5 w-5 data-[state=checked]:bg-primary" />
        <div className="text-left">
          <label htmlFor="save-info-stripe" className="text-[10px] font-black uppercase text-[#213147] cursor-pointer block leading-none">Save for faster checkout</label>
          <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Securely saves your contact & payment info on this device.</p>
        </div>
      </div>

      {isFormValid && (
        <div className="fixed bottom-7 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-50 animate-in slide-in-from-bottom-4 duration-500">
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
      )}
      <CheckoutBrandingBar />
    </div>
  );
}
