'use client';

import React, { useState, useEffect } from 'react';
import { Share, PlusSquare } from 'lucide-react';
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
 * This is required for PWAs on iOS to support Push Notifications and reliable background tracking.
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
      const timer = setTimeout(() => setShowPrompt(true), 2000);
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
      <DialogContent className="sm:max-w-[400px] rounded-2xl border-2">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-headline font-bold uppercase tracking-tight text-center text-[#213147]">
            Enable Live Tracking
          </DialogTitle>
          <DialogDescription className="text-center text-sm font-medium leading-relaxed">
            Add <span className="text-primary font-bold">KOOP</span> to your home screen to receive real-time delivery alerts and stay updated on your order.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-xl border border-dashed">
            <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
              <Share className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-bold">1. Tap the Share button</p>
              <p className="text-[11px] text-muted-foreground">Found in the bottom browser bar.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-xl border border-dashed">
            <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
              <PlusSquare className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-bold">2. 'Add to Home Screen'</p>
              <p className="text-[11px] text-muted-foreground">Scroll down the menu to find this option.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-center border-t pt-4 mt-2">
          <Button 
            onClick={handleDismiss} 
            variant="ghost" 
            className="w-full rounded-full text-muted-foreground font-bold text-xs uppercase tracking-widest"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
