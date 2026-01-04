'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { DollarSign, PackageCheck, Trophy } from "lucide-react";

interface DailySummaryProps {
    isLoading: boolean;
    stats: {
        completedOrders: number;
        totalRevenue: number;
        topItems: { name: string; quantity: number }[];
    };
}

export function DailySummaryCard({ isLoading, stats }: DailySummaryProps) {
    const { completedOrders, totalRevenue, topItems } = stats;

    if (isLoading) {
        return <DailySummarySkeleton />
    }

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Daily Summary</CardTitle>
                <CardDescription>An overview of today's sales performance.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold font-mono">${totalRevenue.toFixed(2)}</div>
                            <p className="text-xs text-muted-foreground">from completed orders</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
                            <PackageCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold font-mono">{completedOrders}</div>
                            <p className="text-xs text-muted-foreground">orders delivered today</p>
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Top Selling Items</CardTitle>
                            <Trophy className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {topItems.length > 0 ? (
                                <ol className="space-y-1 text-sm list-decimal list-inside">
                                    {topItems.map(item => (
                                        <li key={item.name}>
                                            <span className="font-medium">{item.name}</span>
                                            <span className="text-muted-foreground ml-2">({item.quantity} sold)</span>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="text-sm text-muted-foreground">No completed sales yet today.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );
}


function DailySummarySkeleton() {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                             <Skeleton className="h-4 w-24" />
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-32 mb-1" />
                            <Skeleton className="h-3 w-24" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-32" />
                            <PackageCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16 mb-1" />
                            <Skeleton className="h-3 w-28" />
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                             <Skeleton className="h-4 w-28" />
                            <Trophy className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                           <Skeleton className="h-4 w-full" />
                           <Skeleton className="h-4 w-full" />
                           <Skeleton className="h-4 w-4/5" />
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    )
}
