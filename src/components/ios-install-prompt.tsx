'use client';

import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * A specialized prompt for iOS Safari users to add the app to their home screen.
 * Enhanced with visual cues and a directional arrow to point toward the Safari Share button.
 */
export function IosInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Detect if the device is iOS
    const isIOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
    
    // 2. Detect if the browser is Safari (Chrome/Firefox on iOS have 'CriOS'/'FxiOS')
    const isSafari = window.navigator.userAgent.includes('Safari') && 
                    !window.navigator.userAgent.includes('CriOS') && 
                    !window.navigator.userAgent.includes('FxiOS');
    
    // 3. Check if already in standalone mode (installed)
    const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    
    // 4. Check if user has already dismissed it in this session or permanently
    const hasBeenDismissed = localStorage.getItem('ios-install-prompt-dismissed');

    // Only show if it's iOS Safari, not installed, and not previously dismissed
    if (isIOS && isSafari && !isStandalone && !hasBeenDismissed) {
      // Small delay for better UX after page load
      const timer = setTimeout(() => setShowPrompt(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember dismissal to avoid annoying the user
    localStorage.setItem('ios-install-prompt-dismissed', 'true');
  };

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-[420px] rounded-[32px] border-2 shadow-2xl p-0 overflow-hidden">
        <div className="bg-[#213147] p-6 text-center border-b-4 border-primary">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-headline font-black uppercase tracking-tight text-white leading-none">
              ENABLE LIVE TRACKING
            </DialogTitle>
            <DialogDescription className="text-white/80 text-sm font-medium leading-tight">
              Get real-time delivery alerts and watch the cart move live by adding <span className="text-primary font-black">KOOP</span> to your home screen.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-5 bg-muted/40 p-4 rounded-2xl border border-dashed border-primary/20 transition-all hover:bg-muted/60">
            <div className="bg-white p-3 rounded-xl shadow-md shrink-0 border border-primary/5">
              <Share className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black uppercase tracking-tight">1. Tap the Share icon</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.1em]">Found at the bottom of your screen</p>
            </div>
          </div>

          <div className="flex items-center gap-5 bg-muted/40 p-4 rounded-2xl border border-dashed border-primary/20 transition-all hover:bg-muted/60">
            <div className="bg-white p-3 rounded-xl shadow-md shrink-0 border border-primary/5">
              <PlusSquare className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black uppercase tracking-tight">2. 'Add to Home Screen'</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.1em]">Scroll down the menu to find it</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 pb-6 px-6">
          <div className="flex flex-col items-center animate-bounce">
            <ArrowDown className="h-8 w-8 text-primary" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80">Click the share button below</p>
        </div>

        <DialogFooter className="px-6 pb-6 pt-0 sm:justify-center">
          <Button 
            onClick={handleDismiss} 
            variant="ghost" 
            className="w-full rounded-full text-muted-foreground font-black text-[11px] uppercase tracking-widest hover:bg-transparent hover:text-foreground"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
