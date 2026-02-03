'use client';

import { useState, useEffect } from 'react';
import type { Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Navigation, PartyPopper, ClipboardList, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import { cn, getDriverColor } from '@/lib/utils';

const getStatusConfig = (status: Order['status'], isBevCart: boolean) => {
  const config: Record<Order['status'], { label: string, badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    'Placed': {
      label: isBevCart ? 'ORDER CONFIRMED' : 'PLACED',
      badgeVariant: 'default'
    },
    'Preparing': {
      label: 'PREPARING',
      badgeVariant: 'secondary'
    },
    'Out for Delivery': {
      label: 'OUT FOR DELIVERY',
      badgeVariant: 'outline'
    },
    'Delivered': {
      label: isBevCart ? 'ORDER DELIVERED' : 'DELIVERED',
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

export function OrderCard({ order, orderNumber, onUpdateStatus, currentDriverId = 'demo-course' }: { order: Order; orderNumber: number; onUpdateStatus: (id: string, status: Order['status'], driverId?: string) => void; currentDriverId?: string }) {
  const [mounted, setMounted] = useState(false);
  const isBevCart = order.menuType === 'Beverage Cart';
  const statusInfo = getStatusConfig(order.status, isBevCart);

  useEffect(() => {
    setMounted(true);
  }, []);

  const renderAction = () => {
    switch (order.status) {
      case 'Placed':
        if (isBevCart) {
          return (
            <Button className="w-full font-headline font-bold uppercase text-xs h-12" onClick={() => onUpdateStatus(order.id, 'Out for Delivery', currentDriverId)}>
              <Navigation className="mr-2 h-4 w-4" />
              Start Delivery
            </Button>
          );
        }
        return (
          <Button className="w-full font-headline font-bold uppercase text-xs h-12" onClick={() => onUpdateStatus(order.id, 'Preparing', currentDriverId)}>
            <Send className="mr-2 h-4 w-4" />
            Confirm Order
          </Button>
        );
      case 'Preparing':
        return (
          <Button className="w-full font-headline font-bold uppercase text-xs h-12" onClick={() => onUpdateStatus(order.id, 'Out for Delivery', currentDriverId)}>
            <Navigation className="mr-2 h-4 w-4" />
            Start Delivery
          </Button>
        );
      case 'Out for Delivery':
        return (
          <Button className="w-full font-headline font-bold uppercase text-xs h-12" onClick={() => onUpdateStatus(order.id, 'Delivered')}>
            <PartyPopper className="mr-2 h-4 w-4" />
            Complete Order
          </Button>
        );
      default:
        return null;
    }
  }

  const numericId = getNumericOrderId(order.id);
  const assignedDriverId = order.assignedDriverId;
  const driverColor = assignedDriverId ? getDriverColor(assignedDriverId) : null;
  const isAssignedToMe = assignedDriverId === currentDriverId;

  // Use dynamic tailwind classes for the colored border
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
  const borderThickness = assignedDriverId ? 'border-4' : 'border-2';

  return (
    <Card className={cn(
      'overflow-hidden flex flex-col h-full transition-all duration-300',
      borderThickness,
      borderColorClass,
      !assignedDriverId && 'opacity-80 hover:opacity-100',
      isAssignedToMe && 'shadow-lg'
    )}>
      <CardHeader className='flex flex-row items-start gap-4 p-4 bg-muted/50'>
        <Avatar className="w-10 h-10 border-2 border-primary/10">
          <AvatarFallback className="font-bold text-xs bg-primary text-primary-foreground">#{numericId}</AvatarFallback>
        </Avatar>
        <div className='flex-1 min-w-0'>
          <CardTitle className='text-sm font-bold uppercase tracking-tight truncate'>{order.customerName}</CardTitle>
          <div className="flex flex-col gap-1 mt-1">
            <CardDescription className="text-[10px] flex items-center gap-1 font-medium">
              {mounted && order.createdAt?.toDate ? formatDistanceToNow(order.createdAt.toDate(), { addSuffix: true }) : 'Processing...'}
            </CardDescription>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[8px] h-4 px-1.5 uppercase font-bold tracking-widest bg-background border-primary/20 flex items-center gap-1">
                <ClipboardList className="w-2 h-2" /> {order.menuType}
              </Badge>
            </div>
          </div>
        </div>
        {statusInfo && (
          <Badge variant={statusInfo.badgeVariant} className="text-[8px] font-bold tracking-widest h-5">{statusInfo.label}</Badge>
        )}
      </CardHeader>
      <CardContent className='p-4 space-y-3 flex-1'>
        <div className="space-y-1.5">
          {order.items.map(item => (
            <div key={item.id} className="flex justify-between items-center text-xs">
              <span className="font-medium">{item.name} <span className='text-muted-foreground font-normal ml-0.5'>x{item.quantity}</span></span>
              <span className='font-mono font-bold text-[11px]'>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <Separator className="border-dashed" />
        <div className='flex justify-between items-center'>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Order Total</span>
          <span className='font-mono font-bold text-sm'>${order.total.toFixed(2)}</span>
        </div>
      </CardContent>
      {renderAction() && (
        <CardFooter className='p-2 bg-muted/30 mt-auto border-t'>
          {renderAction()}
        </CardFooter>
      )}
    </Card>
  );
}
