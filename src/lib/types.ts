export interface Seller {
  id: string;
  ownerId: string;
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
