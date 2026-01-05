'use client';

import type { Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Check, Navigation, Package, CookingPot, Send, PartyPopper } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';

interface OrderCardProps {
  order: Order;
  orderNumber: number;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
}

const statusConfig: Record<Order['status'], { icon: React.ElementType, label: string, badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    'Placed': { icon: Package, label: 'Placed', badgeVariant: 'default' },
    'Preparing': { icon: CookingPot, label: 'Preparing', badgeVariant: 'secondary' },
    'Out for Delivery': { icon: Navigation, label: 'On its way', badgeVariant: 'outline' },
    'Delivered': { icon: Check, label: 'Delivered', badgeVariant: 'default' },
    'Cancelled': { icon: Check, label: 'Cancelled', badgeVariant: 'destructive' },
};


export function OrderCard({ order, orderNumber, onUpdateStatus }: OrderCardProps) {
    const statusInfo = statusConfig[order.status];

    const renderAction = () => {
        switch (order.status) {
            case 'Placed':
                return (
                    <Button className="w-full" onClick={() => onUpdateStatus(order.id, 'Preparing')}>
                        <Send className="mr-2 h-4 w-4" />
                        Confirm Order
                    </Button>
                );
            case 'Preparing':
                return (
                    <Button className="w-full" onClick={() => onUpdateStatus(order.id, 'Out for Delivery')}>
                        <Navigation className="mr-2 h-4 w-4" />
                        Start Delivery
                    </Button>
                );
            case 'Out for Delivery':
                 return (
                    <Button className="w-full" onClick={() => onUpdateStatus(order.id, 'Delivered')}>
                        <PartyPopper className="mr-2 h-4 w-4" />
                        Complete Order
                    </Button>
                );
            default:
                return null;
        }
    }


    return (
        <Card className='overflow-hidden shadow-md flex flex-col h-full'>
            <CardHeader className='flex flex-row items-start gap-4 p-4 bg-muted/50'>
                <Avatar className="w-10 h-10">
                    <AvatarFallback className="font-bold text-lg bg-accent text-accent-foreground">{orderNumber}</AvatarFallback>
                </Avatar>
                <div className='flex-1'>
                    <CardTitle className='text-lg font-semibold'>{order.customerName}</CardTitle>
                    <CardDescription>
                        {order.createdAt?.toDate && formatDistanceToNow(order.createdAt.toDate(), { addSuffix: true })}
                    </CardDescription>
                </div>
                {statusInfo && (
                     <Badge variant={statusInfo.badgeVariant}>{statusInfo.label}</Badge>
                )}
            </CardHeader>
            <CardContent className='p-4 space-y-2 flex-1'>
                {order.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                        <span>{item.name} <span className='text-muted-foreground'>x{item.quantity}</span></span>
                        <span className='font-mono'>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                ))}
                <Separator />
                <div className='flex justify-between items-center font-bold'>
                    <span>Total</span>
                    <span className='font-mono'>${order.total.toFixed(2)}</span>
                </div>
            </CardContent>
            {renderAction() && (
                <CardFooter className='p-2 bg-muted/50 mt-auto'>
                    {renderAction()}
                </CardFooter>
            )}
        </Card>
    );
}
