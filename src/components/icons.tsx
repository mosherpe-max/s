import { Beer, Martini, GlassWater, Cookie, CookingPot, UtensilsCrossed, Sandwich, IceCream, Pizza, Salad, MoreHorizontal, type LucideIcon } from 'lucide-react';
import type { Category } from '@/lib/types';

export const categoryIcons: Record<Category, LucideIcon> = {
  'Beer': Beer,
  'Spirits': Martini,
  'Soft Drinks': GlassWater,
  'Snacks': Cookie,
  'Handhelds': Sandwich,
  'Appetizers': UtensilsCrossed,
  'Entrees': CookingPot,
  'Pizza': Pizza,
  'Salad': Salad,
  'Dessert': IceCream,
  'Other': MoreHorizontal,
};
