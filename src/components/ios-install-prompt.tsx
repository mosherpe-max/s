'use client';

import React, { useEffect } from 'react';
import { Share, PlusSquare, ArrowDown, MoreHorizontal, X, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface IosInstallPromptProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * A specialized prompt for iOS users to install the PWA.
 * Features a high-fidelity floating bubble anchored to the bottom right.
 */
export function IosInstallPrompt({ open, onOpenChange }: IosInstallPromptProps) {
  if (!open) return null;

  const handleDismiss = () => {
    onOpenChange?.(false);
  };

  const handleEnableNotifications = async () => {
    if ('Notification' in window) {
      try {
        // Request permission immediately when the prompt is shown.
        // This is a proxy for the user "electing" to start the install process.
        await Notification.requestPermission();
      } catch (err) {
        console.warn('Notification permission request failed:', err);
      }
    }
  };

  // Automatically request permission when the prompt opens
  useEffect(() => {
    if (open) {
      handleEnableNotifications();
    }
  }, [open]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end pointer-events-none p-4 pb-12 sm:pb-16 items-end overflow-hidden">
      {/* Backdrop for focus */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-500" 
        onClick={handleDismiss}
      />

      {/* Floating Bubble */}
      <div className={cn(
        "relative w-full max-w-[340px] bg-white/95 backdrop-blur-xl rounded-[2.5rem] border-2 border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] pointer-events-auto",
        "animate-in slide-in-from-bottom-8 duration-500 ease-out",
        "flex flex-col overflow-hidden mb-4"
      )}>
        {/* Header */}
        <div className="bg-[#213147] p-5 text-center border-b-2 border-primary/20 relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDismiss}
            className="absolute right-4 top-4 text-white/40 hover:text-white hover:bg-white/10 rounded-full h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex justify-center mb-2">
            <div className="bg-primary/20 p-2 rounded-xl">
              <BellRing className="h-5 w-5 text-primary animate-pulse" />
            </div>
          </div>
          <h3 className="text-base font-headline font-black uppercase tracking-tight text-white leading-tight mb-1">
            Get Accurate Delivery
          </h3>
          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest leading-relaxed px-4">
            Add to your Home Screen for accurate delivery tracking and order updates
          </p>
        </div>
        
        {/* Instructions */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-slate-500/10 p-2.5 rounded-2xl shadow-sm border border-slate-500/20 shrink-0">
              <MoreHorizontal className="h-5 w-5 text-slate-700" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-tight">1. Tap the '...' More Options</p>
              <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-[0.1em]">Found in the corner of your browser</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-blue-500/10 p-2.5 rounded-2xl shadow-sm border border-blue-500/20 shrink-0">
              <Share className="h-5 w-5 text-blue-600" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-tight">2. Select the Share icon</p>
              <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-[0.1em]">The square with an arrow pointing up</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-green-500/10 p-2.5 rounded-2xl shadow-sm border border-green-500/20 shrink-0">
              <PlusSquare className="h-5 w-5 text-green-700" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-tight">3. Tap 'Add to Home Screen'</p>
              <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-[0.1em]">Scroll down to find the plus icon</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 pb-5 pt-1 flex flex-col gap-2">
          <Button 
            onClick={handleDismiss} 
            variant="ghost" 
            className="w-full rounded-full text-muted-foreground font-black text-[9px] uppercase tracking-[0.2em] hover:bg-black/5 h-8"
          >
            Not Now
          </Button>
        </div>

        {/* The Animated Pointer Arrow - Positioned at bottom-right of bubble */}
        <div className="absolute -bottom-3 right-10 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[15px] border-t-white drop-shadow-xl animate-bounce" />
      </div>

      {/* Visual Indicator showing exactly where to tap */}
      <div className="mt-2 flex flex-col items-center gap-1 opacity-80 mr-6">
        <ArrowDown className="h-6 w-6 text-white animate-bounce" />
        <p className="text-[9px] font-black text-white uppercase tracking-[0.3em] drop-shadow-md">Tap Options</p>
      </div>
    </div>
  );
}
