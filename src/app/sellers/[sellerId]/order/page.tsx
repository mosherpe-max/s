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
          text: "Your order will be delivered directly to you on the course.",
          icon: <MapPin className="h-4 w-4" />
        };
      case 'Take Out':
        return {
          text: "Your order will be available for pickup at the Clubhouse.",
          icon: <ShoppingBasket className="h-4 w-4" />
        };
      case 'Pool':
        return {
          text: "Your order will be delivered to your poolside location.",
          icon: <Info className="h-4 w-4" />
        };
      default:
        return {
          text: `Ordering from ${selectedMenuType}.`,
          icon: <Store className="h-4 w-4" />
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
      {/* Service Selection Bar - Distinct from Header */}
      <div className="bg-muted/50 border-b shadow-inner">
        <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.2em] flex items-center gap-1.5 px-1">
              <Store className="w-3 h-3" /> CHOOSE YOUR SERVICE
            </Label>
            <div className="flex flex-wrap gap-2">
              {seller?.menuTypes?.map((type) => (
                <Button 
                  key={type} 
                  variant={selectedMenuType === type ? 'default' : 'secondary'} 
                  size="sm"
                  onClick={() => setSelectedMenuType(type)} 
                  className={cn(
                    "h-10 text-xs px-5 rounded-xl font-bold transition-all duration-300 shadow-sm",
                    selectedMenuType === type 
                      ? "bg-primary text-white scale-105 shadow-md" 
                      : "bg-white text-muted-foreground hover:bg-white hover:shadow"
                  )}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-primary/10 shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
            <div className="bg-primary/10 p-2 rounded-full text-primary">
              {serviceInstructions.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70 leading-none mb-1">Service Instructions</p>
              <p className="text-xs font-medium text-foreground">{serviceInstructions.text}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Selection Bar - Sticky */}
      <div className="sticky top-16 z-20 bg-background/95 backdrop-blur-md border-b shadow-sm">
        <div className="px-4 py-3 max-w-2xl mx-auto">
          {!isLoading && !isServiceActive && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 py-2 mb-3">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-4 w-4" />
                <div>
                  <AlertTitle className="text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5">Service Currently Offline</AlertTitle>
                  <AlertDescription className="text-[10px] opacity-80 leading-tight">
                    The {selectedMenuType} is not accepting orders right now.
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-1">
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
                      "h-8 text-xs px-4 rounded-full transition-all duration-300",
                      isSelected ? "bg-[#213147] text-white" : "text-muted-foreground hover:bg-muted"
                    )}
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

      <main className="flex-1 px-4 pt-4 pb-24 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-6 px-1">
          <h2 className="font-headline text-xl font-bold uppercase tracking-tight text-foreground">{selectedMenuType} Menu</h2>
          <div className="h-px bg-muted flex-1" />
        </div>

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
          />
        )}
      </main>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        {activeOrderItems.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/10 backdrop-blur-md border-t z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
            <SheetTrigger asChild>
              <Button 
                size="lg" 
                className="w-full text-lg h-14 shadow-2xl font-headline font-black uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] bg-primary"
              >
                View Order ({totalItems}) • ${(total || 0).toFixed(2)}
              </Button>
            </SheetTrigger>
          </div>
        )}
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] flex flex-col p-0 border-t-2 shadow-2xl overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b bg-muted/20">
            <SheetTitle className="font-headline font-black uppercase text-center tracking-tighter">Review Your Order</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6">
            <div className="py-8 space-y-8">
              <OrderSummary items={activeOrderItems} serviceFee={seller?.serviceFee} />
              
              <div className="space-y-4">
                  <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                      <Banknote className="w-4 h-4" /> PAYMENT INFORMATION
                  </h3>
                  <div className="p-5 bg-muted/30 rounded-2xl border-2 border-dashed flex items-center gap-4">
                    <div className="p-3 bg-white rounded-full shadow-sm">
                        <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-black uppercase">Pay at Delivery</p>
                        <p className="text-xs text-muted-foreground font-medium">
                            {selectedMenuType === 'Beverage Cart' 
                                ? 'Cash or Card to Cart Operator' 
                                : 'Pay at pickup/delivery location'}
                        </p>
                    </div>
                  </div>
              </div>
            </div>
          </ScrollArea>
          <SheetFooter className="p-6 bg-white border-t">
            <Button 
              size="lg" 
              className="w-full text-lg font-black h-16 font-headline shadow-2xl uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] bg-primary" 
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
