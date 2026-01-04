
export interface Seller {
  id: string;
  ownerId?: string; // Made optional for prototyping
  courseName: string;
  courseAddress: string;
  latitude: number;
  longitude: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  serviceFee: number;
  status: 'Active' | 'Inactive';
}

export interface Menu {
    id: string;
    sellerId: string;
    name: string;
    description: string;
}

export type Category = 'Beer' | 'Spirits' | 'Soft Drinks' | 'Snacks';

export const categories: readonly Category[] = ['Beer', 'Spirits', 'Soft Drinks', 'Snacks'];

export interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category: Category;
    rank: number;
}

export interface OrderItem extends MenuItem {
  quantity: number;
}
