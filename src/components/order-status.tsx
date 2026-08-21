'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/types';
import { Check, Clock, Timer, Truck, CheckCircle2 } from 'lucide-react';

interface OrderStatusProps {
    currentStatus: Order['status'];
    menuType?: string;
}

const steps = [
  { id: 'Placed', label: 'Placed', icon: Clock },
  { id: 'Preparing', label: 'Prep', icon: Timer },
  { id: 'Out for Delivery', label: 'In Transit', icon: Truck },
  { id: 'Delivered', label: 'Done', icon: CheckCircle2 }
];

export function OrderStatus({ currentStatus }: OrderStatusProps) {
  const currentStatusIndex = steps.findIndex(s => s.id === currentStatus);
  
  // Progress Width calculation:
  // Placed = 25% 
  // Preparing = 50%
  // Out for Delivery = 75%
  // Delivered = 100%
  const progressWidth = useMemo(() => {
    if (currentStatusIndex === -1) return 0;
    return ((currentStatusIndex + 1) / steps.length) * 100;
  }, [currentStatusIndex]);

  return (
    <div className="w-full space-y-4">
      {/* HEADER: Current Status Highlight */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
           <div className="p-1.5 bg-primary/10 rounded-lg">
             <span className="text-primary">
               {React.createElement(steps[currentStatusIndex]?.icon || Clock, { className: "h-3.5 w-3.5" })}
             </span>
           </div>
           <div className="flex flex-col text-left">
             <span className="text-[10px] font-black uppercase tracking-widest text-[#213147] leading-none mb-0.5">
               Status: {steps[currentStatusIndex]?.label || currentStatus}
             </span>
             <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Live Delivery Feed</span>
           </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">
            {Math.round(progressWidth)}%
          </span>
        </div>
      </div>

      {/* MAIN PROGRESS BAR */}
      <div className="relative">
        <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden border shadow-inner">
          <div 
            className="absolute inset-y-0 left-0 bg-primary transition-all duration-1000 ease-out flex items-center justify-end overflow-hidden"
            style={{ width: `${progressWidth}%` }}
          >
            {/* High-fidelity striped animation for active status */}
            {currentStatus !== 'Delivered' && (
              <div className="h-full w-full bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]" />
            )}
          </div>
        </div>
      </div>

      {/* MILESTONE GRID */}
      <div className="grid grid-cols-4 gap-1">
        {steps.map((step, index) => {
          const isCompleted = index < currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          const isActive = index <= currentStatusIndex;

          return (
            <div key={step.id} className="space-y-2 flex flex-col items-center">
              {/* Vertical Tick */}
              <div className={cn(
                "h-1 w-full rounded-full transition-all duration-500",
                isActive ? "bg-primary" : "bg-slate-200"
              )} />
              
              {/* Label & Icon */}
              <div className={cn(
                "flex flex-col items-center gap-1 transition-opacity duration-300",
                isActive ? "opacity-100" : "opacity-30"
              )}>
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-tighter text-center leading-none",
                  isCurrent ? "text-primary" : "text-[#213147]"
                )}>
                  {step.label}
                </span>
                {isCompleted ? (
                  <Check className="h-2 w-2 text-primary" />
                ) : isCurrent ? (
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                ) : (
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
