'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { StylizedKoopLogo } from './header';
import Link from 'next/link';

interface BrandingFooterProps {
  className?: string;
}

/**
 * Global persistent footer for brand presence.
 * Styled to match the landing page's metadata and utility text.
 */
export function BrandingFooter({ className }: BrandingFooterProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <footer className={cn(
      "fixed bottom-0 left-0 right-0 h-7 bg-[#213147] text-white flex items-center justify-between px-6 z-50 w-full border-t border-white/5",
      className
    )}>
      <span className="font-body text-[9px] font-bold uppercase tracking-[0.2em] text-[#8a9ab0]">
        COPYRIGHT 2026
      </span>
      <div className="flex items-center gap-1">
        <span className="font-body text-[9px] font-bold uppercase tracking-[0.2em] text-[#8a9ab0]">
          POWERED BY
        </span>
        <Link href="/" className="hover:opacity-80 transition-opacity active:scale-95">
          <StylizedKoopLogo size="sm" />
        </Link>
      </div>
    </footer>
  );
}
