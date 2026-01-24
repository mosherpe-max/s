
import { Separator } from '@/components/ui/separator';
import type { OrderItem } from '@/lib/types';

interface OrderSummaryProps {
  items: OrderItem[];
  serviceFee?: number;
}

export function OrderSummary({ items, serviceFee = 0 }: OrderSummaryProps) {
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = subtotal + serviceFee;

  return (
    <>
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
              <p className="text-muted-foreground">Service Fee</p>
              <p className="font-mono">${serviceFee.toFixed(2)}</p>
            </div>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <p>Total</p>
            <p className="font-mono">${total.toFixed(2)}</p>
          </div>
        </div>
      )}
    </>
  );
}
