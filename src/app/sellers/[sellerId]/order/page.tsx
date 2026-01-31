'use client';

import { useState, use, useEffect } from 'react';
import { collection, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from '@/firebase';
import type { Seller, OrderItem, MenuItem, Category, Order } from '@/lib/types';
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
import { Loader2, Truck, AlertCircle, Database } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCart } from '@/lib/cart-context';
import Link from 'next/link';

export default function BuyerMenuPage({ params }: { params: { sellerId: string } }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { orderItems, updateItem, isCartOpen, setIsCartOpen, total, totalItems, clearCart } = useCart();

  const [selectedCategory, setSelectedCategory] = useState<Category>(categories[0]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const sellerRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'sellers', sellerId) : null),
    [firestore, sellerId]
  );
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null),
    [firestore, sellerId]
  );
  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  const handlePlaceOrder = async () => {
    if (!firestore || !seller) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not connect to the service. Please try again.',
      });
      return;
    }

    if (seller.status === 'Inactive') {
      toast({
        variant: 'destructive',
        title: 'Service Unavailable',
        description: 'The beverage cart is currently offline. Please try again later.',
      });
      return;
    }

    setIsPlacingOrder(true);
    
    const activeOrderItems = orderItems.filter((item) => item.quantity > 0);

    const createOrder = (latitude: number, longitude: number) => {
      const subtotal = activeOrderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

      const orderData: Omit<Order, 'id' | 'createdAt'> = {
        sellerId: sellerId,
        customerId: 'public-user',
        customerName: 'Guest Golfer',
        deliveryLocation: { latitude, longitude },
        items: activeOrderItems,
        subtotal,
        serviceFee: seller.serviceFee || 0,
        total,
        status: 'Placed',
      };

      const ordersCollection = collection(firestore, 'orders');
      addDoc(ordersCollection, {
        ...orderData,
        createdAt: serverTimestamp(),
      })
      .then(() => {
          toast({
            title: 'Order Placed!',
            description: "We've sent your order to the cart.",
          });
          clearCart();
          router.push('/order/track');
      })
      .catch(() => {
          const contextualError = new FirestorePermissionError({
            path: ordersCollection.path,
            operation: 'create',
            requestResourceData: orderData
          });
          errorEmitter.emit('permission-error', contextualError);
      }).finally(() => {
        setIsPlacingOrder(false);
      });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          createOrder(position.coords.latitude, position.coords.longitude);
        },
        () => {
          toast({
            title: 'Location Error',
            description: 'Could not get your location. Using a fallback for this order.',
            variant: 'destructive',
          });
          const { latitude, longitude } = mockBuyerLocation;
          createOrder(latitude, longitude);
        }
      );
    } else {
      const { latitude, longitude } = mockBuyerLocation;
      createOrder(latitude, longitude);
    }
  };


  const isLoading = isSellerLoading || areItemsLoading;
  const activeOrderItems = orderItems.filter((item) => item.quantity > 0);

  if (!isLoading && !seller) {
      return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-8 text-center space-y-6">
              <div className="bg-muted p-8 rounded-full">
                  <AlertCircle className="h-16 w-16 text-muted-foreground opacity-50" />
              </div>
              <div className="space-y-2">
                  <h2 className="text-3xl font-headline font-bold">Menu Not Found</h2>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                      This course hasn't set up their menu yet. If you are the admin, please go to the Seller Admin page to initialize the course.
                  </p>
              </div>
              <div className="flex gap-4">
                  <Button asChild variant="outline">
                      <Link href="/">Back to Home</Link>
                  </Button>
                  <Button asChild>
                      <Link href={`/sellers/${sellerId}`}>Go to Seller Admin</Link>
                  </Button>
              </div>
          </div>
      );
  }

  if (!isLoading && seller?.status === 'Inactive') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-8 text-center space-y-6">
        <div className="bg-muted p-8 rounded-full">
           <Truck className="h-16 w-16 text-muted-foreground opacity-50" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-headline font-bold">Service Currently Unavailable</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            The beverage cart at {seller.courseName} is currently offline. Please check back later or listen for the cart on the course!
          </p>
        </div>
        <Button asChild variant="outline" size="lg">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 pt-4 pb-2 text-center shrink-0">
        <h1 className="font-headline text-3xl font-bold text-foreground">
          {isLoading ? <Skeleton className="h-9 w-3/4 mx-auto" /> : seller?.courseName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Place your order and we'll deliver it to you on the course!
        </p>
      </header>

      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2 shrink-0 border-b">
         <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 px-4">
            {categories.map((category) => {
                const Icon = categoryIcons[category];
                return (
                <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category)}
                    className="shrink-0"
                >
                    <Icon className="mr-2 h-4 w-4" />
                    {category}
                </Button>
                );
            })}
            </div>
        </ScrollArea>
      </div>
      
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28"> 
        {isLoading ? (
          <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
          </div>
        ) : menuItems && menuItems.length > 0 ? (
          <BuyerMenu
            orderItems={orderItems}
            onUpdateItem={updateItem}
            selectedCategory={selectedCategory}
            menuItems={menuItems}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <Database className="h-12 w-12 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">This course has no menu items listed.</p>
              <Button asChild variant="link">
                  <Link href={`/sellers/${sellerId}`}>Set up menu in Seller Admin</Link>
              </Button>
          </div>
        )}
      </main>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        {activeOrderItems.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-sm border-t z-20">
            <SheetTrigger asChild>
              <Button size="lg" className="w-full text-lg h-14">
                <div className="flex justify-between items-center w-full">
                  <span>View Order ({totalItems})</span>
                  <span className="font-mono">${total.toFixed(2)}</span>
                </div>
              </Button>
            </SheetTrigger>
          </div>
        )}
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader>
             <SheetTitle className="text-center">Your Order</SheetTitle>
          </SheetHeader>
          <div className="py-4 max-h-[50vh] overflow-y-auto">
            <OrderSummary
              items={activeOrderItems}
              serviceFee={seller?.serviceFee}
            />
          </div>
          <SheetFooter>
            <Button 
              size="lg" 
              className="w-full h-12 text-lg" 
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder || totalItems === 0}
            >
              {isPlacingOrder ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Placing Order...
                </>
              ) : (
                `Place Order - $${total.toFixed(2)}`
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
