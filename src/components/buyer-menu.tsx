'use client';

import { Button } from '@/components/ui/button';
import type { OrderItem, MenuItem, Category } from '@/lib/types';
import { Image as LucideImage, Plus, Minus } from 'lucide-react';
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
    <div className="space-y-10">
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
            className="scroll-mt-32 space-y-3"
          >
            <div className="flex items-center gap-2 px-1">
              <CategoryIcon className="w-4 h-4 text-primary" style={accentColor ? { color: accentColor } : {}} />
              <h2 className="font-headline text-[13px] font-black uppercase tracking-[0.1em] text-[#213147]">{category}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {itemsInCategory.map((item) => {
                const relevantCartItems = orderItems.filter(i => i.id === item.id);
                const totalQuantity = relevantCartItems.reduce((acc, i) => acc + i.quantity, 0);
                
                return (
                  <div 
                    key={item.id} 
                    className="bg-white rounded-[1.5rem] border shadow-sm overflow-hidden flex flex-col transition-all active:scale-[0.98] group"
                  >
                    {/* Immersive Image */}
                    <div className="relative aspect-square w-full bg-muted shrink-0 shadow-sm border-b">
                      {item.imageUrl ? (
                        <Image 
                          src={item.imageUrl} 
                          alt={item.name} 
                          fill 
                          className="object-cover transition-transform duration-500 group-hover:scale-110" 
                          data-ai-hint={item.name}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                          <LucideImage className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* Content Area */}
                    <div className="p-3 flex flex-col flex-1 min-w-0">
                      <p className="font-black text-xs leading-tight text-[#213147] uppercase tracking-tight line-clamp-2">
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="text-[9px] text-muted-foreground font-medium line-clamp-1 mt-0.5 uppercase tracking-tighter">
                          {item.description}
                        </p>
                      )}
                      
                      <div className="mt-auto pt-3 flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-primary">
                          ${item.price.toFixed(2)}{isModifierEnabled && '+'}
                        </span>

                        {/* Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isModifierEnabled ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleQuantityChange(item, 1)}
                              className="h-8 w-8 rounded-lg hover:bg-primary/10 text-primary border-2 border-primary/10"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-lg border border-muted min-h-[32px]">
                              {totalQuantity > 0 ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleQuantityChange(item, -1)}
                                    className="h-7 w-7 rounded-md hover:bg-white transition-colors"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="text-[10px] font-black w-4 text-center text-[#213147]">
                                    {totalQuantity}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleQuantityChange(item, 1)}
                                    className="h-7 w-7 rounded-md transition-colors text-primary hover:bg-white"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleQuantityChange(item, 1)}
                                  className="h-7 w-7 rounded-md transition-colors text-primary bg-white shadow-sm hover:bg-white"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
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
