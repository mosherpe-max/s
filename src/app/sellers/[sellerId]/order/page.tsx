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
  AlertTriangle,
  Info,
  ClipboardList,
  Heart
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCart } from '@/lib/cart-context';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn, isStaffSessionStale } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const serviceTypeIcons: Record<string, any> = {
  'Beverage Cart': Truck,
  'Clubhouse': Building,
  'Pool': Waves,
  'Take Out': ShoppingBasket,
  'Halfway House': Home,
  'Dine-In': Utensils,
  'Lane Delivery': MapPin,
};

const serviceLocationLabels: Record<string, string> = {
  'Lane Delivery': 'Lane Number',
  'Dine-In': 'Table Number',
  'Halfway House': 'Location Name',
  'Pool': 'Cabana/Chair Number',
};

export default function BuyerOrderPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { orderItems, updateItem, isCartOpen, setIsCartOpen, total: cartTotal, totalItems, clearCart, editingOrderId, cancelEditing } = useCart();

  const [selectedMenuType, setSelectedMenuType] = useState<string>('');
  const [locationValue, setLocationValue] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Tip State
  const [selectedTipType, setSelectedTipType] = useState<string | null>(null);
  const [customTipValue, setCustomTipValue] = useState<string>('');

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId]);
  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  // Auto-Reset stale drivers at 4 AM EST
  useEffect(() => {
    if (firestore && seller) {
      const lastActive = seller.lastActive?.toDate();
      const needsBevCartReset = seller.bevcartActive && isStaffSessionStale(lastActive);
      const needsClubhouseReset = seller.clubhouseActive && isStaffSessionStale(lastActive);

      if (needsBevCartReset || needsClubhouseReset) {
        const updates: any = {};
        if (needsBevCartReset) updates.bevcartActive = false;
        if (needsClubhouseReset) updates.clubhouseActive = false;
        
        updateDoc(doc(firestore, 'sellers', sellerId), updates).catch(() => {});
      }
    }
  }, [seller, firestore, sellerId]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const activeOrderItems = useMemo(() => orderItems.filter((item) => item.quantity > 0), [orderItems]);
  const subtotal = useMemo(() => activeOrderItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [activeOrderItems]);
  const tax = useMemo(() => subtotal * 0.06, [subtotal]);
  const platformFee = seller?.serviceFee || 0;

  const tipOptions = useMemo(() => {
    if (subtotal > 20) {
      return [
        { label: '15%', value: 0.15, type: 'percent' },
        { label: '20%', value: 0.20, type: 'percent' },
        { label: '25%', value: 0.25, type: 'percent' },
      ];
    } else {
      return [
        { label: '$2', value: 2, type: 'fixed' },
        { label: '$3', value: 3, type: 'fixed' },
        { label: '$4', value: 4, type: 'fixed' },
      ];
    }
  }, [subtotal]);

  // Set default tip on first open or subtotal change
  useEffect(() => {
    if (subtotal > 0 && !selectedTipType) {
      setSelectedTipType(tipOptions[1].label); // Default to middle option
    }
  }, [subtotal, selectedTipType, tipOptions]);

  const tipAmount = useMemo(() => {
    if (selectedTipType === 'Custom') {
      return parseFloat(customTipValue) || 0;
    }
    const option = tipOptions.find(o => o.label === selectedTipType);
    if (!option) return 0;
    return option.type === 'percent' ? subtotal * option.value : option.value;
  }, [selectedTipType, customTipValue, subtotal, tipOptions]);

  const finalTotal = subtotal + platformFee + tax + tipAmount;

  const sortedMenuTypes = useMemo(() => {
    if (!seller?.menuTypes) return [];
    const types = [...seller.menuTypes];
    const laneIndex = types.indexOf('Lane Delivery');
    if (laneIndex > -1) {
      types.splice(laneIndex, 1);
      types.unshift('Lane Delivery');
    }
    return types;
  }, [seller?.menuTypes]);

  const filteredMenuItems = useMemo(() => {
    if (!menuItems || !selectedMenuType) return [];
    return menuItems.filter(item => item.availableOn?.includes(selectedMenuType));
  }, [menuItems, selectedMenuType]);

  const currentCategories = useMemo(() => {
    if (!seller || !filteredMenuItems.length) return [];
    let enabledCategories: Category[] = seller.categoryVisibility?.[selectedMenuType] || [...categories];
    enabledCategories.sort((a, b) => categories.indexOf(a) - categories.indexOf(b));
    const availableCategories = new Set(filteredMenuItems.map(item => item.category));
    return enabledCategories.filter(cat => availableCategories.has(cat));
  }, [selectedMenuType, seller, filteredMenuItems]);

  useEffect(() => {
    if (sortedMenuTypes.length > 0 && !selectedMenuType) {
      setSelectedMenuType(sortedMenuTypes[0]);
    }
  }, [sortedMenuTypes, selectedMenuType]);

  const isServiceActive = useMemo(() => {
    if (!seller) return false;
    if (seller.status !== 'Active') return false;
    if (selectedMenuType === 'Beverage Cart') return seller.bevcartActive === true;
    if (selectedMenuType === 'Clubhouse') return seller.clubhouseActive === true;
    return true; 
  }, [seller, selectedMenuType]);

  const handleJumpToCategory = (cat: string) => {
    const id = cat.toLowerCase().replace(/\s+/g, '-');
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePlaceOrder = async () => {
    try {
      if (!firestore || !seller) return;

      const locationLabel = serviceLocationLabels[selectedMenuType];
      if (locationLabel && !locationValue.trim()) {
        toast({ variant: 'destructive', title: 'Selection Required', description: `Please select your ${locationLabel}.` });
        return;
      }

      if (activeOrderItems.length === 0) {
        toast({ variant: 'destructive', title: 'Empty Cart', description: 'Please add items to your order.' });
        return;
      }

      setIsPlacingOrder(true);

      const submitToFirestore = async (latitude: number, longitude: number) => {
        try {
          const orderData: any = {
            sellerId,
            customerId: 'public-user',
            customerName: 'Guest User',
            deliveryLocation: { latitude, longitude },
            items: activeOrderItems,
            subtotal,
            serviceFee: platformFee,
            tax,
            tip: tipAmount,
            total: finalTotal,
            status: 'Placed',
            paymentMethod: 'Pay at Delivery',
            menuType: selectedMenuType,
            menuTypeLocation: locationValue || null,
            modifiedAt: serverTimestamp(),
          };

          if (editingOrderId) {
            const orderDocRef = doc(firestore, 'orders', editingOrderId);
            await updateDoc(orderDocRef, orderData);
            toast({ title: 'Order Updated' });
            router.push(`/order/track?id=${editingOrderId}&sellerId=${sellerId}`);
          } else {
            const ordersCol = collection(firestore, 'orders');
            const docRef = await addDoc(ordersCol, { ...orderData, createdAt: serverTimestamp() });
            toast({ title: 'Order Placed!' });
            router.push(`/order/track?id=${docRef.id}&sellerId=${sellerId}`);
          }
          
          clearCart();
          setIsPlacingOrder(false);
        } catch (err: any) {
          setIsPlacingOrder(false);
          errorEmitter.emit('permission-error', new FirestorePermissionError({ 
            path: 'orders', operation: editingOrderId ? 'update' : 'create', requestResourceData: { sellerId } 
          }));
        }
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (p) => submitToFirestore(p.coords.latitude, p.coords.longitude),
          () => submitToFirestore(mockBuyerLocation.latitude, mockBuyerLocation.longitude),
          { timeout: 5000 }
        );
      } else {
        submitToFirestore(mockBuyerLocation.latitude, mockBuyerLocation.longitude);
      }
    } catch (error) {
      setIsPlacingOrder(false);
      toast({ variant: 'destructive', title: 'Error' });
    }
  };

  const isLoading = isSellerLoading || areItemsLoading;
  const locationLabel = serviceLocationLabels[selectedMenuType];

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-y-auto">
      {editingOrderId && (
        <div className="bg-primary px-4 py-2 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Modifying Existing Order</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { cancelEditing(); router.back(); }} className="h-6 text-[9px] text-white border border-white/20 uppercase">
            <XCircle className="mr-1 h-3 w-3" /> Cancel
          </Button>
        </div>
      )}

      <div className="bg-muted/30 border-b shrink-0">
        <div className="px-4 py-3 space-y-3 max-w-2xl mx-auto">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1 px-1">
              <Store className="w-2.5 h-2.5" /> SERVICE MODE
            </Label>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-1">
                {sortedMenuTypes.map((type) => {
                  const Icon = serviceTypeIcons[type] || Store;
                  const isSelected = selectedMenuType === type;
                  return (
                    <Button 
                      key={type} 
                      variant={isSelected ? 'default' : 'secondary'} 
                      size="sm"
                      onClick={() => { setSelectedMenuType(type); setLocationValue(''); }} 
                      className={cn(
                        "h-8 text-[10px] px-3 rounded-lg font-bold transition-all shadow-sm flex items-center gap-1.5",
                        isSelected ? "bg-primary text-white" : "bg-white text-muted-foreground"
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
        </div>
      </div>

      {isServiceActive && currentCategories.length > 0 && (
        <div className="sticky top-16 z-20 bg-background/95 backdrop-blur-md border-b shadow-sm shrink-0">
          <div className="px-4 py-2 max-w-2xl mx-auto">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-1.5">
                {currentCategories.map((cat) => {
                  const Icon = categoryIcons[cat];
                  return (
                    <Button key={cat} variant="ghost" size="sm" onClick={() => handleJumpToCategory(cat)} className="h-7 text-[9px] px-2.5 rounded-full font-bold uppercase tracking-wider text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                      <Icon className="mr-1 h-3 w-3" /> {cat}
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
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : !isServiceActive ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-6">
            <div className="bg-muted p-8 rounded-full"><ShieldAlert className="h-16 w-16 opacity-30" /></div>
            <div className="space-y-3">
              <h2 className="font-headline text-3xl font-bold uppercase tracking-tight text-[#213147]">{selectedMenuType} OFFLINE</h2>
              <p className="text-muted-foreground text-xs max-w-xs mx-auto">This service is not currently taking orders. Please try another service or check back later.</p>
            </div>
          </div>
        ) : (
          <BuyerMenu 
            orderItems={orderItems} 
            onUpdateItem={updateItem} 
            currentCategories={currentCategories} 
            menuItems={filteredMenuItems} 
            selectedMenuType={selectedMenuType}
            categoryImageVisibility={seller?.categoryImageVisibility?.[selectedMenuType] || []}
          />
        )}
      </main>

      {showBackToTop && (
        <Button variant="secondary" size="icon" className="fixed bottom-32 right-6 rounded-full shadow-lg z-30 h-10 w-10 bg-background/90" onClick={scrollToTop}>
          <ArrowUp className="h-5 w-5 text-primary" />
        </Button>
      )}

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        {isServiceActive && activeOrderItems.length > 0 && (
          <div className="fixed bottom-7 left-0 right-0 p-4 bg-white/10 backdrop-blur-md border-t z-30 shadow-lg">
            <SheetTrigger asChild>
              <Button size="lg" className="w-full text-base h-12 shadow-xl font-headline font-black uppercase tracking-widest bg-primary">
                {editingOrderId ? "Update Order" : "Review & Place Order"} ({totalItems})
              </Button>
            </SheetTrigger>
          </div>
        )}
        <SheetContent side="bottom" className="rounded-t-[2.5rem] max-h-[95vh] h-[95vh] flex flex-col p-0 border-t-4 overflow-hidden bg-background shadow-[0_-10px_40px_rgba(0,0,0,0.15)]">
          <SheetHeader className="px-6 py-5 border-b bg-muted/20 shrink-0">
            <SheetTitle className="font-headline font-black uppercase text-center text-sm tracking-tight flex items-center justify-center gap-2">
              <ShoppingBasket className="h-4 w-4 text-primary" />
              {editingOrderId ? "Update Your Order" : "Final Order Review"}
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="flex-1 w-full min-h-0">
            <div className="px-6 py-6 space-y-8 pb-32">
              
              <div className="grid grid-cols-2 gap-4 py-4 px-4 bg-muted/30 rounded-2xl border border-dashed">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                    <Store className="w-2.5 h-2.5" /> ESTABLISHMENT
                  </p>
                  <p className="text-xs font-black truncate">{seller?.courseName || 'Loading...'}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5 justify-end">
                    <ClipboardList className="w-2.5 h-2.5" /> SERVICE MODE
                  </p>
                  <p className="text-xs font-black">{selectedMenuType}</p>
                </div>
              </div>

              {locationLabel && (
                <div className="bg-primary/5 p-5 rounded-2xl border-2 border-primary/20 space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-primary" /> {locationLabel}
                  </Label>
                  {(selectedMenuType === 'Lane Delivery' && seller?.laneCount) || (selectedMenuType === 'Dine-In' && seller?.tableCount) ? (
                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                      {Array.from({ length: (selectedMenuType === 'Lane Delivery' ? seller?.laneCount : seller?.tableCount) || 0 }, (_, i) => (i + 1).toString()).map((num) => (
                        <Button
                          key={num}
                          variant={locationValue === num ? 'default' : 'outline'}
                          onClick={() => setLocationValue(num)}
                          className={cn(
                            "h-10 px-0 font-bold text-xs rounded-xl transition-all",
                            locationValue === num ? "bg-primary text-white shadow-lg scale-105" : "bg-white hover:bg-primary/5"
                          )}
                        >
                          {num}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <Input 
                      placeholder={`Enter your ${locationLabel}...`}
                      value={locationValue}
                      onChange={(e) => setLocationValue(e.target.value)}
                      className="h-12 text-base font-black border-2 rounded-xl focus-visible:ring-primary shadow-sm"
                    />
                  )}
                </div>
              )}

              <div className="space-y-4 bg-muted/10 p-5 rounded-2xl border-2 border-dashed">
                <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-red-500" /> ADD GRATUITY / TIP
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {tipOptions.map((opt) => (
                    <Button 
                      key={opt.label} 
                      variant={selectedTipType === opt.label ? 'default' : 'outline'}
                      onClick={() => setSelectedTipType(opt.label)}
                      className={cn(
                        "h-11 font-black rounded-xl",
                        selectedTipType === opt.label ? "bg-primary text-white shadow-md scale-105" : "bg-white"
                      )}
                    >
                      {opt.label}
                    </Button>
                  ))}
                  <Button 
                    variant={selectedTipType === 'Custom' ? 'default' : 'outline'}
                    onClick={() => setSelectedTipType('Custom')}
                    className={cn(
                      "h-11 font-black rounded-xl",
                      selectedTipType === 'Custom' ? "bg-primary text-white shadow-md scale-105" : "bg-white"
                    )}
                  >
                    Other
                  </Button>
                </div>
                {selectedTipType === 'Custom' && (
                  <div className="pt-2 animate-in slide-in-from-top-2">
                    <Input 
                      type="number" 
                      placeholder="Enter tip amount ($)..." 
                      value={customTipValue}
                      onChange={(e) => setCustomTipValue(e.target.value)}
                      className="h-12 text-base font-black border-2 rounded-xl focus-visible:ring-primary"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                  <Info className="w-3.5 h-3.5" /> ORDER SUMMARY
                </h3>
                <OrderSummary 
                  items={activeOrderItems} 
                  serviceFee={platformFee} 
                  tax={tax}
                  tip={tipAmount}
                />
              </div>

              <div className="space-y-4">
                  <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                    <Banknote className="w-3.5 h-3.5" /> PAYMENT METHOD
                  </h3>
                  <div className="p-5 bg-muted/30 rounded-2xl border-2 border-dashed flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border"><CreditCard className="w-6 h-6 text-primary" /></div>
                    <div>
                        <p className="text-sm font-black uppercase tracking-tight">Pay at Delivery</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Card or Cash accepted by staff</p>
                    </div>
                  </div>
              </div>

              <div className="text-center opacity-60 pb-10">
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.1em] italic leading-relaxed">
                  By placing this order, you agree to the service terms of {seller?.courseName}.<br/>
                  Total includes {platformFee > 0 ? `a $${platformFee.toFixed(2)} platform fee, ` : ''}6% sales tax and gratuity.
                </p>
              </div>
            </div>
          </ScrollArea>

          <SheetFooter className="p-6 bg-white border-t-2 flex flex-col gap-4 shrink-0 relative z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-center px-1">
              <span className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">FINAL TOTAL</span>
              <span className="font-headline font-black text-3xl text-primary tracking-tighter">${finalTotal.toFixed(2)}</span>
            </div>
            <Button 
              size="lg" 
              className="w-full text-base font-black h-16 font-headline uppercase tracking-[0.2em] bg-primary shadow-2xl rounded-2xl transition-all active:scale-95" 
              onClick={handlePlaceOrder} 
              disabled={isPlacingOrder || (locationLabel && !locationValue)}
            >
              {isPlacingOrder ? <><Loader2 className="animate-spin mr-2" /> PROCESSING...</> : (editingOrderId ? "UPDATE ORDER" : "PLACE ORDER NOW")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
