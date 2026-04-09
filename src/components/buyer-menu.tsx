'use client';

import { Button } from '@/components/ui/button';
import type { OrderItem, MenuItem, Category } from '@/lib/types';
import { PlusCircle, MinusCircle, Edit2, ImageIcon } from 'lucide-react';
import { categoryIcons } from './icons';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
  categoryModifierEnabled = []
}: BuyerMenuProps) {
  
  const handleQuantityChange = (item: MenuItem, change: number) => {
    const isModifierEnabled = categoryModifierEnabled.includes(item.category);
    
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
      cartId: item.id 
    } as OrderItem);
  };

  return (
    <div className="space-y-12">
      {currentCategories.map((category) => {
        const CategoryIcon = categoryIcons[category];
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
            <div className="flex items-center gap-2 mb-6 border-b-2 pb-2">
              <CategoryIcon className="w-5 h-5 text-primary" style={accentColor ? { color: accentColor } : {}} />
              <h2 className="font-headline text-lg font-bold uppercase tracking-tight">{category}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {itemsInCategory.map((item) => {
                const relevantCartItems = orderItems.filter(i => i.id === item.id);
                const totalQuantity = relevantCartItems.reduce((acc, i) => acc + i.quantity, 0);
                
                return (
                  <div 
                    key={item.id} 
                    className="flex flex-col p-3 rounded-[1.5rem] bg-card border shadow-sm transition-all hover:shadow-md active:scale-[0.98] overflow-hidden group h-full"
                  >
                    {/* Image Area - Forces 1:1 Aspect Ratio */}
                    <div className="relative aspect-square w-full rounded-2xl overflow-hidden border bg-muted shrink-0 shadow-inner mb-3">
                      {item.imageUrl ? (
                        <Image 
                          src={item.imageUrl} 
                          alt={item.name} 
                          fill 
                          className="object-cover transition-transform duration-500 group-hover:scale-110" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                          <ImageIcon className="w-10 h-10" />
                        </div>
                      )}
                      
                      {/* Quantity Badge Overlay */}
                      {totalQuantity > 0 && (
                        <div className="absolute top-2 right-2 bg-primary text-white text-[10px] font-black h-6 min-w-[24px] px-1.5 flex items-center justify-center rounded-full shadow-lg border border-white/20 animate-in zoom-in-50">
                          {totalQuantity}
                        </div>
                      )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 px-1">
                      <p className="font-black text-sm leading-tight text-[#213147] mb-1 line-clamp-2 uppercase tracking-tight">
                        {item.name}
                      </p>
                      
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <span className="font-mono text-xs font-black text-primary">
                          ${item.price.toFixed(2)}{isModifierEnabled && '+'}
                        </span>
                        
                        <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-full border">
                          {isModifierEnabled ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleQuantityChange(item, 1)}
                              className="h-7 w-7 rounded-full hover:bg-background transition-colors text-primary"
                            >
                              <PlusCircle className="h-4.5 w-4.5" />
                            </Button>
                          ) : (
                            <>
                              {totalQuantity > 0 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleQuantityChange(item, -1)}
                                  className="h-7 w-7 rounded-full hover:bg-background transition-colors"
                                >
                                  <MinusCircle className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleQuantityChange(item, 1)}
                                className={cn(
                                  "h-7 w-7 rounded-full hover:bg-background transition-colors text-primary",
                                  totalQuantity === 0 && "bg-primary/5"
                                )}
                              >
                                <PlusCircle className="h-4.5 w-4.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
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
