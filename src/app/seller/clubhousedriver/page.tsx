'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function DeprecatedClubhouseDriverPage() {
  useEffect(() => {
    redirect('/sellers/demo-course/clubhouse');
  }, []);
  
  return null;
}