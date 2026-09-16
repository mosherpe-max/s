
'use client';

import React, { useEffect, useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StripeCheckoutFormProps {
  onReadyStateChange: (ready: boolean) => void;
  clientSecret: string;
}

// If Stripe.js never calls onReady - a mismatched/misconfigured publishable
// key, a blocked iframe (ad/privacy blocker), or Stripe's own network being
// unreachable - this component previously had no way to signal that and
// would show its loading spinner forever with zero feedback. This timeout
// turns that silent hang into a visible, actionable error.
const READY_TIMEOUT_MS = 12000;

/**
 * Integrated Stripe Checkout Form.
 * Configured for zero-friction experience with layout: tabs and hidden billing detail fields.
 */
export function StripeCheckoutForm({ onReadyStateChange, clientSecret }: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isElementLoaded, setIsElementLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  // 'pending' = still waiting on Stripe; 'ok' = Stripe confirmed this
  // client secret is valid for our key (so only the embedded frame itself
  // failed to render); 'error' = Stripe rejected it outright (key/account/
  // mode mismatch, expired secret, etc).
  const [retrieveStatus, setRetrieveStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [diagnosticMessage, setDiagnosticMessage] = useState<string | null>(null);
  const [paymentIntentInfo, setPaymentIntentInfo] = useState<{ status: string; methods: string[] } | null>(null);

  useEffect(() => {
    if (isElementLoaded) return;
    const timer = setTimeout(() => setTimedOut(true), READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isElementLoaded]);

  // Independently ask Stripe.js whether it can even retrieve this payment
  // intent with the publishable key we loaded - this is what actually
  // surfaces a mismatched key/account/mode (Stripe's own error message for
  // that case is explicit, e.g. "a similar object exists in live mode, but
  // a test mode key was used"). Running this in parallel with the
  // PaymentElement mount means a real misconfiguration is diagnosed
  // immediately rather than only after the generic timeout fires, and lets
  // us show the actual reason on screen instead of a guess - useful since
  // most patrons/staff have no practical way to check a browser console.
  // A successful retrieve here with the frame still never rendering points
  // at something else entirely: the embedding browser/webview blocking
  // Stripe's third-party iframe.
  useEffect(() => {
    if (!stripe || !clientSecret) return;
    let cancelled = false;
    stripe.retrievePaymentIntent(clientSecret).then(({ error: retrieveError, paymentIntent }) => {
      if (cancelled) return;
      if (retrieveError) {
        setDiagnosticMessage(retrieveError.message || null);
        setRetrieveStatus('error');
        setTimedOut(true);
      } else {
        setRetrieveStatus('ok');
        // A destination charge (transfer_data.destination) resolves its
        // available payment method types from BOTH the platform and the
        // connected account's capabilities/country/currency. If that
        // resolves to nothing usable, the PaymentElement can have literally
        // nothing to render and never fires onReady - this is what would
        // show up here as an empty methods list.
        if (paymentIntent) {
          setPaymentIntentInfo({
            status: paymentIntent.status,
            methods: paymentIntent.payment_method_types || [],
          });
        }
      }
    });
    return () => { cancelled = true; };
  }, [stripe, clientSecret]);

  const timeoutDiagnosis = !stripe
    ? "Stripe's secure payment library failed to load in this browser."
    : diagnosticMessage
    ? diagnosticMessage
    : retrieveStatus === 'ok'
    ? (paymentIntentInfo?.methods.length === 0
        ? `Connected fine, but no payment methods are available for this order (status: ${paymentIntentInfo.status}). This usually means the venue's connected Stripe account isn't fully enabled for card payments yet.`
        : `Connected fine (methods: ${paymentIntentInfo?.methods.join(', ') || 'unknown'}), but the secure payment frame itself didn't render. If you're inside an app's built-in browser (a link preview, QR scanner, etc.), try opening this checkout in Safari or Chrome directly instead.`)
    : "Could not reach the payment gateway. Check your connection and try again.";

  const handleChange = (event: any) => {
    onReadyStateChange(event.complete);
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  };

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-500 text-left">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          Secure Payment
        </label>
        <span className="flex items-center gap-1 text-[8px] font-bold text-green-600 uppercase tracking-tighter">
          <ShieldCheck className="h-2.5 w-2.5" /> PCI Compliant
        </span>
      </div>

      <div className={cn(
        "bg-white p-3 rounded-2xl border-2 transition-all duration-300 relative min-h-[90px]",
        error ? "border-destructive/50 ring-4 ring-destructive/10" : "border-slate-100 shadow-sm"
      )}>
        {!isElementLoaded && !timedOut && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Securing Terminal...</span>
          </div>
        )}

        {!isElementLoaded && timedOut && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 gap-2 px-4 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <span className="text-[9px] font-black uppercase text-destructive tracking-widest">Payment Form Unavailable</span>
            <span className="text-[8px] font-bold text-destructive/80 normal-case tracking-normal max-w-[280px]">{timeoutDiagnosis}</span>
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Please try again, or use Pay at Delivery.</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-1 text-[9px] font-black uppercase tracking-widest text-primary underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        <PaymentElement 
          onReady={() => setIsElementLoaded(true)}
          onChange={handleChange}
          options={{
            layout: 'tabs',
            business: { name: 'KOOP' },
            wallets: {
              applePay: 'never',
              googlePay: 'never'
            },
            // REDUCE FRICTION: Identity collected by parent; hide redundant fields
            fields: {
              billingDetails: {
                name: 'never',
                email: 'never',
                phone: 'never',
                address: {
                  postalCode: 'auto'
                }
              }
            }
          }}
        />
      </div>

      {error && (
        <p className="text-[10px] font-bold text-destructive uppercase px-1 animate-in shake-in duration-300">
          {error}
        </p>
      )}

      <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-muted-foreground uppercase py-0.5">
        <Lock className="h-2.5 w-2.5" /> AES-256 Encryption Active
      </div>
    </div>
  );
}
