'use client';

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Database, Loader2, Sprout, Trash2 } from 'lucide-react';
import { useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Koop Admin > System Config: fill the demo golf course with past orders so the venue admin charts look
// lived-in during a sales demo, and take them out again.
export function DemoDataManager() {
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  const [busy, setBusy] = useState<'seed' | 'clear' | null>(null);
  const [days, setDays] = useState(60);

  const run = async (kind: 'seed' | 'clear') => {
    if (!firebaseApp) return;
    setBusy(kind);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      if (kind === 'seed') {
        const result = await httpsCallable(functions, 'seedDemoOrders')({ days });
        const data = result.data as { orders: number; days: number };
        toast({ title: 'Demo Orders Added', description: `${data.orders.toLocaleString()} orders over the last ${data.days} days on the demo golf course.` });
      } else {
        const result = await httpsCallable(functions, 'clearDemoOrders')();
        const data = result.data as { removed: number };
        toast({ title: 'Demo Orders Removed', description: `${data.removed.toLocaleString()} seeded orders removed.` });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: kind === 'seed' ? 'Could Not Add Demo Orders' : 'Could Not Remove Demo Orders', description: e?.message || 'Please try again.' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-2 shadow-sm p-8 space-y-5 text-left">
      <div className="space-y-2">
        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
          <Database className="h-4 w-4" /> Demo Data
        </h4>
        <p className="text-[10px] font-medium text-muted-foreground leading-relaxed max-w-xl">
          Fills the demo golf course (Beverage Cart and Clubhouse) with past orders from made-up patrons, so the venue
          admin charts, sales report and patron list have something to show in a demo. Running it again replaces the
          earlier set. These orders send no texts or alerts and are all marked as demo data; the sales report days
          they create are cleared along with them.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Days of history
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            disabled={busy !== null}
            className="h-12 rounded-md border-2 bg-white px-3 font-bold text-sm text-[#213147]"
            aria-label="Days of history"
          >
            {[30, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
          </select>
        </label>
        <Button type="button" onClick={() => run('seed')} disabled={busy !== null} className="h-12 px-6 font-black uppercase text-[10px] tracking-widest gap-2">
          {busy === 'seed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sprout className="h-4 w-4" />} Add Demo Orders
        </Button>
        <Button type="button" variant="outline" onClick={() => run('clear')} disabled={busy !== null} className="h-12 px-6 border-2 font-black uppercase text-[10px] tracking-widest gap-2">
          {busy === 'clear' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Remove Demo Orders
        </Button>
      </div>
    </Card>
  );
}
