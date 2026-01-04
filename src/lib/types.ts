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
