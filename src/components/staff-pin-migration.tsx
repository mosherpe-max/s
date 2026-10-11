'use client';

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { KeyRound, Loader2 } from 'lucide-react';
import { useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Koop admin: moves every existing staff login PIN out of the staff records (which patrons'
// browsers can read) into a private place only venue admins can read. Safe to run again.
export function StaffPinMigration() {
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [lastMoved, setLastMoved] = useState<number | null>(null);

  const run = async () => {
    if (!firebaseApp) return;
    setRunning(true);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      const result = await httpsCallable(functions, 'migrateStaffPins')();
      const moved = (result.data as { moved: number }).moved;
      setLastMoved(moved);
      toast({
        title: 'Staff PINs Secured',
        description: moved === 0 ? 'Nothing left to move. Every PIN is already private.' : `Moved ${moved} staff PIN${moved === 1 ? '' : 's'} to private storage.`,
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could Not Move PINs', description: e.message });
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
      {lastMoved !== null && <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Last run: {lastMoved} moved</p>}
    </Card>
  );
}
