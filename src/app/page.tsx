'use client'

import React, { useState } from 'react';
import { BuyerMenu } from '@/components/buyer-menu';
import { OrderSummary } from '@/components/order-summary';
import type { OrderItem, Category } from '@/lib/data';
import { categories } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { categoryIcons } from '@/components/icons';

export default function Home() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');

  const handleUpdateItem = (item: OrderItem) => {
    setOrderItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(i => i.id === item.id);
      if (existingItemIndex > -1) {
        if (item.quantity === 0) {
          return prevItems.filter(i => i.id !== item.id);
        }
        const newItems = [...prevItems];
        newItems[existingItemIndex] = item;
        return newItems;
      } else if (item.quantity > 0) {
        return [...prevItems, item];
      }
      return prevItems;
    });
  };

  const handlePlaceOrder = () => {
    // In a real app, this would submit the order
    if (orderItems.length > 0) {
      window.location.href = '/order/track';
    } else {
      alert("Your cart is empty. Please add items before placing an order.");
    }
  };

  const allCategories: (Category | 'All')[] = ['All', ...categories];

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="font-headline text-5xl md:text-6xl font-bold text-primary">Welcome to the 19th Hole</h1>
        <p className="text-lg text-muted-foreground mt-2">Your on-course refreshment is just a few taps away.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12 items-start">
        <div className="lg:col-span-2 space-y-8">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                {allCategories.map((category) => {
                    const CategoryIcon = category === 'All' ? null : categoryIcons[category];
                    return (
                        <Button
                            key={category}
                            variant={selectedCategory === category ? "default" : "outline"}
                            onClick={() => setSelectedCategory(category)}
                            className={cn(
                                "capitalize transition-all duration-200",
                                selectedCategory === category && 'bg-accent text-accent-foreground'
                            )}
                        >
                            {CategoryIcon && <CategoryIcon className="mr-2 h-4 w-4" />}
                            {category}
                        </Button>
                    )
                })}
            </div>
          <BuyerMenu 
            orderItems={orderItems} 
            onUpdateItem={handleUpdateItem} 
            selectedCategory={selectedCategory} 
          />
        </div>
        <div className="lg:sticky lg:top-8">
          <OrderSummary items={orderItems} onPlaceOrder={handlePlaceOrder} />
        </div>
      </div>
    </div>
  );
}
