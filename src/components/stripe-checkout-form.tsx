
'use client';

import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StripeCheckoutFormProps {
  onReadyStateChange: (ready: boolean) => void;
}

/**
 * Integrated Stripe Checkout Form.
 * Configured for zero-friction experience with layout: tabs and hidden billing detail fields.
 */
export function StripeCheckoutForm({ onReadyStateChange }: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isElementLoaded, setIsElementLoaded] = useState(false);

  const handleChange = (event: any) => {
    onReadyStateChange(event.complete);
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500 text-left">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          Secure Payment
        </label>
        <span className="flex items-center gap-1 text-[8px] font-bold text-green-600 uppercase tracking-tighter">
          <ShieldCheck className="h-2.5 w-2.5" /> PCI Compliant
        </span>
      </div>
      
      <div className={cn(
        "bg-white p-4 rounded-2xl border-2 transition-all duration-300",
        error ? "border-destructive/50 ring-4 ring-destructive/10" : "border-slate-100 shadow-sm"
      )}>
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

      <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-muted-foreground uppercase py-2">
        <Lock className="h-2.5 w-2.5" /> AES-256 Encryption Active
      </div>
    </div>
  );
}
