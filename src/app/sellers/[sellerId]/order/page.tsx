
'use client';

import { useState, use, useEffect, useMemo } from 'react';
import { collection, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useAuth, useUser } from '@/firebase';
import type { Seller, MenuItem, Category, OrderItem, Order } from '@/lib/types';
import { categories } from '@/lib/types';
import { BuyerMenu } from '@/components/buyer-menu';
import { OrderSummary } from '@/components/order-summary';
import { PricingBreakdown } from '@/components/pricing-breakdown';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { 
  Loader2, 
  Store, 
  Truck,
  Building,
  Waves,
  Home,
  Utensils,
  MapPin,
  ShoppingBasket,
  Satellite,
  Check,
  Pencil
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCart } from '@/lib/cart-context';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { mockBuyerLocation } from '@/lib/data';
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

export default function BuyerOrderPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { orderItems, updateItem, removeItem, isCartOpen, setIsCartOpen, totalItems, clearCart } = useCart();

  const menuTypeFromUrl = searchParams.get('menuType');
  const [selectedMenuType, setSelectedMenuType] = useState<string>(menuTypeFromUrl || '');
  const [locationValue, setLocationValue] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [modifierTarget, setModifierTarget] = useState<MenuItem | null>(null);

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  useEffect(() => {
    if (isCartOpen && (selectedMenuType === 'Beverage Cart' || selectedMenuType === 'Clubhouse') && !capturedLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (p) => setCapturedLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
          () => console.warn('Location fallback active'),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    }
  }, [isCartOpen, selectedMenuType, capturedLocation]);

  const menuItemsQuery = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return collection(firestore, 'sellers', sellerId, 'menuItems');
  }, [firestore, sellerId]);
  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  const activeOrderItems = useMemo(() => orderItems.filter((item) => item.quantity > 0), [orderItems]);
  const subtotal = useMemo(() => activeOrderItems.reduce((acc, item) => {
    const unitPrice = item.price + (item.selectedModifiers ? Object.values(item.selectedModifiers).flat().reduce((s, m) => s + m.price, 0) : 0);
    return acc + unitPrice * item.quantity;
  }, 0), [activeOrderItems]);
  
  const taxRate = seller?.taxRate ?? 6.0;
  const tax = subtotal * (taxRate / 100);
  const platformFee = seller?.serviceFee || 0;
  const tip = subtotal * 0.15; // Auto-tip 15% for simplicity in this fresh start
  const finalTotal = subtotal + platformFee + tax + tip;

  const filteredMenuItems = useMemo(() => {
    if (!menuItems || !selectedMenuType) return [];
    return menuItems.filter(item => item.availableOn?.includes(selectedMenuType));
  }, [menuItems, selectedMenuType]);

  const currentCategories = useMemo(() => {
    if (!seller || !filteredMenuItems.length) return [];
    const available = new Set(filteredMenuItems.map(i => i.category));
    return categories.filter(c => available.has(c));
  }, [seller, filteredMenuItems]);

  const handlePlaceOrder = async () => {
    if (!firestore || !seller || activeOrderItems.length === 0) return;
    setIsPlacingOrder(true);
    try {
      let currentUser = user;
      if (!currentUser && auth) {
        const result = await signInAnonymously(auth);
        currentUser = result.user;
      }
      if (!currentUser) throw new Error("Auth failed");

      const loc = capturedLocation || mockBuyerLocation;
      const orderData: any = {
        sellerId,
        buyerProfileId: currentUser.uid,
        customerName: currentUser.email || 'Guest Patron',
        deliveryLocation: { latitude: loc.latitude, longitude: loc.longitude },
        items: activeOrderItems,
        subtotal,
        serviceFee: platformFee,
        tax,
        tip,
        total: finalTotal,
        status: 'Placed',
        paymentMethod: 'Pay at Delivery',
        menuType: selectedMenuType,
        menuTypeLocation: locationValue || null,
        specialInstructions: specialInstructions || null,
        createdAt: serverTimestamp(),
      };

      const orderRef = await addDoc(collection(firestore, 'orders'), orderData);
      router.push(`/order/track?id=${orderRef.id}&sellerId=${sellerId}`);
      clearCart();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const isLoading = isSellerLoading || areItemsLoading;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-muted/30 border-b">
        <div className="px-4 py-3 space-y-3 max-w-2xl mx-auto">
          <Label className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Select Service</Label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {seller?.menuTypes?.map((type) => {
              const Icon = serviceTypeIcons[type] || Store;
              return (
                <Button key={type} variant={selectedMenuType === type ? 'default' : 'secondary'} size="sm" onClick={() => setSelectedMenuType(type)} className="h-8 text-[10px] font-bold">
                  <Icon className="h-3.5 w-3.5 mr-1.5" /> {type}
                </Button>
              );
            })}
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
          />
        )}
      </main>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        {activeOrderItems.length > 0 && (
          <div className="fixed bottom-7 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-30">
            <SheetTrigger asChild>
              <Button size="lg" className="w-full font-black uppercase tracking-widest">Review Order — ${subtotal.toFixed(2)}</Button>
            </SheetTrigger>
          </div>
        )}
        <SheetContent side="bottom" className="rounded-t-[2rem] h-[90vh] flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b bg-white"><SheetTitle>Review Order</SheetTitle></SheetHeader>
          <ScrollArea className="flex-1 px-6 py-6">
            <div className="space-y-6">
              <OrderSummary items={activeOrderItems} onUpdateItem={updateItem} onRemoveItem={removeItem} />
              
              {selectedMenuType === 'Lane Delivery' && seller?.laneCount && (
                <div className="space-y-2">
                  <Label>Select Lane</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: seller.laneCount }, (_, i) => (i + 1).toString()).map(l => (
                      <Button key={l} variant={locationValue === `Lane ${l}` ? 'default' : 'outline'} size="sm" onClick={() => setLocationValue(`Lane ${l}`)}>{l}</Button>
                    ))}
                  </div>
                </div>
              )}

              <PricingBreakdown subtotal={subtotal} serviceFee={platformFee} tax={tax} tip={tip} taxRate={taxRate} />
            </div>
          </ScrollArea>
          <SheetFooter className="p-6 bg-white border-t">
            <Button size="lg" className="w-full h-14 font-black uppercase tracking-widest" onClick={handlePlaceOrder} disabled={isPlacingOrder}>
              {isPlacingOrder ? <Loader2 className="animate-spin mr-2" /> : null} PLACE ORDER
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
