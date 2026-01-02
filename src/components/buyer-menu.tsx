'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { categories, menuItems, type OrderItem, type MenuItem } from '@/lib/data';
import { PlusCircle, MinusCircle } from 'lucide-react';
import { categoryIcons } from './icons';

interface BuyerMenuProps {
  orderItems: OrderItem[];
  onUpdateItem: (item: OrderItem) => void;
}

export function BuyerMenu({ orderItems, onUpdateItem }: BuyerMenuProps) {
  const handleQuantityChange = (item: MenuItem, change: number) => {
    const existingItem = orderItems.find(i => i.id === item.id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const newQuantity = Math.max(0, currentQuantity + change);
    onUpdateItem({ ...item, quantity: newQuantity });
  };

  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const CategoryIcon = categoryIcons[category];
        const itemsInCategory = menuItems.filter((item) => item.category === category);
        return (
          <section key={category} id={category.toLowerCase().replace(' ', '-')}>
            <div className="flex items-center gap-3 mb-4">
              <CategoryIcon className="w-8 h-8 text-accent" />
              <h2 className="font-headline text-3xl font-bold">{category}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {itemsInCategory.map((item) => {
                const orderItem = orderItems.find(i => i.id === item.id);
                const quantity = orderItem ? orderItem.quantity : 0;
                return (
                  <Card key={item.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle className="font-headline text-xl">{item.name}</CardTitle>
                      <CardDescription className="text-muted-foreground mt-1">{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 flex-grow">
                      
                    </CardContent>
                    <CardFooter className="p-4 flex justify-between items-center">
                      <p className="text-lg font-semibold text-primary">
                        ${item.price.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleQuantityChange(item, -1)}
                          aria-label={`Decrease quantity of ${item.name}`}
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
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
