import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { categories, menuItems } from "@/lib/data";
import { categoryIcons } from "@/components/icons";

export default function SellerPage() {
  return (
    <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
            <h1 className="font-headline text-2xl md:text-3xl font-bold text-foreground">Seller Admin</h1>
        </header>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Manage Menu</CardTitle>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Menu Item
                </Button>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {categories.map(category => {
                        const CategoryIcon = categoryIcons[category];
                        return (
                            <AccordionItem value={category} key={category}>
                                <AccordionTrigger>
                                    <div className="flex items-center gap-3">
                                        <CategoryIcon className="w-5 h-5" />
                                        <span className="font-semibold text-lg">{category}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-4 p-4 bg-muted/50 rounded-md">
                                        {menuItems.filter(item => item.category === category).map(item => (
                                            <div key={item.id} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-background">
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <p className="font-medium">{item.name}</p>
                                                        <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            </CardContent>
        </Card>
    </div>
  );
}
