
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
  ChevronLeft,
  Pencil,
  ChevronRight,
  ShieldCheck,
  Lock as LockIcon 
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
import { Textarea } from '@/components/ui/textarea';

const serviceTypeIcons: Record<string, any> = {
  'Beverage Cart': Truck,
  'Clubhouse': Building,
  'Pool': Waves,
  'Take Out': ShoppingBasket,
  'Halfway House': Home,
  'Dine-In': Utensils,
  'Lane Delivery': MapPin,
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
                    <button
                      key={option.id}
                      className={cn(
                        "h-14 w-full flex items-center justify-between px-4 rounded-xl border-2 transition-all text-left",
                        isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-muted hover:bg-muted/50"
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
                    </button>
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
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentStatusText, setPaymentStatusText] = useState('PROCESSING...');
  
  const [modifierTarget, setModifierTarget] = useState<MenuItem | null>(null);

  const [selectedTipType, setSelectedTipType] = useState<string | null>(null);
  const [customTipValue, setCustomTipValue] = useState<string>('');

  // Credit Card Form State
  const [cardInfo, setCardInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cardCode: '',
  });

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return collection(firestore, 'sellers', sellerId, 'menuItems');
  }, [firestore, sellerId]);
  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  useEffect(() => {
    if (!seller) return;
    
    // Dynamically load Authorize.net Accept.js based on environment
    const isProd = seller.isProduction === true;
    const scriptUrl = isProd 
      ? 'https://js.authorize.net/v1/Accept.js' 
      : 'https://jstest.authorize.net/v1/Accept.js';

    const script = document.createElement('script');
    script.src = scriptUrl; 
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, [seller?.isProduction]);

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

  const tipOptions = useMemo(() => ([
    { label: '10%', value: 0.10, type: 'percent' },
    { label: '15%', value: 0.15, type: 'percent' },
    { label: '20%', value: 0.20, type: 'percent' },
  ]), []);

  useEffect(() => {
    if (subtotal > 0 && !selectedTipType) {
      setSelectedTipType('15%');
    }
  }, [subtotal, selectedTipType]);

  const tipAmount = useMemo(() => {
    if (selectedTipType === 'Custom') return parseFloat(customTipValue) || 0;
    const option = tipOptions.find(o => o.label === selectedTipType);
    if (!option) return 0;
    return subtotal * option.value;
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

  const isLocationRequired = selectedMenuType === 'Lane Delivery';
  const isLocationSelected = !!locationValue;

  const tokenizeCard = async (): Promise<{ dataValue: string, dataDescriptor: string } | null> => {
    if (!seller?.authorizeNetLoginId || !seller?.authorizeNetClientKey) {
      throw new Error("Venue payment gateway not configured. Please contact staff.");
    }

    return new Promise((resolve, reject) => {
      const authData = {
        clientKey: seller.authorizeNetClientKey,
        apiLoginID: seller.authorizeNetLoginId,
      };

      const [expMonth, expYear] = cardInfo.expiryDate.split('/');
      const cardData = {
        cardNumber: cardInfo.cardNumber.replace(/\s/g, ''),
        month: expMonth,
        year: `20${expYear}`, 
        cardCode: cardInfo.cardCode,
      };

      const secureData = { authData, cardData };

      // @ts-ignore
      if (!window.Accept) {
        reject(new Error("Payment security library not loaded. Check connection."));
        return;
      }

      // @ts-ignore
      window.Accept.dispatchData(secureData, (response: any) => {
        if (response.messages.resultCode === "Error") {
          let errorMsg = response.messages.message[0].text;
          reject(new Error(errorMsg));
        } else {
          resolve({
            dataValue: response.opaqueData.dataValue,
            dataDescriptor: response.opaqueData.dataDescriptor
          });
        }
      });
    });
  };

  const handlePlaceOrder = async () => {
    try {
      if (!firestore || !seller) return;
      if (activeOrderItems.length === 0) return;
      if (isLocationRequired && !isLocationSelected) {
        toast({ variant: 'destructive', title: 'Lane Required', description: 'Please select your lane number.' });
        return;
      }

      setIsPlacingOrder(true);
      setPaymentStatusText('PREPARING ORDER...');

      let currentUser = user;
      let isGuestCheckout = false;
      if (!currentUser && auth) {
        const authResult = await signInAnonymously(auth);
        currentUser = authResult.user;
        isGuestCheckout = true;
      } else if (currentUser?.isAnonymous) {
        isGuestCheckout = true;
      }

      if (!currentUser) throw new Error("Security identity required.");

      let paymentResult: { dataValue: string, dataDescriptor: string } | null = null;
      if (selectedPaymentMethod === 'Credit Card') {
        setPaymentStatusText('SECURING PAYMENT...');
        try {
          paymentResult = await tokenizeCard();
        } catch (err: any) {
          toast({ variant: 'destructive', title: 'Card Entry Error', description: err.message });
          setIsPlacingOrder(false);
          return;
        }
      }

      const functions = getFunctions(app);
      const processPaymentFn = httpsCallable(functions, 'processPayment');

      const submitToFirestore = async (latitude: number, longitude: number) => {
        try {
          setPaymentStatusText('FINALIZING TRANSACTION...');
          
          const orderData: any = {
            sellerId,
            buyerProfileId: currentUser!.uid,
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
            specialInstructions: specialInstructions || null,
            isGuestOrder: isGuestCheckout,
            deviceMetadata: { userAgent: window.navigator.userAgent, timestamp: new Date().toISOString() },
            createdAt: serverTimestamp(),
            modifiedAt: serverTimestamp(),
          };

          const orderRef = await addDoc(collection(firestore, 'orders'), orderData);

          if (selectedPaymentMethod === 'Credit Card' && paymentResult) {
            try {
              await processPaymentFn({
                paymentNonce: paymentResult.dataValue,
                dataDescriptor: paymentResult.dataDescriptor,
                amount: finalTotal,
                orderId: orderRef.id,
                buyerProfileId: currentUser!.uid,
                sellerId
              });
            } catch (payErr: any) {
              // If payment fails, mark the order as cancelled and explain why
              await updateDoc(doc(firestore, 'orders', orderRef.id), { status: 'Cancelled', paymentError: payErr.message });
              toast({ 
                variant: 'destructive', 
                title: 'Transaction Denied', 
                description: payErr.message || 'The gateway refused the transaction. Please check your card details or use a different payment method.' 
              });
              setIsPlacingOrder(false);
              return;
            }
          }

          router.push(`/order/track?id=${orderRef.id}&sellerId=${sellerId}`);
          clearCart();
        } catch (err: any) {
          toast({ variant: 'destructive', title: 'Order Submission Error', description: err.message });
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
      toast({ variant: 'destructive', title: 'Internal System Error', description: error.message });
    }
  };

  const isLoading = isSellerLoading || areItemsLoading;

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-y-auto">
      <div className="bg-muted/30 border-b shrink-0">
        <div className="px-4 py-3 space-y-3 max-w-2xl mx-auto">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest px-1">SERVICE MODE</Label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {seller?.menuTypes?.map((type) => {
                const Icon = serviceTypeIcons[type] || Store;
                return (
                  <Button 
                    key={type} 
                    variant={selectedMenuType === type ? 'default' : 'secondary'} 
                    size="sm"
                    onClick={() => { setSelectedMenuType(type); setLocationValue(''); }} 
                    className="h-8 text-[10px] px-3 rounded-lg font-bold shrink-0"
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
        <SheetContent side="bottom" className="rounded-t-[2.5rem] h-[95vh] flex flex-col p-0 bg-[#F2F4F7] overflow-hidden shadow-2xl">
          <SheetHeader className="px-6 py-5 border-b bg-white shrink-0">
            <SheetTitle className="font-headline font-black uppercase text-center text-sm tracking-widest">Order Review</SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="flex-1 w-full">
            <div className="px-6 py-6 space-y-8 pb-32">
              <OrderSummary items={activeOrderItems} onUpdateItem={updateItem} onRemoveItem={removeItem} />

              {selectedMenuType === 'Lane Delivery' && seller?.laneCount && seller.laneCount > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
                    <MapPin className="h-3 w-3" /> SELECT YOUR LANE
                  </h3>
                  <div className="bg-white rounded-[1.5rem] border shadow-sm p-5 space-y-4">
                    <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                      {Array.from({ length: seller.laneCount }, (_, i) => (i + 1).toString()).map((lane) => {
                        const isSelected = locationValue === `Lane ${lane}`;
                        return (
                          <button
                            key={lane}
                            onClick={() => setLocationValue(`Lane ${lane}`)}
                            className={cn(
                              "h-9 w-full flex items-center justify-center text-xs font-black rounded-lg transition-all border-2",
                              isSelected ? "bg-primary border-primary text-white scale-105 shadow-md" : "bg-white border-muted hover:bg-primary/5"
                            )}
                          >
                            {lane}
                          </button>
                        );
                      })}
                    </div>
                    {isLocationSelected ? (
                      <div className="bg-primary/5 py-2 px-4 rounded-xl border border-primary/10 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Selected Destination</span>
                        <span className="text-sm font-black text-primary uppercase">{locationValue}</span>
                      </div>
                    ) : (
                      <p className="text-[9px] text-red-500 font-bold uppercase text-center tracking-widest">Selection Required for Delivery</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="bg-white rounded-2xl border shadow-sm p-4 flex items-center justify-between cursor-pointer hover:bg-muted/5 transition-colors group">
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 bg-yellow-50 rounded-xl text-yellow-600">
                      <Pencil className="h-5 w-5" />
                    </div>
                    <Input 
                      placeholder="Add special instructions..." 
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      className="border-none bg-transparent p-0 h-auto focus-visible:ring-0 font-bold text-[#213147] placeholder:text-muted-foreground/60 w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">ADD A TIP</h3>
                <div className="bg-white rounded-[1.5rem] border shadow-sm p-5 space-y-5">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-[#213147] text-lg">Tip Your Server</h4>
                    <span className="font-black text-[#10B981] text-lg">+{tipAmount > 0 ? `$${tipAmount.toFixed(2)}` : '—'}</span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {tipOptions.map((option) => {
                      const isSelected = selectedTipType === option.label;
                      const calculatedAmount = subtotal * option.value;
                      return (
                        <button
                          key={option.label}
                          onClick={() => setSelectedTipType(option.label)}
                          className={cn(
                            "flex flex-col items-center justify-center py-3 rounded-2xl border-2 transition-all duration-300",
                            isSelected 
                              ? "bg-[#213147] border-[#213147] text-white shadow-lg" 
                              : "bg-white border-muted hover:border-muted-foreground/20"
                          )}
                        >
                          <span className={cn("text-xs font-black", isSelected ? "text-white" : "text-[#213147]")}>{option.label}</span>
                          <span className={cn("text-[9px] font-bold mt-0.5", isSelected ? "text-white/60" : "text-muted-foreground")}>
                            ${calculatedAmount.toFixed(2)}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setSelectedTipType('Custom')}
                      className={cn(
                        "flex flex-col items-center justify-center py-3 rounded-2xl border-2 transition-all duration-300",
                        selectedTipType === 'Custom'
                          ? "bg-[#213147] border-[#213147] text-white shadow-lg" 
                          : "bg-white border-muted hover:border-muted-foreground/20"
                      )}
                    >
                      <span className={cn("text-xs font-black", selectedTipType === 'Custom' ? "text-white" : "text-[#213147]")}>Custom</span>
                      <span className={cn("text-[9px] font-bold mt-0.5", selectedTipType === 'Custom' ? "text-white/60" : "text-muted-foreground")}>—</span>
                    </button>
                  </div>

                  {selectedTipType === 'Custom' && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground mb-1 block">Amount ($)</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={customTipValue}
                        onChange={(e) => setCustomTipValue(e.target.value)}
                        placeholder="0.00"
                        className="h-12 border-2 rounded-xl font-bold"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">PAYMENT METHOD</h3>
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    variant={selectedPaymentMethod === 'Credit Card' ? 'default' : 'outline'}
                    onClick={() => setSelectedPaymentMethod('Credit Card')}
                    className={cn(
                      "h-16 justify-start gap-4 px-5 rounded-2xl border-2 shadow-sm transition-all",
                      selectedPaymentMethod === 'Credit Card' ? "bg-[#213147] border-[#213147]" : "bg-white border-muted"
                    )}
                  >
                    <CreditCard className="h-5 w-5" />
                    <div className="text-left">
                      <p className="text-sm font-black uppercase">Credit Card</p>
                      <p className="text-[9px] font-bold opacity-60">Secure Authorize.net Transaction</p>
                    </div>
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedPaymentMethod('Pay at Delivery')}
                    className={cn(
                      "h-16 justify-start gap-4 px-5 rounded-2xl border-2 shadow-sm transition-all",
                      selectedPaymentMethod === 'Pay at Delivery' ? "bg-[#213147] border-[#213147]" : "bg-white border-muted"
                    )}
                  >
                    <Banknote className="h-5 w-5" />
                    <div className="text-left">
                      <p className="text-sm font-black uppercase">Pay at Delivery</p>
                      <p className="text-[9px] font-bold opacity-60">Cash or Card to Staff</p>
                    </div>
                  </Button>
                </div>

                {selectedPaymentMethod === 'Credit Card' && (
                  <div className="bg-white rounded-[1.5rem] border shadow-md p-6 space-y-4 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-2 border-b pb-3 mb-2">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Secure Card Entry</span>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Card Number</Label>
                        <Input 
                          placeholder="0000 0000 0000 0000"
                          value={cardInfo.cardNumber}
                          onChange={(e) => setCardInfo({...cardInfo, cardNumber: e.target.value})}
                          className="h-12 border-2 rounded-xl font-bold tracking-widest"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Expiry (MM/YY)</Label>
                          <Input 
                            placeholder="MM/YY"
                            value={cardInfo.expiryDate}
                            onChange={(e) => setCardInfo({...cardInfo, expiryDate: e.target.value})}
                            className="h-12 border-2 rounded-xl font-bold text-center"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">CVV</Label>
                          <Input 
                            placeholder="123"
                            value={cardInfo.cardCode}
                            onChange={(e) => setCardInfo({...cardInfo, cardCode: e.target.value})}
                            className="h-12 border-2 rounded-xl font-bold text-center"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 justify-center pt-2 opacity-40">
                      <LockIcon className="h-3 w-3" />
                      <span className="text-[8px] font-black uppercase tracking-[0.2em]">Encrypted Connection</span>
                    </div>
                  </div>
                )}
              </div>

              <PricingBreakdown subtotal={subtotal} serviceFee={platformFee} tax={tax} tip={tipAmount} taxRate={taxRatePercentage} />
            </div>
          </ScrollArea>

          <SheetFooter className="p-6 bg-white border-t-2 shrink-0">
            <Button 
              size="lg" 
              className="w-full h-16 font-black uppercase tracking-[0.2em] bg-primary shadow-xl rounded-2xl" 
              onClick={handlePlaceOrder} 
              disabled={isPlacingOrder || activeOrderItems.length === 0 || (isLocationRequired && !isLocationSelected)}
            >
              {isPlacingOrder ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : null}
              {isPlacingOrder ? paymentStatusText : (isLocationRequired && !isLocationSelected ? "SELECT LANE FIRST" : "PLACE ORDER")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {modifierTarget && (
        <Sheet open={!!modifierTarget} onOpenChange={(open) => !open && setModifierTarget(null)}>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-[2.5rem] p-0 overflow-hidden">
            <ModifierPicker 
              item={modifierTarget} 
              onClose={() => setModifierTarget(null)} 
              onAdd={(selections) => {
                const cartId = `${modifierTarget.id}-${Object.values(selections).flat().map(o => o.id).sort().join('-')}`;
                updateItem({
                  ...modifierTarget,
                  cartId,
                  quantity: (orderItems.find(i => i.cartId === cartId)?.quantity || 0) + 1,
                  selectedModifiers: selections
                } as OrderItem);
                setModifierTarget(null);
              }}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
