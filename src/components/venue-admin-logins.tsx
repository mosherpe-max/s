'use client';

import { useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Copy, KeyRound, Loader2, Mail, UserPlus } from 'lucide-react';
import { useAuth, useCollection, useFirebaseApp, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SellerAdminRole } from '@/lib/types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface VenueAdminLink {
  email: string;
  link: string;
  created: boolean;
}

// Calls the Koop-admin-only functions that create a venue admin login and issue
// password links. Shared by the Venue Controls panel and the new-venue form.
export function useVenueAdminActions() {
  const firebaseApp = useFirebaseApp();
  const functions = firebaseApp ? getFunctions(firebaseApp, 'us-central1') : null;

  const createLogin = async (venueId: string, email: string, name: string): Promise<VenueAdminLink> => {
    if (!functions) throw new Error('Not connected yet. Try again in a moment.');
    const result = await httpsCallable(functions, 'createVenueAdminLogin')({ venueId, email, name });
    const data = result.data as { email: string; resetLink: string; created: boolean };
    return { email: data.email, link: data.resetLink, created: data.created };
  };

  const getResetLink = async (email: string): Promise<VenueAdminLink> => {
    if (!functions) throw new Error('Not connected yet. Try again in a moment.');
    const result = await httpsCallable(functions, 'generateVenueAdminResetLink')({ email });
    const data = result.data as { email: string; resetLink: string };
    return { email: data.email, link: data.resetLink, created: false };
  };

  return { createLogin, getResetLink };
}

// Shows the link a venue admin uses to choose their password, with ways to send it.
export function VenueAdminLinkDialog({ result, onClose }: { result: VenueAdminLink | null; onClose: () => void }) {
  const auth = useAuth();
  const { toast } = useToast();
  const [isEmailing, setIsEmailing] = useState(false);

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.link);
      toast({ title: 'Link Copied', description: 'Paste it into a text or email to the venue admin.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could Not Copy', description: 'Select the link and copy it manually.' });
    }
  };

  const email = async () => {
    if (!result || !auth) return;
    setIsEmailing(true);
    try {
      await sendPasswordResetEmail(auth, result.email);
      toast({ title: 'Email Sent', description: `A password link was emailed to ${result.email}.` });
    } catch {
      toast({ variant: 'destructive', title: 'Email Failed', description: 'Copy the link and send it yourself instead.' });
    } finally {
      setIsEmailing(false);
    }
  };

  return (
    <Dialog open={!!result} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md text-left">
        <DialogHeader className="text-left">
          <DialogTitle className="text-base font-black uppercase tracking-wide text-[#213147]">
            {result?.created ? 'Login Created' : 'Password Link Ready'}
          </DialogTitle>
          <DialogDescription className="text-[11px] font-semibold">
            {result?.email} can use this link to choose their own password, then sign in at kooporder.app/login. The link works once and expires in about an hour.
          </DialogDescription>
        </DialogHeader>
        <Input readOnly value={result?.link || ''} onFocus={(e) => e.currentTarget.select()} className="h-10 border-2 font-mono text-[10px]" aria-label="Password link" />
        <div className="flex gap-2">
          <Button onClick={copy} className="h-11 flex-1 font-black uppercase text-[10px] tracking-widest gap-2"><Copy className="h-4 w-4" /> Copy Link</Button>
          <Button onClick={email} disabled={isEmailing} variant="outline" className="h-11 flex-1 border-2 font-black uppercase text-[10px] tracking-widest gap-2">
            {isEmailing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Email It
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Koop Admin > Venue Controls: the venue's admin logins, with a way to add one and to
// send any of them a password reset.
export function VenueAdminLogins({ venueId, courseName }: { venueId: string; courseName: string }) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { createLogin, getResetLink } = useVenueAdminActions();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [linkResult, setLinkResult] = useState<VenueAdminLink | null>(null);

  const rolesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'roles_seller_admin'), where('sellerId', '==', venueId)) : null),
    [firestore, venueId]
  );
  const { data: admins, isLoading } = useCollection<SellerAdminRole>(rolesQuery);

  const handleCreate = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(trimmed)) {
      toast({ variant: 'destructive', title: 'Check the Email', description: 'Enter the venue admin\'s email address.' });
      return;
    }
    setIsCreating(true);
    try {
      setLinkResult(await createLogin(venueId, trimmed, name.trim()));
      setName('');
      setEmail('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could Not Create Login', description: e?.message || 'Please try again.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEmailReset = async (adminEmail: string) => {
    if (!auth) return;
    setBusyEmail(adminEmail);
    try {
      await sendPasswordResetEmail(auth, adminEmail);
      toast({ title: 'Reset Email Sent', description: `A password reset link was emailed to ${adminEmail}.` });
    } catch {
      toast({ variant: 'destructive', title: 'Email Failed', description: 'Try "Get Link" and send it yourself.' });
    } finally {
      setBusyEmail(null);
    }
  };

  const handleGetLink = async (adminEmail: string) => {
    setBusyEmail(adminEmail);
    try {
      setLinkResult(await getResetLink(adminEmail));
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could Not Create Link', description: e?.message || 'Please try again.' });
    } finally {
      setBusyEmail(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
        <KeyRound className="h-3 w-3" /> Venue Admin Logins
      </p>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary opacity-30" />
      ) : (admins || []).length === 0 ? (
        <p className="text-[10px] font-bold uppercase text-muted-foreground">No login yet for {courseName}. Add one below.</p>
      ) : (
        <div className="space-y-2">
          {(admins || []).map((admin) => (
            <div key={admin.email} className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3 space-y-2">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-[#213147] truncate">{admin.userName || admin.email}</p>
                <p className="text-[10px] font-bold text-muted-foreground truncate">{admin.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" disabled={busyEmail === admin.email} onClick={() => handleEmailReset(admin.email)} className="h-8 border-2 text-[9px] font-black uppercase tracking-widest gap-1.5">
                  <Mail className="h-3 w-3" /> Email Reset
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={busyEmail === admin.email} onClick={() => handleGetLink(admin.email)} className="h-8 border-2 text-[9px] font-black uppercase tracking-widest gap-1.5">
                  {busyEmail === admin.email ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />} Get Link
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border-2 border-dashed border-slate-200 p-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`va-name-${venueId}`} className="text-[9px] font-black uppercase text-muted-foreground">Name</Label>
            <Input id={`va-name-${venueId}`} value={name} onChange={(e) => setName(e.target.value)} className="h-10 border-2 font-bold" />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`va-email-${venueId}`} className="text-[9px] font-black uppercase text-muted-foreground">Email</Label>
            <Input id={`va-email-${venueId}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 border-2 font-bold" />
          </div>
        </div>
        <Button type="button" onClick={handleCreate} disabled={isCreating || !email.trim()} className="w-full h-10 font-black uppercase text-[10px] tracking-widest gap-2">
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Create Login
        </Button>
        <p className="text-[8px] font-bold uppercase text-muted-foreground leading-relaxed">
          Creates their sign-in and gives you a link for them to choose a password. One email can be the admin for one venue.
        </p>
      </div>

      <VenueAdminLinkDialog result={linkResult} onClose={() => setLinkResult(null)} />
    </div>
  );
}
