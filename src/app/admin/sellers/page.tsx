
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Badge } from "@/components/ui/badge";

const mockSellers = [
    { id: 'seller-1', name: 'Mike', email: 'mike@koop.com', status: 'Active', avatar: PlaceHolderImages.find(i => i.id === 'avatar-seller')! },
    { id: 'seller-2', name: 'Jane', email: 'jane@koop.com', status: 'Inactive', avatar: PlaceHolderImages.find(i => i.id === 'avatar-2')! },
]

export default function AdminSellersPage() {
  return (
    <>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline text-4xl font-bold text-foreground">Koop Admin Panel</h1>
          <p className="text-lg text-muted-foreground">Manage your sellers.</p>
        </div>
      </header>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manage Sellers</CardTitle>
          <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Seller
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seller</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSellers.map(seller => (
              <TableRow key={seller.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                      <Avatar>
                          <AvatarImage src={seller.avatar.imageUrl} alt={seller.name} data-ai-hint={seller.avatar.imageHint} />
                          <AvatarFallback>{seller.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                          <p className="font-medium">{seller.name}</p>
                          <p className="text-sm text-muted-foreground">{seller.email}</p>
                      </div>
                  </div>
                </TableCell>
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
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Deactivate</DropdownMenuItem>
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
