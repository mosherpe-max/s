'use client';

import { Button } from '@/components/ui/button';
import type { OrderItem, MenuItem, Category } from '@/lib/types';
import { PlusCircle, MinusCircle } from 'lucide-react';
import { categoryIcons } from './icons';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface BuyerMenuProps {
  orderItems: OrderItem[];
  menuItems: MenuItem[];
  onUpdateItem: (item: OrderItem) => void;
  selectedCategory: Category;
}

export function BuyerMenu({ orderItems, onUpdateItem, selectedCategory, menuItems }: BuyerMenuProps) {
  const handleQuantityChange = (item: MenuItem, change: number) => {
    const existingItem = orderItems.find(i => i.id === item.id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const newQuantity = Math.max(0, currentQuantity + change);
    onUpdateItem({ ...item, quantity: newQuantity });
  };

  const filteredCategories = [selectedCategory];

  return (
    <div className="space-y-4">
      {filteredCategories.map((category) => {
        const CategoryIcon = categoryIcons[category];
        const itemsInCategory = menuItems.filter((item) => item.category === category).sort((a, b) => a.rank - b.rank);
        
        if (itemsInCategory.length === 0) return null;

        return (
          <section key={category} id={category.toLowerCase().replace(' ', '-')}>
            <div className="flex items-center gap-3 mb-4">
              <CategoryIcon className="w-6 h-6 text-primary" />
              <h2 className="font-headline text-2xl font-bold">{category}</h2>
            </div>
            <div className="space-y-2">
              {itemsInCategory.map((item) => {
                const orderItem = orderItems.find(i => i.id === item.id);
                const quantity = orderItem ? orderItem.quantity : 0;
                return (
                  <div key={item.id} className="flex items-start justify-between p-3 rounded-lg bg-card">
                    <div className="flex-1 pr-4">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm font-mono text-primary">${item.price.toFixed(2)}</p>
                      {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleQuantityChange(item, -1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                          disabled={quantity === 0}
                          className="h-9 w-9 rounded-full"
                        >
                          <MinusCircle className="h-5 w-5" />
                        </Button>
                        <span className="text-lg font-bold w-6 text-center">{quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleQuantityChange(item, 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="h-9 w-9 rounded-full"
                        >
                          <PlusCircle className="h-5 w-5" />
                        </Button>
                      </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
