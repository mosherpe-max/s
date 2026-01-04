'use client';

import { useMemo } from 'react';
import {
  collection,
  doc,
  query,
  where,
} from 'firebase/firestore';
import {
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import type { Menu, MenuItem, Seller } from '@/lib/types';
import { categoryIcons } from '@/components/icons';

function MenuItemsList({ menuId, sellerId }: { menuId: string, sellerId: string }) {
  const firestore = useFirestore();
  const menuItemsQuery = useMemoFirebase(() => {
    if (!firestore || !menuId) return null;
    return collection(firestore, 'sellers', sellerId, 'menus', menuId, 'menuItems');
  }, [firestore, menuId, sellerId]);

  const { data: menuItems, isLoading } = useCollection<MenuItem>(menuItemsQuery);

  if (isLoading) return <p>Loading menu items...</p>;

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-md">
      {menuItems && menuItems.length > 0 ? (
        menuItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 p-2 rounded-lg bg-background"
          >
            <div className="flex items-center gap-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  ${item.price.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))
      ) : (
        <p>No items in this menu yet.</p>
      )}
    </div>
  );
}

export default function SellerAdminPage({
  params,
}: {
  params: { sellerId: string };
}) {
  const { sellerId } = params;
  const firestore = useFirestore();

  const sellerRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'sellers', sellerId);
  }, [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menusQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sellers', sellerId, 'menus');
  }, [firestore, sellerId]);

  const { data: menus, isLoading: areMenusLoading } = useCollection<Menu>(menusQuery);

  const isLoading = isSellerLoading || areMenusLoading;

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-headline text-2xl md:text-3xl font-bold text-foreground">
          Seller Admin - {isLoading ? 'Loading...' : seller?.courseName}
        </h1>
      </header>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manage Menus</CardTitle>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Menu
          </Button>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {isLoading ? (
              <p>Loading menus...</p>
            ) : menus && menus.length > 0 ? (
              menus.map((menu) => (
                <AccordionItem value={menu.id} key={menu.id}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">{menu.name}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <MenuItemsList menuId={menu.id} sellerId={sellerId} />
                  </AccordionContent>
                </AccordionItem>
              ))
            ) : (
              <p>No menus found for this seller.</p>
            )}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}