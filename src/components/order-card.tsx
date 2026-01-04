'use client';

import type { Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Check, Navigation, Package, CookingPot } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';


interface OrderCardProps {
  order: Order;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  onNavigate: (location: {latitude: number, longitude: number}) => void;
}

const statusConfig: Record<Order['status'], { icon: React.ElementType, label: string, color: string }> = {
    'Placed': { icon: Package, label: 'Placed', color: 'bg-blue-500' },
    'Preparing': { icon: CookingPot, label: 'Preparing', color: 'bg-yellow-500' },
    'Out for Delivery': { icon: Navigation, label: 'On its way', color: 'bg-orange-500' },
    'Delivered': { icon: Check, label: 'Delivered', color: 'bg-green-500' },
    'Cancelled': { icon: Check, label: 'Cancelled', color: 'bg-red-500' },
};


export function OrderCard({ order, onUpdateStatus, onNavigate }: OrderCardProps) {
    const getInitials = (name: string) => {
        const names = name.split(' ');
        return names.map(n => n[0]).join('').toUpperCase();
    }
    
    const StatusIcon = statusConfig[order.status].icon;
    const statusLabel = statusConfig[order.status].label;

    return (
        <Card className='overflow-hidden shadow-md'>
            <CardHeader className='flex flex-row items-start gap-4 p-4 bg-muted/50'>
                <Avatar>
                    <AvatarFallback>{getInitials(order.customerName)}</AvatarFallback>
                </Avatar>
                <div className='flex-1'>
                    <CardTitle className='text-lg font-semibold'>{order.customerName}</CardTitle>
                    <CardDescription>
                        {order.createdAt?.toDate && formatDistanceToNow(order.createdAt.toDate(), { addSuffix: true })}
                    </CardDescription>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("flex items-center gap-2", `bg-background`)}>
                            <StatusIcon className="w-4 h-4" />
                            <span>{statusLabel}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {(['Placed', 'Preparing', 'Out for Delivery', 'Delivered'] as Order['status'][]).map(status => (
                            <DropdownMenuItem key={status} onClick={() => onUpdateStatus(order.id, status)}>
                                {statusConfig[status].icon && <statusConfig[status].icon className="mr-2 h-4 w-4" />}
                                {status}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className='p-4 space-y-2'>
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
            <CardFooter className='p-2 bg-muted/50 grid grid-cols-2 gap-2'>
                <Button onClick={() => onNavigate(order.deliveryLocation)}>
                    <Navigation className="mr-2 h-4 w-4" />
                    Navigate
                </Button>
                <Button variant='outline' onClick={() => onUpdateStatus(order.id, 'Delivered')}>
                    <Check className="mr-2 h-4 w-4" />
                    Complete
                </Button>
            </CardFooter>
        </Card>
    );
}
