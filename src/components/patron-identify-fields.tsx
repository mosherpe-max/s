'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { User, Smartphone, Mail, Pencil } from 'lucide-react';
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
  // True when name/email/phone all came pre-filled from a prior order on
  // this device (see checkout page's koop_patron_* cache), not just typed
  // in during this visit - shows a compact one-line summary with an Edit
  // affordance instead of the full open form, to save vertical space for
  // patrons who've already given us this info before.
  isReturningCustomer?: boolean;
  // What is wrong with each field right now (see checkoutProblems). A message shows once the patron has left that
  // field, or for every field at once when showAllProblems is set (they tapped Place Order with something missing).
  problems?: Partial<Record<'email' | 'name' | 'phone', string>>;
  showAllProblems?: boolean;
}

export function PatronIdentifyFields({
  patronEmail, setPatronEmail,
  patronName, setPatronName,
  patronPhone, setPatronPhone,
  bare,
  isReturningCustomer,
  problems = {},
  showAllProblems = false,
}: PatronIdentifyFieldsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const hasProblems = Object.keys(problems).length > 0;
  const errorFor = (field: 'email' | 'name' | 'phone') => ((touched[field] || showAllProblems) ? problems[field] : undefined);
  const fieldClass = (field: 'email' | 'name' | 'phone') => cn(
    'pl-10 h-11 border-2 rounded-xl font-bold bg-white shadow-sm',
    errorFor(field) ? 'border-red-400 focus-visible:ring-red-500' : 'border-white focus-visible:ring-primary',
  );
  const fieldProps = (field: 'email' | 'name' | 'phone') => ({
    id: `checkout-${field}`,
    'aria-invalid': errorFor(field) ? true : undefined,
    'aria-describedby': errorFor(field) ? `checkout-${field}-error` : undefined,
    onBlur: () => setTouched(t => ({ ...t, [field]: true })),
  });
  const errorText = (field: 'email' | 'name' | 'phone') => errorFor(field) && (
    <p id={`checkout-${field}-error`} role="alert" className="mt-1 px-1 text-[10px] font-bold leading-snug text-red-600">{errorFor(field)}</p>
  );

  // A returning patron's saved details show as a one-line summary, unless something in them needs fixing.
  if (isReturningCustomer && !isEditing && !(showAllProblems && hasProblems)) {
    return (
      <div className={cn("animate-in fade-in duration-500", !bare && "bg-slate-50/50 p-3 rounded-2xl border-2 border-slate-100")}>
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/10 shrink-0"><User className="h-3.5 w-3.5 text-primary" /></div>
            <div className="min-w-0">
              <p className="text-[11px] font-black text-[#213147] uppercase truncate">{patronName}</p>
              <p className="text-[9px] font-bold text-muted-foreground truncate">{patronEmail} · {patronPhone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary shrink-0 active:scale-95 transition-transform"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 animate-in fade-in duration-500", !bare && "bg-slate-50/50 p-3 rounded-2xl border-2 border-slate-100")}>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 px-1">
        <User className="h-3 w-3" /> Delivery Contact
      </h3>

      <div className="space-y-2.5">
        <div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Email Address"
              type="email"
              value={patronEmail}
              onChange={(e) => setPatronEmail(e.target.value)}
              autoComplete="email"
              className={fieldClass('email')}
              {...fieldProps('email')}
            />
          </div>
          {errorText('email')}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Full Name"
                value={patronName}
                onChange={(e) => setPatronName(e.target.value)}
                autoComplete="name"
                className={fieldClass('name')}
                {...fieldProps('name')}
              />
            </div>
            {errorText('name')}
          </div>

          <div>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Mobile Number"
                type="tel"
                value={patronPhone}
                onChange={(e) => setPatronPhone(e.target.value)}
                autoComplete="tel"
                className={fieldClass('phone')}
                {...fieldProps('phone')}
              />
            </div>
            {errorText('phone')}
          </div>
        </div>

        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider leading-relaxed px-1">
          Receipt sent by email. By providing your number, you agree to receive SMS order status updates. Msg & data rates may apply. Reply STOP to opt out.
        </p>
      </div>
    </div>
  );
}
