'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Terminal, CheckCircle2, AlertCircle } from 'lucide-react';
import { useFirebaseApp } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { cn } from '@/lib/utils';

export default function AdminDiagnosticPage() {
  const firebaseApp = useFirebaseApp();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const runTest = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      const testFn = httpsCallable(functions, 'testFunction');
      const response = await testFn();
      setResult(response.data as { success: boolean; message: string });
    } catch (e: any) {
      setResult({ success: false, message: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <Card className="shadow-xl border-2">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Terminal className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="font-headline text-2xl font-black uppercase tracking-tight">Environment Test</CardTitle>
          <CardDescription>Verify Firebase Cloud Functions v2 Connectivity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted rounded-xl border-2 border-dashed">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Endpoint Configuration</p>
            <code className="text-xs block bg-black text-green-400 p-3 rounded-lg overflow-x-auto">
              Function: testFunction<br />
              Region: us-central1<br />
              Runtime: Node 20
            </code>
          </div>

          {result && (
            <div className={cn(
              "p-4 rounded-xl border-2 flex items-center gap-3 animate-in zoom-in-95 duration-300",
              result.success ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
            )}>
              {result.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Response</p>
                <p className="text-sm font-bold">{result.message}</p>
              </div>
            </div>
          )}

          <Button 
            onClick={runTest} 
            disabled={isLoading}
            className="w-full h-14 font-headline font-black uppercase tracking-widest shadow-lg"
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
            Execute Test Function
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
