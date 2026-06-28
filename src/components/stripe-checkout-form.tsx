'use client';

import React, { useState } from 'react';
import { PaymentElement, LinkAuthenticationElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock, ShieldCheck, User, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface StripeCheckoutFormProps {
  onReadyStateChange: (ready: boolean) => void;
  patronName: string;
  setPatronName: (val: string) => void;
  patronPhone: string;
  setPatronPhone: (val: string) => void;
  patronEmail: string;
  setPatronEmail: (val: string) => void;
}

/**
 * Integrated Stripe Checkout Form.
 * Combines Link (for email & info saving) with native fields for Name and Mobile.
 */
export function StripeCheckoutForm({ 
  onReadyStateChange, 
  patronName, 
  setPatronName, 
  patronPhone, 
  setPatronPhone,
  patronEmail,
  setPatronEmail
}: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleChange = (event: any) => {
    // We consider the form "ready" for submission when card details are valid
    // and we have our required custom fields.
    const isContactValid = patronName.length >= 2 && patronPhone.replace(/\D/g, '').length >= 10;
    onReadyStateChange(event.complete && isContactValid);
    
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
        "bg-white p-4 sm:p-5 rounded-2xl border-2 transition-all duration-300 space-y-4",
        error ? "border-destructive/50 ring-4 ring-destructive/10" : "border-slate-100 shadow-sm"
      )}>
        {/* 1. EMAIL & OPT-IN (STRIPE LINK) */}
        <div className="space-y-1">
          <LinkAuthenticationElement 
            options={{ defaultValues: { email: patronEmail } }}
            onChange={(e: any) => setPatronEmail(e.value.email)} 
          />
        </div>

        {/* 2. FULL NAME */}
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 px-1">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
            <Input 
              placeholder="Name for delivery" 
              value={patronName} 
              onChange={(e) => setPatronName(e.target.value)} 
              className="pl-10 h-11 border-slate-200 bg-white rounded-lg font-bold focus-visible:ring-primary focus-visible:border-primary"
            />
          </div>
        </div>

        {/* 3. MOBILE NUMBER */}
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 px-1">Mobile Number</label>
          <div className="relative">
            <Smartphone className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
            <Input 
              placeholder="For status updates" 
              type="tel"
              value={patronPhone} 
              onChange={(e) => setPatronPhone(e.target.value)} 
              className="pl-10 h-11 border-slate-200 bg-white rounded-lg font-bold focus-visible:ring-primary focus-visible:border-primary"
            />
          </div>
        </div>

        <div className="h-px bg-slate-100 my-4" />

        {/* 4. CARD DETAILS (Number, Expiry, CVV, Zip) */}
        <div className="space-y-2">
           <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 px-1">Card Information</label>
           <PaymentElement 
             onReady={() => setIsLoaded(true)}
             onChange={handleChange}
             options={{
               layout: 'tabs',
               business: { name: 'KOOP Delivery' }
             }}
           />
        </div>
      </div>

      {error && (
        <p className="text-[10px] font-bold text-destructive uppercase px-1 animate-in shake-in duration-300">
          {error}
        </p>
      )}

      <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-muted-foreground uppercase py-2">
        <Lock className="h-2.5 w-2.5" /> Secured by Stripe
      </div>
    </div>
  );
}
