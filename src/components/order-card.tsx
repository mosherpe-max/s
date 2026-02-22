
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
    'Placed': {
      label: 'PENDING',
      badgeVariant: 'secondary'
    },
    'Preparing': {
      label: 'CONFIRMED',
      badgeVariant: 'default'
    },
    'Out for Delivery': {
      label: 'OUT FOR DELIVERY',
      badgeVariant: 'outline'
    },
    'Delivered': {
      label: 'DELIVERED',
      badgeVariant: 'default'
    },
    'Cancelled': {
      label: 'CANCELLED',
      badgeVariant: 'destructive'
    },
  };
  return config[status];
};

interface AvailableDriver {
  id: string;
  name: string;
}

export function OrderCard({ 
  order, 
  orderNumber, 
  onUpdateStatus, 
  onHandoff,
  availableDrivers = [],
  currentDriverId = 'demo-course',
  thresholds,
  now
}: { 
  order: Order; 
  orderNumber: number; 
  onUpdateStatus: (id: string, status: Order['status'], driverId?: string) => void; 
  onHandoff?: (orderId: string, targetDriverId: string) => void;
  availableDrivers?: AvailableDriver[];
  currentDriverId?: string;
  thresholds?: { warning: number; max: number };
  now?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const statusInfo = getStatusConfig(order.status);

  useEffect(() => {
    setMounted(true);
  }, []);

  const assignedDriverId = order.assignedDriverId;
  const driverColor = assignedDriverId ? getDriverColor(assignedDriverId) : null;
  const isAssignedToMe = assignedDriverId === currentDriverId;
  const canHandoff = (order.status === 'Preparing' || order.status === 'Out for Delivery') && availableDrivers.length > 0;

  // Duration Logic
  const minutesElapsed = order.createdAt && now 
    ? Math.floor((now - order.createdAt.toDate().getTime()) / 60000) 
    : 0;
  
  const isExceeded = thresholds && minutesElapsed >= thresholds.max;
  const isWarning = thresholds && minutesElapsed >= thresholds.warning && !isExceeded;

  // GPS Freshness Logic
  const gpsMinutesOld = order.lastGpsUpdate && now 
    ? Math.floor((now - order.lastGpsUpdate.toDate().getTime()) / 60000) 
    : null;
  
  const isGpsStale = gpsMinutesOld !== null && gpsMinutesOld >= 3;
  const isIosWarning = order.buyerDeviceStatus === 'ios-browser' && isGpsStale;

  const renderAction = () => {
    switch (order.status) {
      case 'Placed':
        return (
          <Button className="w-full font-headline font-bold uppercase text-[11px] h-11 shadow-sm" onClick={() => onUpdateStatus(order.id, 'Preparing', currentDriverId)}>
            <Send className="mr-2 h-4 w-4" />
            Confirm Order
          </Button>
        );
      case 'Preparing':
        return (
          <div className="flex gap-2 w-full">
            <Button className="flex-1 font-headline font-bold uppercase text-[11px] h-11 shadow-sm" onClick={() => onUpdateStatus(order.id, 'Out for Delivery', currentDriverId)}>
              <Navigation className="mr-2 h-4 w-4" />
              {order.menuType === 'Lane Delivery' ? 'Serving Now' : 'Start Delivery'}
            </Button>
            {canHandoff && renderHandoffButton()}
          </div>
        );
      case 'Out for Delivery':
        return (
          <div className="flex gap-2 w-full">
            <Button className="flex-1 font-headline font-bold uppercase text-[11px] h-11 shadow-sm bg-green-600 hover:bg-green-700" onClick={() => onUpdateStatus(order.id, 'Delivered')}>
              <PartyPopper className="mr-2 h-4 w-4" />
              Complete Order
            </Button>
            {canHandoff && renderHandoffButton()}
          </div>
        );
      default:
        return null;
    }
  }

  const renderHandoffButton = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 border-primary/20 hover:bg-primary/10">
          <MoveHorizontal className="h-5 w-5 text-primary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Handoff Order To:</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableDrivers.map(driver => (
          <DropdownMenuItem 
            key={driver.id} 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onHandoff?.(order.id, driver.id)}
          >
            <div className={cn("w-2 h-2 rounded-full bg-primary", `bg-${getDriverColor(driver.id)}`)} />
            <span className="font-medium text-sm">{driver.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const numericId = getNumericOrderId(order.id);

  const colorMap: Record<string, string> = {
    'indigo-600': 'border-indigo-600',
    'blue-600': 'border-blue-600',
    'purple-600': 'border-purple-600',
    'pink-600': 'border-pink-600',
    'cyan-600': 'border-cyan-600',
    'fuchsia-600': 'border-fuchsia-600',
    'violet-600': 'border-violet-600',
  };

  const borderColorClass = isExceeded 
    ? 'border-destructive' 
    : (isWarning ? 'border-yellow-500' : (driverColor ? colorMap[driverColor] : 'border-muted'));
  
  const borderThickness = (assignedDriverId || isExceeded || isWarning) ? 'border-[3px]' : 'border-2';

  return (
    <Card className={cn(
      'overflow-hidden flex flex-col h-full transition-all duration-300 w-full max-w-full shadow-sm',
      borderThickness,
      borderColorClass,
      isExceeded ? 'bg-red-50' : (isWarning ? 'bg-yellow-50' : 'bg-card'),
      !assignedDriverId && 'opacity-95 hover:opacity-100',
      isAssignedToMe && !isExceeded && 'shadow-md ring-1 ring-primary/10'
    )}>
      <CardHeader className={cn('flex flex-col p-4 gap-3', isExceeded ? 'bg-red-100/50' : (isWarning ? 'bg-yellow-100/50' : 'bg-muted/30'))}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Numbered Badge - Linked to Map Marker */}
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full font-black text-sm text-white shadow-md shrink-0 border-2 border-white",
              isExceeded ? 'bg-red-600' : (isWarning ? 'bg-yellow-500' : 'bg-green-600')
            )}>
              {orderNumber}
            </div>
            
            <div className="min-w-0">
              <CardTitle className='text-sm font-black uppercase tracking-tight truncate leading-tight'>
                {order.customerName}
              </CardTitle>
              {order.menuTypeLocation && (
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                    {order.menuTypeLocation}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            {statusInfo && (
              <Badge variant={isExceeded ? 'destructive' : statusInfo.badgeVariant} className="text-[8px] font-black tracking-[0.1em] h-5 px-2 shrink-0">
                {isExceeded ? 'OVERDUE' : statusInfo.label}
              </Badge>
            )}
            <div className={cn(
              "text-[10px] font-black uppercase flex items-center gap-1.5 mt-1",
              isExceeded ? "text-destructive" : (isWarning ? "text-yellow-700" : "text-muted-foreground")
            )}>
              <Clock className="w-3 h-3" />
              {minutesElapsed}m
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-dashed border-muted-foreground/20">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[8px] h-4.5 px-1.5 uppercase font-bold tracking-widest bg-background/50 border-primary/20 flex items-center gap-1 shadow-xs">
              <ClipboardList className="w-2.5 h-2.5" /> {order.menuType}
            </Badge>
            <span className="text-[8px] font-mono font-bold text-muted-foreground/40 px-1">#{numericId}</span>
            {assignedDriverId && !isAssignedToMe && (
              <Badge variant="secondary" className="text-[8px] h-4.5 px-1.5 uppercase font-bold flex items-center gap-1">
                <User className="w-2.5 h-2.5" /> Other Staff
              </Badge>
            )}
          </div>

          {mounted && order.lastGpsUpdate && order.status === 'Out for Delivery' && (
            <div className={cn(
              "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-full border transition-all duration-500",
              isGpsStale ? "bg-destructive/10 text-destructive border-destructive/20 animate-pulse" : "bg-primary/5 text-primary border-primary/10"
            )}>
              <div className="flex items-center gap-1">
                {order.buyerDeviceStatus === 'ios-browser' ? <Smartphone className="w-2.5 h-2.5" /> : <Satellite className={cn("w-3 h-3", !isGpsStale && "animate-pulse")} />}
                <span>
                  {isGpsStale ? "GPS SIGNAL STALE" : "SIGNAL: LIVE"} 
                  ({formatDistanceToNow(order.lastGpsUpdate.toDate(), { addSuffix: true }).replace('about ', '')})
                </span>
              </div>
            </div>
          )}
        </div>
        
        {isIosWarning && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-2 flex items-start gap-2 animate-in slide-in-from-top-1">
            <Smartphone className="h-3.5 w-3.5 text-destructive shrink-0" />
            <p className="text-[9px] font-bold text-destructive leading-tight uppercase">
              Buyer is on iOS Browser & likely backgrounded. GPS pin may be unreliable. Use hole selection fallback.
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className='p-4 space-y-3 flex-1'>
        <div className="space-y-1.5">
          {order.items.map(item => (
            <div key={item.id} className="flex justify-between items-start text-xs gap-3">
              <span className="font-medium truncate flex-1 text-foreground/90">
                {item.name} <span className='text-muted-foreground font-bold ml-1 text-[10px]'>×{item.quantity}</span>
              </span>
              <span className='font-mono font-bold text-muted-foreground'>
                ${(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        
        <Separator className="border-dashed opacity-50" />
        
        <div className='flex justify-between items-center px-0.5'>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">TOTAL</span>
          <span className='font-mono font-black text-sm text-primary'>${order.total.toFixed(2)}</span>
        </div>
      </CardContent>

      {renderAction() && (
        <CardFooter className={cn('p-2 mt-auto border-t', isExceeded ? 'bg-red-100/30' : 'bg-muted/20')}>
          {renderAction()}
        </CardFooter>
      )}
    </Card>
  );
}
