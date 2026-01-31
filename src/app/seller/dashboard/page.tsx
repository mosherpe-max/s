'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function DeprecatedSellerDashboardPage() {
  useEffect(() => {
    redirect('/seller/bevcartdriver');
  }, []);
  
  return null;
}
