'use client';

import { Input } from '@/components/ui/input';
import { User, Smartphone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatronIdentifyFieldsProps {
  patronEmail: string;
  setPatronEmail: (value: string) => void;
  patronName: string;
  setPatronName: (value: string) => void;
  patronPhone: string;
  setPatronPhone: (value: string) => void;
  // Drops this component's own card/background so it can be nested inside
  // another container - used on the Digital Payment path so contact info
  // and the card form read as one unified card instead of two stacked ones.
  bare?: boolean;
}

export function PatronIdentifyFields({
  patronEmail, setPatronEmail,
  patronName, setPatronName,
  patronPhone, setPatronPhone,
  bare,
}: PatronIdentifyFieldsProps) {
  return (
    <div className={cn("space-y-3 animate-in fade-in duration-500", !bare && "bg-slate-50/50 p-3 rounded-2xl border-2 border-slate-100")}>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 px-1">
        <User className="h-3 w-3" /> Delivery Contact
      </h3>

      <div className="space-y-2.5">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Email Address"
            type="email"
            value={patronEmail}
            onChange={(e) => setPatronEmail(e.target.value)}
            className="pl-10 h-11 border-2 border-white rounded-xl font-bold focus-visible:ring-primary bg-white shadow-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Full Name"
              value={patronName}
              onChange={(e) => setPatronName(e.target.value)}
              className="pl-10 h-11 border-2 border-white rounded-xl font-bold focus-visible:ring-primary bg-white shadow-sm"
            />
          </div>

          <div className="relative">
            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Mobile Number"
              type="tel"
              value={patronPhone}
              onChange={(e) => setPatronPhone(e.target.value)}
              className="pl-10 h-11 border-2 border-white rounded-xl font-bold focus-visible:ring-primary bg-white shadow-sm"
            />
          </div>
        </div>

        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider leading-relaxed px-1">
          Receipt sent by email. By providing your number, you agree to receive SMS order status updates. Msg & data rates may apply. Reply STOP to opt out.
        </p>
      </div>
    </div>
  );
}
