'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/types';
import { Check, Clock, Timer, Truck, CheckCircle2 } from 'lucide-react';

interface OrderStatusProps {
    currentStatus: Order['status'];
    menuType?: string;
    isDark?: boolean;
}

const steps = [
  { id: 'Placed', label: 'Placed', icon: Clock },
  { id: 'Preparing', label: 'Acknowledged', icon: Timer },
  { id: 'Out for Delivery', label: 'Out for Delivery', icon: Truck },
  { id: 'Delivered', label: 'Delivered', icon: CheckCircle2 }
];

export function OrderStatus({ currentStatus, isDark }: OrderStatusProps) {
  const currentStatusIndex = steps.findIndex(s => s.id === currentStatus);

  return (
    <div className="w-full">
      {/* MILESTONE GRID - The primary segmented progress indicator */}
      <div className="grid grid-cols-4 gap-1.5">
        {steps.map((step, index) => {
          const isCompleted = index < currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          const isActive = index <= currentStatusIndex;

          return (
            <div key={step.id} className="space-y-2.5 flex flex-col items-center">
              {/* Segment Segment / Vertical Tick */}
              <div className={cn(
                "h-1.5 w-full rounded-full transition-all duration-700 relative overflow-hidden",
                isActive ? "bg-primary" : (isDark ? "bg-white/10" : "bg-slate-200")
              )}>
                {isCurrent && currentStatus !== 'Delivered' && (
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]" />
                )}
              </div>
              
              {/* Label & Icon */}
              <div className={cn(
                "flex flex-col items-center gap-1.5 transition-all duration-500",
                isActive ? "opacity-100 scale-100" : (isDark ? "opacity-20 scale-95" : "opacity-30 scale-95")
              )}>
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-tighter text-center leading-tight h-5 flex items-center",
                  // VISIBILITY OPTIMIZATION: Ensure text is white in dark mode to prevent red-on-blue vibration
                  isCurrent 
                    ? (isDark ? "text-white" : "text-primary") 
                    : (isDark ? "text-white/70" : "text-[#213147]")
                )}>
                  {step.label}
                </span>
                <div className={cn(
                  "flex items-center justify-center rounded-full transition-colors",
                  isCurrent ? "h-2 w-2 bg-primary animate-pulse" : (isCompleted ? "" : (isDark ? "h-1 w-1 bg-white/40" : "h-1 w-1 bg-slate-400"))
                )}>
                  {isCompleted && (
                    <Check className={cn(
                      "h-2.5 w-2.5",
                      isDark ? "text-white" : "text-primary"
                    )} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
