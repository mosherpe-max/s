'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { StylizedKoopLogo } from './header';

interface BrandingFooterProps {
  className?: string;
}

export function BrandingFooter({ className }: BrandingFooterProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <footer className={cn("fixed bottom-0 left-0 right-0 h-7 bg-[#213147] text-white flex items-center justify-between px-6 z-50 w-full", className)}>
      <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Copyright 2026</span>
      <div className="flex items-center gap-0.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Powered by</span>
        <StylizedKoopLogo size="sm" />
      </div>
    </footer>
  );
}
