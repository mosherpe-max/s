'use client';

import { Button } from '@/components/ui/button';
import type { OrderItem, MenuItem, Category } from '@/lib/types';
import { PlusCircle, MinusCircle } from 'lucide-react';
import { categoryIcons } from './icons';

interface BuyerMenuProps {
  orderItems: OrderItem[];
  menuItems: MenuItem[];
  onUpdateItem: (item: OrderItem) => void;
  currentCategories: Category[];
  accentColor?: string;
}

export function BuyerMenu({ orderItems, onUpdateItem, currentCategories, menuItems, accentColor }: BuyerMenuProps) {
  const handleQuantityChange = (item: MenuItem, change: number) => {
    const existingItem = orderItems.find(i => i.id === item.id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const newQuantity = Math.max(0, currentQuantity + change);
    onUpdateItem({ ...item, quantity: newQuantity });
  };

  return (
    <div className="space-y-12">
      {currentCategories.map((category) => {
        const CategoryIcon = categoryIcons[category];
        const itemsInCategory = menuItems
          .filter((item) => item.category === category)
          .sort((a, b) => (a.rank || 0) - (b.rank || 0));
        
        if (itemsInCategory.length === 0) return null;

        return (
          <section 
            key={category} 
            id={category.toLowerCase().replace(/\s+/g, '-')}
            className="scroll-mt-32"
          >
            <div className="flex items-center gap-2 mb-4 border-b-2 pb-2">
              <CategoryIcon className="w-5 h-5 text-primary" style={accentColor ? { color: accentColor } : {}} />
              <h2 className="font-headline text-lg font-bold uppercase tracking-tight">{category}</h2>
            </div>
            <div className="space-y-3">
              {itemsInCategory.map((item) => {
                const orderItem = orderItems.find(i => i.id === item.id);
                const quantity = orderItem ? orderItem.quantity : 0;
                return (
                  <div key={item.id} className="flex items-start justify-between p-4 rounded-xl bg-card border shadow-sm transition-all hover:shadow-md active:scale-[0.98]">
                    <div className="flex-1 pr-4">
                      <p className="font-bold text-base leading-tight">{item.name}</p>
                      <p className="text-xs font-mono font-bold mt-0.5" style={{ color: accentColor || 'hsl(var(--primary))' }}>${item.price.toFixed(2)}</p>
                      {item.description && <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{item.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-full border shrink-0 h-fit">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleQuantityChange(item, -1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                          disabled={quantity === 0}
                          className="h-8 w-8 rounded-full hover:bg-background transition-colors"
                        >
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-bold w-6 text-center">{quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleQuantityChange(item, 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="h-8 w-8 rounded-full hover:bg-background transition-colors"
                          style={quantity > 0 ? { color: accentColor || 'hsl(var(--primary))' } : {}}
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
