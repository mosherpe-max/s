'use client';

import { Button } from '@/components/ui/button';
import type { OrderItem, MenuItem, Category } from '@/lib/types';
import { Image as LucideImage, Plus, Minus, Star, Settings2 } from 'lucide-react';
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
}

export function BuyerMenu({ 
  orderItems, 
  onUpdateItem, 
  onOpenModifiers,
  currentCategories, 
  menuItems, 
  accentColor, 
  selectedMenuType
}: BuyerMenuProps) {
  
  const handleQuantityChange = (item: MenuItem, change: number) => {
    const hasModifiers = item.modifierGroupIds && item.modifierGroupIds.length > 0;
    
    // If the item has modifiers and we are adding, we MUST open the modifier selector
    if (hasModifiers && change > 0) {
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
                "font-headline text-[13px] font-black uppercase tracking-[0.1em] text-[#213147]"
              )}>{category}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {itemsInCategory.map((item) => {
                const relevantCartItems = orderItems.filter(i => i.id === item.id);
                const totalQuantity = relevantCartItems.reduce((acc, i) => acc + i.quantity, 0);
                const hasModifiers = item.modifierGroupIds && item.modifierGroupIds.length > 0;
                
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
                      {hasModifiers && (
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-lg border shadow-sm">
                          <Settings2 className="h-3 w-3 text-[#213147]" />
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
                        <div className="flex flex-col">
                          <span className="font-mono text-sm font-black text-primary leading-none">
                            ${item.price.toFixed(2)}
                          </span>
                          {hasModifiers && (
                            <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest mt-1">Options Available</span>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          {hasModifiers ? (
                            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-muted">
                              {totalQuantity > 0 && (
                                <span className="text-xs font-black w-6 text-center text-[#213147]">{totalQuantity}</span>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onOpenModifiers(item)}
                                className="h-9 w-9 rounded-lg transition-colors text-primary bg-white shadow-sm hover:bg-white"
                              >
                                <Plus className="h-5 w-5" />
                              </Button>
                            </div>
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
