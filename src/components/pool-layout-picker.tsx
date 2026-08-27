
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Info, Map as MapIcon } from 'lucide-react';
import Image from 'next/image';

interface PoolLayoutPickerProps {
  value: string;
  onChange: (value: string) => void;
  mapUrl?: string;
}

/**
 * Automatically sections any provided pool image into a 3x3 grid of interactive zones.
 * Falls back to a default luxury pool satellite image if none is configured.
 */
export function PoolLayoutPicker({ value, onChange, mapUrl }: PoolLayoutPickerProps) {
  // Default image if none configured (Satellite view of a resort pool)
  const displayMap = mapUrl || "https://images.unsplash.com/photo-1605144884288-49eb7f9bb447?auto=format&fit=crop&q=80&w=1080";

  // Automatic grid sectioning (3x3 grid = 9 zones)
  const zones = Array.from({ length: 9 }, (_, i) => ({
    id: `Zone ${i + 1}`,
    label: (i + 1).toString(),
  }));

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-[3/4] bg-muted rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl group ring-1 ring-black/5">
        {/* Pool Background Image (Custom Satellite capture or Default) */}
        <Image 
          src={displayMap}
          alt="Pool Map Layout"
          data-ai-hint="pool map"
          fill
          className="object-cover transition-transform duration-1000 group-hover:scale-105"
          unoptimized={!!mapUrl && mapUrl.includes('google')} // Static maps don't need optimization
        />
        
        {/* Subtle overlay for better zone visibility */}
        <div className="absolute inset-0 bg-black/10" />

        {/* Automatic Grid Sectioning UI */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-4 gap-3">
          {zones.map((zone) => {
            const isSelected = value === zone.id;
            return (
              <button
                key={zone.id}
                onClick={() => onChange(zone.id)}
                className={cn(
                  "relative rounded-xl border-2 transition-all duration-300 flex items-center justify-center backdrop-blur-[1px]",
                  isSelected 
                    ? "bg-primary border-white text-white shadow-2xl scale-105 z-20" 
                    : "bg-white/10 border-white/30 text-white hover:bg-white/40 hover:border-white/60"
                )}
              >
                <div className="flex flex-col items-center">
                  {isSelected ? (
                    <Check className="h-8 w-8 drop-shadow-md animate-in zoom-in-50 duration-300" />
                  ) : (
                    <span className="font-headline font-black text-2xl drop-shadow-lg">
                      {zone.label}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        {value ? (
          <div className="bg-primary px-6 py-3 rounded-2xl shadow-lg border-2 border-white/20 flex flex-col items-center animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-white" />
              <span className="text-sm font-black uppercase tracking-[0.1em] text-white">
                {value} SELECTED
              </span>
            </div>
            <span className="text-[10px] font-bold text-white/80 uppercase">
              Staff will find you in this general area
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 px-4 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <MapIcon className="h-3.5 w-3.5" /> Tap a Zone Number
            </p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
              Select the area closest to your seat on the map above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
