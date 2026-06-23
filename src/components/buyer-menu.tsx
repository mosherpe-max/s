'use client';

import { Button } from '@/components/ui/button';
import type { OrderItem, MenuItem, Category } from '@/lib/types';
import { Image as LucideImage, Plus, Minus, Star } from 'lucide-react';
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
        
        // Filter and sort items for this category/mode
        const itemsInCategory = menuItems
          .filter((item) => {
            if (category === 'Featured') {
              return !!(selectedMenuType && item.featuredOn?.includes(selectedMenuType));
            }
            // Standard category: only show if explicitly enabled for this mode
            return item.category === category && !!(selectedMenuType && item.availableOn?.includes(selectedMenuType));
          })
          .sort((a, b) => {
            if (selectedMenuType) {
              const rankField = category === 'Featured' ? 'featuredRanks' : 'menuRanks';
              const rankA = a[rankField]?.[selectedMenuType] ?? 999;
              const rankB = b[rankField]?.[selectedMenuType] ?? 999;
              return rankA - rankB;
            }
            return 0;
          });
        
        if (itemsInCategory.length === 0) return null;

        return (
          <section 
            key={category} 
            id={category.toLowerCase().replace(/\s+/g, '-')}
            className="scroll-mt-32 space-y-3"
          >
            <div className="flex items-center gap-2 px-1">
              {category === 'Featured' ? (
                <Star className="w-4 h-4 text-[#213147] fill-current" />
              ) : (
                <CategoryIcon className="w-4 h-4 text-primary" style={accentColor ? { color: accentColor } : {}} />
              )}
              <h2 className={cn(
                "font-headline text-[13px] font-black uppercase tracking-[0.1em]",
                category === 'Featured' ? "text-[#213147]" : "text-[#213147]"
              )}>{category}</h2>
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
                    <div className="p-4 flex flex-col flex-1 min-w-0">
                      <p className="font-black text-xs leading-tight text-[#213147] uppercase tracking-tight line-clamp-2">
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="text-[9px] text-muted-foreground font-medium line-clamp-1 mt-1 uppercase tracking-tighter">
                          {item.description}
                        </p>
                      )}
                      
                      <div className="mt-auto pt-4 flex items-center justify-between">
                        <span className="font-mono text-sm font-black text-primary">
                          ${item.price.toFixed(2)}{isModifierEnabled && '+'}
                        </span>

                        {/* Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isModifierEnabled ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleQuantityChange(item, 1)}
                              className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary border-2 border-primary/10"
                            >
                              <Plus className="h-5 w-5" />
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-muted min-h-[48px]">
                              {totalQuantity > 0 ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleQuantityChange(item, -1)}
                                    className="h-9 w-9 rounded-lg hover:bg-white transition-colors"
                                  >
                                    <Minus className="h-5 w-5" />
                                  </Button>
                                  <span className="text-sm font-black w-6 text-center text-[#213147]">
                                    {totalQuantity}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleQuantityChange(item, 1)}
                                    className="h-9 w-9 rounded-lg transition-colors text-primary hover:bg-white"
                                  >
                                    <Plus className="h-5 w-5" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleQuantityChange(item, 1)}
                                  className="h-9 w-9 rounded-lg transition-colors text-primary bg-white shadow-sm hover:bg-white"
                                >
                                  <Plus className="h-5 w-5" />
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
