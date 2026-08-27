'use client';

import { useState, useEffect } from 'react';
import type { Order, OrderFulfillmentThresholds } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Clock, AlertTriangle, ChevronRight, CheckCircle2, Truck, Timer, Satellite, User, UserPlus, MapPin, MessageSquare } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn, getNumericOrderId } from '@/lib/utils';

interface OrderCardProps {
  order: Order;
  orderNumber: number;
  onUpdateStatus: (id: string, currentStatus: string) => void;
  onAttach?: (id: string) => void;
  onRefreshLocation?: (id: string) => void;
  currentStaffId?: string;
  thresholds?: OrderFulfillmentThresholds;
  now: number;
  smsEnabled?: boolean;
}

const getStatusConfig = (status: Order['status']) => {
  const config: Record<Order['status'], { label: string, icon: any, variant: 'default' | 'secondary' | 'outline' }> = {
    'Placed': { label: 'NEW', icon: Clock, variant: 'secondary' },
    'Preparing': { label: 'PREP', icon: Timer, variant: 'default' },
    'Out for Delivery': { label: 'TRANSIT', icon: Truck, variant: 'outline' },
    'Delivered': { label: 'DONE', icon: CheckCircle2, variant: 'default' },
    'Cancelled': { label: 'VOID', icon: AlertTriangle, variant: 'outline' },
  };
  
  return config[status] || { label: '???', icon: Clock, variant: 'outline' };
};

const DEFAULT_THRESHOLDS: OrderFulfillmentThresholds = { 
  maxOrderAcknowledgeSeconds: 120,
  warningOrderProcessingMinutes: 15, 
  maxOrderProcessingMinutes: 25 
};

export function OrderCard({ 
  order, 
  orderNumber, 
  onUpdateStatus, 
  onAttach, 
  onRefreshLocation,
  currentStaffId, 
  thresholds, 
  now,
  smsEnabled 
}: OrderCardProps) {
  const statusInfo = getStatusConfig(order.status);
  
  // Calculate Order Duration
  const orderTime = order.createdAt?.toDate?.()?.getTime() || now;
  const minutesElapsed = Math.floor((now - orderTime) / 60000);
  
  // Calculate GPS Freshness
  const lastGpsTime = order.lastGpsUpdate?.toDate?.()?.getTime() || null;
  const gpsMinutesElapsed = lastGpsTime ? Math.floor((now - lastGpsTime) / 60000) : null;
  
  // Fulfillment Threshold Logic
  const t = thresholds || DEFAULT_THRESHOLDS;
  
  const isOverdue = minutesElapsed >= t.maxOrderProcessingMinutes;
  const isWarning = minutesElapsed >= t.warningOrderProcessingMinutes && !isOverdue;

  const isAssignedToMe = currentStaffId && order.assignedStaffId === currentStaffId;
  const isAssignedToOther = order.assignedStaffId && order.assignedStaffId !== currentStaffId;

  // GPS Freshness UI Config
  const getGpsStatus = () => {
    if (gpsMinutesElapsed === null) return { label: 'NO GPS', color: 'text-slate-300', isStale: false };
    if (gpsMinutesElapsed < 1) return { label: 'LIVE', color: 'text-green-500', isStale: false };
    if (gpsMinutesElapsed < 3) return { label: `${gpsMinutesElapsed}m ago`, color: 'text-green-500', isStale: false };
    if (gpsMinutesElapsed < 5) return { label: `${gpsMinutesElapsed}m ago`, color: 'text-amber-500', isStale: true };
    return { label: `${gpsMinutesElapsed}m ago`, color: 'text-red-500', isStale: true };
  };

  const gpsStatus = getGpsStatus();

  // Condition for showing the location label
  const showLocationLabel = order.menuTypeLocation || order.menuType === 'Lane Delivery';

  // SMS Availability for location refresh - Allowed in Placed, Preparing, or Out for Delivery
  const canSendRefreshRequest = !!(smsEnabled && onRefreshLocation && (order.status === 'Placed' || order.status === 'Preparing' || order.status === 'Out for Delivery'));

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
      <CardContent className="p-2.5 flex-1 space-y-3">
        <div className="space-y-2">
          {order.items.map(item => (
            <div key={item.cartId} className="flex flex-col py-1 border-b border-slate-50 last:border-0">
              <div className="flex justify-between text-sm leading-tight">
                <span className="font-black text-[#213147] truncate flex-1 uppercase">
                  {item.quantity}x {item.name}
                </span>
                <span className="font-mono text-slate-500 font-bold shrink-0 ml-2">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
              {/* MENU MODIFIERS SECTION */}
              {item.selectedModifiers && Object.values(item.selectedModifiers).flat().length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 pl-1">
                  {Object.values(item.selectedModifiers).flat().map((mod, idx) => (
                    <Badge 
                      key={`${item.cartId}-mod-${idx}`} 
                      variant="outline" 
                      className="text-[7px] font-black uppercase h-3.5 px-1.5 border-primary/20 bg-primary/5 text-primary"
                    >
                      {mod.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-between items-center pt-2 border-t border-dashed mt-1">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Value</span>
            <span className="text-base font-black text-primary font-mono">${(order.total || 0).toFixed(2)}</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-1 border-t pt-1.5">
          <div className="flex items-center justify-between">
            {/* DELIVERY LOCATION */}
            {showLocationLabel ? (
              <div className="flex items-center gap-1.5 text-sm font-black text-primary uppercase">
                <MapPin className="h-3.5 w-3.5" /> {order.menuTypeLocation || 'Standard'}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[8px] font-black uppercase text-muted-foreground">
                <MapPin className="h-2.5 w-2.5 opacity-40" /> GPS Tracked
              </div>
            )}
            
            {/* GPS FRESHNESS INDICATOR */}
            <div className="flex items-center gap-1 text-[8px] font-black uppercase">
              <Satellite className={cn("h-2 w-2", gpsStatus.color)} />
              <span className={cn(gpsStatus.color)}>{gpsStatus.label}</span>
            </div>
          </div>

          {/* STAFF ASSIGNMENT INFO */}
          <div className="flex items-center justify-between bg-muted/30 rounded px-1.5 py-1">
            <div className="flex items-center gap-1">
              <User className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[7px] font-black uppercase text-muted-foreground">Staff:</span>
              <span className="text-[8px] font-black uppercase text-[#213147] truncate max-w-[80px]">
                {isAssignedToMe ? 'YOU' : (order.assignedStaffName || 'Unassigned')}
              </span>
            </div>
            {onAttach && (!order.assignedStaffId || isAssignedToOther) && order.status !== 'Delivered' && (
              <button 
                onClick={() => onAttach(order.id)}
                className="text-[7px] font-black uppercase text-primary hover:underline flex items-center gap-0.5"
              >
                <UserPlus className="h-2 w-2" /> {order.assignedStaffId ? 'Reattach' : 'Attach'}
              </button>
            )}
          </div>
        </div>
      </CardContent>

      {/* COMPACT FOOTER */}
      <CardFooter className="p-1 bg-slate-50 border-t flex gap-1">
        {canSendRefreshRequest && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRefreshLocation!(order.id)}
            className={cn(
              "h-7 px-2 text-[8px] font-black uppercase tracking-widest border-2 gap-1 rounded-sm transition-all",
              gpsStatus.isStale 
                ? "bg-red-600 border-red-600 text-white animate-pulse hover:bg-red-700" 
                : "border-primary/20 text-primary hover:bg-primary/5"
            )}
            title="Ping patron for fresh location"
          >
            <MapPin className="h-2.5 w-2.5" />
            Pin
          </Button>
        )}
        <Button 
          variant={isOverdue ? "destructive" : "default"}
          className="flex-1 h-7 text-[8px] font-black uppercase tracking-widest gap-1 rounded-sm" 
          onClick={() => onUpdateStatus(order.id, order.status)}
          disabled={order.status === 'Delivered' || order.status === 'Cancelled'}
        >
          {order.status === 'Placed' && "Receive Order"}
          {order.status === 'Preparing' && "Deliver Order"}
          {order.status === 'Out for Delivery' && "Order Complete"}
          {order.status === 'Delivered' && "Complete"}
          <ChevronRight className="h-2.5 w-2.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}
