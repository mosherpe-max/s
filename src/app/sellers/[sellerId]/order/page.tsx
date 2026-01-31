'use client';

import { useState, use, useEffect, useMemo } from 'react';
import { collection, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import type { Seller, OrderItem, MenuItem, Category, Order, Member } from '@/lib/types';
import { categories } from '@/lib/types';
import { BuyerMenu } from '@/components/buyer-menu';
import { OrderSummary } from '@/components/order-summary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { categoryIcons } from '@/components/icons';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { mockBuyerLocation } from '@/lib/data';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Loader2, Truck, AlertCircle, Database, CreditCard, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCart } from '@/lib/cart-context';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function BuyerMenuPage({ params }: { params: { sellerId: string } }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { orderItems, updateItem, isCartOpen, setIsCartOpen, total, totalItems, clearCart } = useCart();

  const [selectedCategory, setSelectedCategory] = useState<Category>(categories[0]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Credit Card' | 'Member Account'>('Credit Card');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId]);
  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  const membersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'members') : null), [firestore, sellerId]);
  const { data: members, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);

  const isClubSeller = seller?.type === 'Private Golf Course' || seller?.type === 'Semi Private Golf Course';

  const handlePlaceOrder = async () => {
    if (!firestore || !seller) {
      toast({ variant: 'destructive', title: 'Error', description: 'Service connection failed.' });
      return;
    }

    if (seller.status === 'Inactive') {
      toast({ variant: 'destructive', title: 'Service Unavailable', description: 'The beverage cart is offline.' });
      return;
    }

    if (paymentMethod === 'Member Account' && !selectedMemberId) {
      toast({ variant: 'destructive', title: 'Missing Member', description: 'Please select your member account.' });
      return;
    }

    setIsPlacingOrder(true);
    const activeOrderItems = orderItems.filter((item) => item.quantity > 0);

    const createOrder = (latitude: number, longitude: number) => {
      const subtotal = activeOrderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const orderData: Omit<Order, 'id' | 'createdAt'> = {
        sellerId,
        customerId: 'public-user',
        customerName: paymentMethod === 'Member Account' ? members?.find(m => m.id === selectedMemberId)?.name || 'Guest Member' : 'Guest Golfer',
        deliveryLocation: { latitude, longitude },
        items: activeOrderItems,
        subtotal,
        serviceFee: seller.serviceFee || 0,
        total,
        status: 'Placed',
        paymentMethod,
        memberId: paymentMethod === 'Member Account' ? selectedMemberId : undefined,
      };

      const ordersCol = collection(firestore, 'orders');
      addDoc(ordersCol, { ...orderData, createdAt: serverTimestamp() })
        .then(() => {
          toast({ title: 'Order Placed!', description: "Delivery is on its way." });
          clearCart();
          router.push('/order/track');
        })
        .catch(() => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ordersCol.path, operation: 'create', requestResourceData: orderData })))
        .finally(() => setIsPlacingOrder(false));
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => createOrder(p.coords.latitude, p.coords.longitude),
        () => {
          toast({ title: 'Location Fallback', description: 'Using estimated course location.' });
          createOrder(mockBuyerLocation.latitude, mockBuyerLocation.longitude);
        }
      );
    } else {
      createOrder(mockBuyerLocation.latitude, mockBuyerLocation.longitude);
    }
  };

  const isLoading = isSellerLoading || areItemsLoading;
  const activeOrderItems = orderItems.filter((item) => item.quantity > 0);

  if (!isLoading && !seller) return <div className="p-8 text-center"><h2 className="text-2xl font-bold">Course Not Found</h2></div>;

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 pt-4 pb-2 text-center shrink-0">
        <h1 className="font-headline text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-3/4 mx-auto" /> : seller?.courseName}</h1>
      </header>

      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2 shrink-0 border-b">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 px-4">
            {categories.map((cat) => {
              const Icon = categoryIcons[cat];
              return (
                <Button key={cat} variant={selectedCategory === cat ? 'default' : 'outline'} onClick={() => setSelectedCategory(cat)} className="shrink-0"><Icon className="mr-2 h-4 w-4" />{cat}</Button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
        {isLoading ? <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div> : (
          <BuyerMenu orderItems={orderItems} onUpdateItem={updateItem} selectedCategory={selectedCategory} menuItems={menuItems || []} />
        )}
      </main>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        {activeOrderItems.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-sm border-t z-20">
            <SheetTrigger asChild><Button size="lg" className="w-full text-lg h-14">View Order ({totalItems}) - ${total.toFixed(2)}</Button></SheetTrigger>
          </div>
        )}
        <SheetContent side="bottom" className="rounded-t-lg max-h-[90vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Review Order</SheetTitle></SheetHeader>
          <div className="py-4 space-y-6">
            <OrderSummary items={activeOrderItems} serviceFee={seller?.serviceFee} />

            <Separator />

            <div className="space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Payment Method</h3>
              <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Credit Card" id="cc" />
                  <Label htmlFor="cc" className="flex items-center gap-2 cursor-pointer"><CreditCard className="h-4 w-4" /> Credit Card</Label>
                </div>
                {isClubSeller && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Member Account" id="member" />
                    <Label htmlFor="member" className="flex items-center gap-2 cursor-pointer"><User className="h-4 w-4" /> Member Account</Label>
                  </div>
                )}
              </RadioGroup>

              {paymentMethod === 'Member Account' && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                  <Label className="mb-2 block">Select Member Account</Label>
                  <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger><SelectValue placeholder="Search for your account" /></SelectTrigger>
                    <SelectContent>
                      {members?.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name} ({m.memberNumber})</SelectItem>
                      ))}
                      {!members?.length && <div className="p-2 text-xs text-muted-foreground">No members found.</div>}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <SheetFooter>
            <Button size="lg" className="w-full" onClick={handlePlaceOrder} disabled={isPlacingOrder}>
              {isPlacingOrder ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : `Complete Purchase`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
