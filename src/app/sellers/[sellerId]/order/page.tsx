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
import { Loader2, CreditCard, Store, Banknote, ShieldAlert, Info, MapPin, ShoppingBasket } from 'lucide-react';
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

  const serviceInstructions = useMemo(() => {
    switch (selectedMenuType) {
      case 'Beverage Cart':
      case 'Clubhouse':
        return {
          text: "Delivery to your location on the course.",
          icon: <MapPin className="h-3 w-3" />
        };
      case 'Take Out':
        return {
          text: "Pickup at the Clubhouse.",
          icon: <ShoppingBasket className="h-3 w-3" />
        };
      case 'Pool':
        return {
          text: "Delivery to your poolside location.",
          icon: <Info className="h-3 w-3" />
        };
      default:
        return {
          text: `Ordering from ${selectedMenuType}.`,
          icon: <Store className="h-3 w-3" />
        };
    }
  }, [selectedMenuType]);

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
          
          toast({ title: 'Order Placed!', description: "Thank you for your order" });
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
  
  if (!isLoading && !seller) return <div className="p-8 text-center"><h2>Seller Not Found</h2></div>;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Tight Service Selection Bar */}
      <div className="bg-muted/30 border-b">
        <div className="px-4 py-2.5 space-y-2 max-w-2xl mx-auto">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1 px-1">
              <Store className="w-2.5 h-2.5" /> SERVICE
            </Label>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-1">
                {seller?.menuTypes?.map((type) => (
                  <Button 
                    key={type} 
                    variant={selectedMenuType === type ? 'default' : 'secondary'} 
                    size="sm"
                    onClick={() => setSelectedMenuType(type)} 
                    className={cn(
                      "h-8 text-[10px] px-3 rounded-lg font-bold transition-all shadow-sm",
                      selectedMenuType === type 
                        ? "bg-primary text-white" 
                        : "bg-white text-muted-foreground"
                    )}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="bg-white/80 rounded-md p-1.5 border border-primary/5 flex items-center gap-2 animate-in fade-in">
            <div className="text-primary">
              {serviceInstructions.icon}
            </div>
            <p className="text-[10px] font-medium text-foreground leading-tight">{serviceInstructions.text}</p>
          </div>
        </div>
      </div>

      {/* Sticky Category Bar - Thin Profile */}
      <div className="sticky top-16 z-20 bg-background/90 backdrop-blur-md border-b">
        <div className="px-4 py-2 max-w-2xl mx-auto">
          {!isLoading && !isServiceActive && (
            <div className="bg-destructive/10 border-destructive/20 p-1 rounded-md mb-2 flex items-center gap-2">
                <ShieldAlert className="h-3 w-3 text-destructive" />
                <p className="text-[9px] font-bold text-destructive uppercase tracking-widest">
                  {selectedMenuType} OFFLINE
                </p>
            </div>
          )}

          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-1.5">
              {currentCategories.map((cat) => {
                const Icon = categoryIcons[cat];
                const isSelected = selectedCategory === cat;
                return (
                  <Button 
                    key={cat} 
                    variant={isSelected ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => setSelectedCategory(cat)} 
                    className={cn(
                      "h-7 text-[9px] px-2.5 rounded-full font-bold uppercase tracking-wider",
                      isSelected ? "bg-[#213147] text-white" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="mr-1 h-3 w-3" />
                    {cat}
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      <main className="flex-1 px-4 pt-3 pb-24 max-w-2xl mx-auto w-full">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ) : (
          <BuyerMenu 
            orderItems={orderItems} 
            onUpdateItem={updateItem} 
            selectedCategory={selectedCategory} 
            menuItems={filteredMenuItems} 
          />
        )}
      </main>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        {activeOrderItems.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/10 backdrop-blur-md border-t z-30 shadow-lg">
            <SheetTrigger asChild>
              <Button 
                size="lg" 
                className="w-full text-base h-12 shadow-xl font-headline font-black uppercase tracking-widest bg-primary"
              >
                Order ({totalItems}) • ${(total || 0).toFixed(2)}
              </Button>
            </SheetTrigger>
          </div>
        )}
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] flex flex-col p-0 border-t-2 shadow-2xl overflow-hidden">
          <SheetHeader className="px-6 py-4 border-b bg-muted/20">
            <SheetTitle className="font-headline font-black uppercase text-center text-sm tracking-tight">Review Your Order</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6">
            <div className="py-6 space-y-6">
              <OrderSummary items={activeOrderItems} serviceFee={seller?.serviceFee} />
              
              <div className="space-y-3">
                  <h3 className="font-black text-[9px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Banknote className="w-3 h-3" /> PAYMENT
                  </h3>
                  <div className="p-4 bg-muted/30 rounded-xl border-2 border-dashed flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full shadow-sm">
                        <CreditCard className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase">Pay at Delivery</p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                            {selectedMenuType === 'Beverage Cart' 
                                ? 'Cash or Card to Cart Operator' 
                                : 'Pay at delivery location'}
                        </p>
                    </div>
                  </div>
              </div>
            </div>
          </ScrollArea>
          <SheetFooter className="p-4 bg-white border-t">
            <Button 
              size="lg" 
              className="w-full text-base font-black h-14 font-headline shadow-xl uppercase tracking-widest bg-primary" 
              onClick={handlePlaceOrder} 
              disabled={isPlacingOrder || !isServiceActive}
            >
              {!isServiceActive ? "SERVICE OFFLINE" : (isPlacingOrder ? <><Loader2 className="animate-spin mr-2" /> PROCESSING...</> : "PLACE ORDER")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <BrandingFooter />
    </div>
  );
}
