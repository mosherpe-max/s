'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/types';

interface OrderStatusProps {
    currentStatus: Order['status'];
    menuType?: string;
}

export function OrderStatus({ currentStatus, menuType }: OrderStatusProps) {
  const statuses = useMemo(() => {
    // If it's a beverage cart order, skip "Preparing"
    if (menuType === 'Beverage Cart') {
      return ['Placed', 'Out for Delivery', 'Delivered'];
    }
    return ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];
  }, [menuType]);

  const currentStatusIndex = statuses.indexOf(currentStatus);
  
  // If the current status isn't in our simplified list (e.g. 'Preparing' for a bev cart order)
  // we treat it as the previous valid status
  const effectiveStatusIndex = currentStatusIndex === -1 
    ? (currentStatus === 'Preparing' ? 0 : -1) 
    : currentStatusIndex;

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        {statuses.map((status, index) => (
          <div
            key={status}
            className={cn(
              "text-[10px] uppercase tracking-wider text-center flex-1 transition-colors duration-500",
              index <= effectiveStatusIndex ? 'text-accent font-bold' : 'text-muted-foreground/60'
            )}
          >
            {status}
          </div>
        ))}
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-accent h-2 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${effectiveStatusIndex >= 0 ? (effectiveStatusIndex / (statuses.length - 1)) * 100 : 0}%` }}
        ></div>
      </div>
    </div>
  );
}
