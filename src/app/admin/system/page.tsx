
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Settings2, 
  Zap, 
  Globe, 
  Save, 
  Loader2,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  Radio
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { SolutionConfig } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function AdminSystemConfigPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: config, isLoading } = useDoc<SolutionConfig>(configRef);

  const handleUpdateConfig = async (field: string, value: any) => {
    if (!firestore || !config) return;
    updateDoc(doc(firestore, 'solution', 'config'), { 
      [field]: value, 
      updatedAt: serverTimestamp() 
    }).then(() => toast({ title: "System Config Updated" }));
  };

  if (isLoading) return <div className="p-20 flex flex-col items-center gap-4"><Loader2 className="animate-spin h-8 w-8 text-primary" /><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fetching Global State...</p></div>;

  return (
    <div className="p-8 animate-in fade-in duration-500 text-left">
      <div className="max-w-3xl mx-auto space-y-8 pb-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings2 className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-black uppercase text-[#213147]">System Configuration</h2>
        </div>
        
        <Card className="border-2 shadow-sm p-8 space-y-8 text-left">
           <div className="space-y-6">
             <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
               <Zap className="h-4 w-4" /> Operational Engine
             </h4>
             <div className="grid gap-6">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase">Daily Operational Reset Hour (EST)</Label>
                   <div className="flex gap-4 items-center">
                      <Input 
                        type="number" 
                        min="0" max="23" 
                        defaultValue={config?.dailyResetHour || 4} 
                        className="h-12 border-2 font-bold w-24 text-center"
                        onBlur={(e) => handleUpdateConfig('dailyResetHour', parseInt(e.target.value))}
                      />
                      <p className="text-[9px] text-muted-foreground uppercase font-medium max-w-xs">
                        The hour at which all staff shifts are system-terminated and stale orders cancelled.
                      </p>
                   </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                   <div className="text-left">
                      <p className="text-xs font-black uppercase text-[#213147]">Twilio SMS Notifications</p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">GLOBAL TOGGLE FOR PATRON UPDATES</p>
                   </div>
                   <Switch 
                      checked={config?.smsNotificationsEnabled !== false} 
                      onCheckedChange={(val) => handleUpdateConfig('smsNotificationsEnabled', val)}
                      className="data-[state=checked]:bg-green-500"
                   />
                </div>
             </div>
           </div>

           <div className="space-y-6 pt-6 border-t">
             <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
               <Radio className="h-4 w-4" /> Signal & Location Dynamics
             </h4>
             
             <div className="space-y-4">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase">Global GPS Broadcast Interval (Seconds)</Label>
                   <div className="flex gap-4 items-center">
                      <Input 
                        type="number" 
                        min="5" max="300" 
                        defaultValue={config?.gpsRefreshIntervalSeconds || 30} 
                        className="h-12 border-2 font-bold w-24 text-center"
                        onBlur={(e) => handleUpdateConfig('gpsRefreshIntervalSeconds', parseInt(e.target.value))}
                      />
                      <p className="text-[9px] text-muted-foreground uppercase font-medium max-w-xs leading-relaxed">
                        Frequency of location updates from patron and driver devices. Lower values increase precision but use more battery.
                      </p>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-[8px] font-black uppercase text-green-600">Hot Threshold (s)</Label>
                    <Input 
                        type="number" 
                        defaultValue={config?.gpsFreshnessThresholds?.hot || 60} 
                        onBlur={(e) => handleUpdateConfig('gpsFreshnessThresholds.hot', parseInt(e.target.value))}
                        className="h-10 border-2 font-bold text-center"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[8px] font-black uppercase text-amber-500">Warm Threshold (s)</Label>
                    <Input 
                        type="number" 
                        defaultValue={config?.gpsFreshnessThresholds?.warm || 300} 
                        onBlur={(e) => handleUpdateConfig('gpsFreshnessThresholds.warm', parseInt(e.target.value))}
                        className="h-10 border-2 font-bold text-center"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[8px] font-black uppercase text-red-500">Cold Threshold (s)</Label>
                    <Input 
                        type="number" 
                        defaultValue={config?.gpsFreshnessThresholds?.cold || 600} 
                        onBlur={(e) => handleUpdateConfig('gpsFreshnessThresholds.cold', parseInt(e.target.value))}
                        className="h-10 border-2 font-bold text-center"
                    />
                  </div>
                </div>
             </div>
           </div>

           <div className="space-y-6 pt-6 border-t">
             <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
               <Globe className="h-4 w-4" /> Support & Branding
             </h4>
             <div className="grid gap-6">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase">Global Support Email</Label>
                   <Input 
                      defaultValue={config?.supportEmail} 
                      onBlur={(e) => handleUpdateConfig('supportEmail', e.target.value)}
                      className="h-12 border-2 font-bold"
                      placeholder="support@kooporders.com"
                   />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase">Global Logo URL</Label>
                   <Input 
                      defaultValue={config?.logoUrl} 
                      onBlur={(e) => handleUpdateConfig('logoUrl', e.target.value)}
                      className="h-12 border-2 font-bold"
                      placeholder="https://..."
                   />
                </div>
             </div>
           </div>
        </Card>

        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] flex items-start gap-4">
           <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
           <div className="space-y-1 text-left">
              <p className="text-xs font-black uppercase text-amber-700 tracking-tight">Security Warning</p>
              <p className="text-[10px] font-medium text-amber-800 leading-relaxed uppercase">
                Changes made in this terminal affect the logic and styling of ALL onboarded venues. Proceed with extreme caution.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
