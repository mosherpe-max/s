
import { Beer, Martini, GlassWater, Cookie, CookingPot, UtensilsCrossed, Sandwich, IceCream, Icon as LucideIcon } from 'lucide-react';
import type { Category } from '@/lib/types';

export const categoryIcons: Record<Category, LucideIcon> = {
  'Beer': Beer,
  'Spirits': Martini,
  'Soft Drinks': GlassWater,
  'Snacks': Cookie,
  'Entrees': CookingPot,
  'Appetizers': UtensilsCrossed,
  'Sandwiches': Sandwich,
  'Dessert': IceCream,
};
