
'use client';

import { useState, useEffect } from 'react';
import type { Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Navigation, PartyPopper, ClipboardList, Send, MoveHorizontal, User, Satellite, Clock, MapPin, Smartphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import { cn, getDriverColor, getNumericOrderId } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getStatusConfig = (status: Order['status']) => {
  const config: Record<Order['status'], { label: string, badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    'Placed': { label: 'PENDING', badgeVariant: 'secondary' },
    'Preparing': { label: 'CONFIRMED', badgeVariant: 'default' },
    'Out for Delivery': { label: 'OUT FOR DELIVERY', badgeVariant: 'outline' },
    'Delivered': { label: 'DELIVERED', badgeVariant: 'default' },
    'Cancelled': { label: 'CANCELLED', badgeVariant: 'destructive' },
  };
  return config[status];
};

export function OrderCard({ order, orderNumber, onUpdateStatus, thresholds, now }: { order: Order; orderNumber: number; onUpdateStatus: (id: string, status: Order['status']) => void; thresholds?: { warning: number; max: number }; now?: number; }) {
  const statusInfo = getStatusConfig(order.status);
  const minutesElapsed = order.createdAt && now ? Math.floor((now - order.createdAt.toDate().getTime()) / 60000) : 0;
  const isExceeded = thresholds && minutesElapsed >= thresholds.max;
  const isWarning = thresholds && minutesElapsed >= thresholds.warning && !isExceeded;

  return (
    <Card className={cn('overflow-hidden flex flex-col h-full border-2', isExceeded ? 'border-destructive bg-red-50' : (isWarning ? 'border-yellow-500 bg-yellow-50' : 'border-muted'))}>
      <CardHeader className="p-4 bg-muted/30">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={cn("flex items-center justify-center w-8 h-8 rounded-full font-black text-white text-xs", isExceeded ? 'bg-red-600' : (isWarning ? 'bg-yellow-500' : 'bg-green-600'))}>
              {orderNumber}
            </div>
            <CardTitle className="text-sm font-black uppercase truncate max-w-[120px]">{order.customerName}</CardTitle>
          </div>
          <Badge variant={statusInfo.badgeVariant} className="text-[8px] font-black uppercase">{statusInfo.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3 flex-1">
        <div className="space-y-2">
          {order.items.map(item => (
            <div key={item.cartId} className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span>{item.quantity}x {item.name}</span>
                <span className="font-mono text-muted-foreground">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
              {item.selectedModifiers && Object.values(item.selectedModifiers).flat().length > 0 && (
                <div className="flex flex-wrap gap-1 pl-4">
                  {Object.values(item.selectedModifiers).flat().map((mod, idx) => (
                    <span key={`${item.cartId}-mod-${idx}`} className="text-[8px] font-bold bg-primary/5 text-primary px-1.5 py-0.5 rounded uppercase">
                      + {mod.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <Separator className="border-dashed" />
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black uppercase text-muted-foreground">TOTAL</span>
          <span className="font-mono font-black text-primary">${order.total.toFixed(2)}</span>
        </div>
      </CardContent>
      <CardFooter className="p-2 border-t">
        {order.status === 'Placed' && <Button className="w-full text-[10px] font-bold uppercase h-9" onClick={() => onUpdateStatus(order.id, 'Preparing')}>Confirm Order</Button>}
        {order.status === 'Preparing' && <Button className="w-full text-[10px] font-bold uppercase h-9" onClick={() => onUpdateStatus(order.id, 'Out for Delivery')}>Start Delivery</Button>}
        {order.status === 'Out for Delivery' && <Button className="w-full text-[10px] font-bold uppercase h-9 bg-green-600 hover:bg-green-700" onClick={() => onUpdateStatus(order.id, 'Delivered')}>Delivered</Button>}
      </CardFooter>
    </Card>
  );
}
