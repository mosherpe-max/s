'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import Image from 'next/image';

interface PoolLayoutPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const POOL_ZONES = [
  { id: 'Zone 1', label: '1', top: '5%', left: '25%', width: '50%', height: '18%', desc: 'North Tables' },
  { id: 'Zone 2', label: '2', top: '25%', left: '68%', width: '25%', height: '30%', desc: 'East Upper Lounge' },
  { id: 'Zone 3', label: '3', top: '58%', left: '68%', width: '25%', height: '30%', desc: 'East Lower Lounge' },
  { id: 'Zone 4', label: '4', top: '78%', left: '30%', width: '40%', height: '18%', desc: 'Circular Pool Area' },
  { id: 'Zone 5', label: '5', top: '50%', left: '5%', width: '25%', height: '35%', desc: 'West Curved Pool' },
  { id: 'Zone 6', label: '6', top: '15%', left: '5%', width: '20%', height: '30%', desc: 'Northwest Lounge' },
];

export function PoolLayoutPicker({ value, onChange }: PoolLayoutPickerProps) {
  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-[3/4] bg-muted rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl group">
        {/* Satellite Background Pool Image */}
        <Image 
          src="https://images.unsplash.com/photo-1605144884288-49eb7f9bb447?auto=format&fit=crop&q=80&w=1080"
          alt="Pool Satellite Layout"
          data-ai-hint="pool satellite"
          fill
          className="object-cover transition-transform duration-1000 group-hover:scale-105"
        />
        
        {/* Overlay to dim image slightly for button visibility */}
        <div className="absolute inset-0 bg-black/10" />

        {/* Selection Overlays */}
        {POOL_ZONES.map((zone) => {
          const isSelected = value === zone.id;
          return (
            <button
              key={zone.id}
              onClick={() => onChange(zone.id)}
              style={{
                top: zone.top,
                left: zone.left,
                width: zone.width,
                height: zone.height,
              }}
              className={cn(
                "absolute rounded-2xl border-2 transition-all duration-300 flex items-center justify-center p-1 backdrop-blur-[2px]",
                isSelected 
                  ? "bg-primary border-white text-white shadow-[0_0_20px_rgba(0,0,0,0.4)] scale-110 z-20" 
                  : "bg-white/40 border-white/60 text-foreground hover:bg-white/60"
              )}
            >
              <div className="flex flex-col items-center">
                {isSelected ? (
                  <Check className="h-6 w-6 drop-shadow-md animate-in zoom-in-50 duration-300" />
                ) : (
                  <span className="font-headline font-black text-xl drop-shadow-sm">
                    {zone.label}
                  </span>
                )}
              </div>
            </button>
          );
        })}
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
              {POOL_ZONES.find(z => z.id === value)?.desc}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
              Tap a Numbered Zone
            </p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              To tell us where you are sitting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
