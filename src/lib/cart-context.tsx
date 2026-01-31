'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import type { OrderItem } from './types';

interface CartContextType {
  orderItems: OrderItem[];
  setOrderItems: React.Dispatch<React.SetStateAction<OrderItem[]>>;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  total: number;
  totalItems: number;
  updateItem: (item: OrderItem) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children, serviceFee = 0 }: { children: React.ReactNode, serviceFee?: number }) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const activeItems = useMemo(() => orderItems.filter(i => i.quantity > 0), [orderItems]);
  
  const subtotal = useMemo(() => 
    activeItems.reduce((acc, item) => acc + item.price * item.quantity, 0), 
  [activeItems]);

  const total = subtotal > 0 ? subtotal + serviceFee : 0;
  const totalItems = activeItems.reduce((acc, item) => acc + item.quantity, 0);

  const updateItem = (updatedItem: OrderItem) => {
    setOrderItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex((i) => i.id === updatedItem.id);
      if (updatedItem.quantity === 0) {
        return prevItems.filter((i) => i.id !== updatedItem.id);
      }
      if (existingItemIndex > -1) {
        const newItems = [...prevItems];
        newItems[existingItemIndex] = updatedItem;
        return newItems;
      }
      return [...prevItems, updatedItem];
    });
  };

  const clearCart = () => {
    setOrderItems([]);
    setIsCartOpen(false);
  };

  const value = useMemo(() => ({
    orderItems,
    setOrderItems,
    isCartOpen,
    setIsCartOpen,
    total,
    totalItems,
    updateItem,
    clearCart,
  }), [orderItems, isCartOpen, total, totalItems]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
