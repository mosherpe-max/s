import { Beer, Martini, GlassWater, Cookie, Icon as LucideIcon, CookingPot, Package } from 'lucide-react';
import type { Category } from '@/lib/types';

export const categoryIcons: Record<Category, LucideIcon> = {
  'Beer': Beer,
  'Spirits': Martini,
  'Soft Drinks': GlassWater,
  'Snacks': Cookie,
};
