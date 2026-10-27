'use client';

import { useState } from 'react';
import { collection } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Copy, Loader2, Mail, Trash2, UserPlus, UsersRound } from 'lucide-react';
import { useAuth, useCollection, useFirebaseApp, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VenueAdminLinkDialog, type VenueAdminLink } from '@/components/venue-admin-logins';
import type { KoopTeamRole } from '@/lib/types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Koop Admin > System Config: who else can sign in to the Koop admin. Team members do the day-to-day
// work (venues, menus, the sales pipeline); this page, the global reset and venue/order deletion stay
// with the Koop admin.
export function KoopTeamManager() {
  const firebaseApp = useFirebaseApp();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const functions = firebaseApp ? getFunctions(firebaseApp, 'us-central1') : null;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [linkResult, setLinkResult] = useState<VenueAdminLink | null>(null);
  const [toRemove, setToRemove] = useState<KoopTeamRole | null>(null);

  const teamQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'roles_koop_team') : null), [firestore]);
  const { data: team, isLoading } = useCollection<KoopTeamRole>(teamQuery);

  const call = async <T,>(fn: string, data: Record<string, unknown>): Promise<T> => {
    if (!functions) throw new Error('Not connected yet. Try again in a moment.');
    return (await httpsCallable(functions, fn)(data)).data as T;
  };

  const handleCreate = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(trimmed)) {
      toast({ variant: 'destructive', title: 'Check the Email', description: 'Enter the team member\'s email address.' });
      return;
    }
    setIsCreating(true);
    try {
      const data = await call<{ email: string; resetLink: string; created: boolean }>('createKoopTeamLogin', { email: trimmed, name: name.trim() });
      setLinkResult({ email: data.email, link: data.resetLink, created: data.created });
      setName('');
      setEmail('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could Not Add Team Member', description: e?.message || 'Please try again.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleGetLink = async (memberEmail: string) => {
    setBusyEmail(memberEmail);
    try {
      const data = await call<{ email: string; resetLink: string }>('generateKoopTeamResetLink', { email: memberEmail });
      setLinkResult({ email: data.email, link: data.resetLink, created: false });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could Not Create Link', description: e?.message || 'Please try again.' });
    } finally {
      setBusyEmail(null);
    }
  };

  const handleEmailReset = async (memberEmail: string) => {
    if (!auth) return;
    setBusyEmail(memberEmail);
    try {
      await sendPasswordResetEmail(auth, memberEmail);
      toast({ title: 'Reset Email Sent', description: `A password reset link was emailed to ${memberEmail}.` });
    } catch {
      toast({ variant: 'destructive', title: 'Email Failed', description: 'Try "Get Link" and send it yourself.' });
    } finally {
      setBusyEmail(null);
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    setBusyEmail(toRemove.email);
    try {
      await call('removeKoopTeamLogin', { email: toRemove.email });
      toast({ title: 'Team Member Removed', description: `${toRemove.email} can no longer use the Koop admin.` });
      setToRemove(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could Not Remove', description: e?.message || 'Please try again.' });
    } finally {
      setBusyEmail(null);
    }
  };

  return (
    <Card className="border-2 shadow-sm p-8 space-y-6 text-left">
      <div className="space-y-2">
        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
          <UsersRound className="h-4 w-4" /> Koop Team
        </h4>
        <p className="text-[10px] font-medium text-muted-foreground leading-relaxed max-w-xl">
          People who can sign in to the Koop admin to set venues up, build menus and work the sales pipeline. They cannot
          open System Config, manage this team, run the global reset, or delete a venue or an order. Removing someone takes effect right away.
        </p>
      </div>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary opacity-30" />
      ) : (team || []).length === 0 ? (
        <p className="text-[10px] font-bold uppercase text-muted-foreground">No team members yet.</p>
      ) : (
        <div className="space-y-2">
          {(team || []).map((member) => (
            <div key={member.email} className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3 space-y-2">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-[#213147] truncate">{member.userName || member.email}</p>
                <p className="text-[10px] font-bold text-muted-foreground truncate">{member.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" disabled={busyEmail === member.email} onClick={() => handleEmailReset(member.email)} className="h-8 border-2 text-[9px] font-black uppercase tracking-widest gap-1.5">
                  <Mail className="h-3 w-3" /> Email Reset
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={busyEmail === member.email} onClick={() => handleGetLink(member.email)} className="h-8 border-2 text-[9px] font-black uppercase tracking-widest gap-1.5">
                  {busyEmail === member.email ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />} Get Link
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={busyEmail === member.email} onClick={() => setToRemove(member)} className="h-8 border-2 text-[9px] font-black uppercase tracking-widest gap-1.5 text-destructive hover:text-destructive">
                  <Trash2 className="h-3 w-3" /> Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border-2 border-dashed border-slate-200 p-3 space-y-3 max-w-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="kt-name" className="text-[9px] font-black uppercase text-muted-foreground">Name</Label>
            <Input id="kt-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10 border-2 font-bold" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="kt-email" className="text-[9px] font-black uppercase text-muted-foreground">Email</Label>
            <Input id="kt-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 border-2 font-bold" />
          </div>
        </div>
        <Button type="button" onClick={handleCreate} disabled={isCreating || !email.trim()} className="w-full h-10 font-black uppercase text-[10px] tracking-widest gap-2">
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add Team Member
        </Button>
        <p className="text-[8px] font-bold uppercase text-muted-foreground leading-relaxed">
          Creates their sign-in and gives you a link for them to choose a password.
        </p>
      </div>

      <VenueAdminLinkDialog result={linkResult} onClose={() => setLinkResult(null)} />

      <AlertDialog open={!!toRemove} onOpenChange={(open) => { if (!open) setToRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="font-black uppercase">Remove {toRemove?.userName || toRemove?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              They are signed out of the Koop admin right away and cannot use it again unless you add them back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
