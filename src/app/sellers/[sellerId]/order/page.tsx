'use client';

import { useState, use, useEffect, useMemo } from 'react';
import { collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
import { 
  Loader2, 
  CreditCard, 
  Store, 
  Banknote, 
  ShieldAlert, 
  MapPin, 
  ShoppingBasket, 
  Clock,
  Truck,
  Building,
  Waves,
  Home,
  Utensils,
  ArrowUp,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCart } from '@/lib/cart-context';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const serviceTypeIcons: Record<string, any> = {
  'Beverage Cart': Truck,
  'Clubhouse': Building,
  'Pool': Waves,
  'Take Out': ShoppingBasket,
  'Halfway House': Home,
  'Dine-In': Utensils,
  'Lane Delivery': MapPin,
};

export default function BuyerOrderPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { orderItems, updateItem, isCartOpen, setIsCartOpen, total, totalItems, clearCart, editingOrderId, cancelEditing } = useCart();

  const [selectedMenuType, setSelectedMenuType] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId]);
  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    if (seller?.menuTypes && seller.menuTypes.length > 0 && !selectedMenuType) {
      setSelectedMenuType(seller.menuTypes[0]);
    }
  }, [seller, selectedMenuType]);

  const isServiceActive = useMemo(() => {
    if (!seller) return false;
    if (seller.status !== 'Active') return false;
    if (selectedMenuType === 'Beverage Cart') {
      return seller.bevcartActive === true;
    }
    if (selectedMenuType === 'Clubhouse') {
      return seller.clubhouseActive === true;
    }
    return true;
  }, [seller, selectedMenuType]);

  const serviceInstructions = useMemo(() => {
    const Icon = serviceTypeIcons[selectedMenuType] || Store;
    
    switch (selectedMenuType) {
      case 'Beverage Cart':
      case 'Clubhouse':
        return {
          text: "Delivery to your location on the course.",
          icon: <Icon className="h-3 w-3" />
        };
      case 'Take Out':
        return {
          text: "Pickup at the Clubhouse.",
          icon: <Icon className="h-3 w-3" />
        };
      case 'Pool':
        return {
          text: "Delivery to your poolside location.",
          icon: <Icon className="h-3 w-3" />
        };
      default:
        return {
          text: `Ordering from ${selectedMenuType}.`,
          icon: <Icon className="h-3 w-3" />
        };
    }
  }, [selectedMenuType]);

  const handleJumpToCategory = (cat: string) => {
    const id = cat.toLowerCase().replace(/\s+/g, '-');
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

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

          const orderData: any = {
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
            modifiedAt: serverTimestamp(),
          };

          if (editingOrderId) {
            const orderDocRef = doc(firestore, 'orders', editingOrderId);
            await updateDoc(orderDocRef, orderData);
            toast({ title: 'Order Updated', description: "Your modifications have been saved." });
            router.push(`/order/track?id=${editingOrderId}&sellerId=${sellerId}`);
          } else {
            const ordersCol = collection(firestore, 'orders');
            const docRef = await addDoc(ordersCol, { ...orderData, createdAt: serverTimestamp() });
            toast({ title: 'Order Placed!', description: "Thank you for your order" });
            router.push(`/order/track?id=${docRef.id}&sellerId=${sellerId}`);
          }
          
          clearCart();
          setIsPlacingOrder(false);
        } catch (err: any) {
          console.error("Order submission failed:", err);
          errorEmitter.emit('permission-error', new FirestorePermissionError({ 
            path: 'orders', 
            operation: editingOrderId ? 'update' : 'create', 
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

  const handleCancelEdit = () => {
    cancelEditing();
    router.back();
  };

  const isLoading = isSellerLoading || areItemsLoading;
  const activeOrderItems = orderItems.filter((item) => item.quantity > 0);
  
  if (!isLoading && !seller) return <div className="p-8 text-center text-muted-foreground"><h2>Seller Not Found</h2></div>;

  return (
    <div className="flex flex-col min-h-screen bg-background relative">
      {editingOrderId && (
        <div className="bg-primary px-4 py-2 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Modifying Existing Order</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCancelEdit}
            className="h-6 text-[9px] text-white hover:bg-white/10 font-bold uppercase border border-white/20"
          >
            <XCircle className="mr-1 h-3 w-3" /> Cancel
          </Button>
        </div>
      )}

      <div className="bg-muted/30 border-b">
        <div className="px-4 py-2.5 space-y-2 max-w-2xl mx-auto">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1 px-1">
              <Store className="w-2.5 h-2.5" /> SERVICE MODE
            </Label>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-1">
                {seller?.menuTypes?.map((type) => {
                  const Icon = serviceTypeIcons[type] || Store;
                  const isSelected = selectedMenuType === type;
                  return (
                    <Button 
                      key={type} 
                      variant={isSelected ? 'default' : 'secondary'} 
                      size="sm"
                      onClick={() => setSelectedMenuType(type)} 
                      className={cn(
                        "h-8 text-[10px] px-3 rounded-lg font-bold transition-all shadow-sm flex items-center gap-1.5",
                        isSelected 
                          ? "bg-primary text-white" 
                          : "bg-white text-muted-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {type}
                    </Button>
                  );
                })}
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

      {isServiceActive && (
        <div className="sticky top-16 z-20 bg-background/95 backdrop-blur-md border-b shadow-sm">
          <div className="px-4 py-2 max-w-2xl mx-auto">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-1.5">
                {currentCategories.map((cat) => {
                  const Icon = categoryIcons[cat];
                  return (
                    <Button 
                      key={cat} 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleJumpToCategory(cat)} 
                      className="h-7 text-[9px] px-2.5 rounded-full font-bold uppercase tracking-wider text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
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
      )}

      <main className="flex-1 px-4 pt-6 pb-32 max-w-2xl mx-auto w-full">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ) : !isServiceActive ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-muted p-8 rounded-full">
              <ShieldAlert className="h-16 w-16 text-muted-foreground opacity-30" />
            </div>
            <div className="space-y-3">
              <h2 className="font-headline text-3xl font-bold uppercase tracking-tight text-[#213147]">{selectedMenuType} IS OFFLINE</h2>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <p className="text-sm font-medium">Service is currently unavailable</p>
              </div>
              <p className="text-muted-foreground text-xs max-w-xs mx-auto leading-relaxed">
                The {selectedMenuType} is not currently accepting orders. Please try another service or check back later during active hours.
              </p>
            </div>
            {seller?.menuTypes && seller.menuTypes.length > 1 && (
              <div className="pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Try another service:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {seller.menuTypes.filter(t => t !== selectedMenuType).map(type => (
                    <Button key={type} variant="outline" size="sm" onClick={() => setSelectedMenuType(type)} className="text-xs font-bold uppercase">
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <BuyerMenu 
            orderItems={orderItems} 
            onUpdateItem={updateItem} 
            currentCategories={currentCategories} 
            menuItems={filteredMenuItems} 
          />
        )}
      </main>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <Button
          variant="secondary"
          size="icon"
          className="fixed bottom-32 right-6 rounded-full shadow-lg z-30 animate-in fade-in slide-in-from-bottom-4 border-2 border-primary/20 h-10 w-10 bg-background/90 backdrop-blur-sm hover:scale-110 transition-transform"
          onClick={scrollToTop}
        >
          <ArrowUp className="h-5 w-5 text-primary" />
        </Button>
      )}

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        {isServiceActive && activeOrderItems.length > 0 && (
          <div className="fixed bottom-7 left-0 right-0 p-4 bg-white/10 backdrop-blur-md border-t z-30 shadow-lg">
            <SheetTrigger asChild>
              <Button 
                size="lg" 
                className="w-full text-base h-12 shadow-xl font-headline font-black uppercase tracking-widest bg-primary"
              >
                {editingOrderId ? "Update Order" : "Order"} ({totalItems}) • ${(total || 0).toFixed(2)}
              </Button>
            </SheetTrigger>
          </div>
        )}
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] flex flex-col p-0 border-t-2 shadow-2xl overflow-hidden">
          <SheetHeader className="px-6 py-4 border-b bg-muted/20">
            <SheetTitle className="font-headline font-black uppercase text-center text-sm tracking-tight">
              {editingOrderId ? "Updating Your Order" : "Review Your Order"}
            </SheetTitle>
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
              {!isServiceActive ? "SERVICE OFFLINE" : (isPlacingOrder ? <><Loader2 className="animate-spin mr-2" /> PROCESSING...</> : (editingOrderId ? "UPDATE ORDER" : "PLACE ORDER"))}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
