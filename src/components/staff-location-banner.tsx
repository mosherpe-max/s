'use client';

import { Loader2, MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { locationNotice, type StaffLocationStatus } from '@/lib/staff-location';

// Sits over the staff map. Silent once the position is being shared; otherwise says what is going on and,
// where it helps, offers a retry.
export function StaffLocationBanner({ status, onRetry }: { status: StaffLocationStatus; onRetry: () => void }) {
  const notice = locationNotice(status);
  if (!notice) return null;
  return (
    <div
      role="status"
      className={cn(
        'absolute bottom-3 left-3 right-3 z-10 rounded-xl border-2 p-3 shadow-lg text-left flex items-start gap-3',
        notice.tone === 'warn' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-white/95 border-slate-200 text-slate-700',
      )}
    >
      {notice.tone === 'warn'
        ? <MapPinOff className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
        : <Loader2 className="h-4 w-4 mt-0.5 shrink-0 animate-spin" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black uppercase tracking-wide">{notice.title}</p>
        <p className="text-[10px] font-semibold leading-snug">{notice.detail}</p>
      </div>
      {notice.canRetry && (
        <Button type="button" size="sm" variant="outline" onClick={onRetry} className="h-8 shrink-0 border-2 text-[9px] font-black uppercase tracking-widest">
          Try Again
        </Button>
      )}
    </div>
  );
}
