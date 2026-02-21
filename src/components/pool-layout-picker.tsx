'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Check } from 'lucide-react';
import Image from 'next/image';

interface PoolLayoutPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const POOL_ZONES = [
  { id: 'VIP Cabanas', label: 'VIP Cabanas', top: '8%', left: '15%', width: '70%', height: '18%' },
  { id: 'West Lounge', label: 'West Lounge', top: '30%', left: '5%', width: '22%', height: '45%' },
  { id: 'East Lounge', label: 'East Lounge', top: '30%', left: '73%', width: '22%', height: '45%' },
  { id: 'South Deck', label: 'South Deck', top: '78%', left: '15%', width: '70%', height: '18%' },
];

export function PoolLayoutPicker({ value, onChange }: PoolLayoutPickerProps) {
  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-[4/3] bg-muted rounded-3xl overflow-hidden border-2 border-primary/10 shadow-2xl group">
        {/* Background Pool Image */}
        <Image 
          src="https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&q=80&w=1080"
          alt="Pool Layout"
          fill
          className="object-cover transition-transform duration-1000 group-hover:scale-105"
        />
        
        {/* Overlay to dim image slightly */}
        <div className="absolute inset-0 bg-black/20" />

        {/* The Pool Body (Visual only) */}
        <div className="absolute top-[35%] left-[30%] w-[40%] h-[35%] rounded-[40px] border-2 border-cyan-300/50 bg-cyan-400/10 backdrop-blur-sm pointer-events-none flex items-center justify-center">
           <span className="font-headline font-black text-white/40 text-xl tracking-[0.3em] uppercase select-none">POOL</span>
        </div>

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
                "absolute rounded-2xl border-2 transition-all duration-300 flex items-center justify-center p-2 backdrop-blur-md",
                isSelected 
                  ? "bg-primary/60 border-white text-white shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-105 z-10" 
                  : "bg-white/10 border-white/20 text-white/90 hover:bg-white/20 hover:border-white/40"
              )}
            >
              <div className="flex flex-col items-center gap-1.5">
                {isSelected ? (
                  <Check className="h-5 w-5 drop-shadow-md animate-in zoom-in-50 duration-300" />
                ) : (
                  <MapPin className="h-4 w-4 opacity-50 drop-shadow-md" />
                )}
                <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest drop-shadow-lg text-center leading-tight px-1">
                  {zone.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2">
        {value ? (
          <div className="bg-primary px-6 py-2.5 rounded-full shadow-lg border-2 border-white/20 flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-300">
            <Check className="h-4 w-4 text-white" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-white">
              Selected: {value}
            </span>
          </div>
        ) : (
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
            Tap a zone on the pool map
          </p>
        )}
      </div>
    </div>
  );
}
