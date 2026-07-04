'use client';

import React, { useState, useEffect } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock, ShieldCheck, User, Smartphone, Mail, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface StripeCheckoutFormProps {
  onReadyStateChange: (ready: boolean) => void;
  patronName: string;
  setPatronName: (val: string) => void;
  patronPhone: string;
  setPatronPhone: (val: string) => void;
  patronEmail: string;
  setPatronEmail: (val: string) => void;
  saveInfo: boolean;
  setSaveInfo: (val: boolean) => void;
}

/**
 * Integrated Stripe Checkout Form.
 * Unifies Patron Identity with the Secure Payment Element.
 * Redundant Stripe-native billing fields are suppressed for a seamless "one-step" feel.
 * Restores ZIP code (Postal Code) collection within the secure element.
 */
export function StripeCheckoutForm({ 
  onReadyStateChange, 
  patronName, 
  setPatronName, 
  patronPhone, 
  setPatronPhone,
  patronEmail,
  setPatronEmail,
  saveInfo,
  setSaveInfo
}: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isElementLoaded, setIsElementLoaded] = useState(false);

  const handleChange = (event: any) => {
    const isContactValid = patronName.length >= 2 && patronPhone.replace(/\D/g, '').length >= 10 && patronEmail.includes('@');
    onReadyStateChange(event.complete && isContactValid);
    
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-500 text-left">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          Patron Information
        </label>
        <span className="flex items-center gap-1 text-[8px] font-bold text-green-600 uppercase tracking-tighter">
          <ShieldCheck className="h-2.5 w-2.5" /> Secure Checkout
        </span>
      </div>
      
      <div className={cn(
        "bg-white p-4 sm:p-5 rounded-2xl border-2 transition-all duration-300 space-y-4",
        error ? "border-destructive/50 ring-4 ring-destructive/10" : "border-slate-100 shadow-sm"
      )}>
        {/* 1. IDENTITY SECTION */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 px-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
              <Input 
                type="email"
                placeholder="receipt@example.com" 
                value={patronEmail} 
                onChange={(e) => setPatronEmail(e.target.value)} 
                className="pl-10 h-11 border-slate-200 bg-white rounded-lg font-bold focus-visible:ring-primary focus-visible:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 px-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                <Input 
                  placeholder="Delivery Name" 
                  value={patronName} 
                  onChange={(e) => setPatronName(e.target.value)} 
                  className="pl-10 h-11 border-slate-200 bg-white rounded-lg font-bold focus-visible:ring-primary focus-visible:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 px-1">Mobile Number</label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                <Input 
                  placeholder="(555) 000-0000" 
                  type="tel"
                  value={patronPhone} 
                  onChange={(e) => setPatronPhone(e.target.value)} 
                  className="pl-10 h-11 border-slate-200 bg-white rounded-lg font-bold focus-visible:ring-primary focus-visible:border-primary"
                />
              </div>
            </div>
          </div>

          {/* 2. OPT-IN FOR FAST CHECKOUT */}
          <div 
            className="flex items-center space-x-3 p-3 bg-primary/5 rounded-xl border-2 border-primary/10 cursor-pointer group"
            onClick={() => setSaveInfo(!saveInfo)}
          >
            <Checkbox 
              id="save-info" 
              checked={saveInfo} 
              onCheckedChange={(val) => setSaveInfo(!!val)}
              className="h-5 w-5 data-[state=checked]:bg-primary"
            />
            <div className="flex-1 text-left">
              <label htmlFor="save-info" className="text-[10px] font-black uppercase text-[#213147] cursor-pointer block leading-none">
                Save for faster checkout
              </label>
              <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">
                Securely store card details for your next visit
              </p>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100 my-2" />

        {/* 3. SECURE CARD ELEMENT */}
        <div className="space-y-2">
           <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 px-1">Payment Details</label>
           <PaymentElement 
             onReady={() => setIsElementLoaded(true)}
             onChange={handleChange}
             options={{
               layout: 'tabs',
               business: { name: 'KOOP' },
               // Disable wallets to prevent SecurityError in restricted iframe/preview environments
               wallets: {
                 applePay: 'never',
                 googlePay: 'never'
               },
               // Hide the native Stripe checkbox because we handle consent in our own UI above
               features: {
                 paymentMethodSave: 'disabled'
               },
               // Suppress redundant billing fields since we collect them above
               // We set postalCode to 'auto' to ensure ZIP is collected for AVS verification
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
      </div>

      {error && (
        <p className="text-[10px] font-bold text-destructive uppercase px-1 animate-in shake-in duration-300">
          {error}
        </p>
      )}

      <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-muted-foreground uppercase py-2">
        <Lock className="h-2.5 w-2.5" /> PCI Compliant Encryption
      </div>
    </div>
  );
}
