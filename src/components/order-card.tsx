'use client';

import { useState, useEffect } from 'react';
import type { Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Clock, AlertTriangle, ChevronRight, CheckCircle2, Truck, Timer } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn, getNumericOrderId } from '@/lib/utils';

interface OrderCardProps {
  order: Order;
  orderNumber: number;
  onUpdateStatus: (id: string, currentStatus: string) => void;
  thresholds?: { warning: number; max: number };
  now: number;
}

const getStatusConfig = (status: Order['status']) => {
  const config: Record<Order['status'], { label: string, icon: any, variant: 'default' | 'secondary' | 'outline' }> = {
    'Placed': { label: 'NEW', icon: Clock, variant: 'secondary' },
    'Preparing': { label: 'PREP', icon: Timer, variant: 'default' },
    'Out for Delivery': { label: 'TRANSIT', icon: Truck, variant: 'outline' },
    'Delivered': { label: 'DONE', icon: CheckCircle2, variant: 'default' },
    'Cancelled': { label: 'VOID', icon: AlertTriangle, variant: 'outline' },
  };
  
  // Return config or a safe fallback to prevent "cannot read properties of undefined"
  return config[status] || { label: '???', icon: Clock, variant: 'outline' };
};

const DEFAULT_THRESHOLDS: Record<string, { warning: number; max: number }> = {
  'Beverage Cart': { warning: 10, max: 15 },
  'Clubhouse': { warning: 15, max: 20 },
  'Lane Delivery': { warning: 10, max: 15 },
  'Take Out': { warning: 15, max: 25 }
};

export function OrderCard({ order, orderNumber, onUpdateStatus, thresholds, now }: OrderCardProps) {
  const statusInfo = getStatusConfig(order.status);
  
  // Defensive calculation for minutes elapsed
  const orderTime = order.createdAt?.toDate?.()?.getTime() || now;
  const minutesElapsed = Math.floor((now - orderTime) / 60000);
  
  const modeDefaults = DEFAULT_THRESHOLDS[order.menuType] || { warning: 15, max: 20 };
  const warningThreshold = thresholds?.warning || modeDefaults.warning;
  const maxThreshold = thresholds?.max || modeDefaults.max;
  
  const isOverdue = minutesElapsed >= maxThreshold;
  const isWarning = minutesElapsed >= warningThreshold && !isOverdue;

  return (
    <Card className={cn(
      'overflow-hidden flex flex-col border-2 transition-all duration-300 shadow-sm',
      isOverdue 
        ? 'border-destructive bg-red-50 ring-2 ring-destructive/20' 
        : (isWarning ? 'border-amber-400 bg-amber-50' : 'border-slate-100 hover:border-slate-200')
    )}>
      {/* COMPACT HEADER */}
      <CardHeader className="p-2.5 bg-white border-b flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center justify-center w-5 h-5 rounded-md font-black text-white text-[9px]",
            isOverdue ? 'bg-destructive' : 'bg-[#213147]'
          )}>
            {orderNumber}
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase text-[#213147] tracking-tight leading-none truncate max-w-[100px]">
              {order.customerName}
            </span>
            <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
              #{getNumericOrderId(order.id)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
           <div className={cn(
             "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase",
             isOverdue ? "bg-destructive text-white" : "bg-slate-100 text-slate-500"
           )}>
             {isOverdue && <AlertTriangle className="h-2 w-2" />}
             {minutesElapsed}m
           </div>
           <Badge variant={statusInfo.variant} className="h-4 px-1 text-[7px] font-black uppercase border-0">
             {statusInfo.label}
           </Badge>
        </div>
      </CardHeader>

      {/* COMPACT CONTENT */}
      <CardContent className="p-2.5 flex-1 space-y-2">
        <div className="space-y-0.5">
          {order.items.map(item => (
            <div key={item.cartId} className="flex justify-between text-[9px] leading-tight">
              <span className="font-bold text-slate-700 truncate max-w-[140px]">{item.quantity}x {item.name}</span>
              <span className="font-mono text-slate-400 shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        
        {order.menuTypeLocation && (
          <div className="flex items-center gap-1 text-[8px] font-black text-primary uppercase border-t pt-1.5">
            <Clock className="h-2 w-2" /> {order.menuTypeLocation}
          </div>
        )}
      </CardContent>

      {/* COMPACT FOOTER */}
      <CardFooter className="p-1 bg-slate-50 border-t gap-1">
        <Button 
          variant={isOverdue ? "destructive" : "default"}
          className="flex-1 h-7 text-[8px] font-black uppercase tracking-widest gap-1 rounded-sm" 
          onClick={() => onUpdateStatus(order.id, order.status)}
          disabled={order.status === 'Delivered' || order.status === 'Cancelled'}
        >
          {order.status === 'Placed' && "Prepare"}
          {order.status === 'Preparing' && "Dispatch"}
          {order.status === 'Out for Delivery' && "Deliver"}
          {order.status === 'Delivered' && "Complete"}
          <ChevronRight className="h-2.5 w-2.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}