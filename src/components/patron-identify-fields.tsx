'use client';

import { Input } from '@/components/ui/input';
import { User, Smartphone, Mail } from 'lucide-react';

interface PatronIdentifyFieldsProps {
  patronEmail: string;
  setPatronEmail: (value: string) => void;
  patronName: string;
  setPatronName: (value: string) => void;
  patronPhone: string;
  setPatronPhone: (value: string) => void;
}

export function PatronIdentifyFields({
  patronEmail, setPatronEmail,
  patronName, setPatronName,
  patronPhone, setPatronPhone,
}: PatronIdentifyFieldsProps) {
  return (
    <div className="space-y-6 bg-slate-50/50 p-5 rounded-[2rem] border-2 border-slate-100 animate-in fade-in duration-500">
      <div className="space-y-1.5 px-1">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
          <User className="h-3 w-3" /> Delivery Contact
        </h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Email Address"
              type="email"
              value={patronEmail}
              onChange={(e) => setPatronEmail(e.target.value)}
              className="pl-10 h-12 border-2 border-white rounded-xl font-bold focus-visible:ring-primary bg-white shadow-sm"
            />
          </div>
          <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
            Your digital receipt will be sent here
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Full Name"
                value={patronName}
                onChange={(e) => setPatronName(e.target.value)}
                className="pl-10 h-12 border-2 border-white rounded-xl font-bold focus-visible:ring-primary bg-white shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="relative">
              <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Mobile Number"
                type="tel"
                value={patronPhone}
                onChange={(e) => setPatronPhone(e.target.value)}
                className="pl-10 h-12 border-2 border-white rounded-xl font-bold focus-visible:ring-primary bg-white shadow-sm"
              />
            </div>
            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
              By providing your number, you agree to receive SMS order status updates. Msg & data rates may apply. Reply STOP to opt out.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
