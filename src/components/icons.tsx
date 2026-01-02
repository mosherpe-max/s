import { Beer, Martini, GlassWater, Cookie, Icon as LucideIcon } from 'lucide-react';
import type { Category } from '@/lib/data';

export const categoryIcons: Record<Category, LucideIcon> = {
  'Beer': Beer,
  'Spirits': Martini,
  'Soft Drinks': GlassWater,
  'Snacks': Cookie,
};
