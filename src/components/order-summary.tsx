import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { OrderItem } from '@/lib/data';
import { ShoppingCart } from 'lucide-react';

interface OrderSummaryProps {
  items: OrderItem[];
  onPlaceOrder: () => void;
}

export function OrderSummary({ items, onPlaceOrder }: OrderSummaryProps) {
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const taxRate = 0.08;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return (
    <Card className="shadow-2xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-accent" />
          <CardTitle className="font-headline text-2xl">Your Order</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Your cart is empty.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground">x {item.quantity}</p>
                  </div>
                  <p className="font-mono">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <p className="text-muted-foreground">Subtotal</p>
                <p className="font-mono">${subtotal.toFixed(2)}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-muted-foreground">Tax (8%)</p>
                <p className="font-mono">${tax.toFixed(2)}</p>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <p>Total</p>
              <p className="font-mono">${total.toFixed(2)}</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          size="lg" 
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90" 
          onClick={onPlaceOrder}
          disabled={items.length === 0}
        >
          Place Order
        </Button>
      </CardFooter>
    </Card>
  );
}
