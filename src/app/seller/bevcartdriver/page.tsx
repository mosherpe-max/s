'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function DeprecatedBevCartDriverPage() {
  useEffect(() => {
    redirect('/sellers/demo-course/bevcart');
  }, []);
  
  return null;
}