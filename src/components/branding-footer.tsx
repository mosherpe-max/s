'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BrandingFooterProps {
  className?: string;
}

export function BrandingFooter({ className }: BrandingFooterProps) {
  return (
    <footer className={cn("h-7 bg-[#213147] text-white flex items-center justify-between px-6 shrink-0 z-30 w-full", className)}>
      <span className="text-[10px] font-medium text-white">Copyright 2026</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-white">Powered by</span>
        <div className="flex items-center gap-0.5 font-headline font-bold text-xs tracking-tight text-white">
          <span>KO</span>
          <div className="relative flex items-center justify-center w-3 h-3">
            <div className="absolute inset-0 border-[1.2px] border-red-600 rounded-full"></div>
            <div className="absolute w-[5px] h-[5px] border-[0.8px] border-red-600 rounded-full"></div>
            <div className="w-[1.5px] h-[1.5px] bg-red-600 rounded-full"></div>
          </div>
          <span>P</span>
        </div>
      </div>
    </footer>
  );
}
