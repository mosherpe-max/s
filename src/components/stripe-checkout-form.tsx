'use client';

import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StripeCheckoutFormProps {
  onReadyStateChange: (ready: boolean) => void;
}

/**
 * High-fidelity embedded Stripe Card Element form.
 * Optimized for a seamless patron mobile ordering experience.
 */
export function StripeCheckoutForm({ onReadyStateChange }: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsMounted] = useState(false);

  const handleChange = (event: any) => {
    onReadyStateChange(event.complete);
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  };

  const CARD_ELEMENT_OPTIONS = {
    style: {
      base: {
        color: '#213147',
        fontFamily: '"PT Sans", sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
      },
    },
    hidePostalCode: true,
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <CreditCard className="h-3 w-3" /> Card Details
        </label>
        <span className="flex items-center gap-1 text-[8px] font-bold text-green-600 uppercase tracking-tighter">
          <ShieldCheck className="h-2.5 w-2.5" /> PCI Compliant
        </span>
      </div>
      
      <div className={cn(
        "bg-white p-4 rounded-xl border-2 transition-all duration-200",
        error ? "border-destructive/50 ring-4 ring-destructive/10" : "border-slate-100 hover:border-slate-200"
      )}>
        <CardElement 
          options={CARD_ELEMENT_OPTIONS} 
          onChange={handleChange}
          onFocus={() => setIsMounted(true)}
          onBlur={() => setIsMounted(false)}
        />
      </div>

      {error && (
        <p className="text-[10px] font-bold text-destructive uppercase px-1 animate-in shake-in duration-300">
          {error}
        </p>
      )}

      <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-muted-foreground uppercase py-2">
        <Lock className="h-2.5 w-2.5" /> Encrypted by Stripe
      </div>
    </div>
  );
}
