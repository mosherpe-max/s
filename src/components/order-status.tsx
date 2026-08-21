'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/types';
import { Check, Clock, Timer, Truck, CheckCircle2 } from 'lucide-react';

interface OrderStatusProps {
    currentStatus: Order['status'];
    menuType?: string;
}

const statusConfig: Record<string, { label: string, icon: any }> = {
  'Placed': { label: 'Order Received', icon: Clock },
  'Preparing': { label: 'In Preparation', icon: Timer },
  'Out for Delivery': { label: 'Out for Delivery', icon: Truck },
  'Delivered': { label: 'Order Complete', icon: CheckCircle2 }
};

export function OrderStatus({ currentStatus }: OrderStatusProps) {
  const steps = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];
  const currentStatusIndex = steps.indexOf(currentStatus);
  
  // Progress Logic: 
  // Placed = 25% (First block active)
  // Preparing = 50%
  // Out for Delivery = 75%
  // Delivered = 100%
  const progressWidth = useMemo(() => {
    if (currentStatusIndex === -1) return 0;
    return ((currentStatusIndex + 1) / steps.length) * 100;
  }, [currentStatusIndex]);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
           <div className="p-1.5 bg-primary/10 rounded-lg">
             {React.createElement(statusConfig[currentStatus]?.icon || Clock, { className: "h-3.5 w-3.5 text-primary" })}
           </div>
           <span className="text-xs font-black uppercase tracking-tight text-[#213147]">
             {statusConfig[currentStatus]?.label || currentStatus}
           </span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-primary">
          {Math.round(progressWidth)}%
        </span>
      </div>

      <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden border">
        <div 
          className="absolute inset-y-0 left-0 bg-primary transition-all duration-1000 ease-out flex items-center justify-end overflow-hidden"
          style={{ width: `${progressWidth}%` }}
        >
          <div className="h-full w-full bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {steps.map((status, index) => {
          const isActive = index <= currentStatusIndex;
          return (
            <div
              key={status}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                isActive ? "bg-primary" : "bg-slate-100"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
