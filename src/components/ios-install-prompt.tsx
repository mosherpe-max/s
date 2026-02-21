'use client';

import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, ArrowDown, MoreHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface IosInstallPromptProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * A specialized prompt for iOS Safari users to add the app to their home screen.
 * Enhanced with visual cues and a directional arrow to point toward the Safari Share button.
 */
export function IosInstallPrompt({ open: controlledOpen, onOpenChange }: IosInstallPromptProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  useEffect(() => {
    // FOR PREVIEW: Always show after a short delay if not controlled
    if (controlledOpen === undefined) {
      const timer = setTimeout(() => setInternalOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [controlledOpen]);

  const handleDismiss = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[420px] rounded-[32px] border-2 shadow-2xl p-0 overflow-hidden">
        <div className="bg-[#213147] p-6 text-center border-b-4 border-primary relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDismiss}
            className="absolute right-4 top-4 text-white/40 hover:text-white hover:bg-white/10 rounded-full h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-headline font-black uppercase tracking-tight text-white leading-none">
              ENABLE LIVE TRACKING
            </DialogTitle>
            <DialogDescription className="text-white/80 text-sm font-medium leading-tight">
              Get real-time delivery alerts and watch the cart move live by adding <span className="text-primary font-black">KOOP</span> to your home screen.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-5 bg-muted/40 p-3 rounded-2xl border border-dashed border-primary/20 transition-all hover:bg-muted/60">
            <div className="bg-white p-2.5 rounded-xl shadow-md shrink-0 border border-primary/5">
              <MoreHorizontal className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-black uppercase tracking-tight">1. Tap the Menu icon</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.1em]">Found at the top or bottom corner</p>
            </div>
          </div>

          <div className="flex items-center gap-5 bg-muted/40 p-3 rounded-2xl border border-dashed border-primary/20 transition-all hover:bg-muted/60">
            <div className="bg-white p-2.5 rounded-xl shadow-md shrink-0 border border-primary/5">
              <Share className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-black uppercase tracking-tight">2. Select the Share icon</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.1em]">Look for the square with an arrow</p>
            </div>
          </div>

          <div className="flex items-center gap-5 bg-muted/40 p-3 rounded-2xl border border-dashed border-primary/20 transition-all hover:bg-muted/60">
            <div className="bg-white p-2.5 rounded-xl shadow-md shrink-0 border border-primary/5">
              <PlusSquare className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-black uppercase tracking-tight">3. 'Add to Home Screen'</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.1em]">Scroll down the menu to find it</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 pb-6 px-6">
          <div className="flex flex-col items-center animate-bounce">
            <ArrowDown className="h-8 w-8 text-primary" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80 text-center">Follow the browser instructions</p>
        </div>

        <DialogFooter className="px-6 pb-6 pt-0 flex flex-col gap-2 sm:justify-center">
          <Button 
            onClick={handleDismiss} 
            variant="ghost" 
            className="w-full rounded-full text-muted-foreground font-black text-[11px] uppercase tracking-widest hover:bg-transparent hover:text-foreground"
          >
            Maybe Later, take me to status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
