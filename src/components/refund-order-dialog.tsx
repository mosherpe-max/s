'use client';

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Loader2, Undo2 } from 'lucide-react';
import { useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/lib/types';
import { REFUND_REASONS, isRefundReason } from '@/lib/refund-reasons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const usd = (n: number) => `$${n.toFixed(2)}`;

// Venue admin > Fulfillment Log: refund a card order from Koop, in full or in part. The refund is made on the venue's own
// Stripe account, so it comes out of the venue's Stripe balance. Koop's fee and Stripe's processing fee are not returned.
// Every refund needs a reason. If a staff member asked for this refund, their reason is filled in and the venue admin can
// decline the request instead (with an internal note staff never see).
export function RefundOrder({ order }: { order: Order }) {
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declineNote, setDeclineNote] = useState('');

  const total = order.total || 0;
  const refunded = order.refundedAmount || 0;
  const remaining = Math.max(0, Math.round((total - refunded) * 100) / 100);
  const isCard = order.paymentMethod === 'Digital Payment' && !!order.stripePaymentIntentId;
  const typed = amount.trim() === '' ? remaining : Number(amount);
  const valid = Number.isFinite(typed) && typed >= 0.01 && typed <= remaining + 0.001 && isRefundReason(reason);
  const request = order.refundRequest?.status === 'Requested' ? order.refundRequest : null;
  const busy = isRefunding || isDeclining;
  const inProgress = ['Placed', 'Preparing', 'Out for Delivery'].includes(order.status);

  const reopen = () => {
    setAmount(''); setNote(''); setDeclining(false); setDeclineNote('');
    setReason(request && isRefundReason(request.reason) ? request.reason : '');
    setOpen(true);
  };

  const handleDecline = async () => {
    if (!firebaseApp) return;
    setIsDeclining(true);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      await httpsCallable(functions, 'declineRefundRequest')({ orderId: order.id, note: declineNote.trim() });
      toast({ title: 'Request Closed', description: 'No refund was made.' });
      setOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could Not Close Request', description: e?.message || 'Please try again.' });
    } finally {
      setIsDeclining(false);
    }
  };

  const handleRefund = async () => {
    if (!firebaseApp || !valid) return;
    setIsRefunding(true);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      const result = await httpsCallable(functions, 'refundOrder')({
        orderId: order.id,
        ...(amount.trim() === '' ? {} : { amount: typed }),
        reason,
        note: note.trim(),
      });
      const data = result.data as { refundedAmount: number; remaining: number };
      toast({ title: 'Refund Sent', description: `${usd(typed)} refunded. ${data.remaining > 0 ? `${usd(data.remaining)} could still be refunded.` : 'This order is fully refunded.'}` });
      setOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Refund Failed', description: e?.message || 'Please try again.' });
    } finally {
      setIsRefunding(false);
    }
  };

  if (!isCard) return <span className="text-[9px] font-bold uppercase text-muted-foreground">-</span>;

  return (
    <div className="flex flex-col items-end gap-1">
      {request && (
        <Badge className="text-[8px] font-black uppercase border-0 bg-amber-100 text-amber-800 text-right whitespace-normal" title={request.note || undefined}>
          Refund requested: {request.reason} · {request.requestedByStaffName}
        </Badge>
      )}
      {order.refundStatus && (
        <Badge className="text-[8px] font-black uppercase border-0 bg-red-100 text-red-700">{order.refundStatus} {usd(refunded)}</Badge>
      )}
      {remaining > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={reopen} className="h-7 border-2 text-[9px] font-black uppercase tracking-widest gap-1">
          <Undo2 className="h-3 w-3" /> Refund
        </Button>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
        <DialogContent className="max-w-md text-left">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-black uppercase tracking-wide text-[#213147]">Refund Order</DialogTitle>
            <DialogDescription className="text-[11px] font-semibold leading-relaxed">
              The patron's card is refunded from your Stripe balance. Koop&apos;s fee and Stripe&apos;s card processing fee are not returned, so a refund costs
              you both. A refund can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3 text-[11px] font-bold uppercase text-[#213147] space-y-1">
              <div className="flex justify-between"><span>Order #{order.id.slice(-6).toUpperCase()}</span><span>{order.customerName}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Charged</span><span>{usd(total)}</span></div>
              {refunded > 0 && <div className="flex justify-between text-muted-foreground"><span>Already refunded</span><span>{usd(refunded)}</span></div>}
              <div className="flex justify-between"><span>Can still refund</span><span>{usd(remaining)}</span></div>
            </div>
            {request && (
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-900 space-y-1">
                <div className="text-[9px] font-black uppercase tracking-widest">Refund requested by {request.requestedByStaffName}{request.requestedAt?.toDate ? ` · ${request.requestedAt.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}</div>
                <div>{request.reason}</div>
                {request.note && <div className="font-semibold normal-case">&ldquo;{request.note}&rdquo;</div>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Reason for the refund</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger aria-label="Reason for the refund" className="h-11 border-2 font-bold"><SelectValue placeholder="Choose a reason" /></SelectTrigger>
                <SelectContent>
                  {REFUND_REASONS.map((r) => <SelectItem key={r} value={r} className="font-bold">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`refund-amount-${order.id}`} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Amount to refund (leave blank for {usd(remaining)})</Label>
              <Input id={`refund-amount-${order.id}`} type="number" inputMode="decimal" min="0.01" step="0.01" max={remaining} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={remaining.toFixed(2)} className="h-11 border-2 font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`refund-note-${order.id}`} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Note (optional, for your records)</Label>
              <Input id={`refund-note-${order.id}`} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} className="h-11 border-2 font-bold" />
            </div>
            {inProgress && typed >= remaining - 0.001 && (
              <p className="text-[10px] font-bold uppercase text-amber-700 leading-relaxed">This order is still in progress. Refunding it in full also cancels it.</p>
            )}
            <Button type="button" onClick={handleRefund} disabled={!valid || busy} className="w-full h-12 bg-destructive hover:bg-destructive/90 font-black uppercase text-[10px] tracking-widest gap-2">
              {isRefunding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />} Refund {valid ? usd(typed) : ''}
            </Button>
            {request && !declining && (
              <Button type="button" variant="outline" onClick={() => setDeclining(true)} disabled={busy} className="w-full h-10 border-2 font-black uppercase text-[10px] tracking-widest">
                Decline request instead
              </Button>
            )}
            {request && declining && (
              <div className="space-y-2 rounded-xl border-2 border-slate-100 p-3">
                <Label htmlFor={`decline-note-${order.id}`} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Note (optional, internal; staff do not see it)</Label>
                <Input id={`decline-note-${order.id}`} value={declineNote} maxLength={200} onChange={(e) => setDeclineNote(e.target.value)} className="h-11 border-2 font-bold" />
                <Button type="button" variant="outline" onClick={handleDecline} disabled={busy} className="w-full h-10 border-2 font-black uppercase text-[10px] tracking-widest gap-2">
                  {isDeclining && <Loader2 className="h-4 w-4 animate-spin" />} Decline request, no refund
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
