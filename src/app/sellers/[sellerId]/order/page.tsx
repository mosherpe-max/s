
'use client';

import { useState, use, useEffect, useMemo } from 'react';
import { collection, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import type { Seller, MenuItem, Category, Order, PaymentMethod } from '@/lib/types';
import { categories } from '@/lib/types';
import { BuyerMenu } from '@/components/buyer-menu';
import { OrderSummary } from '@/components/order-summary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { categoryIcons } from '@/components/icons';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { mockBuyerLocation } from '@/lib/data';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Loader2, AlertCircle, CreditCard, Store, Banknote, ShieldAlert } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCart } from '@/lib/cart-context';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { BrandingFooter } from '@/components/branding-footer';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export default function BuyerOrderPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { orderItems, updateItem, isCartOpen, setIsCartOpen, total, totalItems, clearCart } = useCart();

  const [selectedCategory, setSelectedCategory] = useState<Category>(categories[0]);
  const [selectedMenuType, setSelectedMenuType] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId]);
  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  const filteredMenuItems = useMemo(() => {
    if (!menuItems) return [];
    if (!selectedMenuType) return menuItems;
    return menuItems.filter(item => 
      !item.availableOn || item.availableOn.length === 0 || item.availableOn.includes(selectedMenuType)
    );
  }, [menuItems, selectedMenuType]);

  const currentCategories = useMemo(() => {
    if (selectedMenuType === 'Beverage Cart') {
      return ['Beer', 'Spirits', 'Soft Drinks', 'Snacks'] as Category[];
    }
    if (selectedMenuType === 'Clubhouse') {
      return ['Sandwiches', 'Appetizers', 'Entrees', 'Dessert', 'Beer', 'Spirits', 'Soft Drinks', 'Snacks'] as Category[];
    }
    return categories as unknown as Category[];
  }, [selectedMenuType]);

  useEffect(() => {
    if (currentCategories.length > 0 && !currentCategories.includes(selectedCategory)) {
      setSelectedCategory(currentCategories[0]);
    }
  }, [currentCategories, selectedCategory]);

  useEffect(() => {
    if (seller?.menuTypes && seller.menuTypes.length > 0 && !selectedMenuType) {
      setSelectedMenuType(seller.menuTypes[0]);
    }
  }, [seller, selectedMenuType]);

  const isServiceActive = useMemo(() => {
    if (!seller) return true;
    if (selectedMenuType === 'Beverage Cart') {
      return seller.bevcartActive === true;
    }
    if (selectedMenuType === 'Clubhouse') {
      return seller.clubhouseActive === true;
    }
    return seller.status === 'Active';
  }, [seller, selectedMenuType]);

  const handlePlaceOrder = async () => {
    try {
      if (!firestore || !seller) {
        toast({ variant: 'destructive', title: 'Error', description: 'Service connection failed. Please try again.' });
        return;
      }

      if (!isServiceActive) {
        toast({ 
          variant: 'destructive', 
          title: 'Service Offline', 
          description: `The ${selectedMenuType} is currently not taking orders.` 
        });
        return;
      }

      const activeOrderItems = orderItems.filter((item) => item.quantity > 0);
      if (activeOrderItems.length === 0) {
        toast({ variant: 'destructive', title: 'Empty Cart', description: 'Please add items to your order.' });
        return;
      }

      setIsPlacingOrder(true);

      const submitToFirestore = async (latitude: number, longitude: number) => {
        try {
          const subtotal = activeOrderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
          
          const paymentMethod: PaymentMethod = 'Pay at Delivery';

          const orderData: Omit<Order, 'id' | 'createdAt'> = {
            sellerId,
            customerId: 'public-user',
            customerName: 'Guest Golfer',
            deliveryLocation: { latitude, longitude },
            items: activeOrderItems,
            subtotal,
            serviceFee: seller.serviceFee || 0,
            total: subtotal + (seller.serviceFee || 0),
            status: 'Placed',
            paymentMethod,
            menuType: selectedMenuType,
          };

          const ordersCol = collection(firestore, 'orders');
          const docRef = await addDoc(ordersCol, { ...orderData, createdAt: serverTimestamp() });
          
          toast({ title: 'Order Placed!', description: "Redirecting to tracking..." });
          clearCart();
          setIsPlacingOrder(false);
          router.push(`/order/track?id=${docRef.id}`);
        } catch (err: any) {
          console.error("Order submission failed:", err);
          errorEmitter.emit('permission-error', new FirestorePermissionError({ 
            path: 'orders', 
            operation: 'create', 
            requestResourceData: { sellerId } 
          }));
          setIsPlacingOrder(false);
        }
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (p) => submitToFirestore(p.coords.latitude, p.coords.longitude),
          (error) => {
            console.warn("Geolocation fallback used:", error);
            submitToFirestore(mockBuyerLocation.latitude, mockBuyerLocation.longitude);
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      } else {
        submitToFirestore(mockBuyerLocation.latitude, mockBuyerLocation.longitude);
      }
    } catch (error) {
      console.error("Critical error in handlePlaceOrder:", error);
      setIsPlacingOrder(false);
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    }
  };

  const isLoading = isSellerLoading || areItemsLoading;
  const activeOrderItems = orderItems.filter((item) => item.quantity > 0);
  const brandColor = seller?.brandColor || 'hsl(var(--primary))';

  if (!isLoading && !seller) return <div className="p-8 text-center"><h2>Seller Not Found</h2></div>;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 border-b">
        <div className="px-4 py-3 space-y-3">
            <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1">
                    <Store className="w-3 h-3" /> SELECT SERVICE
                </Label>
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-2 pb-1">
                        {seller?.menuTypes?.map((type) => (
                            <Button 
                                key={type} 
                                variant={selectedMenuType === type ? 'default' : 'outline'} 
                                size="sm"
                                onClick={() => setSelectedMenuType(type)} 
                                className="h-8 text-xs px-4 rounded-full"
                                style={selectedMenuType === type ? { backgroundColor: brandColor } : {}}
                            >
                                {type}
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            
            {!isLoading && !isServiceActive && (
              <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 py-2">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <div>
                    <AlertTitle className="text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5">Service Offline</AlertTitle>
                    <AlertDescription className="text-[10px] opacity-80 leading-tight">
                      The {selectedMenuType} is currently not accepting orders.
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            <Separator />
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2 pb-1">
                    {currentCategories.map((cat) => {
                        const Icon = categoryIcons[cat];
                        const isSelected = selectedCategory === cat;
                        return (
                            <Button 
                                key={cat} 
                                variant={isSelected ? 'default' : 'outline'} 
                                size="sm"
                                onClick={() => setSelectedCategory(cat)} 
                                className="h-8 text-xs px-4 rounded-full"
                                style={isSelected ? { backgroundColor: brandColor } : {}}
                            >
                                <Icon className="mr-2 h-3.5 w-3.5" />
                                {cat}
                            </Button>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
      </div>

      <main className="flex-1 px-4 pt-4 pb-24">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : (
          <BuyerMenu 
            orderItems={orderItems} 
            onUpdateItem={updateItem} 
            selectedCategory={selectedCategory} 
            menuItems={filteredMenuItems} 
            accentColor={brandColor}
          />
        )}
      </main>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        {activeOrderItems.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-sm border-t z-30">
            <SheetTrigger asChild>
              <Button 
                size="lg" 
                className="w-full text-lg h-14 shadow-xl font-headline"
                style={{ backgroundColor: brandColor }}
              >
                View Order ({totalItems}) • ${(total || 0).toFixed(2)}
              </Button>
            </SheetTrigger>
          </div>
        )}
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] flex flex-col p-0 border-t-2">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="font-headline uppercase text-center">Review Your Order</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6">
            <div className="py-6 space-y-6">
              <OrderSummary items={activeOrderItems} serviceFee={seller?.serviceFee} />
              
              <div className="space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Banknote className="w-4 h-4" /> Payment Info
                  </h3>
                  <div className="p-4 bg-primary/5 rounded-xl border-2 border-primary/10 flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                        <CreditCard className="w-5 h-5 text-primary" style={{ color: brandColor }} />
                    </div>
                    <div>
                        <p className="text-sm font-bold">Pay at Delivery</p>
                        <p className="text-xs text-muted-foreground">
                            {selectedMenuType === 'Beverage Cart' 
                                ? 'Cash or Card to Cart Operator' 
                                : 'Pay at pickup/delivery location'}
                        </p>
                    </div>
                  </div>
              </div>
            </div>
          </ScrollArea>
          <SheetFooter className="p-6 bg-background border-t">
            <Button 
              size="lg" 
              className="w-full text-lg font-bold h-14 font-headline shadow-lg" 
              onClick={handlePlaceOrder} 
              disabled={isPlacingOrder || !isServiceActive}
              style={{ backgroundColor: brandColor }}
            >
              {!isServiceActive ? "SERVICE OFFLINE" : (isPlacingOrder ? <><Loader2 className="animate-spin mr-2" /> Placing...</> : "PLACE ORDER")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <BrandingFooter />
    </div>
  );
}
