'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Hourglass } from "lucide-react";

export default function OrderTrackingPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-muted/20 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <Hourglass className="h-12 w-12 text-primary animate-spin" />
          </div>
          <CardTitle className="font-headline text-2xl">
            Order Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page is being rebuilt. Ready for your fresh start!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
