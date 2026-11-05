'use client';

import { useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Loader2, Undo2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/lib/types';
import { REFUND_REASONS, isRefundReason } from '@/lib/refund-reasons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// Staff can ask the venue admin to refund a card order, with a reason. They cannot refund anything themselves: the venue
// admin decides. Staff only ever see a neutral status; the admin's reason for declining stays private.
export function StaffRefundRequest({ order, staffId, staffName, compact = false }: {
  order: Order;
  staffId?: string;
  staffName?: string;
  compact?: boolean;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const isCard = order.paymentMethod === 'Digital Payment' && !!order.stripePaymentIntentId;
  if (!isCard) return null;

  const request = order.refundRequest;
  const fullyRefunded = order.refundStatus === 'Refunded';
  if (request || fullyRefunded) {
    const label = fullyRefunded || request?.status === 'Approved' ? 'Refunded' : request?.status === 'Declined' ? 'Request closed' : 'Refund requested';
    const tone = label === 'Refund requested' ? 'bg-amber-100 text-amber-800' : label === 'Refunded' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600';
    return <Badge className={`text-[8px] font-black uppercase border-0 ${tone}`}>{label}</Badge>;
  }

  if (!staffId) return null;

  const submit = async () => {
    if (!firestore || !isRefundReason(reason)) return;
    setSaving(true);
    try {
      await updateDoc(doc(firestore, 'orders', order.id), {
        refundRequest: {
          status: 'Requested',
          reason,
          ...(note.trim() ? { note: note.trim() } : {}),
          requestedByStaffId: staffId,
          requestedByStaffName: staffName || 'Staff',
          requestedAt: serverTimestamp(),
        },
      });
      toast({ title: 'Refund Requested', description: 'The venue admin will review it.' });
      setOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could Not Send Request', description: e?.message || 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => { setReason(''); setNote(''); setOpen(true); }}
        className={`border-2 font-black uppercase tracking-widest gap-1 ${compact ? 'h-7 text-[8px]' : 'h-9 text-[9px]'}`}
      >
        <Undo2 className="h-3 w-3" /> Request Refund
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (!saving) setOpen(o); }}>
        <DialogContent className="max-w-md text-left">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-black uppercase tracking-wide text-[#213147]">Request a Refund</DialogTitle>
            <DialogDescription className="text-[11px] font-semibold leading-relaxed">
              Order #{order.id.slice(-6).toUpperCase()} · {order.customerName}. This sends a request to the venue admin, who decides whether to refund it. Nothing is refunded until they do.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger aria-label="Reason" className="h-11 border-2 font-bold"><SelectValue placeholder="Choose a reason" /></SelectTrigger>
                <SelectContent>
                  {REFUND_REASONS.map((r) => <SelectItem key={r} value={r} className="font-bold">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`refund-request-note-${order.id}`} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Note (optional)</Label>
              <Textarea id={`refund-request-note-${order.id}`} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className="border-2 font-bold" rows={3} />
            </div>
            <Button type="button" onClick={submit} disabled={!isRefundReason(reason) || saving} className="w-full h-12 font-black uppercase text-[10px] tracking-widest gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Send Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
