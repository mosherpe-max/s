'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

/**
 * KOOP Solution Admin Entrance
 * Redirects to the root dashboard view.
 */
export default function KoopAdminPage() {
  useEffect(() => {
    redirect('/admin/dashboard');
  }, []);
  
  return null;
}
