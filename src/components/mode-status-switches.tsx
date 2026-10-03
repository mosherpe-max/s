'use client';

import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface ModeStatusSwitchesProps {
  isActive: boolean;
  // True when new orders are held, whether staff, the venue admin or the
  // automatic queue limit paused the mode.
  isPaused: boolean;
  onActiveChange: (active: boolean) => void;
  // Called with true to pause (callers confirm first) and false to resume.
  onPausedChange: (paused: boolean) => void;
}

// The two controls at the top of each service mode card on the venue dashboard:
// Active (is this mode offered at all) and Paused (hold new orders for now).
export function ModeStatusSwitches({ isActive, isPaused, onActiveChange, onPausedChange }: ModeStatusSwitchesProps) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center gap-1">
        <span className={cn("text-[7px] font-black uppercase tracking-widest leading-none", isActive ? "text-green-600" : "text-muted-foreground")}>
          {isActive ? 'Active' : 'Not Active'}
        </span>
        <Switch aria-label="Service mode active" checked={isActive} onCheckedChange={onActiveChange} className="data-[state=checked]:bg-green-500 scale-75" />
      </div>
      <div className={cn("flex flex-col items-center gap-1", !isActive && "opacity-50")}>
        <span className={cn("text-[7px] font-black uppercase tracking-widest leading-none", isPaused ? "text-amber-600" : "text-muted-foreground")}>
          {isPaused ? 'Paused' : 'Pause'}
        </span>
        <Switch aria-label="Pause new orders" checked={isPaused} disabled={!isActive} onCheckedChange={onPausedChange} className="data-[state=checked]:bg-amber-500 scale-75" />
      </div>
    </div>
  );
}
