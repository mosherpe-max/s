
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Unhandled Root Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#213147] text-white p-6 text-center">
      <div className="bg-red-500/10 p-6 rounded-[2.5rem] border-2 border-red-500/20 mb-8">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
      </div>
      <h2 className="font-headline text-3xl font-black uppercase tracking-tight mb-4">
        System Interrupted
      </h2>
      <p className="text-white/60 text-sm max-w-md mb-10 leading-relaxed font-medium">
        We encountered an unexpected error while initializing the KOOP solution.
        This could be due to a network interruption or configuration sync.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button 
          onClick={() => reset()}
          className="h-14 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest gap-2 shadow-xl"
        >
          <RefreshCcw className="h-5 w-5" />
          Attempt Recovery
        </Button>
        <Button 
          variant="ghost" 
          asChild
          className="text-white/40 hover:text-white uppercase text-[10px] font-black tracking-widest h-10"
        >
          <a href="/">Return to Home</a>
        </Button>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-12 p-6 bg-black/40 rounded-2xl text-[10px] text-red-400 font-mono text-left overflow-auto max-w-full border border-white/5">
          {error.message}
        </pre>
      )}
    </div>
  );
}
