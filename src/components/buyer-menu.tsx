'use client';

import { Button } from '@/components/ui/button';
import type { OrderItem, MenuItem, Category } from '@/lib/types';
import { PlusCircle, MinusCircle, ImageIcon, Plus, Minus } from 'lucide-react';
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
            
            <div className="bg-white rounded-[1.5rem] border shadow-sm overflow-hidden divide-y">
              {itemsInCategory.map((item) => {
                const relevantCartItems = orderItems.filter(i => i.id === item.id);
                const totalQuantity = relevantCartItems.reduce((acc, i) => acc + i.quantity, 0);
                
                return (
                  <div 
                    key={item.id} 
                    className="p-4 flex items-center gap-4 bg-white hover:bg-muted/5 transition-all active:bg-muted/10 group"
                  >
                    {/* Item Image Thumbnail - List Style */}
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border bg-muted shrink-0 shadow-sm">
                      {item.imageUrl ? (
                        <Image 
                          src={item.imageUrl} 
                          alt={item.name} 
                          fill 
                          className="object-cover transition-transform duration-500 group-hover:scale-110" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                      
                      {/* Active Quantity Dark Overlay (Matches Summary Style) */}
                      {totalQuantity > 0 && (
                        <div className="absolute inset-0 bg-[#213147]/80 flex items-center justify-center animate-in fade-in duration-300">
                          <span className="text-white font-black text-xl">{totalQuantity}</span>
                        </div>
                      )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm leading-tight text-[#213147] uppercase tracking-tight truncate">
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="text-[10px] text-muted-foreground font-medium line-clamp-1 mt-0.5 uppercase tracking-tighter">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-1">
                        <span className="font-mono text-xs font-black text-primary">
                          ${item.price.toFixed(2)}{isModifierEnabled && '+'}
                        </span>
                      </div>
                    </div>

                    {/* Controls - Minimalist List Style */}
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
                        <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-xl border border-muted">
                          {totalQuantity > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleQuantityChange(item, -1)}
                              className="h-8 w-8 rounded-lg hover:bg-white transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleQuantityChange(item, 1)}
                            className={cn(
                              "h-8 w-8 rounded-lg transition-colors text-primary hover:bg-white",
                              totalQuantity === 0 && "bg-white shadow-sm"
                            )}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
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
