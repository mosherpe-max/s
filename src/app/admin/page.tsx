'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { mockSellers, type Seller } from "@/lib/data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SellerForm({
  onSave,
  onOpenChange,
  seller,
}: {
  onSave: (sellerData: Omit<Seller, 'id' | 'latitude' | 'longitude'>, id?: string) => void;
  onOpenChange: (open: boolean) => void;
  seller?: Seller | null;
}) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const sellerData = {
      courseName: formData.get('courseName') as string,
      courseAddress: formData.get('courseAddress') as string,
      contactName: formData.get('contactName') as string,
      contactEmail: formData.get('contactEmail') as string,
      contactPhone: formData.get('contactPhone') as string,
      serviceFee: parseFloat(formData.get('serviceFee') as string),
      status: (seller?.status || 'Active') as 'Active' | 'Inactive',
    };
    onSave(sellerData, seller?.id);
    onOpenChange(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="courseName">Course Name</Label>
          <Input id="courseName" name="courseName" defaultValue={seller?.courseName} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="courseAddress">Address</Label>
          <Input id="courseAddress" name="courseAddress" defaultValue={seller?.courseAddress} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contactName">Contact Name</Label>
          <Input id="contactName" name="contactName" defaultValue={seller?.contactName} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={seller?.contactEmail} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <Input id="contactPhone" name="contactPhone" type="tel" defaultValue={seller?.contactPhone} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="serviceFee">Service Fee</Label>
          <Input id="serviceFee" name="serviceFee" type="number" step="0.50" defaultValue={seller?.serviceFee} required />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit">{seller ? 'Save Changes' : 'Add Seller'}</Button>
      </DialogFooter>
    </form>
  );
}

export default function AdminPage() {
  const [sellers, setSellers] = useState<Seller[]>(mockSellers);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);

  const handleSaveSeller = (sellerData: Omit<Seller, 'id' | 'latitude' | 'longitude'>, id?: string) => {
    if (id) {
      // Update existing seller
      setSellers(prevSellers =>
        prevSellers.map(seller =>
          seller.id === id
            ? { ...seller, ...sellerData }
            : seller
        )
      );
    } else {
      // Add new seller
      const newSeller: Seller = {
        ...sellerData,
        id: (Math.max(...sellers.map(s => parseInt(s.id))) + 1).toString(),
        // Mock coordinates for now
        latitude: 42.7,
        longitude: -83.2,
      };
      setSellers(prevSellers => [...prevSellers, newSeller]);
    }
  };

  const toggleSellerStatus = (sellerId: string) => {
    setSellers(prevSellers =>
      prevSellers.map(seller =>
        seller.id === sellerId
          ? { ...seller, status: seller.status === 'Active' ? 'Inactive' : 'Active' }
          : seller
      )
    );
  };

  const handleOpenForm = (seller: Seller | null = null) => {
    setEditingSeller(seller);
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingSeller(null);
  }

  return (
    <>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline text-4xl font-bold text-foreground">Koop Admin Panel</h1>
        </div>
      </header>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manage Sellers</CardTitle>
          <Dialog open={isFormOpen} onOpenChange={(open) => open ? handleOpenForm() : handleCloseForm()}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenForm()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Seller
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSeller ? 'Edit Seller' : 'Add New Seller'}</DialogTitle>
              </DialogHeader>
              <SellerForm onSave={handleSaveSeller} onOpenChange={handleCloseForm} seller={editingSeller} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Golf Course</TableHead>
                <TableHead>Seller ID</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Service Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellers.map(seller => (
              <TableRow key={seller.id}>
                <TableCell>
                  <div className="font-medium">{seller.courseName}</div>
                  <div className="text-sm text-muted-foreground">{seller.courseAddress}</div>
                </TableCell>
                <TableCell>
                  <div className="font-mono text-sm">{seller.id}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{seller.contactName}</div>
                  <div className="text-sm text-muted-foreground">{seller.contactEmail}</div>
                  <div className="text-sm text-muted-foreground">{seller.contactPhone}</div>
                </TableCell>
                <TableCell>${seller.serviceFee.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={seller.status === 'Active' ? 'default' : 'destructive'} className={seller.status === 'Active' ? 'bg-accent text-accent-foreground' : ''}>{seller.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleOpenForm(seller)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleSellerStatus(seller.id)}>
                            {seller.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
