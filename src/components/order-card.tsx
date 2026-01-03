'use client';

import type { Order } from '@/lib/data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Check, Navigation } from 'lucide-react';

interface OrderCardProps {
    order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
    return (
        <Card className='overflow-hidden'>
            <CardHeader className='flex flex-row items-start gap-4 p-4 bg-muted/50'>
                <Avatar>
                    <AvatarImage src={order.avatar.imageUrl} alt={order.customerName} data-ai-hint={order.avatar.imageHint} />
                    <AvatarFallback>{order.customerName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className='flex-1'>
                    <CardTitle className='text-lg font-semibold'>{order.customerName}</CardTitle>
                    <CardDescription>Hole 8 Green</CardDescription>
                </div>
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
                <Button>
                    <Navigation className="mr-2 h-4 w-4" />
                    Navigate
                </Button>
                <Button variant='outline'>
                    <Check className="mr-2 h-4 w-4" />
                    Complete
                </Button>
            </CardFooter>
        </Card>
    );
}
