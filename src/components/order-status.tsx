'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/types';

const statuses: Order['status'][] = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];

interface OrderStatusProps {
    currentStatus: Order['status'];
}

export function OrderStatus({ currentStatus }: OrderStatusProps) {
  const currentStatusIndex = statuses.indexOf(currentStatus);

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        {statuses.map((status, index) => (
          <div
            key={status}
            className={cn(
              "text-xs text-center flex-1 transition-colors duration-500",
              index <= currentStatusIndex ? 'text-accent font-semibold' : 'text-muted-foreground'
            )}
          >
            {status}
          </div>
        ))}
      </div>
      <div className="w-full bg-muted rounded-full h-2.5">
        <div
          className="bg-accent h-2.5 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${currentStatusIndex >= 0 ? (currentStatusIndex / (statuses.length - 1)) * 100 : 0}%` }}
        ></div>
      </div>
    </div>
  );
}
