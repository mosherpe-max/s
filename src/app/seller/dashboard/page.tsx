import { RouteOptimizer } from './route-optimizer';

export default function SellerDashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Driver Dashboard</h1>
        <p className="text-lg text-muted-foreground mt-2">Your active orders and optimized route.</p>
      </header>
      <RouteOptimizer />
    </div>
  );
}
