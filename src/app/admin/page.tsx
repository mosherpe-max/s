
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { mockSellers } from "@/lib/data";

export default function AdminPage() {
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
          <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Seller
          </Button>
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
              {mockSellers.map(seller => (
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
