'use client';

import { Loader2 } from 'lucide-react';
import { PatronTermsContent } from '@/components/patron-terms-content';
import { useActivePatronTerms } from '@/lib/patron-terms';

// Public copy of the Patron Terms & Conditions, always the version currently in force.
export default function TermsPage() {
  const terms = useActivePatronTerms();
  return (
    <main className="bg-[#F0F0F0] min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl bg-white p-6 shadow-sm md:p-10">
          {terms ? (
            <PatronTermsContent terms={terms} />
          ) : (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" /></div>
          )}
        </div>
      </div>
    </main>
  );
}
