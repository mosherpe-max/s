'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { DollarSign, Percent } from 'lucide-react';

interface TipSelectorProps {
  subtotal: number;
  onTipChange: (amount: number) => void;
}

export function TipSelector({ subtotal, onTipChange }: TipSelectorProps) {
  const isSmallOrder = subtotal < 10;
  const [selectedType, setSelectedType] = useState<'preset' | 'custom'>('preset');
  const [presetValue, setPresetValue] = useState<number | string>(isSmallOrder ? 2 : 20);
  const [customValue, setCustomValue] = useState<string>('');

  // Standard options: 15%, 20%, 25%
  // Small order options: $1, $2, $3
  const options = isSmallOrder 
    ? [1, 2, 3] 
    : [15, 20, 25];

  useEffect(() => {
    if (selectedType === 'preset') {
      const val = Number(presetValue);
      const calculatedTip = isSmallOrder ? val : subtotal * (val / 100);
      onTipChange(calculatedTip);
    } else {
      const val = parseFloat(customValue) || 0;
      onTipChange(val);
    }
  }, [presetValue, customValue, selectedType, subtotal, isSmallOrder, onTipChange]);

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Gratuity / Tip
        </h3>
        <span className="text-[8px] font-bold text-primary uppercase tracking-tighter">
          100% goes to staff
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {options.map((option) => (
          <Button
            key={option}
            variant={selectedType === 'preset' && presetValue === option ? 'default' : 'outline'}
            className={cn(
              "h-11 font-black text-xs transition-all",
              selectedType === 'preset' && presetValue === option ? "shadow-md scale-105" : "border-slate-100"
            )}
            onClick={() => {
              setSelectedType('preset');
              setPresetValue(option);
            }}
          >
            {isSmallOrder ? `$${option}` : `${option}%`}
          </Button>
        ))}
        <Button
          variant={selectedType === 'custom' ? 'default' : 'outline'}
          className={cn(
            "h-11 font-black text-[10px] uppercase tracking-widest transition-all",
            selectedType === 'custom' ? "shadow-md scale-105" : "border-slate-100"
          )}
          onClick={() => setSelectedType('custom')}
        >
          Custom
        </Button>
      </div>

      {selectedType === 'custom' && (
        <div className="relative mt-2 animate-in zoom-in-95 duration-200">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            placeholder="0.00"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            className="pl-9 h-12 border-2 border-primary/20 font-mono font-bold focus-visible:ring-primary"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
