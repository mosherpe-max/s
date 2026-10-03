'use client';

import { useState } from 'react';
import { RefreshCcw, Satellite } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getLocationFixSteps } from '@/lib/patron-location';

// Shown on the order tracking screen when the phone is blocking location, so the
// patron knows why staff can't see them and how to turn it back on.
export function LocationBlockedCard({ onRetry }: { onRetry: () => void }) {
  const [showSteps, setShowSteps] = useState(false);
  return (
    <div className="rounded-2xl p-4 shadow-md border-2 bg-red-50 border-red-200 space-y-3 text-left">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl shrink-0 bg-red-500 text-white"><Satellite className="h-5 w-5" /></div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-red-700">Location is turned off</p>
          <p className="text-[10px] font-bold text-red-600/80 mt-0.5">Your driver can&apos;t see where to bring your order. Turn location on so they can find you.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onRetry} className="h-9 px-3 font-black uppercase text-[10px] gap-2"><RefreshCcw className="h-3 w-3" /> Try again</Button>
        <Button size="sm" variant="outline" onClick={() => setShowSteps((v) => !v)} className="h-9 px-3 bg-white border-red-200 text-red-600 font-black uppercase text-[10px]">
          {showSteps ? 'Hide steps' : 'How to turn it on'}
        </Button>
      </div>
      {showSteps && (
        <ol className="list-decimal pl-5 space-y-1 text-[11px] font-semibold text-red-800">
          {getLocationFixSteps().map((s) => <li key={s}>{s}</li>)}
        </ol>
      )}
    </div>
  );
}
