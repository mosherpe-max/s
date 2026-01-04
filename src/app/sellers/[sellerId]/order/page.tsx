'use client';

import { useState } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Seller, OrderItem, MenuItem, Category } from '@/lib/types';
import { categories } from '@/lib/types';
import { BuyerMenu } from '@/components/buyer-menu';
import { OrderSummary } from '@/components/order-summary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { categoryIcons } from '@/components/icons';

export default function BuyerMenuPage({ params }: { params: { sellerId: string } }) {
  const { sellerId } = params;
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category>(categories[0]);

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

  const handleUpdateItem = (updatedItem: OrderItem) => {
    setOrderItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex((i) => i.id === updatedItem.id);
      if (updatedItem.quantity === 0) {
        return prevItems.filter((i) => i.id !== updatedItem.id);
      }
      if (existingItemIndex > -1) {
        const newItems = [...prevItems];
        newItems[existingItemIndex] = updatedItem;
        return newItems;
      }
      return [...prevItems, updatedItem];
    });
  };

  const handlePlaceOrder = () => {
    // In a real app, you'd save the order to Firestore here.
    toast({
      title: 'Order Placed!',
      description: "We've sent your order to the cart.",
    });
    router.push('/order/track');
  };

  const isLoading = isSellerLoading || areItemsLoading;

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground">
          {isLoading ? <Skeleton className="h-12 w-3/4 mx-auto" /> : seller?.courseName}
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Place your order and we'll deliver it to you on the course!
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <main className="lg:col-span-2 space-y-8">
          <div className="sticky top-16 bg-background/95 backdrop-blur-sm z-10 py-4">
            <div className="flex justify-center gap-2 flex-wrap">
              {categories.map((category) => {
                const Icon = categoryIcons[category];
                return (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category)}
                    className="flex-grow sm:flex-grow-0"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {category}
                  </Button>
                );
              })}
            </div>
          </div>
          
          {isLoading ? (
            <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
          ) : menuItems ? (
            <BuyerMenu
              orderItems={orderItems}
              onUpdateItem={handleUpdateItem}
              selectedCategory={selectedCategory}
              menuItems={menuItems}
            />
          ) : (
            <p>No menu items available.</p>
          )}
        </main>

        <aside className="lg:col-span-1 sticky top-20">
          <OrderSummary
            items={orderItems.filter((item) => item.quantity > 0)}
            onPlaceOrder={handlePlaceOrder}
            serviceFee={seller?.serviceFee}
          />
        </aside>
      </div>
    </div>
  );
}
