'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function DeprecatedAdminSellersPage() {
  useEffect(() => {
    redirect('/admin');
  }, []);
  
  return null;
}
