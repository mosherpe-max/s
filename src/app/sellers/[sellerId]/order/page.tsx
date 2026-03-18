'use client';

import { useState, use, useEffect, useMemo } from 'react';
import { collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useAuth, useUser, useFirebaseApp } from '@/firebase';
import type { Seller, MenuItem, Category, Order, ModifierGroup, ModifierOption, OrderItem, PaymentMethod } from '@/lib/types';
import { categories } from '@/lib/types';
import { BuyerMenu } from '@/components/buyer-menu';
import { OrderSummary } from '@/components/order-summary';
import { PricingBreakdown } from '@/components/pricing-breakdown';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Heart,
  Plus,
  Minus,
  Check,
  ChevronLeft
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCart } from '@/lib/cart-context';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn, isStaffSessionStale } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { PoolLayoutPicker } from '@/components/pool-layout-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

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
  'Pool': 'Pool Side Location',
};

function ModifierPicker({ 
  item, 
  onClose, 
  onAdd 
}: { 
  item: MenuItem; 
  onClose: () => void; 
  onAdd: (selected: Record<string, ModifierOption[]>) => void 
}) {
  const [selections, setSelections] = useState<Record<string, ModifierOption[]>>({});

  const toggleOption = (group: ModifierGroup, option: ModifierOption) => {
    const current = selections[group.id] || [];
    const isSelected = current.find(o => o.id === option.id);
    
    if (isSelected) {
      setSelections({ ...selections, [group.id]: current.filter(o => o.id !== option.id) });
    } else {
      if (group.maxSelection === 1) {
        setSelections({ ...selections, [group.id]: [option] });
      } else if (current.length < group.maxSelection) {
        setSelections({ ...selections, [group.id]: [...current, option] });
      }
    }
  };

  const isGroupValid = (group: ModifierGroup) => {
    const count = (selections[group.id] || []).length;
    return count >= group.minSelection && count <= group.maxSelection;
  };

  const isValid = item.modifierGroups?.every(isGroupValid) ?? true;

  const currentTotal = item.price + Object.values(selections).flat().reduce((acc, opt) => acc + opt.price, 0);

  return (
    <div className="flex flex-col h-full bg-background">
      <ScrollArea className="flex-1 px-6">
        <div className="space-y-8 py-6 pb-24">
          <div className="space-y-1">
            <h2 className="text-2xl font-black uppercase tracking-tight">{item.name}</h2>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>

          {item.modifierGroups?.map((group) => (
            <div key={group.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider">{group.name}</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">
                    {group.minSelection > 0 ? `Required (Min ${group.minSelection})` : `Optional (Max ${group.maxSelection})`}
                  </p>
                </div>
                {!isGroupValid(group) && <Badge variant="destructive" className="text-[8px] font-black uppercase">Selection Required</Badge>}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {group.options.map((option) => {
                  const isSelected = !!selections[group.id]?.find(o => o.id === option.id);
                  return (
                    <Button
                      key={option.id}
                      variant="outline"
                      className={cn(
                        "h-14 justify-between px-4 rounded-xl border-2 transition-all",
                        isSelected ? "border-primary bg-primary/5 shadow-sm" : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleOption(group, option)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                        )}>
                          {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <span className="font-bold text-sm">{option.name}</span>
                      </div>
                      {option.price > 0 && <span className="font-mono text-xs font-bold text-primary">+${option.price.toFixed(2)}</span>}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-6 bg-white border-t-2 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Item Total</span>
          <span className="text-2xl font-headline font-black text-primary">${currentTotal.toFixed(2)}</span>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1 font-bold uppercase text-xs" onClick={onClose}>Cancel</Button>
          <Button 
            className="flex-[2] h-12 rounded-xl font-black uppercase tracking-widest" 
            disabled={!isValid}
            onClick={() => onAdd(selections)}
          >
            Add to Order
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BuyerOrderPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const app = useFirebaseApp();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { orderItems, updateItem, removeItem, isCartOpen, setIsCartOpen, totalItems, clearCart } = useCart();

  const menuTypeFromUrl = searchParams.get('menuType');
  const [selectedMenuType, setSelectedMenuType] = useState<string>(menuTypeFromUrl || '');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('Pay at Delivery');
  const [locationValue, setLocationValue] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showBackToTop, setShowTopButton] = useState(false);
  
  const [modifierTarget, setModifierTarget] = useState<MenuItem | null>(null);

  const [selectedTipType, setSelectedTipType] = useState<string | null>(null);
  const [customTipValue, setCustomTipValue] = useState<string>('');

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId]);
  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  useEffect(() => {
    const handleScroll = () => setShowTopButton(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const activeOrderItems = useMemo(() => orderItems.filter((item) => item.quantity > 0), [orderItems]);
  const subtotal = useMemo(() => activeOrderItems.reduce((acc, item) => {
    const basePrice = item.price;
    const modifiersPrice = item.selectedModifiers ? 
      Object.values(item.selectedModifiers).flat().reduce((sum, mod) => sum + mod.price, 0) : 0;
    return acc + (basePrice + modifiersPrice) * item.quantity;
  }, 0), [activeOrderItems]);
  
  const taxRatePercentage = seller?.taxRate ?? 6.0;
  const tax = useMemo(() => subtotal * (taxRatePercentage / 100), [subtotal, taxRatePercentage]);
  
  const platformFee = useMemo(() => {
    if (!seller) return 0;
    const menuSpecificFees = seller.menuServiceFees || {};
    const specificFee = menuSpecificFees[selectedMenuType];
    return specificFee !== undefined && specificFee !== null ? specificFee : (seller.serviceFee || 0);
  }, [seller, selectedMenuType]);

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

  useEffect(() => {
    if (subtotal > 0 && !selectedTipType) {
      setSelectedTipType(tipOptions[1].label);
    }
  }, [subtotal, selectedTipType, tipOptions]);

  const tipAmount = useMemo(() => {
    if (selectedTipType === 'Custom') return parseFloat(customTipValue) || 0;
    const option = tipOptions.find(o => o.label === selectedTipType);
    if (!option) return 0;
    return option.type === 'percent' ? subtotal * option.value : option.value;
  }, [selectedTipType, customTipValue, subtotal, tipOptions]);

  const finalTotal = subtotal + platformFee + tax + tipAmount;

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

  const handlePlaceOrder = async () => {
    try {
      if (!firestore || !seller) return;
      if (activeOrderItems.length === 0) return;

      setIsPlacingOrder(true);

      // Deferred Auth: Authenticate only during submission if not already signed in
      let currentUser = user;
      if (!currentUser && auth) {
        try {
          const authResult = await signInAnonymously(auth);
          currentUser = authResult.user;
        } catch (authErr) {
          console.error("Auth failed:", authErr);
          throw new Error("Failed to establish guest session.");
        }
      }

      if (!currentUser) throw new Error("Security identity required to place order.");

      const functions = getFunctions(app);
      const processPayment = httpsCallable(functions, 'processPayment');

      // Mocking Authorize.net Accept.js Nonce retrieval for prototype
      const mockPaymentNonce = selectedPaymentMethod === 'Credit Card' ? 'fake-valid-nonce' : null;

      const submitToFirestore = async (latitude: number, longitude: number) => {
        try {
          const orderData: any = {
            sellerId,
            buyerProfileId: currentUser!.uid, // Use buyerProfileId to match rules
            customerName: currentUser!.email || 'Guest User',
            deliveryLocation: { latitude, longitude },
            items: activeOrderItems,
            subtotal,
            serviceFee: platformFee,
            tax,
            tip: tipAmount,
            total: finalTotal,
            status: 'Placed',
            paymentMethod: selectedPaymentMethod,
            menuType: selectedMenuType,
            menuTypeLocation: locationValue || null,
            createdAt: serverTimestamp(),
            modifiedAt: serverTimestamp(),
          };

          const orderRef = await addDoc(collection(firestore, 'orders'), orderData);

          if (selectedPaymentMethod === 'Credit Card' && mockPaymentNonce) {
            await processPayment({
              paymentNonce: mockPaymentNonce,
              amount: finalTotal,
              orderId: orderRef.id,
              buyerProfileId: currentUser!.uid,
              sellerId
            });
          }

          router.push(`/order/track?id=${orderRef.id}&sellerId=${sellerId}`);
          clearCart();
        } catch (err: any) {
          console.error(err);
          toast({ variant: 'destructive', title: 'Order Failed', description: err.message });
        } finally {
          setIsPlacingOrder(false);
        }
      };

      if (navigator.geolocation && (selectedMenuType === 'Beverage Cart' || selectedMenuType === 'Clubhouse')) {
        navigator.geolocation.getCurrentPosition(
          (p) => submitToFirestore(p.coords.latitude, p.coords.longitude),
          () => submitToFirestore(mockBuyerLocation.latitude, mockBuyerLocation.longitude)
        );
      } else {
        submitToFirestore(mockBuyerLocation.latitude, mockBuyerLocation.longitude);
      }
    } catch (error: any) {
      setIsPlacingOrder(false);
      toast({ variant: 'destructive', title: 'Submission Error', description: error.message });
    }
  };

  const isLoading = isSellerLoading || areItemsLoading;

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-y-auto">
      <div className="bg-muted/30 border-b shrink-0">
        <div className="px-4 py-3 space-y-3 max-w-2xl mx-auto">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest px-1">SERVICE MODE</Label>
            <div className="flex gap-2">
              {seller?.menuTypes?.map((type) => {
                const Icon = serviceTypeIcons[type] || Store;
                return (
                  <Button 
                    key={type} 
                    variant={selectedMenuType === type ? 'default' : 'secondary'} 
                    size="sm"
                    onClick={() => { setSelectedMenuType(type); setLocationValue(''); }} 
                    className="h-8 text-[10px] px-3 rounded-lg font-bold"
                  >
                    <Icon className="h-3.5 w-3.5 mr-1.5" /> {type}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 pt-6 pb-32 max-w-2xl mx-auto w-full">
        {isLoading ? <Skeleton className="h-40 w-full" /> : (
          <BuyerMenu 
            orderItems={orderItems} 
            onUpdateItem={updateItem} 
            onOpenModifiers={setModifierTarget}
            currentCategories={currentCategories} 
            menuItems={filteredMenuItems} 
            selectedMenuType={selectedMenuType}
            categoryImageVisibility={seller?.categoryImageVisibility?.[selectedMenuType] || []}
            categoryModifierEnabled={seller?.categoryModifierEnabled?.[selectedMenuType] || []}
          />
        )}
      </main>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        {activeOrderItems.length > 0 && (
          <div className="fixed bottom-7 left-0 right-0 p-4 bg-white/10 backdrop-blur-md border-t z-30 shadow-lg">
            <SheetTrigger asChild>
              <Button size="lg" className="w-full text-base h-12 font-black uppercase tracking-widest bg-primary">
                Review Order ({totalItems}) — ${subtotal.toFixed(2)}
              </Button>
            </SheetTrigger>
          </div>
        )}
        <SheetContent side="bottom" className="rounded-t-[2.5rem] h-[95vh] flex flex-col p-0 bg-background overflow-hidden shadow-2xl">
          <SheetHeader className="px-6 py-5 border-b bg-muted/20 shrink-0">
            <SheetTitle className="font-headline font-black uppercase text-center text-sm">Order Review</SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="flex-1 w-full">
            <div className="px-6 py-6 space-y-8 pb-32">
              <OrderSummary items={activeOrderItems} onUpdateItem={updateItem} onRemoveItem={removeItem} />

              <div className="space-y-4">
                <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Banknote className="w-3.5 h-3.5" /> PAYMENT METHOD
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    variant={selectedPaymentMethod === 'Credit Card' ? 'default' : 'outline'}
                    onClick={() => setSelectedPaymentMethod('Credit Card')}
                    className="h-14 justify-start gap-4 px-4 rounded-xl border-2"
                  >
                    <CreditCard className="h-5 w-5" />
                    <div className="text-left">
                      <p className="text-sm font-black uppercase">Credit Card</p>
                      <p className="text-[9px] opacity-60">Authorize.net Secure Processing</p>
                    </div>
                  </Button>
                  <Button 
                    variant={selectedPaymentMethod === 'Pay at Delivery' ? 'default' : 'outline'}
                    onClick={() => setSelectedPaymentMethod('Pay at Delivery')}
                    className="h-14 justify-start gap-4 px-4 rounded-xl border-2"
                  >
                    <Banknote className="h-5 w-5" />
                    <div className="text-left">
                      <p className="text-sm font-black uppercase">Pay at Delivery</p>
                      <p className="text-[9px] opacity-60">Cash or Card to Staff</p>
                    </div>
                  </Button>
                </div>
              </div>

              <PricingBreakdown subtotal={subtotal} serviceFee={platformFee} tax={tax} tip={tipAmount} taxRate={taxRatePercentage} />
            </div>
          </ScrollArea>

          <SheetFooter className="p-6 bg-white border-t-2 shrink-0">
            <Button size="lg" className="w-full h-16 font-black uppercase tracking-[0.2em] bg-primary shadow-xl rounded-2xl" onClick={handlePlaceOrder} disabled={isPlacingOrder || activeOrderItems.length === 0}>
              {isPlacingOrder ? "PROCESSING..." : "PLACE ORDER"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
