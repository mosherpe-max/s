
'use client';

import { Button } from '@/components/ui/button';
import type { OrderItem, MenuItem, Category } from '@/lib/types';
import { PlusCircle, MinusCircle, Edit2 } from 'lucide-react';
import { categoryIcons } from './icons';
import Image from 'next/image';

interface BuyerMenuProps {
  orderItems: OrderItem[];
  menuItems: MenuItem[];
  onUpdateItem: (item: OrderItem) => void;
  onOpenModifiers: (item: MenuItem) => void;
  currentCategories: Category[];
  accentColor?: string;
  selectedMenuType?: string;
  categoryImageVisibility?: Category[];
  categoryModifierEnabled?: Category[];
}

export function BuyerMenu({ 
  orderItems, 
  onUpdateItem, 
  onOpenModifiers,
  currentCategories, 
  menuItems, 
  accentColor, 
  selectedMenuType, 
  categoryImageVisibility = [],
  categoryModifierEnabled = []
}: BuyerMenuProps) {
  
  const handleQuantityChange = (item: MenuItem, change: number) => {
    const isModifierEnabled = categoryModifierEnabled.includes(item.category);
    
    // If modifiers are enabled for this category, we always route through the modifier picker
    // for addition. Subtraction is handled via cart management or direct matching if no mods.
    if (isModifierEnabled && change > 0) {
      onOpenModifiers(item);
      return;
    }

    const existingItem = orderItems.find(i => i.id === item.id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const newQuantity = Math.max(0, currentQuantity + change);
    
    onUpdateItem({ 
      ...item, 
      quantity: newQuantity, 
      cartId: item.id // Use base ID if no modifiers
    } as OrderItem);
  };

  return (
    <div className="space-y-12">
      {currentCategories.map((category) => {
        const CategoryIcon = categoryIcons[category];
        const showImages = categoryImageVisibility.includes(category);
        const isModifierEnabled = categoryModifierEnabled.includes(category);
        
        const itemsInCategory = menuItems
          .filter((item) => item.category === category)
          .sort((a, b) => {
            if (selectedMenuType) {
              const rankA = a.menuRanks?.[selectedMenuType] ?? a.rank ?? 0;
              const rankB = b.menuRanks?.[selectedMenuType] ?? b.rank ?? 0;
              return rankA - rankB;
            }
            return (a.rank || 0) - (b.rank || 0);
          });
        
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
                // For non-modifier categories, we show a count. 
                // For modifier categories, we show a count of ALL instances of this item in cart.
                const relevantCartItems = orderItems.filter(i => i.id === item.id);
                const totalQuantity = relevantCartItems.reduce((acc, i) => acc + i.quantity, 0);
                
                return (
                  <div key={item.id} className="flex items-start justify-between p-4 rounded-xl bg-card border shadow-sm transition-all hover:shadow-md active:scale-[0.98]">
                    <div className="flex items-start gap-4 flex-1 pr-2">
                      {showImages && item.imageUrl && (
                        <div className="relative h-20 w-20 rounded-lg overflow-hidden border bg-muted shrink-0 shadow-inner">
                          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base leading-tight truncate">{item.name}</p>
                        <p className="text-xs font-mono font-bold mt-0.5" style={{ color: accentColor || 'hsl(var(--primary))' }}>
                          ${item.price.toFixed(2)}{isModifierEnabled && '+'}
                        </p>
                        {item.description && <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{item.description}</p>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-full border shrink-0 h-fit ml-2">
                        {isModifierEnabled ? (
                          // For items with modifiers, addition always opens the picker
                          <>
                            {totalQuantity > 0 && <span className="text-[10px] font-black bg-primary/10 text-primary px-2 rounded-full border border-primary/20">{totalQuantity}</span>}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleQuantityChange(item, 1)}
                              className="h-8 w-8 rounded-full hover:bg-background transition-colors text-primary"
                            >
                              <PlusCircle className="h-5 w-5" />
                            </Button>
                          </>
                        ) : (
                          // For simple items, standard increment/decrement
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleQuantityChange(item, -1)}
                              disabled={totalQuantity === 0}
                              className="h-8 w-8 rounded-full hover:bg-background transition-colors"
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-bold w-6 text-center">{totalQuantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleQuantityChange(item, 1)}
                              className="h-8 w-8 rounded-full hover:bg-background transition-colors text-primary"
                            >
                              <PlusCircle className="h-5 w-5" />
                            </Button>
                          </>
                        )}
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
