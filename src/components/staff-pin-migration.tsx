'use client';

import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { migrateStaffPins, type PinMigrationResult } from '@/lib/staff-pin-migration';

// Koop admin: moves every existing staff login PIN out of the staff records (which patrons'
// browsers can read) into a private place only venue admins can read. Safe to run again.
export function StaffPinMigration() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<PinMigrationResult | null>(null);

  const run = async () => {
    if (!firestore) return;
    setRunning(true);
    try {
      const result = await migrateStaffPins(firestore);
      setLast(result);
      if (result.failed.length > 0) {
        toast({ variant: 'destructive', title: 'Some PINs Could Not Be Moved', description: `${result.moved} moved, ${result.failed.length} failed. Details are on this page.` });
      } else {
        toast({
          title: 'Staff PINs Secured',
          description: result.moved === 0 ? 'Nothing left to move. Every PIN is already private.' : `Moved ${result.moved} staff PIN${result.moved === 1 ? '' : 's'} to private storage.`,
        });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could Not Move PINs', description: e?.message || 'Unknown error' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="border-2 shadow-sm p-8 space-y-4 text-left">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg"><KeyRound className="h-5 w-5 text-primary" /></div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-[#213147]">Staff PIN Privacy</h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Move staff login PINs to private storage</p>
        </div>
      </div>
      <p className="text-xs font-medium text-muted-foreground leading-relaxed">
        Staff PINs used to sit on each staff record, which anyone using a venue&apos;s order page could read. This moves every PIN into a record only that venue&apos;s admin can see. Staff keep using the same PINs. Run it once after the update goes live. Running it again is harmless.
      </p>
      <Button onClick={run} disabled={running} className="h-11 font-black uppercase text-[10px] tracking-widest gap-2">
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        Secure Staff PINs
      </Button>
      {last && (
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Last run: {last.moved} moved</p>
          {last.failed.map((f) => (
            <p key={f.path} className="text-[10px] font-bold text-destructive break-all">{f.path}: {f.message}</p>
          ))}
        </div>
      )}
    </Card>
  );
}
