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
    <Card className="border-2 border-slate-100 bg-white p-4 shadow-sm space-y-3 text-left">
      {step === 'ask' ? (
        <>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#213147]">How was your order?</p>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" disabled={saving} onClick={() => send('up')} aria-label="Thumbs up" className="h-14 border-2 gap-2 text-[11px] font-black uppercase tracking-widest hover:bg-green-50 hover:border-green-300 hover:text-green-700">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <ThumbsUp className="h-5 w-5" />} Great
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setStep('why')} aria-label="Thumbs down" className="h-14 border-2 gap-2 text-[11px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-300 hover:text-red-700">
              <ThumbsDown className="h-5 w-5" /> Not good
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#213147]">What went wrong?</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What went wrong">
            {RATING_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                onClick={() => setReason(r)}
                className={cn('rounded-full border-2 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors', reason === r ? 'bg-[#213147] border-[#213147] text-white' : 'bg-white border-slate-200 text-[#213147] hover:border-[#213147]/40')}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea value={comment} maxLength={RATING_COMMENT_MAX} onChange={(e) => setComment(e.target.value)} placeholder="Anything else? (optional)" rows={2} className="border-2 font-medium" />
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => setStep('ask')} className="h-11 border-2 font-black uppercase text-[10px] tracking-widest">Back</Button>
            <Button type="button" disabled={!reason || saving} onClick={() => send('down')} className="h-11 flex-1 font-black uppercase text-[10px] tracking-widest gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Send
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
