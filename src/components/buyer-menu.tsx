'use client';

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
            className="scroll-mt-32 space-y-4"
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
                    className="bg-white rounded-[1.25rem] border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all active:scale-[0.98] group"
                  >
                    {/* Image - shorter aspect ratio than before to fit more cards per screen */}
                    <div className="relative aspect-[4/3] w-full bg-muted shrink-0 border-b-2 border-slate-100 overflow-hidden">
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

                      {/* Price pill - solid navy fill for max contrast in direct sunlight */}
                      <div className="absolute top-2 left-2 bg-[#213147] px-2.5 py-1 rounded-lg shadow-md z-10">
                        <span className="font-mono text-[12px] font-black text-white leading-none">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>

                      {hasModifiers && (
                        <div className="absolute top-2 right-2 bg-white p-1.5 rounded-lg border-2 border-slate-100 shadow-md z-10">
                          <Settings2 className="h-3 w-3 text-[#213147]" />
                        </div>
                      )}
                    </div>

                    {/* Content Area */}
                    <div className="p-3 flex flex-col flex-1 min-w-0 gap-2">
                      <div>
                        <p className="font-black text-[12px] leading-tight text-[#213147] uppercase tracking-tight">
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase tracking-tighter leading-snug line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Full-width stepper - large, high-contrast tap targets for outdoor/sunlight use */}
                      <div className="mt-auto">
                        {hasModifiers ? (
                          <button
                            onClick={() => onOpenModifiers(item)}
                            className="w-full h-10 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.97] transition-transform"
                          >
                            {totalQuantity > 0 ? (
                              <>
                                <span className="bg-white/25 rounded-md px-1.5 py-0.5 text-[10px]">{totalQuantity}</span>
                                Add Another
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4" /> Add
                              </>
                            )}
                          </button>
                        ) : totalQuantity > 0 ? (
                          <div className="w-full h-10 rounded-xl border-2 border-primary bg-primary/5 flex items-center justify-between overflow-hidden shadow-sm">
                            <button
                              onClick={() => handleQuantityChange(item, -1)}
                              className="h-full w-10 shrink-0 flex items-center justify-center bg-[#213147] text-white active:opacity-80"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="flex-1 text-center text-[13px] font-black text-[#213147]">
                              {totalQuantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item, 1)}
                              className="h-full w-10 shrink-0 flex items-center justify-center bg-primary text-white active:opacity-80"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleQuantityChange(item, 1)}
                            className="w-full h-10 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.97] transition-transform"
                          >
                            <Plus className="h-4 w-4" /> Add
                          </button>
                        )}
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
