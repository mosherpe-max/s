'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PatronTermsContent } from '@/components/patron-terms-content';
import type { PatronTermsState } from '@/lib/patron-terms';

// The "I agree to the Terms & Conditions" row shown above the Pay / Place Order
// button. It only appears until the patron has agreed once on this device (see
// usePatronTerms). The Terms open in a popup so the patron never leaves checkout.
export function PatronTermsAgreement({ terms }: { terms: PatronTermsState }) {
  const [viewing, setViewing] = useState(false);
  if (!terms.ready || terms.alreadyAccepted) return null;

  return (
    <>
      <div className="flex items-center gap-3 p-3 rounded-2xl border-2 border-primary/10 bg-primary/5">
        <Checkbox
          id="agree-patron-terms"
          checked={terms.checked}
          onCheckedChange={(val) => terms.setChecked(!!val)}
          className="h-5 w-5 shrink-0 data-[state=checked]:bg-primary"
        />
        <p className="text-left text-[11px] font-bold leading-tight text-[#213147]">
          <label htmlFor="agree-patron-terms" className="cursor-pointer">I have read and agree to the </label>
          <button type="button" onClick={() => setViewing(true)} className="font-black underline underline-offset-2 text-primary">
            Terms &amp; Conditions
          </button>
        </p>
      </div>

      <Dialog open={viewing} onOpenChange={setViewing}>
        <DialogContent className="flex max-h-[88vh] w-[calc(100%-2rem)] max-w-lg flex-col gap-3 p-5 text-left">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-black uppercase tracking-wide text-[#213147]">Terms &amp; Conditions</DialogTitle>
            <DialogDescription className="text-[11px] font-semibold">Please read before placing your order.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border-2 border-slate-100 bg-white p-4">
            {terms.document && <PatronTermsContent terms={terms.document} showTitle={false} />}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setViewing(false)} className="h-11 flex-1 border-2 font-black uppercase text-[10px] tracking-widest">
              Close
            </Button>
            <Button
              onClick={() => { terms.setChecked(true); setViewing(false); }}
              className="h-11 flex-1 font-black uppercase text-[10px] tracking-widest"
            >
              I agree
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
