'use client';

import React, { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StripePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (paymentIntentId: string) => void;
  amount: number;
}

export function StripePaymentDialog({
  open,
  onOpenChange,
  onSuccess,
  amount,
}: StripePaymentDialogProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: result.error.message,
      });
      setIsProcessing(false);
    } else {
      if (result.paymentIntent.status === 'succeeded') {
        toast({
          title: 'Payment Successful',
          description: 'Your transaction has been verified.',
        });
        onSuccess(result.paymentIntent.id);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] rounded-[2rem]">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-2xl">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="font-headline font-black uppercase text-xl">
            Secure Checkout
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Total Amount: ${(amount / 100).toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="bg-muted/30 p-4 rounded-2xl border">
            <PaymentElement />
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-bold uppercase tracking-tighter">
              <Lock className="h-3 w-3" />
              Encrypted by Stripe
            </div>
            
            <Button
              type="submit"
              disabled={!stripe || isProcessing}
              className="w-full h-14 font-black uppercase tracking-widest text-lg shadow-xl"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                `Confirm Payment`
              )}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-[10px] font-black uppercase tracking-widest"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
