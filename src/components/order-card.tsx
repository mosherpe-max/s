'use client';

import { useState, useEffect } from 'react';
import type { Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Navigation, PartyPopper, ClipboardList, Send, MoveHorizontal, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import { cn, getDriverColor } from '@/lib/utils';
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

function getNumericOrderId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 10000).toString().padStart(4, '0');
}

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
  currentDriverId = 'demo-course' 
}: { 
  order: Order; 
  orderNumber: number; 
  onUpdateStatus: (id: string, status: Order['status'], driverId?: string) => void; 
  onHandoff?: (orderId: string, targetDriverId: string) => void;
  availableDrivers?: AvailableDriver[];
  currentDriverId?: string 
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

  const renderAction = () => {
    switch (order.status) {
      case 'Placed':
        return (
          <Button className="w-full font-headline font-bold uppercase text-[10px] h-10" onClick={() => onUpdateStatus(order.id, 'Preparing', currentDriverId)}>
            <Send className="mr-2 h-3.5 w-3.5" />
            Confirm Order
          </Button>
        );
      case 'Preparing':
        return (
          <div className="flex gap-1.5 w-full">
            <Button className="flex-1 font-headline font-bold uppercase text-[10px] h-10" onClick={() => onUpdateStatus(order.id, 'Out for Delivery', currentDriverId)}>
              <Navigation className="mr-2 h-3.5 w-3.5" />
              Start Delivery
            </Button>
            {canHandoff && renderHandoffButton()}
          </div>
        );
      case 'Out for Delivery':
        return (
          <div className="flex gap-1.5 w-full">
            <Button className="flex-1 font-headline font-bold uppercase text-[10px] h-10" onClick={() => onUpdateStatus(order.id, 'Delivered')}>
              <PartyPopper className="mr-2 h-3.5 w-3.5" />
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
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 border-primary/20 hover:bg-primary/10">
          <MoveHorizontal className="h-4 w-4 text-primary" />
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

  const borderColorClass = driverColor ? colorMap[driverColor] : 'border-muted';
  const borderThickness = assignedDriverId ? 'border-[3px]' : 'border-2';

  return (
    <Card className={cn(
      'overflow-hidden flex flex-col h-full transition-all duration-300 w-full max-w-full',
      borderThickness,
      borderColorClass,
      !assignedDriverId && 'opacity-90 hover:opacity-100',
      isAssignedToMe && 'shadow-md ring-1 ring-primary/20'
    )}>
      <CardHeader className='flex flex-row items-start gap-3 p-3 bg-muted/30'>
        <Avatar className="w-9 h-9 shrink-0 border border-primary/10">
          <AvatarFallback className="font-bold text-[10px] bg-primary text-primary-foreground">#{numericId}</AvatarFallback>
        </Avatar>
        <div className='flex-1 min-w-0'>
          <CardTitle className='text-xs font-bold uppercase tracking-tight truncate leading-tight'>{order.customerName}</CardTitle>
          <div className="flex flex-col gap-0.5 mt-0.5">
            <CardDescription className="text-[9px] flex items-center gap-1 font-medium truncate">
              {mounted && order.createdAt?.toDate ? formatDistanceToNow(order.createdAt.toDate(), { addSuffix: true }) : 'Processing...'}
            </CardDescription>
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Badge variant="outline" className="text-[7px] h-3.5 px-1 uppercase font-bold tracking-widest bg-background border-primary/20 flex items-center gap-1 shrink-0">
                <ClipboardList className="w-2 h-2" /> {order.menuType}
              </Badge>
              {assignedDriverId && !isAssignedToMe && (
                <Badge variant="secondary" className="text-[7px] h-3.5 px-1 uppercase font-bold truncate">
                  <User className="w-2 h-2 mr-1" /> Other Driver
                </Badge>
              )}
            </div>
          </div>
        </div>
        {statusInfo && (
          <Badge variant={statusInfo.badgeVariant} className="text-[7px] font-bold tracking-widest h-4 px-1 shrink-0">{statusInfo.label}</Badge>
        )}
      </CardHeader>
      <CardContent className='p-3 space-y-2.5 flex-1'>
        <div className="space-y-1">
          {order.items.map(item => (
            <div key={item.id} className="flex justify-between items-start text-[11px] gap-2">
              <span className="font-medium truncate flex-1">{item.name} <span className='text-muted-foreground font-normal ml-0.5'>x{item.quantity}</span></span>
              <span className='font-mono font-bold text-[10px] shrink-0'>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <Separator className="border-dashed" />
        <div className='flex justify-between items-center'>
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Order Total</span>
          <span className='font-mono font-bold text-xs'>${order.total.toFixed(2)}</span>
        </div>
      </CardContent>
      {renderAction() && (
        <CardFooter className='p-1.5 bg-muted/20 mt-auto border-t'>
          {renderAction()}
        </CardFooter>
      )}
    </Card>
  );
}
