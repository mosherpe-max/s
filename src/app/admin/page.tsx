'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Terminal, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useFirebaseApp } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseConfig } from '@/firebase/config';
import { cn } from '@/lib/utils';

export default function AdminDiagnosticPage() {
  const firebaseApp = useFirebaseApp();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; code?: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const runTest = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      // Explicitly targeting us-central1 to match backend
      const functions = getFunctions(firebaseApp, 'us-central1');
      const testFn = httpsCallable(functions, 'testFunction');
      
      const response = await testFn();
      setResult({ 
        success: true, 
        message: (response.data as any).message || "Success" 
      });
    } catch (e: any) {
      console.error("Function Error:", e);
      setResult({ 
        success: false, 
        message: e.message || "Unknown error",
        code: e.code // This will show 'functions/internal', 'functions/not-found', etc.
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <Card className="shadow-xl border-2">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Terminal className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="font-headline text-2xl font-black uppercase tracking-tight">Environment Diagnostic</CardTitle>
          <CardDescription>Verify Firebase Cloud Functions v2 Connectivity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted rounded-xl border-2 border-dashed space-y-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Project Configuration</p>
              <code className="text-[10px] block bg-black text-green-400 p-2 rounded overflow-x-auto">
                ID: {firebaseConfig.projectId}<br />
                Region: us-central1
              </code>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Target Endpoint</p>
              <code className="text-[10px] block bg-black text-blue-400 p-2 rounded">
                testFunction (v2 Callable)
              </code>
            </div>
          </div>

          {result && (
            <div className={cn(
              "p-4 rounded-xl border-2 flex flex-col gap-2 animate-in zoom-in-95 duration-300",
              result.success ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
            )}>
              <div className="flex items-center gap-3">
                {result.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Response</p>
                  <p className="text-sm font-bold">{result.message}</p>
                </div>
              </div>
              {result.code && (
                <div className="mt-1 pt-2 border-t border-red-200">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Error Code</p>
                  <code className="text-[10px] font-mono font-bold">{result.code}</code>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button 
              onClick={runTest} 
              disabled={isLoading}
              className="w-full h-14 font-headline font-black uppercase tracking-widest shadow-lg"
            >
              {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
              Execute Test Function
            </Button>
            
            <p className="text-[9px] text-center text-muted-foreground uppercase font-bold italic">
              Note: Ensure functions are deployed via 'firebase deploy --only functions'
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
