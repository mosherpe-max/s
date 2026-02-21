'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Check } from 'lucide-react';

interface PoolLayoutPickerProps {
  value: string;
  onChange: (value: string) => void;
}

type PoolZone = 'Cabanas' | 'West Lounge' | 'East Lounge' | 'South Deck';

interface ZoneConfig {
  id: PoolZone;
  label: string;
  prefix: string;
  count: number;
  color: string;
}

const ZONES: ZoneConfig[] = [
  { id: 'Cabanas', label: 'VIP Cabanas', prefix: '', count: 8, color: 'bg-amber-500' },
  { id: 'West Lounge', label: 'West Lounge', prefix: 'W', count: 15, color: 'bg-blue-500' },
  { id: 'East Lounge', label: 'East Lounge', prefix: 'E', count: 15, color: 'bg-blue-500' },
  { id: 'South Deck', label: 'South Deck', prefix: 'S', count: 10, color: 'bg-emerald-500' },
];

export function PoolLayoutPicker({ value, onChange }: PoolLayoutPickerProps) {
  const [selectedZone, setSelectedZone] = useState<PoolZone | null>(null);

  // Derive zone from value if already set
  useMemo(() => {
    if (value && !selectedZone) {
      if (value.startsWith('W')) setSelectedZone('West Lounge');
      else if (value.startsWith('E')) setSelectedZone('East Lounge');
      else if (value.startsWith('S')) setSelectedZone('South Deck');
      else if (!isNaN(parseInt(value))) setSelectedZone('Cabanas');
    }
  }, [value, selectedZone]);

  const handleZoneClick = (zone: PoolZone) => {
    setSelectedZone(zone);
  };

  const handleNumberClick = (num: string) => {
    onChange(num);
  };

  const activeZoneConfig = ZONES.find(z => z.id === selectedZone);

  return (
    <div className="space-y-6">
      {/* Visual Map */}
      <div className="relative w-full aspect-[4/3] bg-muted/20 rounded-3xl border-2 border-dashed border-primary/20 overflow-hidden p-4 shadow-inner">
        <div className="absolute inset-0 flex flex-col items-center justify-between p-6">
          
          {/* North Area: Cabanas */}
          <button 
            onClick={() => handleZoneClick('Cabanas')}
            className={cn(
              "w-3/4 h-12 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest",
              selectedZone === 'Cabanas' ? "bg-amber-500 text-white border-amber-600 shadow-lg scale-105" : "bg-white/80 border-amber-200 text-amber-700 hover:bg-amber-50"
            )}
          >
            VIP Cabanas (1-8)
          </button>

          <div className="flex-1 w-full flex items-center justify-between gap-4 py-4">
            {/* West Area */}
            <button 
              onClick={() => handleZoneClick('West Lounge')}
              className={cn(
                "w-12 h-3/4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest [writing-mode:vertical-lr] rotate-180",
                selectedZone === 'West Lounge' ? "bg-blue-500 text-white border-blue-600 shadow-lg scale-105" : "bg-white/80 border-blue-200 text-blue-700 hover:bg-blue-50"
              )}
            >
              West Lounge
            </button>

            {/* The Pool Body */}
            <div className="flex-1 h-full bg-cyan-100/50 rounded-[40px] border-4 border-cyan-200 flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-pulse" />
              </div>
              <span className="font-headline font-black text-cyan-300 text-2xl uppercase tracking-[0.2em] select-none">POOL</span>
            </div>

            {/* East Area */}
            <button 
              onClick={() => handleZoneClick('East Lounge')}
              className={cn(
                "w-12 h-3/4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest [writing-mode:vertical-lr]",
                selectedZone === 'East Lounge' ? "bg-blue-500 text-white border-blue-600 shadow-lg scale-105" : "bg-white/80 border-blue-200 text-blue-700 hover:bg-blue-50"
              )}
            >
              East Lounge
            </button>
          </div>

          {/* South Area */}
          <button 
            onClick={() => handleZoneClick('South Deck')}
            className={cn(
              "w-3/4 h-12 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest",
              selectedZone === 'South Deck' ? "bg-emerald-500 text-white border-emerald-600 shadow-lg scale-105" : "bg-white/80 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            )}
          >
            South Deck (S1-S10)
          </button>
        </div>
      </div>

      {/* Number Selection */}
      <div className={cn("space-y-4 animate-in fade-in slide-in-from-top-4 duration-500", !selectedZone && "hidden")}>
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", activeZoneConfig?.color)} />
            Select {activeZoneConfig?.label} Number
          </h4>
          {value && (
            <span className="text-[10px] font-black text-primary uppercase">Selected: {value}</span>
          )}
        </div>

        <ScrollArea className="h-32 border-2 rounded-2xl bg-white p-3 shadow-inner">
          <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
            {activeZoneConfig && Array.from({ length: activeZoneConfig.count }, (_, i) => {
              const val = `${activeZoneConfig.prefix}${i + 1}`;
              const isSelected = value === val;
              return (
                <Button
                  key={val}
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => handleNumberClick(val)}
                  className={cn(
                    "h-10 px-0 font-black text-xs rounded-xl transition-all",
                    isSelected ? "bg-primary text-white shadow-md scale-105" : "bg-white hover:bg-primary/5 border-2"
                  )}
                >
                  {val}
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {!selectedZone && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-4 animate-bounce">
          <MapPin className="h-4 w-4" />
          <p className="text-[10px] font-black uppercase tracking-widest">Tap a zone on the map above</p>
        </div>
      )}
    </div>
  );
}
