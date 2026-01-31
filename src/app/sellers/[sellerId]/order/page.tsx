
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
import { Loader2, AlertCircle, CreditCard, User, MapPin, Store, Banknote } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCart } from '@/lib/cart-context';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { BrandingFooter } from '@/components/branding-footer';

export default function BuyerOrderPage({ params }: { params: { sellerId: string } }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { orderItems, updateItem, isCartOpen, setIsCartOpen, total, totalItems, clearCart } = useCart();

  const [selectedCategory, setSelectedCategory] = useState<Category>(categories[0]);
  const [selectedMenuType, setSelectedMenuType] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit Card');
  
  const [inputMemberId, setInputMemberId] = useState('');
  const [inputMemberLastName, setInputMemberLastName] = useState('');
  const [menuTypeLocation, setMenuTypeLocation] = useState<string>('');

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

  const isPrivateCourse = seller?.type === 'Private Golf Course';
  const isSemiPrivateCourse = seller?.type === 'Semi Private Golf Course';
  const isPublicCourse = seller?.type === 'Public Golf Course';
  const isBevCart = selectedMenuType === 'Beverage Cart';

  useEffect(() => {
    if (isPublicCourse && isBevCart) {
      setPaymentMethod('Pay with Cash or Credit Card to Beverage Cart Operator');
    } else if (isPrivateCourse) {
      setPaymentMethod('Member Account');
    } else if (paymentMethod === 'Pay with Cash or Credit Card to Beverage Cart Operator') {
      setPaymentMethod('Credit Card');
    }
  }, [isPublicCourse, isBevCart, isPrivateCourse]);

  useEffect(() => {
    if (seller?.menuTypes && seller.menuTypes.length > 0 && !selectedMenuType) {
      setSelectedMenuType(seller.menuTypes[0]);
    }
  }, [seller, selectedMenuType]);

  const handlePlaceOrder = async () => {
    if (!firestore || !seller) {
      toast({ variant: 'destructive', title: 'Error', description: 'Service connection failed.' });
      return;
    }

    if (seller.status === 'Inactive') {
      toast({ variant: 'destructive', title: 'Service Unavailable', description: 'The beverage cart is offline.' });
      return;
    }

    if (!selectedMenuType) {
        toast({ variant: 'destructive', title: 'Menu Selection Required', description: 'Please select where you are ordering from.' });
        return;
    }

    if (selectedMenuType === 'Halfway House' && !menuTypeLocation) {
        toast({ variant: 'destructive', title: 'Location Required', description: 'Please select which Halfway House you are at.' });
        return;
    }

    if (selectedMenuType === 'Lane Delivery' && !menuTypeLocation) {
        toast({ variant: 'destructive', title: 'Lane Number Required', description: 'Please enter your lane number.' });
        return;
    }

    if (selectedMenuType === 'Dine-In' && !menuTypeLocation) {
        toast({ variant: 'destructive', title: 'Table Number Required', description: 'Please enter your table number.' });
        return;
    }

    if (paymentMethod === 'Member Account') {
      if (!inputMemberId.trim() || !inputMemberLastName.trim()) {
        toast({ 
          variant: 'destructive', 
          title: 'Required Information', 
          description: 'Please enter both your Member ID and Last Name.' 
        });
        return;
      }
    }

    setIsPlacingOrder(true);
    const activeOrderItems = orderItems.filter((item) => item.quantity > 0);

    const createOrder = (latitude: number, longitude: number) => {
      const subtotal = activeOrderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const orderData: Omit<Order, 'id' | 'createdAt'> = {
        sellerId,
        customerId: 'public-user',
        customerName: paymentMethod === 'Member Account' 
          ? `Member ${inputMemberLastName}` 
          : 'Guest Golfer',
        deliveryLocation: { latitude, longitude },
        items: activeOrderItems,
        subtotal,
        serviceFee: seller.serviceFee || 0,
        total,
        status: 'Placed',
        paymentMethod,
        menuType: selectedMenuType,
        menuTypeLocation: menuTypeLocation || undefined,
        memberId: paymentMethod === 'Member Account' ? inputMemberId : undefined,
        memberLastName: paymentMethod === 'Member Account' ? inputMemberLastName : undefined,
      };

      const ordersCol = collection(firestore, 'orders');
      addDoc(ordersCol, { ...orderData, createdAt: serverTimestamp() })
        .then(() => {
          toast({ title: 'Order Placed!', description: "Your order has been received." });
          clearCart();
          router.push('/order/track');
        })
        .catch(() => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ordersCol.path, operation: 'create', requestResourceData: orderData })))
        .finally(() => setIsPlacingOrder(false));
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => createOrder(p.coords.latitude, p.coords.longitude),
        () => {
          toast({ title: 'Location Fallback', description: 'Using estimated location.' });
          createOrder(mockBuyerLocation.latitude, mockBuyerLocation.longitude);
        }
      );
    } else {
      createOrder(mockBuyerLocation.latitude, mockBuyerLocation.longitude);
    }
  };

  const isLoading = isSellerLoading || areItemsLoading;
  const activeOrderItems = orderItems.filter((item) => item.quantity > 0);

  if (!isLoading && !seller) return <div className="p-8 text-center"><h2 className="text-2xl font-bold">Seller Not Found</h2></div>;

  const brandStyle = {
    primaryColor: seller?.brandColor || 'hsl(var(--primary))',
  };

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 shrink-0 border-b">
        <div className="px-4 py-3 space-y-3">
            <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1">
                    <Store className="w-3 h-3" /> Service Mode
                </Label>
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-2 pb-1">
                        {seller?.menuTypes?.map((type) => (
                            <Button 
                                key={type} 
                                variant={selectedMenuType === type ? 'default' : 'outline'} 
                                size="sm"
                                onClick={() => {
                                    setSelectedMenuType(type);
                                    setMenuTypeLocation('');
                                }} 
                                className="shrink-0 h-8 text-xs px-3"
                                style={selectedMenuType === type ? { backgroundColor: brandStyle.primaryColor } : {}}
                            >
                                {type}
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            <Separator />

            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2 pb-1">
                    {categories.map((cat) => {
                        const Icon = categoryIcons[cat];
                        const isSelected = selectedCategory === cat;
                        return (
                            <Button 
                                key={cat} 
                                variant={isSelected ? 'default' : 'outline'} 
                                size="sm"
                                onClick={() => setSelectedCategory(cat)} 
                                className="shrink-0 h-8 text-xs px-3"
                                style={isSelected ? { backgroundColor: brandStyle.primaryColor } : {}}
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

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-12">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <BuyerMenu 
            orderItems={orderItems} 
            onUpdateItem={updateItem} 
            selectedCategory={selectedCategory} 
            menuItems={filteredMenuItems} 
            accentColor={brandStyle.primaryColor}
          />
        )}
      </main>

      <BrandingFooter />

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        {activeOrderItems.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-sm border-t z-20">
            <SheetTrigger asChild>
              <Button 
                size="lg" 
                className="w-full text-lg h-14 shadow-lg"
                style={{ backgroundColor: brandStyle.primaryColor }}
              >
                View Order ({totalItems}) - ${total.toFixed(2)}
              </Button>
            </SheetTrigger>
          </div>
        )}
        <SheetContent side="bottom" className="rounded-t-lg max-h-[90vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Review Order</SheetTitle></SheetHeader>
          <div className="py-4 space-y-6">
            <OrderSummary items={activeOrderItems} serviceFee={seller?.serviceFee} />

            <Separator />

            <div className="space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Delivery Location
                </h3>
                
                <div className="p-3 bg-muted/50 rounded-lg border flex flex-col gap-1">
                    <p className="text-xs font-bold text-primary" style={{ color: brandStyle.primaryColor }}>Ordering From</p>
                    <p className="text-sm font-medium">{selectedMenuType}</p>
                </div>

                {selectedMenuType === 'Halfway House' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                        <Label>Select Halfway House</Label>
                        <select 
                          className="w-full p-2 border rounded-md"
                          value={menuTypeLocation} 
                          onChange={(e) => setMenuTypeLocation(e.target.value)}
                        >
                          <option value="">Which house are you at?</option>
                          {seller?.halfwayHouseNames?.map(name => (
                              <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                    </div>
                )}

                {selectedMenuType === 'Lane Delivery' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                        <Label>Bowling Lane Number</Label>
                        <Input 
                            type="number" 
                            placeholder={`1 - ${seller?.laneCount || 24}`}
                            value={menuTypeLocation}
                            onChange={(e) => setMenuTypeLocation(e.target.value)}
                        />
                    </div>
                )}

                {selectedMenuType === 'Dine-In' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                        <Label>Table Number</Label>
                        <Input 
                            type="number" 
                            placeholder={`1 - ${seller?.tableCount || 50}`}
                            value={menuTypeLocation}
                            onChange={(e) => setMenuTypeLocation(e.target.value)}
                        />
                    </div>
                )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Payment Method</h3>
              
              {isPublicCourse && isBevCart ? (
                <div className="bg-muted/50 p-4 rounded-lg flex items-center gap-4 border border-primary/20 animate-in fade-in slide-in-from-top-2">
                  <Banknote className="h-6 w-6 text-primary shrink-0" style={{ color: brandStyle.primaryColor }} />
                  <div>
                    <p className="text-sm font-bold">Pay At Delivery</p>
                    <p className="text-xs text-muted-foreground">Cash or Credit Card to Beverage Cart Operator</p>
                  </div>
                </div>
              ) : isPrivateCourse ? (
                <div className="bg-muted/50 p-3 rounded-lg flex items-center gap-3 border border-primary/10">
                  <User className="h-5 w-5 text-primary" style={{ color: brandStyle.primaryColor }} />
                  <div>
                    <p className="text-sm font-bold">Member Account Only</p>
                    <p className="text-xs text-muted-foreground">This is a private club establishment.</p>
                  </div>
                </div>
              ) : (
                <RadioGroup value={paymentMethod as any} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Credit Card" id="cc" style={{ borderColor: brandStyle.primaryColor }} />
                    <Label htmlFor="cc" className="flex items-center gap-2 cursor-pointer"><CreditCard className="h-4 w-4" /> Credit Card</Label>
                  </div>
                  {isSemiPrivateCourse && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Member Account" id="member" style={{ borderColor: brandStyle.primaryColor }} />
                      <Label htmlFor="member" className="flex items-center gap-2 cursor-pointer"><User className="h-4 w-4" /> Member Account</Label>
                    </div>
                  )}
                </RadioGroup>
              )}

              {paymentMethod === 'Member Account' && (
                <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <Label htmlFor="memberId">Member ID Number</Label>
                    <Input 
                      id="memberId"
                      placeholder="e.g. 12345"
                      value={inputMemberId}
                      onChange={(e) => setInputMemberId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Member Last Name</Label>
                    <Input 
                      id="lastName"
                      placeholder="e.g. Smith"
                      value={inputMemberLastName}
                      onChange={(e) => setInputMemberLastName(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <SheetFooter>
            <Button 
              size="lg" 
              className="w-full" 
              onClick={handlePlaceOrder} 
              disabled={isPlacingOrder}
              style={{ backgroundColor: brandStyle.primaryColor }}
            >
              {isPlacingOrder ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : `Complete Purchase`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
