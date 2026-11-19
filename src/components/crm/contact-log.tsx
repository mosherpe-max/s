'use client';

import { useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { Loader2, Pencil, Save, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { LeadContact, LeadContactType } from '@/lib/types';
import { CONTACT_TYPES } from '@/lib/crm';

const prettyDate = (key: string) => { try { return format(parseISO(key), 'EEE, MMM d, yyyy'); } catch { return key; } };
const labelClass = 'text-[9px] font-black uppercase';
const inputClass = 'h-11 border-2 font-bold';

export interface ContactLogProps {
  contacts: LeadContact[]; // already sorted, newest first
  loading: boolean;
  editingId: string | null;
  date: string;
  type: LeadContactType;
  notes: string;
  maxDate: string;
  saving: boolean;
  onDate: (v: string) => void;
  onType: (v: LeadContactType) => void;
  onNotes: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: (entry: LeadContact) => void;
  onDelete: (entry: LeadContact) => void;
}

// The fields for one contact: used to add a new entry (at the top) and to change an existing one (in its own place in the
// list, so it opens right where the pencil was tapped instead of off-screen above a long list).
function EntryForm({ idPrefix, editing, props }: { idPrefix: string; editing: boolean; props: ContactLogProps }) {
  const { date, type, notes, maxDate, saving, onDate, onType, onNotes, onSave, onCancel } = props;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-date`} className={labelClass}>Date</Label>
          <Input id={`${idPrefix}-date`} type="date" value={date} max={maxDate} onChange={(e) => onDate(e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>Type</Label>
          <Select value={type} onValueChange={(v) => onType(v as LeadContactType)}>
            <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
            <SelectContent>{CONTACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-notes`} className={labelClass}>Notes from the meeting or discussion</Label>
        <Textarea id={`${idPrefix}-notes`} value={notes} onChange={(e) => onNotes(e.target.value)} rows={editing ? 6 : 4} placeholder="Who you spoke with, what was said, what happens next…" className="border-2 font-medium" />
      </div>
      <div className="flex gap-2 justify-end">
        {editing && <Button type="button" variant="outline" onClick={onCancel} className="h-10 border-2 font-black uppercase text-[10px] tracking-widest gap-1.5"><X className="h-3.5 w-3.5" /> Cancel</Button>}
        <Button type="button" onClick={onSave} disabled={saving} className="h-10 font-black uppercase text-[10px] tracking-widest gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {editing ? 'Update Entry' : 'Add To Log'}
        </Button>
      </div>
    </div>
  );
}

// The contact log on a lead: a form to add an entry, then the entries newest first. Tapping the pencil on an entry turns
// that entry into the edit form, in place.
export function ContactLog(props: ContactLogProps) {
  const { contacts, loading, editingId, onStartEdit, onDelete } = props;
  const editingRef = useRef<HTMLLIElement | null>(null);

  // Bring the entry being changed into view and put the cursor in its notes.
  useEffect(() => {
    if (!editingId) return;
    const li = editingRef.current;
    if (!li) return;
    li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    li.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true });
  }, [editingId]);

  return (
    <>
      {!editingId && (
        <div className="rounded-2xl border-2 p-4 bg-white">
          <EntryForm idPrefix="entry" editing={false} props={props} />
        </div>
      )}

      {loading ? (
        <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin text-primary inline" /></div>
      ) : contacts.length === 0 ? (
        <p className="py-6 text-center text-[10px] font-black uppercase text-muted-foreground opacity-60">No contacts logged yet</p>
      ) : (
        <ul className="space-y-3">
          {contacts.map(c => c.id === editingId ? (
            <li key={c.id} ref={editingRef} data-testid="editing-entry" className="rounded-2xl border-2 border-primary/40 p-4 bg-white space-y-3 scroll-mt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Editing this entry</p>
              <EntryForm idPrefix="edit" editing props={props} />
            </li>
          ) : (
            <li key={c.id} className="rounded-2xl border-2 p-4 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase text-[#213147]">{prettyDate(c.date)}</span>
                  <Badge variant="outline" className="text-[8px] font-black uppercase bg-white">{c.type}</Badge>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit entry" onClick={() => onStartEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Delete entry" onClick={() => onDelete(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm font-medium text-slate-700">{c.notes}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
