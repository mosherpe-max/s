'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/types';

interface OrderStatusProps {
    currentStatus: Order['status'];
    menuType?: string;
}

const statusLabelMap: Record<string, string> = {
  'Placed': 'Order Placed',
  'Preparing': 'Order Received',
  'Out for Delivery': 'Out for Delivery',
  'Delivered': 'Order Complete'
};

export function OrderStatus({ currentStatus }: OrderStatusProps) {
  const steps = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];
  const currentStatusIndex = steps.indexOf(currentStatus);
  
  // Effective index for progress bar width
  const effectiveStatusIndex = currentStatusIndex === -1 ? 0 : currentStatusIndex;

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        {steps.map((status, index) => (
          <div
            key={status}
            className={cn(
              "text-[9px] uppercase tracking-wider text-center flex-1 transition-colors duration-500 px-1",
              index <= effectiveStatusIndex ? 'text-accent font-bold' : 'text-muted-foreground/60'
            )}
          >
            {statusLabelMap[status] || status}
          </div>
        ))}
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-accent h-2 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${(effectiveStatusIndex / (steps.length - 1)) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}
