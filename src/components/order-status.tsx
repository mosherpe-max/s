'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const statuses = ['Order Placed', 'Preparing', 'Out for Delivery', 'Delivered'];

export function OrderStatus() {
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);

  useEffect(() => {
    // Simulate order progress
    if (currentStatusIndex < statuses.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStatusIndex(prev => prev + 1);
      }, 5000); // Advance status every 5 seconds
      return () => clearTimeout(timer);
    }
  }, [currentStatusIndex]);

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
          style={{ width: `${(currentStatusIndex / (statuses.length - 1)) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}
