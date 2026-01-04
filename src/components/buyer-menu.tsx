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

const categoryImageMap: Record<Category, string> = {
  Beer: 'beer-1',
  Spirits: 'spirits-1',
  'Soft Drinks': 'soft-drink-1',
  Snacks: 'snack-1'
};

export function BuyerMenu({ orderItems, onUpdateItem, selectedCategory, menuItems }: BuyerMenuProps) {
  const handleQuantityChange = (item: MenuItem, change: number) => {
    const existingItem = orderItems.find(i => i.id === item.id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const newQuantity = Math.max(0, currentQuantity + change);
    onUpdateItem({ ...item, quantity: newQuantity });
  };

  const filteredCategories = [selectedCategory];

  return (
    <div className="space-y-8">
      {filteredCategories.map((category) => {
        const CategoryIcon = categoryIcons[category];
        const itemsInCategory = menuItems.filter((item) => item.category === category).sort((a, b) => a.rank - b.rank);
        
        if (itemsInCategory.length === 0) return null;

        const categoryImage = PlaceHolderImages.find(p => p.id === categoryImageMap[category]);

        return (
          <section key={category} id={category.toLowerCase().replace(' ', '-')}>
             {categoryImage && (
                <div className="relative h-48 w-full mb-4 rounded-xl overflow-hidden">
                    <Image 
                        src={categoryImage.imageUrl}
                        alt={categoryImage.description}
                        data-ai-hint={categoryImage.imageHint}
                        fill
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="flex items-center gap-4 text-white">
                           <CategoryIcon className="w-10 h-10" />
                           <h2 className="font-headline text-4xl font-bold tracking-wider">{category}</h2>
                        </div>
                    </div>
                </div>
             )}

            <div className="space-y-4">
              {itemsInCategory.map((item) => {
                const orderItem = orderItems.find(i => i.id === item.id);
                const quantity = orderItem ? orderItem.quantity : 0;
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-card border shadow-sm">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm font-mono text-primary">${item.price.toFixed(2)}</p>
                      {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleQuantityChange(item, -1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                          disabled={quantity === 0}
                        >
                          <MinusCircle className="h-6 w-6" />
                        </Button>
                        <span className="text-lg font-bold w-6 text-center">{quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleQuantityChange(item, 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          <PlusCircle className="h-6 w-6" />
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
