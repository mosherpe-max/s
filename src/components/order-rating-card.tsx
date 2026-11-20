'use client';

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Check, Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/lib/types';
import { RATING_COMMENT_MAX, RATING_REASONS, type RatingScore } from '@/lib/ratings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Shown on the order tracking page once an order is Delivered: one question, two buttons. A thumbs up is saved at once;
// a thumbs down asks what went wrong (one tap) and takes an optional comment. Once per order.
export function OrderRatingCard({ order }: { order: Order }) {
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  const [step, setStep] = useState<'ask' | 'why'>('ask');
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState<RatingScore | null>(null);

  const answered = order.rating?.score || sent;
  if (answered) {
    return (
      <Card className="border-2 border-slate-100 bg-white px-4 py-3 shadow-sm flex items-center gap-3" role="status">
        <div className="p-1.5 rounded-full bg-green-100 text-green-700 shrink-0"><Check className="h-4 w-4" /></div>
        <p className="text-[11px] font-black uppercase tracking-widest text-[#213147]">
          Thanks for your feedback{answered === 'down' ? '. We will look into it.' : '!'}
        </p>
      </Card>
    );
  }

  const send = async (score: RatingScore) => {
    if (!firebaseApp) return;
    setSaving(true);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      await httpsCallable(functions, 'rateOrder')({ orderId: order.id, score, ...(score === 'down' ? { reason } : {}), ...(comment.trim() ? { comment: comment.trim() } : {}) });
      setSent(score);
    } catch (e: any) {
      // Already rated (for example from another phone): treat it as done.
      if (e?.code === 'functions/already-exists') { setSent(score); return; }
      toast({ variant: 'destructive', title: 'Could not send your rating', description: e?.message || 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border-0 border-t-4 border-t-[#E50000] bg-[#213147] p-5 shadow-xl ring-4 ring-[#213147]/10 space-y-4 text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
      {step === 'ask' ? (
        <>
          <div className="space-y-1 text-center">
            <p className="text-xl font-black uppercase tracking-wide text-white leading-tight">How was your order?</p>
            <p className="text-xs font-semibold text-white/70">One tap helps us serve you better.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" disabled={saving} onClick={() => send('up')} aria-label="Thumbs up" className="h-16 gap-2 border-0 bg-green-500 text-sm font-black uppercase tracking-widest text-white shadow-md hover:bg-green-600 active:scale-95 transition-transform">
              {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <ThumbsUp className="h-6 w-6" />} Great
            </Button>
            <Button type="button" disabled={saving} onClick={() => setStep('why')} aria-label="Thumbs down" className="h-16 gap-2 border-0 bg-white text-sm font-black uppercase tracking-widest text-[#213147] shadow-md hover:bg-red-50 hover:text-[#E50000] active:scale-95 transition-transform">
              <ThumbsDown className="h-6 w-6" /> Not good
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[11px] font-black uppercase tracking-widest text-white">What went wrong?</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What went wrong">
            {RATING_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                onClick={() => setReason(r)}
                className={cn('rounded-full border-2 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors', reason === r ? 'bg-[#E50000] border-[#E50000] text-white' : 'bg-white border-white text-[#213147] hover:bg-slate-100')}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea value={comment} maxLength={RATING_COMMENT_MAX} onChange={(e) => setComment(e.target.value)} placeholder="Anything else? (optional)" rows={2} className="border-2 border-white bg-white font-medium text-[#213147]" />
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => setStep('ask')} className="h-11 border-2 border-white bg-transparent font-black uppercase text-[10px] tracking-widest text-white hover:bg-white/10 hover:text-white">Back</Button>
            <Button type="button" disabled={!reason || saving} onClick={() => send('down')} className="h-11 flex-1 bg-[#E50000] text-white hover:bg-[#E50000]/90 font-black uppercase text-[10px] tracking-widest gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Send
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
