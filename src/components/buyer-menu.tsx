'use client';

import { Button } from '@/components/ui/button';
import type { OrderItem, MenuItem, Category } from '@/lib/types';
import { PlusCircle, MinusCircle } from 'lucide-react';
import { categoryIcons } from './icons';

interface BuyerMenuProps {
  orderItems: OrderItem[];
  menuItems: MenuItem[];
  onUpdateItem: (item: OrderItem) => void;
  selectedCategory: Category;
  accentColor?: string;
}

export function BuyerMenu({ orderItems, onUpdateItem, selectedCategory, menuItems, accentColor }: BuyerMenuProps) {
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
        
        if (itemsInCategory.length === 0) return (
          <div key={category} className="text-center py-12 text-muted-foreground">
            <p className="italic">No items currently available in this category.</p>
          </div>
        );

        return (
          <section key={category} id={category.toLowerCase().replace(' ', '-')}>
            <div className="flex items-center gap-2 mb-3">
              <CategoryIcon className="w-5 h-5 text-primary" style={accentColor ? { color: accentColor } : {}} />
              <h2 className="font-headline text-lg font-bold uppercase tracking-tight">{category}</h2>
            </div>
            <div className="space-y-2.5">
              {itemsInCategory.map((item) => {
                const orderItem = orderItems.find(i => i.id === item.id);
                const quantity = orderItem ? orderItem.quantity : 0;
                return (
                  <div key={item.id} className="flex items-start justify-between p-3.5 rounded-xl bg-card border shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex-1 pr-4">
                      <p className="font-bold text-base leading-tight">{item.name}</p>
                      <p className="text-xs font-mono font-bold mt-0.5" style={{ color: accentColor || 'hsl(var(--primary))' }}>${item.price.toFixed(2)}</p>
                      {item.description && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-snug">{item.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-full border shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleQuantityChange(item, -1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                          disabled={quantity === 0}
                          className="h-7 w-7 rounded-full hover:bg-background"
                        >
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-bold w-5 text-center">{quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleQuantityChange(item, 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="h-7 w-7 rounded-full hover:bg-background"
                          style={quantity > 0 ? { color: accentColor || 'hsl(var(--primary))' } : {}}
                        >
                          <PlusCircle className="h-4 w-4" />
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
